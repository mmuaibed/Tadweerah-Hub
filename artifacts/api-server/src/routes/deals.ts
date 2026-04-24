import { Router, type IRouter } from "express";
import { and, eq, or } from "drizzle-orm";
import { db, companiesTable, dealsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";
import { logAudit } from "../lib/audit";
import { notifyDealStageChange } from "../lib/notify";

const router: IRouter = Router();

function serializeDeal(
  deal: typeof dealsTable.$inferSelect,
  counterparty: { name: string; contactPhone: string },
) {
  return {
    id: deal.id,
    offer_id: deal.offer_id,
    listing_id: deal.listing_id,
    producer_company_id: deal.producer_company_id,
    buyer_company_id: deal.buyer_company_id,
    settlement_type: deal.settlement_type,
    price_per_unit: Number(deal.price_per_unit),
    estimated_amount: Number(deal.estimated_amount),
    actual_quantity:
      deal.actual_quantity != null ? Number(deal.actual_quantity) : null,
    final_amount: deal.final_amount != null ? Number(deal.final_amount) : null,
    status: deal.status,
    counterparty: {
      name: counterparty.name,
      contact_phone: counterparty.contactPhone,
    },
    payment_confirmed_at: deal.payment_confirmed_at?.toISOString() ?? null,
    payment_reference: deal.payment_reference ?? null,
    payment_proof_url: deal.payment_proof_url ?? null,
    dispatched_at: deal.dispatched_at?.toISOString() ?? null,
    received_at: deal.received_at?.toISOString() ?? null,
    created_at: deal.created_at.toISOString(),
    updated_at: deal.updated_at.toISOString(),
  };
}

async function fetchDealWithCounterparty(
  dealId: string,
  companyId: string,
) {
  const [deal] = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.id, dealId))
    .limit(1);

  if (!deal) throw new HttpError(404, "NotFound", "Deal not found");

  const isProducer = deal.producer_company_id === companyId;
  const isBuyer = deal.buyer_company_id === companyId;
  if (!isProducer && !isBuyer) {
    throw new HttpError(403, "Forbidden", "Not a party to this deal");
  }

  const counterpartyId = isProducer
    ? deal.buyer_company_id
    : deal.producer_company_id;

  const [counterparty] = await db
    .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
    .from(companiesTable)
    .where(eq(companiesTable.id, counterpartyId))
    .limit(1);

  if (!counterparty) throw new HttpError(500, "InternalError", "Counterparty not found");

  return { deal, counterparty, isProducer, isBuyer };
}

/**
 * GET /deals/:deal_id
 * Any party to the deal (producer or buyer) can view it.
 * Returns deal info with counterparty phone (role-aware).
 */
router.get(
  "/deals/:deal_id",
  requireAuth,
  requireCompany(["producer", "buyer"]),
  async (req, res) => {
    const dealId = assertUuid(req.params.deal_id, "deal_id");
    const { company } = req as AuthedCompanyRequest;

    const { deal, counterparty } = await fetchDealWithCounterparty(
      dealId,
      company.id,
    );

    res.json(serializeDeal(deal, counterparty));
  },
);

/**
 * POST /deals/:deal_id/confirm-payment
 * Producer confirms payment received.
 * Requires `payment_reference` (bank transfer ID / transaction number) in body.
 * Optional: `payment_proof_url` (URL of uploaded document).
 * For by_weight deals: `actual_quantity` also required to compute final_amount.
 * For fixed deals: `actual_quantity` must NOT be sent.
 */
