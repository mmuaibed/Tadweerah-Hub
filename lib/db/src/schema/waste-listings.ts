import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

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
export const pricingModelEnum = pgEnum("pricing_model", ["fixed", "by_weight"]);

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
});

export type WasteListing = typeof wasteListingsTable.$inferSelect;
