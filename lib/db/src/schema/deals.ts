import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { wasteListingsTable } from "./waste-listings";
import { listingOffersTable } from "./listing-offers";

export const dealSettlementTypeEnum = pgEnum("deal_settlement_type", [
  "fixed",
  "by_weight",
  "revenue_share",
]);

export const dealStatusEnum = pgEnum("deal_status", [
  "active",
  "payment_confirmed",
  "dispatched",
  "completed",
  "expired",
]);

export const dealsTable = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    offer_id: uuid("offer_id")
      .notNull()
      .unique()
      .references(() => listingOffersTable.id, { onDelete: "restrict" }),

    listing_id: uuid("listing_id")
      .notNull()
      .references(() => wasteListingsTable.id, { onDelete: "restrict" }),

    producer_company_id: uuid("producer_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),

    buyer_company_id: uuid("buyer_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),

    settlement_type: dealSettlementTypeEnum("settlement_type").notNull(),

    price_per_unit: numeric("price_per_unit", {
      precision: 12,
      scale: 3,
    }).notNull(),

    estimated_amount: numeric("estimated_amount", {
      precision: 14,
      scale: 3,
    }).notNull(),

    actual_quantity: numeric("actual_quantity", { precision: 12, scale: 3 }),

    final_amount: numeric("final_amount", { precision: 14, scale: 3 }),

    status: dealStatusEnum("status").notNull().default("active"),

    payment_confirmed_at: timestamp("payment_confirmed_at", {
      withTimezone: true,
    }),
    payment_confirmed_by: uuid("payment_confirmed_by").references(
      () => companiesTable.id,
      { onDelete: "restrict" },
    ),

    /** Bank transfer reference number or payment transaction ID (required when confirming payment). */
    payment_reference: text("payment_reference"),

    /** URL to uploaded payment proof document / screenshot (optional). */
    payment_proof_url: text("payment_proof_url"),

    dispatched_at: timestamp("dispatched_at", { withTimezone: true }),
    dispatched_by: uuid("dispatched_by").references(() => companiesTable.id, {
      onDelete: "restrict",
    }),

    received_at: timestamp("received_at", { withTimezone: true }),
    received_by: uuid("received_by").references(() => companiesTable.id, {
      onDelete: "restrict",
    }),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_deals_listing: index("idx_deals_listing_id").on(table.listing_id),
    idx_deals_producer: index("idx_deals_producer_company_id").on(
      table.producer_company_id,
    ),
    idx_deals_buyer: index("idx_deals_buyer_company_id").on(
      table.buyer_company_id,
    ),
  }),
);

export type Deal = typeof dealsTable.$inferSelect;
