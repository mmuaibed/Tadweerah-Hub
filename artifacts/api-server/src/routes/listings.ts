import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  db,
  companiesTable,
  companyRolesTable,
  wasteListingsTable,
  listingOffersTable,
  listingRequiredServicesTable,
  listingTargetCategoriesTable,
  materialCategoriesTable,
  capabilitiesTable,
  dealsTable,
  unitOptionsTable,
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
import { logAudit } from "../lib/audit";
import { notifyPrivateDealInvitation, notifyOfferRejected, notifyNewListingPublished, notifyListingPublishedSuccess } from "../lib/notify";
import { listingRef as makeListingRef } from "../lib/listing-ref";

import { Storage } from "@google-cloud/storage";

const storageClient = new Storage();
const BUCKET_NAME = process.env.GCS_LISTING_IMAGES_BUCKET || "tadweerah-staging-listing-images";

// Use memory storage so we can upload the buffer directly to GCS
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
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
  material_category_name_ar?: string | null;
  material_category_name_en?: string | null;
  offer_count?: number;
  highest_subtotal_amount?: number | null;
  highest_offer_price?: number | null;
  deal_status?: string | null;
  material_location_address?: string | null;
  google_maps_url?: string | null;
  material_location_notes?: string | null;
};

type RequiredServiceShape = {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  requires_license: boolean;
};

function serialize(
  row: Row,
  requiredServices?: RequiredServiceShape[],
  targetCategoryIds?: string[],
) {
  const r = row as Row & {
    sale_type?: string;
    material_category_id?: string | null;
    material_category_name_ar?: string | null;
    material_category_name_en?: string | null;
    material_subcategory_id?: string | null;
    unit_option_id?: string | null;
    unit_notes?: string | null;
    revenue_share_pct?: string | null;
    targeting_type?: string | null;
    target_company_id?: string | null;
    eligible_company_type?: string | null;
  };
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
    sale_type: r.sale_type ?? "auction",
    material_category_id: r.material_category_id ?? null,
    material_category_name_ar: r.material_category_name_ar ?? null,
    material_category_name_en: r.material_category_name_en ?? null,
    material_subcategory_id: r.material_subcategory_id ?? null,
    unit_option_id: r.unit_option_id ?? null,
    unit_notes: r.unit_notes ?? null,
    revenue_share_pct: r.revenue_share_pct != null ? Number(r.revenue_share_pct) : undefined,
    visibility: row.visibility,
    targeting_type: r.targeting_type ?? "open",
    target_company_id: r.target_company_id ?? null,
    eligible_company_type: (r.eligible_company_type ?? "ALL") as "ALL" | "LICENSED_ONLY",
    target_category_ids: targetCategoryIds ?? [],
    image_url: row.image_url ?? undefined,
    transport_responsibility: (row.transport_responsibility ?? "buyer") as "seller" | "buyer",
    vat_applicable: row.vat_applicable ?? true,
    material_location_address: (row as Row).material_location_address ?? null,
    google_maps_url: (row as Row).google_maps_url ?? null,
    material_location_notes: (row as Row).material_location_notes ?? null,
    created_at: row.created_at.toISOString(),
    closed_at: row.closed_at?.toISOString() ?? undefined,
    offer_count: row.offer_count ?? undefined,
    highest_subtotal_amount:
      row.highest_subtotal_amount != null ? Number(row.highest_subtotal_amount) : undefined,
    highest_offer_price:
      row.highest_offer_price != null ? Number(row.highest_offer_price) : undefined,
    deal_status: row.deal_status ?? undefined,
    required_services: requiredServices ?? [],
  };
}

/**
 * Batch-fetch required services for a set of listing IDs.
 * Returns a map: listingId → RequiredServiceShape[]
 */
