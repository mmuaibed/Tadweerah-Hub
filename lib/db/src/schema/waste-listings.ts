import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { unitOptionsTable } from "./unit-options";
import { materialCategoriesTable } from "./material-categories";

/**
 * Material categories accepted by the marketplace.
 * Kept short and stable for the MVP — extend with care (DB enum migration).
 */
export const wasteMaterialEnum = pgEnum("waste_material", [
  "paper",
  "plastic",
  "metal",
  "glass",
  "electronics",
  "organic",
  "other",
]);

export const wasteUnitEnum = pgEnum("waste_unit", ["kg", "ton"]);

export const wasteListingStatusEnum = pgEnum("waste_listing_status", [
  "open",
  "closed",
]);

/**
 * Governs how price_per_unit is interpreted and what settlement mechanics apply.
 * Immutable once a listing is published — producers must close and re-list to change model.
 *
 * fixed    — price_per_unit × quantity = agreed commercial amount (current MVP)
 * by_weight — price_per_unit is a rate; final amount settled post-weighing (future)
 */
export const pricingModelEnum = pgEnum("pricing_model", ["fixed", "by_weight", "revenue_share"]);

/**
 * Controls whether a listing appears in the public marketplace feed.
 *
 * CURRENT BEHAVIOUR (read-only from API):
 *   All listings default to "public". This field is returned in responses but
 *   is NOT accepted in CreateWasteListingBody — there is no mechanism to create
 *   a private listing yet.
 *
 * FUTURE (when listing_invitations layer exists):
 *   Producers will be able to set visibility = "private" at creation time.
 *   Access enforcement will be handled by the listing_invitations table (FK
 *   listing_id → waste_listings.id, invited_company_id → companies.id).
 *   The GET /listings marketplace feed already filters WHERE visibility = 'public',
 *   so private listings will be automatically excluded once created.
 *
 * DO NOT allow updates to this field — immutable once published.
 */
export const listingVisibilityEnum = pgEnum("listing_visibility", [
  "public",
  "private",
]);

/**
 * Whether the listing uses an open auction (buyers compete by price)
 * or a direct fixed-price sale (producer names the price, buyer buys at that price).
 * Defaults to "auction" for new listings.
 * Immutable once published — producers must close + re-list to change model.
 */
export const saleTypeEnum = pgEnum("sale_type", ["auction", "direct"]);

/**
 * Applies only to Direct Sale listings.
 * open             — visible to all companies in the marketplace
 * category         — visible only to companies whose category is in listing_target_categories
 * specific_company — visible only to one named company (target_company_id)
 * Auction listings always use 'open'.
 */
export const targetingTypeEnum = pgEnum("targeting_type", [
  "open",
  "category",
  "specific_company",
]);

export const wasteListingsTable = pgTable("waste_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  material: wasteMaterialEnum("material").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: wasteUnitEnum("unit").notNull(),
  city: text("city").notNull(),
  description: text("description"),
  price_hint: numeric("price_hint", { precision: 12, scale: 2 }),
  status: wasteListingStatusEnum("status").notNull().default("open"),
  /**
   * Immutable once published. Governs settlement mechanics.
   * Defaults to "fixed" for the current MVP.
   * Do NOT allow updates to this field — producers must close + re-list to change model.
   */
  pricing_model: pricingModelEnum("pricing_model").notNull().default("fixed"),
  /**
   * CURRENTLY READ-ONLY from the API. Defaults to "public".
   * Immutable once published — producers must close + re-list to change visibility.
   * "private" listings are filtered out of GET /listings (marketplace feed).
   * Private access enforcement requires a future listing_invitations table.
   * Do NOT accept this field in CreateWasteListingBody until enforcement exists.
   */
  visibility: listingVisibilityEnum("visibility").notNull().default("public"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closed_at: timestamp("closed_at", { withTimezone: true }),
  image_url: text("image_url"),

  /**
   * Auction: buyers compete, producer picks the best offer.
   * Direct: producer names a fixed price, first buyer to accept wins.
   * Defaults to "auction". Immutable once published.
   */
  sale_type: saleTypeEnum("sale_type").notNull().default("auction"),

  /**
   * Reference to admin-managed unit options table.
   * Null for listings created before unit_options existed (they use legacy `unit` enum).
   * New listings should populate this field instead of the legacy `unit` column.
   */
  unit_option_id: uuid("unit_option_id").references(() => unitOptionsTable.id, {
    onDelete: "set null",
  }),

  /**
   * Free-text unit description used when unit_option has key = 'other'.
   * Nullable; only populated when the producer selects "Other" unit.
   */
  unit_notes: text("unit_notes"),

  /**
   * Reference to admin-managed material category hierarchy.
   * Null for listings created before material_categories existed.
   * New listings should populate this for finer classification.
   */
  material_category_id: uuid("material_category_id").references(
    () => materialCategoriesTable.id,
    { onDelete: "set null" },
  ),

  /**
   * Optional sub-category within material_category_id.
   * Points to a materialCategoriesTable row where parent_id is non-null.
   */
  material_subcategory_id: uuid("material_subcategory_id").references(
    () => materialCategoriesTable.id,
    { onDelete: "set null" },
  ),

  /**
   * Revenue-sharing percentage applied when pricing_model = 'revenue_share'.
   * Represents the percentage of the buyer's revenue paid to the producer.
   * Range: 0.00–100.00. Null for other pricing models.
   * Immutable once published — producers must close + re-list to change.
   */
  revenue_share_pct: numeric("revenue_share_pct", { precision: 5, scale: 2 }),

  /**
   * Controls which companies can see and bid on this listing.
   * Applies to Direct Sale only — auction listings are always 'open'.
   * open             — visible to all companies
   * category         — visible to companies in listed company categories (listing_target_categories)
   * specific_company — visible only to target_company_id (private deal)
   * Immutable once published.
   */
  targeting_type: targetingTypeEnum("targeting_type").notNull().default("open"),

  /**
   * Set when targeting_type = 'specific_company'.
   * Only this company can view the listing and submit an offer.
   */
  target_company_id: uuid("target_company_id").references(
    () => companiesTable.id,
    { onDelete: "set null" },
  ),
});

export type WasteListing = typeof wasteListingsTable.$inferSelect;
