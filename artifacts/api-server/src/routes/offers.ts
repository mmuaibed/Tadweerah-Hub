import { Router, type IRouter } from "express";
import { and, desc, eq, gt, inArray, max, ne, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  listingOffersTable,
  wasteListingsTable,
  listingRequiredServicesTable,
  capabilitiesTable,
  companyCapabilitiesTable,
  dealsTable,
} from "@workspace/db";
import {
  SubmitOfferBody,
  RejectOfferBody,
  AcceptOfferBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";
import { listingRef } from "../lib/listing-ref";
import { logAudit } from "../lib/audit";
import {
  notifyOfferReceived,
  notifyOutbid,
  notifyOfferAccepted,
  notifyOfferRejected,
} from "../lib/notify";

const router: IRouter = Router();

type OfferRow = {
  id: string;
  waste_listing_id: string;
  buyer_company_id: string;
  buyer_company_name: string;
  price_per_unit: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  rejection_reason: string | null;
  acceptance_reason: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  rank?: number;
  total_offers?: number;
  /** True when buyer's offer was already the highest before they submitted an improvement. */
  already_top?: boolean;
};

function serializeOffer(row: OfferRow) {
  return {
    id: row.id,
    waste_listing_id: row.waste_listing_id,
    buyer_company_id: row.buyer_company_id,
    buyer_company_name: row.buyer_company_name,
    price_per_unit: Number(row.price_per_unit),
    message: row.message ?? undefined,
    status: row.status,
    rejection_reason: row.rejection_reason ?? undefined,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    resolved_at: row.resolved_at?.toISOString() ?? undefined,
    rank: row.rank,
    total_offers: row.total_offers,
    already_top: row.already_top,
  };
}

/** Resolve buyer company name for a single offer row from DB. */
const offerSelect = {
  id: listingOffersTable.id,
  waste_listing_id: listingOffersTable.waste_listing_id,
  buyer_company_id: listingOffersTable.buyer_company_id,
  buyer_company_name: companiesTable.name,
  price_per_unit: listingOffersTable.price_per_unit,
  message: listingOffersTable.message,
  status: listingOffersTable.status,
  rejection_reason: listingOffersTable.rejection_reason,
  acceptance_reason: listingOffersTable.acceptance_reason,
  created_at: listingOffersTable.created_at,
  updated_at: listingOffersTable.updated_at,
  resolved_at: listingOffersTable.resolved_at,
} as const;

/**
 * GET /offers/mine
 * M2: Returns all offers submitted by the current buyer, enriched with listing context.
 * Ordered: pending first, then by updated_at DESC.
 * Optional ?status=pending|accepted|rejected filter.
 */
router.get(
  "/offers/mine",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const ALLOWED_STATUSES = ["pending", "accepted", "rejected", "withdrawn"] as const;
    type AllowedStatus = (typeof ALLOWED_STATUSES)[number];
    const statusFilter =
      typeof req.query.status === "string" &&
      ALLOWED_STATUSES.includes(req.query.status as AllowedStatus)
        ? (req.query.status as AllowedStatus)
        : undefined;

    const conditions = [eq(listingOffersTable.buyer_company_id, company.id)];
    if (statusFilter) {
      conditions.push(eq(listingOffersTable.status, statusFilter));
    } else {
      // By default, hide withdrawn offers — they are not actionable
      conditions.push(ne(listingOffersTable.status, "withdrawn"));
    }

    const rows = await db
      .select({
        offer_id: listingOffersTable.id,
        waste_listing_id: listingOffersTable.waste_listing_id,
        price_per_unit: listingOffersTable.price_per_unit,
        message: listingOffersTable.message,
        offer_status: listingOffersTable.status,
        rejection_reason: listingOffersTable.rejection_reason,
        offer_created_at: listingOffersTable.created_at,
        offer_updated_at: listingOffersTable.updated_at,
        offer_resolved_at: listingOffersTable.resolved_at,
        listing_material: wasteListingsTable.material,
        listing_quantity: wasteListingsTable.quantity,
        listing_unit: wasteListingsTable.unit,
        listing_city: wasteListingsTable.city,
        listing_status: wasteListingsTable.status,
        listing_closed_at: wasteListingsTable.closed_at,
        listing_company_name: companiesTable.name,
        deal_status: dealsTable.status,
        deal_id: dealsTable.id,
      })
      .from(listingOffersTable)
      .innerJoin(
        wasteListingsTable,
        eq(wasteListingsTable.id, listingOffersTable.waste_listing_id),
      )
      .innerJoin(
        companiesTable,
        eq(companiesTable.id, wasteListingsTable.company_id),
      )
      .leftJoin(
        dealsTable,
        eq(dealsTable.offer_id, listingOffersTable.id),
      )
      .where(and(...conditions))
      .orderBy(
        // Pending first, then by most recent activity
        sql`CASE WHEN ${listingOffersTable.status} = 'pending' THEN 0 ELSE 1 END ASC`,
        desc(listingOffersTable.updated_at),
      );

    // For each offer, compute rank + total_offers + listing_accepted_total
    const results = await Promise.all(
      rows.map(async (row) => {
        const listingId = row.waste_listing_id;
        const ppu = Number(row.price_per_unit);
        const qty = Number(row.listing_quantity);

        // Rank: count of offers with higher price on this listing + 1
        const [rankRow] = await db
          .select({
            above: sql<number>`cast(count(*) as int)`,
            total: sql<number>`cast(count(*) over () as int)`,
          })
          .from(listingOffersTable)
          .where(eq(listingOffersTable.waste_listing_id, listingId));

        const [rankData] = await db
          .select({
            above: sql<number>`cast(count(*) as int)`.as("above"),
          })
          .from(listingOffersTable)
          .where(
            and(
              eq(listingOffersTable.waste_listing_id, listingId),
              gt(listingOffersTable.price_per_unit, String(ppu)),
            ),
          );

        const [totalData] = await db
          .select({ total: sql<number>`cast(count(*) as int)`.as("total") })
          .from(listingOffersTable)
          .where(eq(listingOffersTable.waste_listing_id, listingId));

        const rank = (rankData?.above ?? 0) + 1;
        const total_offers = totalData?.total ?? 1;

        // For rejected buyers when listing is closed, find the accepted offer total
        let listing_accepted_total: number | undefined;
        if (row.offer_status === "rejected" && row.listing_status === "closed") {
          const [accepted] = await db
            .select({ price_per_unit: listingOffersTable.price_per_unit })
            .from(listingOffersTable)
            .where(
              and(
                eq(listingOffersTable.waste_listing_id, listingId),
                eq(listingOffersTable.status, "accepted"),
              ),
            )
            .limit(1);
          if (accepted) {
            listing_accepted_total = Number(accepted.price_per_unit) * qty;
          }
        }

        return {
          id: row.offer_id,
          waste_listing_id: listingId,
          listing_ref: listingRef(listingId),
          listing_material: row.listing_material,
          listing_quantity: qty,
          listing_unit: row.listing_unit,
          listing_city: row.listing_city,
          listing_status: row.listing_status,
          listing_company_name: row.listing_company_name,
          listing_closed_at: row.listing_closed_at?.toISOString() ?? undefined,
          price_per_unit: ppu,
          message: row.message ?? undefined,
          status: row.offer_status,
          rejection_reason: row.rejection_reason ?? undefined,
          rank: row.offer_status === "pending" ? rank : undefined,
          total_offers: row.offer_status === "pending" ? total_offers : undefined,
          listing_accepted_total,
          created_at: row.offer_created_at.toISOString(),
          updated_at: row.offer_updated_at.toISOString(),
          resolved_at: row.offer_resolved_at?.toISOString() ?? undefined,
          deal_id: row.deal_id ?? undefined,
          deal_status: row.deal_status ?? undefined,
        };
      }),
    );

    res.json(results);
  },
);