async function fetchRequiredServicesMap(
  listingIds: string[],
): Promise<Map<string, RequiredServiceShape[]>> {
  const map = new Map<string, RequiredServiceShape[]>();
  if (listingIds.length === 0) return map;

  const rows = await db
    .select({
      listing_id: listingRequiredServicesTable.listing_id,
      id: capabilitiesTable.id,
      key: capabilitiesTable.key,
      name_ar: capabilitiesTable.name_ar,
      name_en: capabilitiesTable.name_en,
      requires_license: capabilitiesTable.requires_license,
    })
    .from(listingRequiredServicesTable)
    .innerJoin(
      capabilitiesTable,
      eq(capabilitiesTable.id, listingRequiredServicesTable.capability_id),
    )
    .where(inArray(listingRequiredServicesTable.listing_id, listingIds));

  for (const row of rows) {
    const existing = map.get(row.listing_id) ?? [];
    existing.push({
      id: row.id,
      key: row.key,
      name_ar: row.name_ar,
      name_en: row.name_en,
      requires_license: row.requires_license,
    });
    map.set(row.listing_id, existing);
  }
  return map;
}

/**
 * Batch-fetch target category IDs for a set of listing IDs.
 * Returns a map: listingId → company_category_id[]
 */
async function fetchTargetCategoryIdsMap(
  listingIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (listingIds.length === 0) return map;
  const rows = await db
    .select({
      listing_id: listingTargetCategoriesTable.listing_id,
      company_category_id: listingTargetCategoriesTable.company_category_id,
    })
    .from(listingTargetCategoriesTable)
    .where(inArray(listingTargetCategoriesTable.listing_id, listingIds));
  for (const row of rows) {
    const existing = map.get(row.listing_id) ?? [];
    existing.push(row.company_category_id);
    map.set(row.listing_id, existing);
  }
  return map;
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
  sale_type: wasteListingsTable.sale_type,
  material_category_id: wasteListingsTable.material_category_id,
  material_category_name_ar: materialCategoriesTable.name_ar,
  material_category_name_en: materialCategoriesTable.name_en,
  material_subcategory_id: wasteListingsTable.material_subcategory_id,
  unit_option_id: wasteListingsTable.unit_option_id,
  unit_notes: wasteListingsTable.unit_notes,
  revenue_share_pct: wasteListingsTable.revenue_share_pct,
  visibility: wasteListingsTable.visibility,
  targeting_type: wasteListingsTable.targeting_type,
  target_company_id: wasteListingsTable.target_company_id,
  eligible_company_type: wasteListingsTable.eligible_company_type,
  image_url: wasteListingsTable.image_url,
  transport_responsibility: wasteListingsTable.transport_responsibility,
  vat_applicable: wasteListingsTable.vat_applicable,
  material_location_address: wasteListingsTable.material_location_address,
  google_maps_url: wasteListingsTable.google_maps_url,
  material_location_notes: wasteListingsTable.material_location_notes,
  created_at: wasteListingsTable.created_at,
  closed_at: wasteListingsTable.closed_at,
  company_name: companiesTable.name,
} as const;

/**
 * Aggregate subquery: offer_count and highest offer per listing.
 * Withdrawn offers are excluded from both count and max calculation.
 */
const offerAgg = db
  .selectDistinctOn([listingOffersTable.waste_listing_id], {
    waste_listing_id: listingOffersTable.waste_listing_id,
    offer_count:
      sql<number>`cast(count(*) over (partition by ${listingOffersTable.waste_listing_id}) as int)`.as("offer_count"),
    highest_subtotal_amount:
      sql<string>`coalesce(${listingOffersTable.offer_subtotal_amount}, ${listingOffersTable.price_per_unit} * ${wasteListingsTable.quantity})`.as("highest_subtotal_amount"),
    max_price_per_unit:
      listingOffersTable.price_per_unit,
  })
  .from(listingOffersTable)
  .innerJoin(wasteListingsTable, eq(wasteListingsTable.id, listingOffersTable.waste_listing_id))
  .where(ne(listingOffersTable.status, "withdrawn"))
  .orderBy(
    listingOffersTable.waste_listing_id,
    desc(sql`coalesce(${listingOffersTable.offer_subtotal_amount}, ${listingOffersTable.price_per_unit} * ${wasteListingsTable.quantity})`)
  )
  .as("offer_agg");

/**
 * GET /listings — public marketplace (buyers only).
 * Producers and carriers should not browse the buyer marketplace.
 * F10: city filter is case-insensitive (ILIKE).
 */
