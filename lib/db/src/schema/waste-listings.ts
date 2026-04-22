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
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  closed_at: timestamp("closed_at", { withTimezone: true }),
});

export type WasteListing = typeof wasteListingsTable.$inferSelect;