/**
 * GET /listings/:waste_listing_id/offers/summary
 * Returns offer count + current highest price (anonymous — no identities).
 * Any authenticated company user can access.
 */
router.get(
  "/listings/:waste_listing_id/offers/summary",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const listingId = assertUuid(
      req.params.waste_listing_id,
      "waste_listing_id",
    );

    const [row] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
        highest_price: max(listingOffersTable.price_per_unit),
      })
      .from(listingOffersTable)
      .where(eq(listingOffersTable.waste_listing_id, listingId));

    res.json({
      count: row?.count ?? 0,
      highest_price:
        row?.highest_price != null ? Number(row.highest_price) : null,
    });
  },
);

/**
 * GET /listings/:waste_listing_id/offers
 * Producer (owner) sees all offers with buyer company names.
 * Buyer sees only their own offer (with rank + total_offers).
 * Carrier / other roles → 403.
 */
router.get(
  "/listings/:waste_listing_id/offers",
  requireAuth,
  requireCompany(["producer", "buyer"]),
  async (req, res) => {
    const listingId = assertUuid(
      req.params.waste_listing_id,
      "waste_listing_id",
    );
    const { company } = req as AuthedCompanyRequest;

    if (company.type === "producer") {
      const listing = await db
        .select({ company_id: wasteListingsTable.company_id })
        .from(wasteListingsTable)
        .where(eq(wasteListingsTable.id, listingId))
        .limit(1);

      if (!listing[0]) {
        throw new HttpError(404, "NotFound", "Listing not found");
      }
      if (listing[0].company_id !== company.id) {
        throw new HttpError(
          403,
          "Forbidden",
          "Only the listing owner can view all offers",
        );
      }

      const rows = await db
        .select(offerSelect)
        .from(listingOffersTable)
        .innerJoin(
          companiesTable,
          eq(companiesTable.id, listingOffersTable.buyer_company_id),
        )
        .where(eq(listingOffersTable.waste_listing_id, listingId))
        .orderBy(sql`${listingOffersTable.price_per_unit} DESC`);

      return res.json(rows.map(serializeOffer));
    }

    // Buyer: return only their own offer, with rank + total_offers
    const rows = await db
      .select(offerSelect)
      .from(listingOffersTable)
      .innerJoin(
        companiesTable,
        eq(companiesTable.id, listingOffersTable.buyer_company_id),
      )
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          eq(listingOffersTable.buyer_company_id, company.id),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return res.json([]);
    }

    const myOffer = rows[0];
    const myPpu = Number(myOffer.price_per_unit);

    // F6: Compute rank (offers with higher price + 1) and total
    const [rankData] = await db
      .select({ above: sql<number>`cast(count(*) as int)`.as("above") })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          gt(listingOffersTable.price_per_unit, String(myPpu)),
        ),
      );

    const [totalData] = await db
      .select({ total: sql<number>`cast(count(*) as int)`.as("total") })
      .from(listingOffersTable)
      .where(eq(listingOffersTable.waste_listing_id, listingId));

    const rank = (rankData?.above ?? 0) + 1;
    const total_offers = totalData?.total ?? 1;

    return res.json([
      serializeOffer({ ...myOffer, rank, total_offers }),
    ]);
  },
);

