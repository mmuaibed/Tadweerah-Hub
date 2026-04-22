import { Router, type IRouter } from "express";
import { and, eq, max, ne, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  listingOffersTable,
  wasteListingsTable,
} from "@workspace/db";
import { SubmitOfferBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";

const router: IRouter = Router();

type OfferRow = {
  id: string;
  waste_listing_id: string;
  buyer_company_id: string;
  buyer_company_name: string;
  price_per_unit: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
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
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    resolved_at: row.resolved_at?.toISOString() ?? undefined,
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
  created_at: listingOffersTable.created_at,
  updated_at: listingOffersTable.updated_at,
  resolved_at: listingOffersTable.resolved_at,
} as const;

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
 * Buyer sees only their own offer.
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

    // Buyer: return only their own offer
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

    return res.json(rows.map(serializeOffer));
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

    // Check for duplicate
    const [existing] = await db
      .select({ id: listingOffersTable.id })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, listingId),
          eq(listingOffersTable.buyer_company_id, company.id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new HttpError(
        409,
        "OfferExists",
        "You already have an offer on this listing. Use the improve offer endpoint.",
      );
    }

    // Price must exceed current highest offer
    const [summary] = await db
      .select({ highest: max(listingOffersTable.price_per_unit) })
      .from(listingOffersTable)
      .where(eq(listingOffersTable.waste_listing_id, listingId));

    const currentMax = summary?.highest != null ? Number(summary.highest) : 0;
    if (price_per_unit <= currentMax) {
      throw new HttpError(
        400,
        "PriceTooLow",
        `Your offer must be higher than the current highest offer (${currentMax})`,
      );
    }

    const [inserted] = await db
      .insert(listingOffersTable)
      .values({
        waste_listing_id: listingId,
        buyer_company_id: company.id,
        price_per_unit: String(price_per_unit),
        message: message ?? null,
      })
      .returning();

    res.status(201).json(
      serializeOffer({ ...inserted, buyer_company_name: company.name }),
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
    if (myOffer.status !== "pending") {
      throw new HttpError(
        409,
        "InvalidState",
        "Only pending offers can be improved",
      );
    }

    // New price must exceed the current highest offer on the listing
    // This implicitly covers "must exceed own price" since own price ≤ max
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

    const [updated] = await db
      .update(listingOffersTable)
      .set({
        price_per_unit: String(price_per_unit),
        message: message !== undefined ? (message ?? null) : myOffer.message,
        updated_at: new Date(),
      })
      .where(eq(listingOffersTable.id, myOffer.id))
      .returning();

    res.json(serializeOffer({ ...updated, buyer_company_name: company.name }));
  },
);

/**
 * POST /offers/:offer_id/accept
 * Atomically:
 *  1. Lock the listing row (SELECT FOR UPDATE)
 *  2. Verify listing is open + offer is pending
 *  3. Accept the offer
 *  4. Reject all other offers on the same listing
 *  5. Close the listing
 */
router.post(
  "/offers/:offer_id/accept",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const offerId = assertUuid(req.params.offer_id, "offer_id");
    const { company } = req as AuthedCompanyRequest;

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

      const now = new Date();

      // 1. Accept this offer
      await tx
        .update(listingOffersTable)
        .set({ status: "accepted", resolved_at: now, updated_at: now })
        .where(eq(listingOffersTable.id, offerId));

      // 2. Reject all other pending offers on this listing
      await tx
        .update(listingOffersTable)
        .set({ status: "rejected", resolved_at: now, updated_at: now })
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

    res.json(serializeOffer(result));
  },
);

/**
 * POST /offers/:offer_id/reject
 * Producer rejects a single pending offer on their listing.
 */
router.post(
  "/offers/:offer_id/reject",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const offerId = assertUuid(req.params.offer_id, "offer_id");
    const { company } = req as AuthedCompanyRequest;

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

    const now = new Date();
    await db
      .update(listingOffersTable)
      .set({ status: "rejected", resolved_at: now, updated_at: now })
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

    res.json(serializeOffer(result));
  },
);

export default router;
