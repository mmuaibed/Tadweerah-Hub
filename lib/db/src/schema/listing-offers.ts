import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { wasteListingsTable } from "./waste-listings";

export const offerStatusEnum = pgEnum("offer_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const listingOffersTable = pgTable(
  "listing_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waste_listing_id: uuid("waste_listing_id")
      .notNull()
      .references(() => wasteListingsTable.id, { onDelete: "cascade" }),
    buyer_company_id: uuid("buyer_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    price_per_unit: numeric("price_per_unit", { precision: 12, scale: 3 }).notNull(),
    message: text("message"),
    status: offerStatusEnum("status").notNull().default("pending"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    /** One offer per buyer per listing — use PUT /offers/mine to improve */
    unique_buyer_listing: unique().on(table.waste_listing_id, table.buyer_company_id),
  }),
);

export type ListingOffer = typeof listingOffersTable.$inferSelect;