/**
 * POST /listings/:waste_listing_id/offers
 * Buyer submits their first offer on an open listing.
 * Price must be > current highest offer (or any positive number if no offers yet).
 */
router.post(
  "/listings/:waste_listing_id/offers",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const listingId = assertUuid(
      req.params.waste_listing_id,
      "waste_listing_id",
    );
    const { company } = req as AuthedCompanyRequest;

    const parsed = SubmitOfferBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "ValidationError",
        "Invalid offer data",
        parsed.error.issues,
      );
    }
    const { price_per_unit, message } = parsed.data;

    const [listing] = await db
      .select({
        id: wasteListingsTable.id,
        company_id: wasteListingsTable.company_id,
        status: wasteListingsTable.status,
        quantity: wasteListingsTable.quantity,
      })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, listingId))
      .limit(1);

    if (!listing) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }
    if (listing.status !== "open") {
      throw new HttpError(
        409,
        "ListingClosed",
        "This listing is no longer accepting offers",
      );
    }
    if (listing.company_id === company.id) {
      throw new HttpError(
        403,
        "Forbidden",
        "You cannot submit an offer on your own listing",
      );
    }

    // ── Item 4: Required services gate ────────────────────────────────────────
    // Fetch any capability requirements on this listing
    const requiredSvcs = await db
      .select({
        capability_id: listingRequiredServicesTable.capability_id,
        key: capabilitiesTable.key,
        name_en: capabilitiesTable.name_en,
        name_ar: capabilitiesTable.name_ar,
        requires_license: capabilitiesTable.requires_license,
      })
      .from(listingRequiredServicesTable)
      .innerJoin(
        capabilitiesTable,
        eq(capabilitiesTable.id, listingRequiredServicesTable.capability_id),
      )
      .where(eq(listingRequiredServicesTable.listing_id, listingId));

    if (requiredSvcs.length > 0) {
      // Fetch buyer's declared capabilities
      const buyerCaps = await db
        .select({ capability_id: companyCapabilitiesTable.capability_id })
        .from(companyCapabilitiesTable)
        .where(eq(companyCapabilitiesTable.company_id, company.id));

      const buyerCapIds = new Set(buyerCaps.map((c) => c.capability_id));

      for (const svc of requiredSvcs) {
        if (!buyerCapIds.has(svc.capability_id)) {
          throw new HttpError(
            403,
            "MissingCapability",
            `Your company does not have the required service: ${svc.name_en} (${svc.key})`,
          );
        }
        // If this capability requires a license, buyer must be licensed
        if (svc.requires_license && company.license_status !== "approved") {
          throw new HttpError(
            403,
            "LicenseRequired",
            `The required service '${svc.name_en}' requires an approved recycling license. Your current license status: ${company.license_status ?? "not submitted"}.`,
          );
        }
      }
    }
    // ── End required services gate ────────────────────────────────────────────

    // Check for duplicate
    const [existing] = await db
      .select({ id: listingOffersTable.id, status: listingOffersTable.status })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          eq(listingOffersTable.buyer_company_id, company.id),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === "rejected") {
        throw new HttpError(
          409,
          "OfferRejected",
          "Your previous offer was rejected. You cannot re-submit an offer on this listing.",
        );
      }
      if (existing.status !== "withdrawn") {
        // pending or accepted — cannot submit a new one
        throw new HttpError(
          409,
          "OfferExists",
          "You already have an offer on this listing. Use the improve offer endpoint.",
        );
      }
      // Buyer previously withdrew — allow re-submission by updating the withdrawn row.
      // This preserves the unique constraint on (waste_listing_id, buyer_company_id).
    }

    // Price must exceed current highest non-withdrawn offer
    const [summary] = await db
      .select({ highest: max(listingOffersTable.price_per_unit) })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          ne(listingOffersTable.status, "withdrawn"),
        ),
      );

    const currentMax = summary?.highest != null ? Number(summary.highest) : 0;
    if (price_per_unit <= currentMax) {
      throw new HttpError(
        400,
        "PriceTooLow",
        `Your offer must be higher than the current highest offer (${currentMax})`,
      );
    }

    // Capture previous top bidder (to notify outbid) before saving new offer
    let prevTopBidderId: string | null = null;
    if (currentMax > 0) {
      const [topOffer] = await db
        .select({ buyer_company_id: listingOffersTable.buyer_company_id })
        .from(listingOffersTable)
        .where(
          and(
            eq(listingOffersTable.waste_listing_id, listingId),
            eq(listingOffersTable.price_per_unit, String(currentMax)),
            ne(listingOffersTable.status, "withdrawn"),
          ),
        )
        .limit(1);
      if (topOffer && topOffer.buyer_company_id !== company.id) {
        prevTopBidderId = topOffer.buyer_company_id;
      }
    }

    let offerResult;
    if (existing?.status === "withdrawn") {
      // Re-activate the withdrawn offer row
      const [updated] = await db
        .update(listingOffersTable)
        .set({
          price_per_unit: String(price_per_unit),
          message: message ?? null,
          status: "pending",
          resolved_at: null,
          updated_at: new Date(),
        })
        .where(eq(listingOffersTable.id, existing.id))
        .returning();
      offerResult = updated;
    } else {
      const [inserted] = await db
        .insert(listingOffersTable)
        .values({
          waste_listing_id: listingId,
          buyer_company_id: company.id,
          price_per_unit: String(price_per_unit),
          message: message ?? null,
        })
        .returning();
      offerResult = inserted;
    }

    // Fire-and-forget: audit + notifications
    const listingLabel = listingRef(listingId);
    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "offer.submitted",
      entityType: "offer",
      entityId: offerResult.id,
      details: { listing_id: listingId, price_per_unit },
    });
    void notifyOfferReceived({
      producerCompanyId: listing.company_id,
      listingId,
      listingRef: listingLabel,
      buyerName: company.name,
    });
    if (prevTopBidderId) {
      void notifyOutbid({
        buyerCompanyId: prevTopBidderId,
        listingId,
        listingRef: listingLabel,
      });
    }

    res.status(201).json(
      serializeOffer({ ...offerResult, buyer_company_name: company.name }),
    );
  },
);

