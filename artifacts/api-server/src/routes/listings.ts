import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  db,
  companiesTable,
  wasteListingsTable,
  listingOffersTable,
  dealsTable,
  type WasteListing,
} from "@workspace/db";
import { CreateWasteListingBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import {
  HttpError,
  assertEnum,
  assertUuid,
} from "../middlewares/errorHandler";

// Multer storage — saves to <project-root>/public/uploads/
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const ALLOWED_MATERIALS = [
  "paper",
  "plastic",
  "metal",
  "glass",
  "electronics",
  "organic",
  "other",
] as const;

const ALLOWED_STATUSES = ["open", "closed"] as const;

const router: IRouter = Router();

type Row = WasteListing & {
  company_name: string;
  offer_count?: number;
  highest_offer_total?: number | null;
  deal_status?: string | null;
};

function serialize(row: Row) {
  return {
    id: row.id,
    company_id: row.company_id,
    company_name: row.company_name,
    material: row.material,
    quantity: Number(row.quantity),
    unit: row.unit,
    city: row.city,
    description: row.description ?? undefined,
    price_hint: row.price_hint != null ? Number(row.price_hint) : undefined,
    status: row.status,
    pricing_model: row.pricing_model,
    visibility: row.visibility,
    image_url: row.image_url ?? undefined,
    created_at: row.created_at.toISOString(),
    closed_at: row.closed_at?.toISOString() ?? undefined,
    offer_count: row.offer_count ?? undefined,
    highest_offer_total:
      row.highest_offer_total != null ? Number(row.highest_offer_total) : undefined,
    deal_status: row.deal_status ?? undefined,
  };
}

const baseSelect = {
  id: wasteListingsTable.id,
  company_id: wasteListingsTable.company_id,
  material: wasteListingsTable.material,
  quantity: wasteListingsTable.quantity,
  unit: wasteListingsTable.unit,
  city: wasteListingsTable.city,
  description: wasteListingsTable.description,
  price_hint: wasteListingsTable.price_hint,
  status: wasteListingsTable.status,
  pricing_model: wasteListingsTable.pricing_model,
  visibility: wasteListingsTable.visibility,
  image_url: wasteListingsTable.image_url,
  created_at: wasteListingsTable.created_at,
  closed_at: wasteListingsTable.closed_at,
  company_name: companiesTable.name,
} as const;

/** Aggregate subquery: offer_count and highest_offer_total per listing */
const offerAgg = db
  .select({
    waste_listing_id: listingOffersTable.waste_listing_id,
    offer_count: sql<number>`cast(count(*) as int)`.as("offer_count"),
    max_price_per_unit:
      sql<string>`max(${listingOffersTable.price_per_unit})`.as("max_price_per_unit"),
  })
  .from(listingOffersTable)
  .groupBy(listingOffersTable.waste_listing_id)
  .as("offer_agg");

/**
 * GET /listings — public marketplace (buyers only).
 * Producers and carriers should not browse the buyer marketplace.
 * F10: city filter is case-insensitive (ILIKE).
 */
router.get(
  "/listings",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const material = assertEnum(
      req.query.material,
      ALLOWED_MATERIALS,
      "material",
    );
    const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;

    // Only public listings appear in the marketplace feed.
    // Private listings (when eventually supported) are never leaked here.
    const conditions = [
      eq(wasteListingsTable.status, "open"),
      eq(wasteListingsTable.visibility, "public"),
    ];
    if (material) {
      conditions.push(eq(wasteListingsTable.material, material));
    }
    if (city) {
      conditions.push(ilike(wasteListingsTable.city, `%${city}%`));
    }

    const rows = await db
      .select({
        ...baseSelect,
        offer_count: offerAgg.offer_count,
        max_price_per_unit: offerAgg.max_price_per_unit,
      })
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .leftJoin(offerAgg, eq(offerAgg.waste_listing_id, wasteListingsTable.id))
      .where(and(...conditions))
      .orderBy(desc(wasteListingsTable.created_at))
      .limit(200);

    res.json(
      rows.map((r) => {
        const qty = Number(r.quantity);
        const maxPpu = r.max_price_per_unit != null ? Number(r.max_price_per_unit) : null;
        return serialize({
          ...r,
          offer_count: r.offer_count ?? 0,
          highest_offer_total: maxPpu != null ? maxPpu * qty : null,
        });
      }),
    );
  },
);

/**
 * GET /listings/mine — current producer's own listings.
 * F8 ordering: active (open) first, then by offer_count DESC, then created_at DESC.
 * F9: optional ?status=open|closed filter.
 */
router.get(
  "/listings/mine",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const status = assertEnum(req.query.status, ALLOWED_STATUSES, "status");

    const conditions = [eq(wasteListingsTable.company_id, company.id)];
    if (status) {
      conditions.push(eq(wasteListingsTable.status, status));
    }

    const rows = await db
      .select({
        ...baseSelect,
        offer_count: offerAgg.offer_count,
        max_price_per_unit: offerAgg.max_price_per_unit,
        deal_status: dealsTable.status,
      })
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .leftJoin(offerAgg, eq(offerAgg.waste_listing_id, wasteListingsTable.id))
      .leftJoin(dealsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
      .where(and(...conditions))
      .orderBy(
        // F8: active first, then most offers, then newest
        asc(
          sql`CASE WHEN ${wasteListingsTable.status} = 'open' THEN 0 ELSE 1 END`,
        ),
        desc(sql`COALESCE(${offerAgg.offer_count}, 0)`),
        desc(wasteListingsTable.created_at),
      );

    res.json(
      rows.map((r) => {
        const qty = Number(r.quantity);
        const maxPpu = r.max_price_per_unit != null ? Number(r.max_price_per_unit) : null;
        return serialize({
          ...r,
          offer_count: r.offer_count ?? 0,
          highest_offer_total: maxPpu != null ? maxPpu * qty : null,
        });
      }),
    );
  },
);

