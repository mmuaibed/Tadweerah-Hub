import { Router, type IRouter } from "express";
import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import {
  db,
  companiesTable,
  dealsTable,
  transportRequestsTable,
  wasteListingsTable,
} from "@workspace/db";
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
  counterparty: { name: string; contactPhone: string; city: string | null; commercialRegistration?: string | null; license_status?: string | null },
  listingExtra?: { transport_responsibility: string | null },
) {
  const isVerified = !!(counterparty.commercialRegistration && counterparty.license_status === "approved");

  // Compute VAT display values. Use stored vat_rate if available, else default 15%.
  const vatRate = deal.vat_rate != null ? Number(deal.vat_rate) : 0.15;
  const subtotalAmount = Number(deal.estimated_amount);
  const vatAmount = deal.vat_amount != null
    ? Number(deal.vat_amount)
    : Math.round(subtotalAmount * vatRate * 1000) / 1000;
  const totalAmount = deal.total_amount != null
    ? Number(deal.total_amount)
    : Math.round((subtotalAmount + vatAmount) * 1000) / 1000;

  return {
    id: deal.id,
    offer_id: deal.offer_id,
    listing_id: deal.listing_id,
    producer_company_id: deal.producer_company_id,
    buyer_company_id: deal.buyer_company_id,
    settlement_type: deal.settlement_type,
    price_per_unit: Number(deal.price_per_unit),
    estimated_amount: subtotalAmount,
    actual_quantity:
      deal.actual_quantity != null ? Number(deal.actual_quantity) : null,
    final_amount: deal.final_amount != null ? Number(deal.final_amount) : null,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    status: deal.status,
    transport_decision: deal.transport_decision ?? null,
    transport_responsibility: listingExtra?.transport_responsibility ?? null,
    counterparty: {
      name: counterparty.name,
      contact_phone: counterparty.contactPhone,
      city: counterparty.city ?? undefined,
      is_verified: isVerified,
    },
    payment_confirmed_at: deal.payment_confirmed_at?.toISOString() ?? null,
    payment_submitted_at: deal.payment_submitted_at?.toISOString() ?? null,
    payment_reference: deal.payment_reference ?? null,
    payment_proof_url: deal.payment_proof_url ?? null,
    dispatched_at: deal.dispatched_at?.toISOString() ?? null,
    received_at: deal.received_at?.toISOString() ?? null,
    receipt_pending_since: deal.receipt_pending_since?.toISOString() ?? null,
    cancelled_at: deal.cancelled_at?.toISOString() ?? null,
    extension_count: deal.extension_count,
    extended_until: deal.extended_until?.toISOString() ?? null,
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

  const [counterparty, listingRow] = await Promise.all([
    db
      .select({
        name: companiesTable.name,
        contactPhone: companiesTable.contactPhone,
        city: companiesTable.city,
        commercialRegistration: companiesTable.commercialRegistration,
        license_status: companiesTable.license_status,
      })
      .from(companiesTable)
      .where(eq(companiesTable.id, counterpartyId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ transport_responsibility: wasteListingsTable.transport_responsibility })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, deal.listing_id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!counterparty) throw new HttpError(500, "InternalError", "Counterparty not found");

  return { deal, counterparty, isProducer, isBuyer, listingExtra: listingRow };
}

/**
 * GET /deals/pending
 * Returns deals where the current user/company needs to take action.
 * MUST be registered before /deals/:deal_id so Express doesn't match
 * "pending" as a deal UUID and return a 400 bad request.
 * Producer: status = payment_submitted (confirm payment) or payment_confirmed (confirm dispatch)
 * Buyer:    status = active (submit payment) or dispatched (confirm receipt)
 */
router.get(
  "/deals/pending",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    const listingExtraFields = {
      material: wasteListingsTable.material,
      city: wasteListingsTable.city,
      quantity: wasteListingsTable.quantity,
      unit: wasteListingsTable.unit,
      material_subcategory_id: wasteListingsTable.material_subcategory_id,
      material_location_address: wasteListingsTable.material_location_address,
      google_maps_url: wasteListingsTable.google_maps_url,
    };

    // ── 1. Producer deal-flow actions: payment_submitted → confirm_payment, payment_confirmed → confirm_dispatch
    const producerDeals = await db
      .select({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        status: dealsTable.status,
        ...listingExtraFields,
        updated_at: dealsTable.updated_at,
      })
      .from(dealsTable)
      .leftJoin(wasteListingsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
      .where(
        and(
          eq(dealsTable.producer_company_id, company.id),
          inArray(dealsTable.status, ["payment_submitted", "payment_confirmed"]),
        ),
      )
      .orderBy(dealsTable.updated_at);

    // ── 2. Buyer deal-flow actions: active → submit_payment, dispatched → confirm_receipt
    const buyerDeals = await db
      .select({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        status: dealsTable.status,
        ...listingExtraFields,
        updated_at: dealsTable.updated_at,
      })
      .from(dealsTable)
      .leftJoin(wasteListingsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
      .where(
        and(
          eq(dealsTable.buyer_company_id, company.id),
          inArray(dealsTable.status, ["active", "dispatched"]),
        ),
      )
      .orderBy(dealsTable.updated_at);

    // ── 3. Buyer transport decision: payment_confirmed + no transport_decision + no existing TR
    const buyerChooseTransport = await db
      .select({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        status: dealsTable.status,
        ...listingExtraFields,
        updated_at: dealsTable.updated_at,
      })
      .from(dealsTable)
      .leftJoin(wasteListingsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
      .where(
        and(
          eq(dealsTable.buyer_company_id, company.id),
          eq(dealsTable.status, "payment_confirmed"),
          isNull(dealsTable.transport_decision),
        ),
      )
      .orderBy(dealsTable.updated_at);

    // ── 4. Pending transport requests (both roles) on non-terminal deals
    const pendingTRs = await db
      .select({
        tr_id: transportRequestsTable.id,
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        status: dealsTable.status,
        ...listingExtraFields,
        updated_at: transportRequestsTable.updated_at,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
      })
      .from(transportRequestsTable)
      .innerJoin(dealsTable, eq(dealsTable.id, transportRequestsTable.deal_id))
      .leftJoin(wasteListingsTable, eq(wasteListingsTable.id, dealsTable.listing_id))
      .where(
        and(
          eq(transportRequestsTable.status, "pending"),
          notInArray(dealsTable.status, ["completed", "cancelled"]),
          or(
            eq(dealsTable.producer_company_id, company.id),
            eq(dealsTable.buyer_company_id, company.id),
          ),
        ),
      );

    // ── Build response ────────────────────────────────────────────────────────

    const actionMap: Record<string, string> = {
      payment_submitted: "confirm_payment",   // producer
      payment_confirmed: "confirm_dispatch",  // producer
      active:            "submit_payment",    // buyer
      dispatched:        "confirm_receipt",   // buyer
    };

    // IDs already shown from producer/buyer deal flow — avoid duplicating them in transport lists
    const dealFlowIds = new Set([
      ...producerDeals.map((d) => d.id),
      ...buyerDeals.map((d) => d.id),
    ]);

    const deals = [
      // Deal-flow actions
      ...producerDeals.map((d) => ({
        ...d,
        role: "producer" as const,
        action_needed: actionMap[d.status] ?? d.status,
        updated_at: d.updated_at.toISOString(),
      })),
      ...buyerDeals.map((d) => ({
        ...d,
        role: "buyer" as const,
        action_needed: actionMap[d.status] ?? d.status,
        updated_at: d.updated_at.toISOString(),
      })),

      // Buyer: choose transport (only if not already in deal flow)
      ...buyerChooseTransport
        .filter((d) => !dealFlowIds.has(d.id))
        .map((d) => ({
          ...d,
          role: "buyer" as const,
          action_needed: "choose_transport",
          updated_at: d.updated_at.toISOString(),
        })),

      // Pending transport requests (both roles)
      ...pendingTRs.map((tr) => {
        const role: "producer" | "buyer" =
          tr.producer_company_id === company.id ? "producer" : "buyer";
        return {
          id: tr.id,          // use deal id for linking
          listing_id: tr.listing_id,
          status: tr.status,
          material: tr.material,
          city: tr.city,
          quantity: tr.quantity,
          unit: tr.unit,
          material_subcategory_id: tr.material_subcategory_id,
          role,
          action_needed: `transport_pending_${role}` as const,
          updated_at: tr.updated_at.toISOString(),
        };
      }),
    ].sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    res.json({ deals });
  },
);

/**
 * GET /deals/:deal_id
 * Any party to the deal (producer or buyer) can view it.
 * Returns deal info with counterparty phone (role-aware).
 */
router.get(
  "/deals/:deal_id",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const dealId = assertUuid(req.params.deal_id, "deal_id");
    const { company } = req as AuthedCompanyRequest;

    const { deal, counterparty, listingExtra } = await fetchDealWithCounterparty(
      dealId,
      company.id,
    );

    res.json(serializeDeal(deal, counterparty, listingExtra ?? undefined));
  },
);

/**
 * POST /deals/:deal_id/submit-payment
 * Buyer submits the payment reference to notify the producer payment was sent.
 * Transitions: active → payment_submitted.
 * The producer will then confirm receipt via confirm-payment.
 */
router.post(
  "/deals/:deal_id/submit-payment",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const dealId = assertUuid(req.params.deal_id, "deal_id");
    const { company } = req as AuthedCompanyRequest;

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
    if (deal.buyer_company_id !== company.id) {
      throw new HttpError(403, "Forbidden", "Only the buyer can submit payment for this deal");
    }
    if (deal.status !== "active") {
      throw new HttpError(
        409,
        "InvalidState",
        "Deal must be in 'active' state. Current state: " + deal.status,
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(dealsTable)
      .set({
        status: "payment_submitted",
        payment_reference: payment_reference.trim(),
        payment_proof_url,
        payment_submitted_at: now,
        payment_submitted_by: company.id,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone, city: companiesTable.city, commercialRegistration: companiesTable.commercialRegistration, license_status: companiesTable.license_status })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.producer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.payment_submitted",
      entityType: "deal",
      entityId: dealId,
      actorRole: "buyer",
      statusBefore: "active",
      statusAfter: "payment_submitted",
    });
    void notifyDealStageChange({
      companyId: updated.producer_company_id,
      dealId,
      listingId: updated.listing_id,
      type: "deal_payment_submitted",
      title_ar: "المشتري أرسل مرجع الدفع",
      title_en: "Buyer Submitted Payment Reference",
      body_ar: "أرسل المشتري مرجع الحوالة البنكية. يرجى التحقق منه وتأكيد استلام الدفع",
      body_en: "The buyer submitted a bank transfer reference. Please verify and confirm payment receipt.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

/**
 * POST /deals/:deal_id/confirm-payment
 * Producer confirms they received payment from the buyer.
 * Requires status = 'payment_submitted' (buyer must call submit-payment first).
 * No payment_reference in body — already stored by the buyer at submit-payment.
 * NOTE: actual_quantity is entered at dispatch for by_weight deals.
 */
router.post(
  "/deals/:deal_id/confirm-payment",
  requireAuth,
  requireCompany(),
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
    if (deal.status !== "payment_submitted") {
      throw new HttpError(
        409,
        "InvalidState",
        "Deal must be in 'payment_submitted' state. Current state: " + deal.status,
      );
    }

    if (req.body?.actual_quantity !== undefined) {
      throw new HttpError(
        400,
        "ActualQuantityForbidden",
        "actual_quantity must not be sent at payment confirmation — enter it at dispatch after weighbridge reading",
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(dealsTable)
      .set({
        status: "payment_confirmed",
        payment_confirmed_at: now,
        payment_confirmed_by: company.id,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone, city: companiesTable.city, commercialRegistration: companiesTable.commercialRegistration, license_status: companiesTable.license_status })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.buyer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.payment_confirmed",
      entityType: "deal",
      entityId: dealId,
      actorRole: "producer",
      statusBefore: "payment_submitted",
      statusAfter: "payment_confirmed",
      details: { settlement_type: deal.settlement_type },
    });
    void notifyDealStageChange({
      companyId: updated.buyer_company_id,
      dealId,
      listingId: updated.listing_id,
      type: "deal_payment_confirmed",
      title_ar: "تم تأكيد الدفع",
      title_en: "Payment Confirmed",
      body_ar: "أكّد المنتج استلام الدفع، يرجى انتظار شحن البضاعة",
      body_en: "The producer confirmed payment receipt. Awaiting dispatch.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

/**
 * POST /deals/:deal_id/confirm-dispatch
 * Producer confirms goods have been dispatched.
 * Requires status = 'payment_confirmed'.
 * For by_weight deals: `actual_quantity` is required here (weighbridge at pickup).
 * Final amount is computed and stored at this point.
 */
router.post(
  "/deals/:deal_id/confirm-dispatch",
  requireAuth,
  requireCompany(),
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

    // Transport is optional — dispatch does not depend on transport request status.
    const now = new Date();
    const dispatchUpdate: Partial<typeof dealsTable.$inferInsert> = {
      status: "dispatched",
      dispatched_at: now,
      dispatched_by: company.id,
      updated_at: now,
    };

    // For by_weight deals, actual_quantity (weighbridge) is required at dispatch
    if (deal.settlement_type === "by_weight") {
      const rawQty = req.body?.actual_quantity;
      if (rawQty === undefined || rawQty === null) {
        throw new HttpError(
          422,
          "ActualQuantityRequired",
          "actual_quantity is required for by_weight deals at dispatch (weighbridge reading)",
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
      dispatchUpdate.actual_quantity = String(qty);
      dispatchUpdate.final_amount = String(Number(deal.price_per_unit) * qty);
    } else if (req.body?.actual_quantity !== undefined) {
      throw new HttpError(
        400,
        "ActualQuantityForbidden",
        "actual_quantity must not be sent for fixed-price deals",
      );
    }

    const [updated] = await db
      .update(dealsTable)
      .set(dispatchUpdate)
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone, city: companiesTable.city, commercialRegistration: companiesTable.commercialRegistration, license_status: companiesTable.license_status })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.buyer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.dispatched",
      entityType: "deal",
      entityId: dealId,
      actorRole: "producer",
      statusBefore: "payment_confirmed",
      statusAfter: "dispatched",
    });
    void notifyDealStageChange({
      companyId: updated.buyer_company_id,
      dealId,
      listingId: updated.listing_id,
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
 * Buyer confirms goods have been received.
 * Transitions: dispatched → receipt_pending.
 * The deal will auto-complete 48 hours after receipt_pending_since
 * unless a dispute is filed via the support system.
 */
router.post(
  "/deals/:deal_id/confirm-receipt",
  requireAuth,
  requireCompany(),
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
        status: "receipt_pending",
        received_at: now,
        received_by: company.id,
        receipt_pending_since: now,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone, city: companiesTable.city, commercialRegistration: companiesTable.commercialRegistration, license_status: companiesTable.license_status })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.producer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.receipt_confirmed",
      entityType: "deal",
      entityId: dealId,
      actorRole: "buyer",
      statusBefore: "dispatched",
      statusAfter: "receipt_pending",
    });
    void notifyDealStageChange({
      companyId: updated.producer_company_id,
      dealId,
      listingId: updated.listing_id,
      type: "deal_receipt_pending",
      title_ar: "المشتري أكّد استلام البضاعة",
      title_en: "Buyer Confirmed Receipt",
      body_ar: "أكّد المشتري استلام البضاعة. ستكتمل الصفقة تلقائياً خلال 48 ساعة ما لم يُرفع تقرير خلاف",
      body_en: "The buyer confirmed receipt. The deal will auto-complete in 48 hours unless a dispute is filed.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

/**
 * POST /deals/:deal_id/cancel
 * Producer cancels a deal before dispatch. Terminal — cannot be undone.
 * Allowed from: active, payment_confirmed.
 * Not allowed from: dispatched, completed, expired, cancelled.
 */
router.post(
  "/deals/:deal_id/cancel",
  requireAuth,
  requireCompany(),
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
      throw new HttpError(403, "Forbidden", "Only the producer can cancel this deal");
    }
    if (!["active", "payment_submitted", "payment_confirmed"].includes(deal.status)) {
      throw new HttpError(
        409,
        "InvalidState",
        `Deal cannot be cancelled from status '${deal.status}'. Cancellation is only allowed before dispatch.`,
      );
    }

    const now = new Date();

    const [updated] = await db
      .update(dealsTable)
      .set({
        status: "cancelled",
        cancelled_at: now,
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone, city: companiesTable.city, commercialRegistration: companiesTable.commercialRegistration, license_status: companiesTable.license_status })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.buyer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.cancelled",
      entityType: "deal",
      entityId: dealId,
      actorRole: "producer",
      statusBefore: deal.status,
      statusAfter: "cancelled",
      severity: "warn",
    });
    void notifyDealStageChange({
      companyId: updated.buyer_company_id,
      dealId,
      listingId: updated.listing_id,
      type: "deal_cancelled",
      title_ar: "تم إلغاء الصفقة",
      title_en: "Deal Cancelled",
      body_ar: "قام المنتج بإلغاء الصفقة. يمكنك رفع تقرير إذا كنت تعتقد أن هذا خطأ",
      body_en: "The producer has cancelled this deal. You may file an issue report if you believe this is an error.",
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

/**
 * POST /deals/:deal_id/extend
 * Producer extends the deal deadline by 7 calendar days.
 * Allowed once only, before dispatch (active or payment_confirmed).
 * After dispatch, extension is not permitted.
 */
router.post(
  "/deals/:deal_id/extend",
  requireAuth,
  requireCompany(),
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
      throw new HttpError(403, "Forbidden", "Only the producer can extend this deal");
    }
    if (!["active", "payment_submitted", "payment_confirmed"].includes(deal.status)) {
      throw new HttpError(
        409,
        "InvalidState",
        `Deal cannot be extended from status '${deal.status}'. Extension is only allowed before dispatch.`,
      );
    }
    if (deal.extension_count >= 1) {
      throw new HttpError(
        409,
        "ExtensionLimitReached",
        "This deal has already been extended once. No further extensions are allowed.",
      );
    }

    const now = new Date();
    const extendedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(dealsTable)
      .set({
        extended_until: extendedUntil,
        extension_count: 1,
        pre_expiry_notified: false, // reset so pre-expiry fires again relative to new deadline
        updated_at: now,
      })
      .where(eq(dealsTable.id, dealId))
      .returning();

    const [counterparty] = await db
      .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone, city: companiesTable.city, commercialRegistration: companiesTable.commercialRegistration, license_status: companiesTable.license_status })
      .from(companiesTable)
      .where(eq(companiesTable.id, updated.buyer_company_id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "deal.extended",
      entityType: "deal",
      entityId: dealId,
      actorRole: "producer",
      details: { extended_until: extendedUntil.toISOString(), from_status: deal.status },
    });
    void notifyDealStageChange({
      companyId: updated.buyer_company_id,
      dealId,
      listingId: updated.listing_id,
      type: "deal_extended",
      title_ar: "تم تمديد الصفقة",
      title_en: "Deal Extended",
      body_ar: `قام المنتج بتمديد الصفقة حتى ${extendedUntil.toLocaleDateString("ar-SA")}`,
      body_en: `The producer extended the deal deadline to ${extendedUntil.toLocaleDateString("en-US")}.`,
    });

    return res.json(serializeDeal(updated, counterparty!));
  },
);

export default router;