/**
 * PUT /listings/:waste_listing_id/offers/mine
 * Buyer improves their existing pending offer.
 * New price must exceed:
 *   a) their current offer
 *   b) the current highest offer on the listing (which covers (a) as well)
 */
router.put(
  "/listings/:waste_listing_id/offers/mine",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const listingId = assertUuid(
      req.params.waste_listing_id,
      "waste_listing_id",
    );
    const { company } = req as AuthedCompanyRequest;

    const parsed = SubmitOfferBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "ValidationError",
        "Invalid offer data",
        parsed.error.issues,
      );
    }
    const { price_per_unit, message } = parsed.data;

    const [listing] = await db
      .select({ status: wasteListingsTable.status })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, listingId))
      .limit(1);

    if (!listing) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }
    if (listing.status !== "open") {
      throw new HttpError(
        409,
        "ListingClosed",
        "This listing is no longer accepting offers",
      );
    }

    const [myOffer] = await db
      .select()
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          eq(listingOffersTable.buyer_company_id, company.id),
        ),
      )
      .limit(1);

    if (!myOffer) {
      throw new HttpError(
        404,
        "NotFound",
        "No existing offer found. Submit a new offer first.",
      );
    }
    if (myOffer.status === "rejected") {
      throw new HttpError(
        409,
        "OfferRejected",
        "Your previous offer was rejected. You cannot re-submit an offer on this listing.",
      );
    }
    if (myOffer.status !== "pending") {
      throw new HttpError(
        409,
        "InvalidState",
        "Only pending offers can be improved",
      );
    }

    // New price must exceed the current highest offer on the listing
    const [summary] = await db
      .select({ highest: max(listingOffersTable.price_per_unit) })
      .from(listingOffersTable)
      .where(eq(listingOffersTable.waste_listing_id, listingId));

    const currentMax = summary?.highest != null ? Number(summary.highest) : 0;
    if (price_per_unit <= currentMax) {
      throw new HttpError(
        400,
        "PriceTooLow",
        `Your improved offer must exceed the current highest offer (${currentMax})`,
      );
    }

    // Detect whether the buyer was already the top bidder before this improvement
    const already_top = Number(myOffer.price_per_unit) >= currentMax;

    // Capture outbid buyer before saving (only if buyer was NOT already top)
    let outbidBuyerId: string | null = null;
    if (!already_top) {
      const [topOffer] = await db
        .select({ buyer_company_id: listingOffersTable.buyer_company_id })
        .from(listingOffersTable)
        .where(
          and(
            eq(listingOffersTable.waste_listing_id, listingId),
            eq(listingOffersTable.price_per_unit, String(currentMax)),
            ne(listingOffersTable.status, "withdrawn"),
          ),
        )
        .limit(1);
      if (topOffer && topOffer.buyer_company_id !== company.id) {
        outbidBuyerId = topOffer.buyer_company_id;
      }
    }

    const [updated] = await db
      .update(listingOffersTable)
      .set({
        price_per_unit: String(price_per_unit),
        message: message !== undefined ? (message ?? null) : myOffer.message,
        updated_at: new Date(),
      })
      .where(eq(listingOffersTable.id, myOffer.id))
      .returning();

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "offer.improved",
      entityType: "offer",
      entityId: myOffer.id,
      details: { listing_id: listingId, old_price: Number(myOffer.price_per_unit), new_price: price_per_unit },
    });
    if (outbidBuyerId) {
      void notifyOutbid({
        buyerCompanyId: outbidBuyerId,
        listingId,
        listingRef: listingRef(listingId),
      });
    }

    res.json(serializeOffer({ ...updated, buyer_company_name: company.name, already_top }));
  },
);

