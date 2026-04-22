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
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closed_at: timestamp("closed_at", { withTimezone: true }),
});

export type WasteListing = typeof wasteListingsTable.$inferSelect;