/**
 * POST /listings — producer creates a new waste listing.
 */
router.post(
  "/listings",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const parsed = CreateWasteListingBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "ValidationError",
        "Invalid listing data",
        parsed.error.issues,
      );
    }
    const { company } = req as AuthedCompanyRequest;
    const data = parsed.data;

    const [created] = await db
      .insert(wasteListingsTable)
      .values({
        company_id: company.id,
        material: data.material,
        quantity: String(data.quantity),
        unit: data.unit,
        city: data.city,
        description: data.description ?? null,
        price_hint: data.price_hint != null ? String(data.price_hint) : null,
        // pricing_model is immutable once set; defaults to "fixed" at DB level
        pricing_model: data.pricing_model ?? "fixed",
      })
      .returning();

    res.status(201).json(
      serialize({ ...created, company_name: company.name }),
    );
  },
);

/**
 * GET /listings/:waste_listing_id — single listing detail.
 * Any authenticated user with a company can view.
 */
router.get(
  "/listings/:waste_listing_id",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const id = assertUuid(req.params.waste_listing_id, "waste_listing_id");
    const { company } = req as AuthedCompanyRequest;

    const rows = await db
      .select(baseSelect)
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!rows[0]) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }

    // Attach deal info if the current user is a party (producer or accepted buyer)
    let deal = null;
    const dealRows = await db
      .select()
      .from(dealsTable)
      .where(
        and(
          eq(dealsTable.listing_id, id),
          or(
            eq(dealsTable.producer_company_id, company.id),
            eq(dealsTable.buyer_company_id, company.id),
          ),
        ),
      )
      .limit(1);

    if (dealRows[0]) {
      const d = dealRows[0];
      const isProducer = d.producer_company_id === company.id;
      const counterpartyId = isProducer ? d.buyer_company_id : d.producer_company_id;
      const [counterparty] = await db
        .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
        .from(companiesTable)
        .where(eq(companiesTable.id, counterpartyId))
        .limit(1);

      deal = {
        id: d.id,
        offer_id: d.offer_id,
        settlement_type: d.settlement_type,
        price_per_unit: Number(d.price_per_unit),
        estimated_amount: Number(d.estimated_amount),
        actual_quantity: d.actual_quantity != null ? Number(d.actual_quantity) : null,
        final_amount: d.final_amount != null ? Number(d.final_amount) : null,
        status: d.status,
        counterparty: counterparty
          ? { name: counterparty.name, contact_phone: counterparty.contactPhone }
          : null,
        payment_confirmed_at: d.payment_confirmed_at?.toISOString() ?? null,
        dispatched_at: d.dispatched_at?.toISOString() ?? null,
        received_at: d.received_at?.toISOString() ?? null,
        created_at: d.created_at.toISOString(),
        updated_at: d.updated_at.toISOString(),
      };
    }

    res.json({ ...serialize(rows[0]), deal });
  },
);

/**
 * POST /listings/:waste_listing_id/close — owner producer closes a listing.
 * F1: All pending offers are automatically rejected with resolved_at = now.
 * Returns the updated listing.
 */
router.post(
  "/listings/:waste_listing_id/close",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const id = assertUuid(req.params.waste_listing_id, "waste_listing_id");
    const { company } = req as AuthedCompanyRequest;

    const [existing] = await db
      .select()
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!existing) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }
    if (existing.company_id !== company.id) {
      throw new HttpError(403, "Forbidden", "Not the owner of this listing");
    }
    if (existing.status !== "open") {
      throw new HttpError(409, "ListingClosed", "Listing is already closed");
    }

    const now = new Date();

    // F1: Auto-reject all pending offers when listing is manually closed
    await db.transaction(async (tx) => {
      await tx
        .update(listingOffersTable)
        .set({
          status: "rejected",
          resolved_at: now,
          updated_at: now,
          rejection_reason: "listing_closed",
        })
        .where(
          and(
            eq(listingOffersTable.waste_listing_id, id),
            eq(listingOffersTable.status, "pending"),
          ),
        );

      await tx
        .update(wasteListingsTable)
        .set({ status: "closed", closed_at: now })
        .where(eq(wasteListingsTable.id, id));
    });

    const [updated] = await db
      .select(baseSelect)
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    res.json(serialize(updated!));
  },
);

/**
 * POST /listings/:waste_listing_id/image — upload a single image for a listing.
 * Only the listing owner (producer) can upload.
 * Returns the updated listing.
 */
router.post(
  "/listings/:waste_listing_id/image",
  requireAuth,
  requireCompany(["producer"]),
  upload.single("image"),
  async (req, res) => {
    const id = assertUuid(req.params.waste_listing_id, "waste_listing_id");
    const { company } = req as AuthedCompanyRequest;

    if (!req.file) {
      throw new HttpError(400, "ValidationError", "No image file provided");
    }

    const [existing] = await db
      .select()
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!existing) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }
    if (existing.company_id !== company.id) {
      throw new HttpError(403, "Forbidden", "Not the owner of this listing");
    }

    // Delete old image file if it exists
    if (existing.image_url) {
      const oldFile = path.join(process.cwd(), "public", existing.image_url.replace(/^\//, ""));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    const imageUrl = `/api/uploads/${req.file.filename}`;

    await db
      .update(wasteListingsTable)
      .set({ image_url: imageUrl })
      .where(eq(wasteListingsTable.id, id));

    res.json({ image_url: imageUrl });
  },
);

export default router;