/**
 * DELETE /listings/:waste_listing_id/offers/mine
 * Batch 2 Item 2: Buyer withdraws their own pending offer.
 * Only pending offers can be withdrawn. Withdrawn offers:
 *  - Are excluded from offer_count and highest_offer calculations.
 *  - Are excluded from ranking on the listing card.
 *  - Cannot be re-submitted if the listing is still open (buyer must submit a new offer).
 */
router.delete(
  "/listings/:waste_listing_id/offers/mine",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const listingId = assertUuid(
      req.params.waste_listing_id,
      "waste_listing_id",
    );
    const { company } = req as AuthedCompanyRequest;

    // Check if any offer exists at all first (for meaningful error messages)
    const [anyOffer] = await db
      .select({ id: listingOffersTable.id, status: listingOffersTable.status })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          eq(listingOffersTable.buyer_company_id, company.id),
        ),
      )
      .limit(1);

    if (!anyOffer) {
      throw new HttpError(404, "NotFound", "No offer found to withdraw");
    }
    if (anyOffer.status !== "pending") {
      throw new HttpError(
        409,
        "CannotWithdraw",
        `Cannot withdraw an offer with status '${anyOffer.status}'. Only pending offers can be withdrawn.`,
      );
    }

    const now = new Date();
    await db
      .update(listingOffersTable)
      .set({ status: "withdrawn", updated_at: now, resolved_at: now })
      .where(eq(listingOffersTable.id, anyOffer.id));

    const [result] = await db
      .select(offerSelect)
      .from(listingOffersTable)
      .innerJoin(
        companiesTable,
        eq(companiesTable.id, listingOffersTable.buyer_company_id),
      )
      .where(eq(listingOffersTable.id, anyOffer.id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "offer.withdrawn",
      entityType: "offer",
      entityId: anyOffer.id,
      details: { listing_id: listingId },
    });

    res.json(serializeOffer(result));
  },
);