router.get(
  "/listings",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const material = assertEnum(
      req.query.material,
      ALLOWED_MATERIALS,
      "material",
    );
    const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;

    // Only public, open listings appear in the marketplace feed.
    // Targeting: only show listings the viewer is allowed to see.
    //   open             → visible to all
    //   specific_company → only the named company (or the owner)
    //   category         → companies whose category matches any of the listed categories
    const targetingFilter = or(
      // P6: Own listings are excluded from the marketplace feed (producers use
      // /listings/mine for that). Removing the owner-shortcut here keeps the
      // feed clean and prevents companies from bidding on their own waste.
      // Fully open listing
      eq(wasteListingsTable.targeting_type, "open"),
      // Direct invite to this company
      and(
        eq(wasteListingsTable.targeting_type, "specific_company"),
        eq(wasteListingsTable.target_company_id, company.id),
      ),
      // Category-targeted: viewer's category is in listing_target_categories
      company.company_category_id
        ? and(
            eq(wasteListingsTable.targeting_type, "category"),
            sql`EXISTS (
              SELECT 1 FROM listing_target_categories ltc
              WHERE ltc.listing_id = ${wasteListingsTable.id}
                AND ltc.company_category_id = ${company.company_category_id}
            )`,
          )
        : sql`false`,
    )!;

    const conditions = [
      eq(wasteListingsTable.status, "open"),
      eq(wasteListingsTable.visibility, "public"),
      // P6: never show the viewer's own listings in the marketplace
      ne(wasteListingsTable.company_id, company.id),
      targetingFilter,
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
        highest_subtotal_amount: offerAgg.highest_subtotal_amount,
      })
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .leftJoin(materialCategoriesTable, eq(materialCategoriesTable.id, wasteListingsTable.material_category_id))
      .leftJoin(offerAgg, eq(offerAgg.waste_listing_id, wasteListingsTable.id))
      .where(and(...conditions))
      .orderBy(desc(wasteListingsTable.created_at))
      .limit(200);

    // Batch 2 Item 1: Overlay buyer's own offer price + rank on each listing card.
    // Single query: fetch all pending offers for visible listings, rank in memory.
    const myOfferMap = new Map<string, { price_per_unit: number; rank: number }>();
    const listingIds = rows.map((r) => r.id);

    if (listingIds.length > 0) {
      const allPendingOffers = await db
        .select({
          waste_listing_id: listingOffersTable.waste_listing_id,
          buyer_company_id: listingOffersTable.buyer_company_id,
          price_per_unit: listingOffersTable.price_per_unit,
        })
        .from(listingOffersTable)
        .where(
          and(
            inArray(listingOffersTable.waste_listing_id, listingIds),
            ne(listingOffersTable.status, "withdrawn"),
          ),
        );

      // Group prices per listing, track which listing this buyer bid on
      const offersByListing = new Map<string, number[]>();
      const myPriceByListing = new Map<string, number>();

      for (const offer of allPendingOffers) {
        const prices = offersByListing.get(offer.waste_listing_id) ?? [];
        prices.push(Number(offer.price_per_unit));
        offersByListing.set(offer.waste_listing_id, prices);

        if (offer.buyer_company_id === company.id) {
          myPriceByListing.set(offer.waste_listing_id, Number(offer.price_per_unit));
        }
      }

      // Compute rank in memory: rank = count of higher prices + 1
      for (const [listingId, myPrice] of myPriceByListing) {
        const allPrices = offersByListing.get(listingId) ?? [];
        const rank = allPrices.filter((p) => p > myPrice).length + 1;
        myOfferMap.set(listingId, { price_per_unit: myPrice, rank });
      }
    }

    const [reqSvcMap, targetCatMap] = await Promise.all([
      fetchRequiredServicesMap(listingIds),
      fetchTargetCategoryIdsMap(listingIds),
    ]);

    res.json(
      rows.map((r) => {
        const qty = Number(r.quantity);
        const maxPpu = r.max_price_per_unit != null ? Number(r.max_price_per_unit) : null;
        const highestSubtotal = r.highest_subtotal_amount != null ? Number(r.highest_subtotal_amount) : null;
        const myOffer = myOfferMap.get(r.id);
        return {
          ...serialize(
            {
              ...r,
              offer_count: r.offer_count ?? 0,
              highest_subtotal_amount: highestSubtotal,
            },
            reqSvcMap.get(r.id) ?? [],
            targetCatMap.get(r.id) ?? [],
          ),
          my_offer_price: myOffer?.price_per_unit,
          my_rank: myOffer?.rank,
          // P3: per-unit max offer price so cards can show market context
          highest_offer_price: maxPpu,
        };
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
  requireCompany(),
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
        highest_subtotal_amount: offerAgg.highest_subtotal_amount,
        deal_status: dealsTable.status,
      })
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .leftJoin(materialCategoriesTable, eq(materialCategoriesTable.id, wasteListingsTable.material_category_id))
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

    const mineIds = rows.map((r) => r.id);
    const [mineReqSvcMap, mineTargetCatMap] = await Promise.all([
      fetchRequiredServicesMap(mineIds),
      fetchTargetCategoryIdsMap(mineIds),
    ]);

    res.json(
      rows.map((r) => {
        const qty = Number(r.quantity);
        const maxPpu = r.max_price_per_unit != null ? Number(r.max_price_per_unit) : null;
        const highestSubtotal = r.highest_subtotal_amount != null ? Number(r.highest_subtotal_amount) : null;
        return serialize(
          {
            ...r,
            offer_count: r.offer_count ?? 0,
            highest_subtotal_amount: highestSubtotal,
            highest_offer_price: maxPpu,
          },
          mineReqSvcMap.get(r.id) ?? [],
          mineTargetCatMap.get(r.id) ?? [],
        );
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
  requireCompany(),
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

    // ── Company approval gate ─────────────────────────────────────────────────
    // Only approved companies may publish listings.
    if (!company.license_status) {
      throw new HttpError(
        403,
        "CompanyIncomplete",
        "Your company profile is incomplete. Complete your company data and submit it for review before publishing listings.",
      );
    }
    if (company.license_status === "pending") {
      throw new HttpError(
        403,
        "CompanyPending",
        "Your company is currently under review. You will be able to publish listings once approved.",
      );
    }
    if (company.license_status === "expired") {
      throw new HttpError(
        403,
        "CompanyExpired",
        "Your company license has expired. Please renew your license before publishing listings.",
      );
    }
    // (rejected is already blocked globally by requireCompany middleware)
    // ── End approval gate ─────────────────────────────────────────────────────

    // CR gate: Commercial Registration is required to create listings
    if (!company.commercialRegistration) {
      throw new HttpError(
        422,
        "CommercialRegistrationRequired",
        "Commercial Registration is required before creating listings. Update your company profile.",
      );
    }

    // Extra fields not in generated schema (safe to read directly from body)
    const saleType: "auction" | "direct" = req.body.sale_type === "direct" ? "direct" : "auction";
    const materialCategoryId: string | null =
      typeof req.body.material_category_id === "string" ? req.body.material_category_id : null;
    const materialSubcategoryId: string | null =
      typeof req.body.material_subcategory_id === "string" ? req.body.material_subcategory_id : null;
    const unitOptionId: string | null =
      typeof req.body.unit_option_id === "string" ? req.body.unit_option_id : null;
    const unitNotes: string | null =
      typeof req.body.unit_notes === "string" && req.body.unit_notes.trim()
        ? req.body.unit_notes.trim()
        : null;

    // unit_notes is required when the selected unit_option has key='other'
    if (unitOptionId) {
      const [uo] = await db
        .select({ key: unitOptionsTable.key })
        .from(unitOptionsTable)
        .where(eq(unitOptionsTable.id, unitOptionId))
        .limit(1);
      if (uo?.key === "other" && !unitNotes) {
        res.status(400).json({
          error: "ValidationError",
          message: "unit_notes is required when unit is 'Other'",
        });
        return;
      }
    }

    const pricingModel: string = typeof req.body.pricing_model === "string" ? req.body.pricing_model : (data.pricing_model ?? "fixed");

    // ── Pricing model validation ───────────────────────────────────────────────
    // Marketplace supports fixed and by_weight only.
    // revenue_share is not a supported marketplace pricing model.
    if (pricingModel === "revenue_share") {
      throw new HttpError(
        400,
        "UnsupportedPricingModel",
        "revenue_share is not supported in the Marketplace. Use 'fixed' or 'by_weight'.",
      );
    }
    if (!["fixed", "by_weight"].includes(pricingModel)) {
      throw new HttpError(
        400,
        "ValidationError",
        "pricing_model must be 'fixed' or 'by_weight'",
      );
    }
    const revenueSharePct: string | null = null;

    // ── Targeting ─────────────────────────────────────────────────────────────
    // Targeting is only valid for Direct Sale; auction listings are always open.
    const rawTargetingType = req.body.targeting_type;
    const targetingType: "open" | "category" | "specific_company" =
      saleType === "direct" &&
      (rawTargetingType === "category" || rawTargetingType === "specific_company")
        ? rawTargetingType
        : "open";

    const targetCompanyId: string | null =
      targetingType === "specific_company" &&
      typeof req.body.target_company_id === "string"
        ? req.body.target_company_id
        : null;

    if (targetingType === "specific_company" && !targetCompanyId) {
      throw new HttpError(
        400,
        "ValidationError",
        "target_company_id is required when targeting_type=specific_company",
      );
    }

    // category UUIDs to store in listing_target_categories
    const targetCategoryIds: string[] =
      targetingType === "category" && Array.isArray(req.body.target_category_ids)
        ? (req.body.target_category_ids as unknown[]).filter(
            (v): v is string => typeof v === "string",
          )
        : [];

    if (targetingType === "category" && targetCategoryIds.length === 0) {
      throw new HttpError(
        400,
        "ValidationError",
        "At least one target_category_id is required when targeting_type=category",
      );
    }

    // required_service_ids: array of capability UUIDs
    const requiredServiceIds: string[] = Array.isArray(req.body.required_service_ids)
      ? (req.body.required_service_ids as unknown[]).filter((v): v is string => typeof v === "string")
      : [];

    // eligible_company_type: who can submit offers — defaults to ALL
    const eligibleCompanyType: "ALL" | "LICENSED_ONLY" =
      req.body.eligible_company_type === "LICENSED_ONLY" ? "LICENSED_ONLY" : "ALL";

    // transport_responsibility: who arranges/bears transport cost — required field, defaults to "buyer"
    const transportResponsibility: "seller" | "buyer" =
      req.body.transport_responsibility === "seller" ? "seller" : "buyer";

    // vat_applicable: whether VAT at 15% applies — defaults to true for standard Saudi transactions
    const vatApplicable: boolean = req.body.vat_applicable !== false;

    // material_location_address: optional pickup location description
    const materialLocationAddress: string | null =
      typeof req.body.material_location_address === "string" && req.body.material_location_address.trim()
        ? req.body.material_location_address.trim().slice(0, 500)
        : null;

    // google_maps_url: optional Maps link — must start with https:// to be stored
    const rawMapsUrl: unknown = req.body.google_maps_url;
    const googleMapsUrl: string | null =
      typeof rawMapsUrl === "string" && rawMapsUrl.trim().startsWith("https://")
        ? rawMapsUrl.trim().slice(0, 500)
        : null;

    // material_location_notes: operational site details — gate number, loading point, etc.
    const materialLocationNotes: string | null =
      typeof req.body.material_location_notes === "string" && req.body.material_location_notes.trim()
        ? req.body.material_location_notes.trim().slice(0, 500)
        : null;

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
        pricing_model: pricingModel as "fixed" | "by_weight" | "revenue_share",
        sale_type: saleType,
        material_category_id: materialCategoryId,
        material_subcategory_id: materialSubcategoryId,
        unit_option_id: unitOptionId,
        unit_notes: unitNotes,
        revenue_share_pct: revenueSharePct,
        targeting_type: targetingType,
        target_company_id: targetCompanyId,
        eligible_company_type: eligibleCompanyType,
        transport_responsibility: transportResponsibility,
        vat_applicable: vatApplicable,
        material_location_address: materialLocationAddress,
        google_maps_url: googleMapsUrl,
        material_location_notes: materialLocationNotes,
      })
      .returning();

    // Save required services
    if (requiredServiceIds.length > 0) {
      await db.insert(listingRequiredServicesTable).values(
        requiredServiceIds.map((capId) => ({
          listing_id: created.id,
          capability_id: capId,
        })),
      ).onConflictDoNothing();
    }

    // Save target category rows
    if (targetCategoryIds.length > 0) {
      await db.insert(listingTargetCategoriesTable).values(
        targetCategoryIds.map((catId) => ({
          listing_id: created.id,
          company_category_id: catId,
        })),
      ).onConflictDoNothing();
    }

    let categoryNameAr: string = data.material;
    let categoryNameEn: string = data.material;
    let subcategoryNameAr = "غير محدد";
    let subcategoryNameEn = "Not specified";
    let unitSymbolAr: string = data.unit || "";
    let unitSymbolEn: string = data.unit || "";

    try {
      const [catResult, subcatResult, uoptResult] = await Promise.all([
        data.material_category_id
          ? db.select().from(materialCategoriesTable).where(eq(materialCategoriesTable.id, data.material_category_id)).limit(1)
          : Promise.resolve([]),
        data.material_subcategory_id
          ? db.select().from(materialCategoriesTable).where(eq(materialCategoriesTable.id, data.material_subcategory_id)).limit(1)
          : Promise.resolve([]),
        unitOptionId
          ? db.select().from(unitOptionsTable).where(eq(unitOptionsTable.id, unitOptionId)).limit(1)
          : Promise.resolve([]),
      ]);
      if (catResult[0]) {
        categoryNameAr = catResult[0].name_ar;
        categoryNameEn = catResult[0].name_en;
      }
      if (subcatResult[0]) {
        subcategoryNameAr = subcatResult[0].name_ar;
        subcategoryNameEn = subcatResult[0].name_en;
      }
      if (uoptResult[0]) {
        unitSymbolAr = uoptResult[0].name_ar;
        unitSymbolEn = uoptResult[0].name_en;
      }
    } catch (err) {
      console.error("[listings] Failed to fetch localized names for notification", err);
    }

    const quantityAr = `${data.quantity} ${unitSymbolAr}`.trim();
    const quantityEn = `${data.quantity} ${unitSymbolEn}`.trim();

    // Notify the target company when a specific_company listing is created
    if (targetingType === "specific_company" && targetCompanyId) {
      void notifyPrivateDealInvitation({
        targetCompanyId,
        listingId: created.id,
        listingRef: makeListingRef(created.id),
        producerName: company.name,
      });
    }

    // Notify all approved buyers when an open listing is published
    if (targetingType === "open") {
      void (async () => {
        try {
          console.info("[listings] open listing notification broadcast start", {
            listingId: created.id,
            listingRef: makeListingRef(created.id),
            companyId: company.id,
            targetingType,
          });

          const eligibleBuyers = await db
            .selectDistinct({ id: companiesTable.id })
            .from(companiesTable)
            .leftJoin(companyRolesTable, eq(companiesTable.id, companyRolesTable.company_id))
            .where(
              and(
                eq(companiesTable.license_status, "approved"),
                eq(companiesTable.offer_submission_blocked, false),
                or(
                  eq(companiesTable.type, "buyer"),
                  eq(companyRolesTable.role, "receiver")
                )
              )
            );

          const finalBuyers = eligibleBuyers.filter((b) => b.id !== company.id);

          console.info("[listings] open listing eligible buyer count", {
            listingId: created.id,
            listingRef: makeListingRef(created.id),
            eligibleBuyerCount: finalBuyers.length,
          });

          const promises = finalBuyers.map((b) =>
            notifyNewListingPublished({
              buyerCompanyId: b.id,
              listingId: created.id,
              listingRef: makeListingRef(created.id),
              city: data.city,
              categoryAr: categoryNameAr,
              categoryEn: categoryNameEn,
              subcategoryAr: subcategoryNameAr,
              subcategoryEn: subcategoryNameEn,
              quantityAr: quantityAr,
              quantityEn: quantityEn,
            })
          );

          const results = await Promise.allSettled(promises);

          console.info("[listings] open listing notification broadcast done", {
            listingId: created.id,
            listingRef: makeListingRef(created.id),
            fulfilled: results.filter((r) => r.status === "fulfilled").length,
            rejected: results.filter((r) => r.status === "rejected").length,
          });
        } catch (err) {
          console.error("[listings] Failed to broadcast new listing", err);
        }
      })();
    }

    // Fetch the required services + target categories for the response
    const [reqSvcMap, targetCatMap] = await Promise.all([
      fetchRequiredServicesMap([created.id]),
      fetchTargetCategoryIdsMap([created.id]),
    ]);

    void notifyListingPublishedSuccess({
      sellerCompanyId: company.id,
      listingId: created.id,
      listingRef: makeListingRef(created.id),
      city: data.city,
      categoryAr: categoryNameAr,
      categoryEn: categoryNameEn,
      subcategoryAr: subcategoryNameAr,
      subcategoryEn: subcategoryNameEn,
      quantityAr: quantityAr,
      quantityEn: quantityEn,
    }).catch((err) => console.error("[listings] Failed to notify seller", err));

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "listing.created",
      entityType: "listing",
      entityId: created.id,
      details: {
        sale_type: saleType,
        pricing_model: pricingModel,
        material: data.material,
        targeting_type: targetingType,
      },
    });

    res.status(201).json(
      serialize(
        { ...created, company_name: company.name },
        reqSvcMap.get(created.id) ?? [],
        targetCatMap.get(created.id) ?? [],
      ),
    );
  },
);