router.post(
  "/deals/:deal_id/confirm-payment",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const dealId = assertUuid(req.params.deal_id, "deal_id");
    const { company } = req as AuthedCompanyRequest;

    // Validate required payment_reference
    const payment_reference = req.body?.payment_reference;
    if (!payment_reference || typeof payment_reference !== "string" || !payment_reference.trim()) {
      throw new HttpError(
        400,
        "PaymentReferenceRequired",
        "payment_reference (bank transfer number / transaction ID) is required",
      );
    }
    const payment_proof_url = req.body?.payment_proof_url
      ? String(req.body.payment_proof_url).trim() || null
      : null;

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) throw new HttpError(404, "NotFound", "Deal not found");
    if (deal.producer_company_id !== company.id) {
      throw new HttpError(403, "Forbidden", "Not the producer of this deal");
    }
    if (deal.status !== "active") {
      throw new HttpError(
        409,
        "InvalidState",
        "Deal is not in 'active' state. Current state: " + deal.status,
      );
    }

    const now = new Date();

    if (deal.settlement_type === "fixed") {
      if (req.body?.actual_quantity !== undefined) {
        throw new HttpError(
          400,
          "ActualQuantityForbidden",
          "actual_quantity must not be sent for fixed-price deals",
        );
      }

      const [updated] = await db
        .update(dealsTable)
        .set({
          status: "payment_confirmed",
          payment_confirmed_at: now,
          payment_confirmed_by: company.id,
          payment_reference: payment_reference.trim(),
          payment_proof_url,
          updated_at: now,
        })
        .where(eq(dealsTable.id, dealId))
        .returning();

      const counterpartyId = updated.buyer_company_id;
      const [counterparty] = await db
        .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
        .from(companiesTable)
        .where(eq(companiesTable.id, counterpartyId))
        .limit(1);

      void logAudit({
        userId: (req as AuthedCompanyRequest).userId,
        companyId: company.id,
        action: "deal.payment_confirmed",
        entityType: "deal",
        entityId: dealId,
        details: { settlement_type: "fixed" },
      });
      void notifyDealStageChange({
        companyId: updated.buyer_company_id,
        dealId,
        type: "deal_payment_confirmed",
        title_ar: "تم تأكيد الدفع",
        title_en: "Payment Confirmed",
        body_ar: "قام المنتج بتأكيد استلام الدفع، يرجى انتظار شحن البضاعة",
        body_en: "The producer confirmed payment receipt. Awaiting dispatch.",
      });

      return res.json(serializeDeal(updated, counterparty!));
    }

    // by_weight
    const rawQty = req.body?.actual_quantity;
    if (rawQty === undefined || rawQty === null) {
      throw new HttpError(
        422,
        "ActualQuantityRequired",
        "actual_quantity is required for by_weight deals",
      );
    }
    const qty = Number(rawQty);
    if (!isFinite(qty) || qty <= 0) {
      throw new HttpError(
        422,
        "ActualQuantityInvalid",
        "actual_quantity must be a positive number",
      );
    }

    const finalAmount = Number(deal.price_per_unit) * qty;

    const [updated] = await db
      .update(dealsTable)
      .set({
        status: "payment_confirmed",
        actual_quantity: String(qty),
        final_amount: String(finalAmount),
        payment_confirmed_at: now,
        payment_confirmed_by: company.id,
        payment_reference: payment_reference.trim(),
        payment_proof_url,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.buyer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.payment_confirmed",
      entityType: "deal",
      entityId: dealId,
      details: { settlement_type: "by_weight", actual_quantity: qty, final_amount: finalAmount },
    });
    void notifyDealStageChange({
      companyId: updated.buyer_company_id,
      dealId,
      type: "deal_payment_confirmed",
      title_ar: "تم تأكيد الدفع",
      title_en: "Payment Confirmed",
      body_ar: "قام المنتج بتأكيد استلام الدفع، يرجى انتظار شحن البضاعة",
      body_en: "The producer confirmed payment receipt. Awaiting dispatch.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

/**
 * POST /deals/:deal_id/confirm-dispatch
 * Producer confirms goods have been dispatched.
 * Requires status = 'payment_confirmed'.
 */
router.post(
  "/deals/:deal_id/confirm-dispatch",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const dealId = assertUuid(req.params.deal_id, "deal_id");
    const { company } = req as AuthedCompanyRequest;

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) throw new HttpError(404, "NotFound", "Deal not found");
    if (deal.producer_company_id !== company.id) {
      throw new HttpError(403, "Forbidden", "Not the producer of this deal");
    }
    if (deal.status !== "payment_confirmed") {
      throw new HttpError(
        409,
        "InvalidState",
        "Deal must be in 'payment_confirmed' state. Current state: " + deal.status,
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(dealsTable)
      .set({
        status: "dispatched",
        dispatched_at: now,
        dispatched_by: company.id,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.buyer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.dispatched",
      entityType: "deal",
      entityId: dealId,
    });
    void notifyDealStageChange({
      companyId: updated.buyer_company_id,
      dealId,
      type: "deal_dispatched",
      title_ar: "تم شحن البضاعة",
      title_en: "Goods Dispatched",
      body_ar: "قام المنتج بتأكيد شحن البضاعة، يرجى تأكيد الاستلام عند وصولها",
      body_en: "The producer confirmed dispatch. Please confirm receipt when goods arrive.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

/**
 * POST /deals/:deal_id/confirm-receipt
 * Buyer confirms goods have been received. Completes the deal.
 * Requires status = 'dispatched'.
 */
router.post(
  "/deals/:deal_id/confirm-receipt",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const dealId = assertUuid(req.params.deal_id, "deal_id");
    const { company } = req as AuthedCompanyRequest;

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) throw new HttpError(404, "NotFound", "Deal not found");
    if (deal.buyer_company_id !== company.id) {
      throw new HttpError(403, "Forbidden", "Not the buyer of this deal");
    }
    if (deal.status !== "dispatched") {
      throw new HttpError(
        409,
        "InvalidState",
        "Deal must be in 'dispatched' state. Current state: " + deal.status,
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(dealsTable)
      .set({
        status: "completed",
        received_at: now,
        received_by: company.id,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.producer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.receipt_confirmed",
      entityType: "deal",
      entityId: dealId,
    });
    void notifyDealStageChange({
      companyId: updated.producer_company_id,
      dealId,
      type: "deal_completed",
      title_ar: "اكتملت الصفقة",
      title_en: "Deal Completed",
      body_ar: "أكّد المشتري استلام البضاعة. تم إتمام الصفقة بنجاح",
      body_en: "The buyer confirmed receipt. The deal is now complete.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

export default router;