/**
 * POST /offers/:offer_id/accept
 * Atomically:
 *  1. Lock the listing row (SELECT FOR UPDATE)
 *  2. Verify listing is open + offer is pending
 *  3. F4: If accepting an offer lower than current highest pending, require acceptance_reason
 *  4. Accept the offer
 *  5. Reject all other pending offers (with rejection_reason = 'offer_accepted')
 *  6. Close the listing
 */
router.post(
  "/offers/:offer_id/accept",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const offerId = assertUuid(req.params.offer_id, "offer_id");
    const { company } = req as AuthedCompanyRequest;

    // Parse optional body
    const bodyParsed = AcceptOfferBody.safeParse(req.body ?? {});
    const acceptance_reason = bodyParsed.success
      ? (bodyParsed.data.acceptance_reason ?? null)
      : null;

    const [offer] = await db
      .select()
      .from(listingOffersTable)
      .where(eq(listingOffersTable.id, offerId))
      .limit(1);

    if (!offer) {
      throw new HttpError(404, "NotFound", "Offer not found");
    }
    if (offer.status !== "pending") {
      throw new HttpError(
        409,
        "InvalidState",
        "Only pending offers can be accepted",
      );
    }

    await db.transaction(async (tx) => {
      // Lock the listing row to prevent concurrent accepts
      const [listing] = await tx
        .select()
        .from(wasteListingsTable)
        .where(eq(wasteListingsTable.id, offer.waste_listing_id))
        .for("update");

      if (!listing) {
        throw new HttpError(404, "NotFound", "Listing not found");
      }
      if (listing.company_id !== company.id) {
        throw new HttpError(
          403,
          "Forbidden",
          "Only the listing owner can accept offers",
        );
      }
      if (listing.status !== "open") {
        throw new HttpError(
          409,
          "ListingClosed",
          "This listing has already been closed",
        );
      }

      // F4: Check if accepting a lower offer than the current highest other pending offer
      const [highestOther] = await tx
        .select({ max_price: max(listingOffersTable.price_per_unit) })
        .from(listingOffersTable)
        .where(
          and(
            eq(listingOffersTable.waste_listing_id, offer.waste_listing_id),
            ne(listingOffersTable.id, offerId),
            eq(listingOffersTable.status, "pending"),
          ),
        );

      const otherMax =
        highestOther?.max_price != null ? Number(highestOther.max_price) : null;
      const isLowerThanHighest =
        otherMax !== null && Number(offer.price_per_unit) < otherMax;

      if (isLowerThanHighest && !acceptance_reason?.trim()) {
        throw new HttpError(
          400,
          "AcceptanceReasonRequired",
          "You are accepting an offer lower than the current highest offer. A reason is required.",
        );
      }

      const now = new Date();

      // 1. Accept this offer
      await tx
        .update(listingOffersTable)
        .set({
          status: "accepted",
          resolved_at: now,
          updated_at: now,
          acceptance_reason: acceptance_reason?.trim() ?? null,
        })
        .where(eq(listingOffersTable.id, offerId));

      // 2. Reject all other pending offers on this listing
      await tx
        .update(listingOffersTable)
        .set({
          status: "rejected",
          resolved_at: now,
          updated_at: now,
          rejection_reason: "offer_accepted",
        })
        .where(
          and(
            eq(listingOffersTable.waste_listing_id, offer.waste_listing_id),
            ne(listingOffersTable.id, offerId),
            eq(listingOffersTable.status, "pending"),
          ),
        );

      // 3. Close the listing
      await tx
        .update(wasteListingsTable)
        .set({ status: "closed", closed_at: now })
        .where(eq(wasteListingsTable.id, offer.waste_listing_id));

      // 4. Auto-create deal record (M5-Pre)
      const settlementType = listing.pricing_model;
      const estimatedAmount =
        Number(offer.price_per_unit) * Number(listing.quantity);
      const finalAmountAtCreation =
        settlementType === "fixed" ? String(estimatedAmount) : null;

      await tx.insert(dealsTable).values({
        offer_id: offerId,
        listing_id: offer.waste_listing_id,
        producer_company_id: listing.company_id,
        buyer_company_id: offer.buyer_company_id,
        settlement_type: settlementType,
        price_per_unit: offer.price_per_unit,
        estimated_amount: String(estimatedAmount),
        final_amount: finalAmountAtCreation,
      });
    });

    // Re-fetch with company name for response
    const [result] = await db
      .select(offerSelect)
      .from(listingOffersTable)
      .innerJoin(
        companiesTable,
        eq(companiesTable.id, listingOffersTable.buyer_company_id),
      )
      .where(eq(listingOffersTable.id, offerId))
      .limit(1);

    // Fetch rejected buyers (auto-rejected by this accept) and notify them
    const rejectedOffers = await db
      .select({ buyer_company_id: listingOffersTable.buyer_company_id })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, offer.waste_listing_id),
          ne(listingOffersTable.id, offerId),
          eq(listingOffersTable.rejection_reason, "offer_accepted"),
        ),
      );

    const labelAccept = listingRef(offer.waste_listing_id);
    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "offer.accepted",
      entityType: "offer",
      entityId: offerId,
      details: { listing_id: offer.waste_listing_id, buyer_company_id: offer.buyer_company_id },
    });
    void notifyOfferAccepted({
      buyerCompanyId: offer.buyer_company_id,
      listingId: offer.waste_listing_id,
      listingRef: labelAccept,
    });
    for (const rejected of rejectedOffers) {
      void notifyOfferRejected({
        buyerCompanyId: rejected.buyer_company_id,
        listingId: offer.waste_listing_id,
        listingRef: labelAccept,
        reason: "Another offer was selected",
      });
    }

    res.json(serializeOffer(result));
  },
);

