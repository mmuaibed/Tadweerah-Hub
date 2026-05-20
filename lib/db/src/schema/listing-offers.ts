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
  "withdrawn",
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
    /**
     * Pre-VAT subtotal — financial source of truth for this offer.
     * fixed listings:    buyer-entered total amount (no rounding from division).
     * by_weight listings: price_per_unit × listing quantity.
     * Null for legacy offers; fallback: price_per_unit × quantity.
     */
    offer_subtotal_amount: numeric("offer_subtotal_amount", { precision: 14, scale: 2 }),
    message: text("message"),
    status: offerStatusEnum("status").notNull().default("pending"),
    /** Required when producer manually rejects an offer (F3). Visible to the affected buyer only. */
    rejection_reason: text("rejection_reason"),
    /** Required when producer accepts an offer lower than the current highest (F4). Internal only. */
    acceptance_reason: text("acceptance_reason"),
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