/**
 * DELETE /listings/:waste_listing_id — producer closes their own open listing.
 *
 * Body (optional): { forceClose?: boolean }
 *
 * Behaviour:
 *   - No pending offers       → close immediately (status = 'closed'), returns updated listing.
 *   - Pending offers present  → if forceClose is falsy, returns 409 with
 *       { requiresConfirmation: true, pendingOffersCount, message }.
 *   - forceClose = true       → transaction: close listing + reject all pending offers +
 *       fire notifications to affected buyers + audit log.
 */
router.delete(
  "/listings/:waste_listing_id",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const id = assertUuid(req.params.waste_listing_id, "waste_listing_id");
    const { company } = req as AuthedCompanyRequest;
    const forceClose = req.body?.forceClose === true;

    const [existing] = await db
      .select()
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!existing) throw new HttpError(404, "NotFound", "Listing not found");
    if (existing.company_id !== company.id) throw new HttpError(403, "Forbidden", "Not the owner of this listing");
    if (existing.status !== "open") throw new HttpError(409, "InvalidState", "Only open listings can be closed");

    const listingRef = makeListingRef(id);

    // Fetch all non-withdrawn offers (need buyer info for notifications)
    const pendingOffers = await db
      .select({ id: listingOffersTable.id, buyer_company_id: listingOffersTable.buyer_company_id })
      .from(listingOffersTable)
      .where(
        and(
          eq(listingOffersTable.waste_listing_id, id),
          ne(listingOffersTable.status, "withdrawn"),
        ),
      );

    if (pendingOffers.length > 0 && !forceClose) {
      // Signal the frontend that user confirmation is required before force-close
      res.status(409).json({
        requiresConfirmation: true,
        pendingOffersCount: pendingOffers.length,
        message: "listing_has_pending_offers",
      });
      return;
    }

    if (pendingOffers.length > 0 && forceClose) {
      // Atomic: close listing + reject all pending offers
      await db.transaction(async (tx) => {
        await tx
          .update(wasteListingsTable)
          .set({ status: "closed" })
          .where(eq(wasteListingsTable.id, id));
        await tx
          .update(listingOffersTable)
          .set({ status: "rejected", rejection_reason: "listing_closed" })
          .where(
            and(
              eq(listingOffersTable.waste_listing_id, id),
              ne(listingOffersTable.status, "withdrawn"),
            ),
          );
      });

      // Notify each affected buyer (fire-and-forget)
      for (const offer of pendingOffers) {
        void notifyOfferRejected({
          buyerCompanyId: offer.buyer_company_id,
          listingId: id,
          listingRef,
          reason: "listing_closed",
        });
      }

      void logAudit({
        userId: (req as AuthedCompanyRequest).userId,
        companyId: company.id,
        action: "listing.force_closed",
        entityType: "listing",
        entityId: id,
        details: { cancelledOffersCount: pendingOffers.length },
      });
    } else {
      // No pending offers — close directly
      await db
        .update(wasteListingsTable)
        .set({ status: "closed" })
        .where(eq(wasteListingsTable.id, id));

      void logAudit({
        userId: (req as AuthedCompanyRequest).userId,
        companyId: company.id,
        action: "listing.closed",
        entityType: "listing",
        entityId: id,
      });
    }

    const [closed] = await db
      .select(baseSelect)
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .leftJoin(materialCategoriesTable, eq(materialCategoriesTable.id, wasteListingsTable.material_category_id))
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    res.json(serialize(closed!, [], []));
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
      .leftJoin(materialCategoriesTable, eq(materialCategoriesTable.id, wasteListingsTable.material_category_id))
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!rows[0]) {
      throw new HttpError(404, "NotFound", "Listing not found");
    }

    const listing = rows[0];

    // ── Targeting visibility enforcement ──────────────────────────────────────
    // Owners always see their own listing. Others must pass the targeting gate.
    if (listing.company_id !== company.id) {
      if (listing.targeting_type === "specific_company") {
        if (listing.target_company_id !== company.id) {
          throw new HttpError(404, "NotFound", "Listing not found");
        }
      } else if (listing.targeting_type === "category") {
        // Check whether this company's category is in the allowed set
        const [allowed] = await db
          .select({ listing_id: listingTargetCategoriesTable.listing_id })
          .from(listingTargetCategoriesTable)
          .where(
            and(
              eq(listingTargetCategoriesTable.listing_id, id),
              company.company_category_id
                ? eq(listingTargetCategoriesTable.company_category_id, company.company_category_id)
                : sql`false`,
            ),
          )
          .limit(1);
        if (!allowed) {
          throw new HttpError(404, "NotFound", "Listing not found");
        }
      }
      // targeting_type = 'open' → no additional check needed
    }
    // ── End targeting enforcement ──────────────────────────────────────────────

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
        transport_decision: d.transport_decision ?? null,
        transport_responsibility: listing.transport_responsibility,
        counterparty: counterparty
          ? { name: counterparty.name, contact_phone: counterparty.contactPhone }
          : null,
        payment_reference: d.payment_reference ?? null,
        payment_proof_url: d.payment_proof_url ?? null,
        payment_submitted_at: d.payment_submitted_at?.toISOString() ?? null,
        payment_confirmed_at: d.payment_confirmed_at?.toISOString() ?? null,
        dispatched_at: d.dispatched_at?.toISOString() ?? null,
        received_at: d.received_at?.toISOString() ?? null,
        created_at: d.created_at.toISOString(),
        updated_at: d.updated_at.toISOString(),
      };
    }

    const [reqSvcMap, targetCatMap] = await Promise.all([
      fetchRequiredServicesMap([id]),
      fetchTargetCategoryIdsMap([id]),
    ]);
    res.json({ ...serialize(listing, reqSvcMap.get(id) ?? [], targetCatMap.get(id) ?? []), deal });
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
  requireCompany(),
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
      .leftJoin(materialCategoriesTable, eq(materialCategoriesTable.id, wasteListingsTable.material_category_id))
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "listing.closed",
      entityType: "listing",
      entityId: id,
    });

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
  requireCompany(),
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

    // Note: We don't delete the old image from GCS here to keep the MVP simple and avoid 
    // requiring delete permissions, but in production we might want to clean it up.

    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const filename = `listings/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const blob = storageClient.bucket(BUCKET_NAME).file(filename);

    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("error", (err) => reject(err));
      stream.on("finish", () => resolve());
      stream.end(req.file!.buffer);
    });

    // Bucket is public, so we store the direct public URL
    const imageUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

    await db
      .update(wasteListingsTable)
      .set({ image_url: imageUrl })
      .where(eq(wasteListingsTable.id, id));

    res.json({ image_url: imageUrl });
  },
);

export default router;