/**
 * POST /offers/:offer_id/reject
 * F3: Producer rejects a single pending offer on their listing.
 * rejection_reason is REQUIRED.
 */
router.post(
  "/offers/:offer_id/reject",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const offerId = assertUuid(req.params.offer_id, "offer_id");
    const { company } = req as AuthedCompanyRequest;

    const parsed = RejectOfferBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "ValidationError",
        "rejection_reason is required",
        parsed.error.issues,
      );
    }
    const { rejection_reason, rejection_reason_detail } = parsed.data;

    const [offer] = await db
      .select()
      .from(listingOffersTable)
      .where(eq(listingOffersTable.id, offerId))
      .limit(1);

    if (!offer) {
      throw new HttpError(404, "NotFound", "Offer not found");
    }
    if (offer.status !== "pending") {
      throw new HttpError(
        409,
        "InvalidState",
        "Only pending offers can be rejected",
      );
    }

    const [listing] = await db
      .select({ company_id: wasteListingsTable.company_id })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, offer.waste_listing_id))
      .limit(1);

    if (!listing) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }
    if (listing.company_id !== company.id) {
      throw new HttpError(
        403,
        "Forbidden",
        "Only the listing owner can reject offers",
      );
    }

    // Build full reason string: if detail provided (for "other"), combine them
    const fullReason = rejection_reason_detail?.trim()
      ? `${rejection_reason}: ${rejection_reason_detail.trim()}`
      : rejection_reason;

    const now = new Date();
    await db
      .update(listingOffersTable)
      .set({
        status: "rejected",
        resolved_at: now,
        updated_at: now,
        rejection_reason: fullReason,
      })
      .where(eq(listingOffersTable.id, offerId));

    const [result] = await db
      .select(offerSelect)
      .from(listingOffersTable)
      .innerJoin(
        companiesTable,
        eq(companiesTable.id, listingOffersTable.buyer_company_id),
      )
      .where(eq(listingOffersTable.id, offerId))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "offer.rejected",
      entityType: "offer",
      entityId: offerId,
      details: { listing_id: offer.waste_listing_id, reason: fullReason },
    });
    void notifyOfferRejected({
      buyerCompanyId: offer.buyer_company_id,
      listingId: offer.waste_listing_id,
      listingRef: listingRef(offer.waste_listing_id),
      reason: fullReason,
    });

    res.json(serializeOffer(result));
  },
);

export default router;
