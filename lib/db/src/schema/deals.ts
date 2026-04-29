import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  numeric,
  index,
  integer,
  boolean,
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
  "cancelled",
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

    /**
     * Set when producer or admin cancels the deal before dispatch.
     * Terminal status: no further transitions after cancelled.
     */
    cancelled_at: timestamp("cancelled_at", { withTimezone: true }),

    /**
     * One-time extension: producer can extend the deal deadline once, before dispatch.
     * extended_until replaces the normal SLA deadline for active/payment_confirmed states.
     * extension_count tracks how many times the deal has been extended (max 1).
     */
    extended_until: timestamp("extended_until", { withTimezone: true }),
    extension_count: integer("extension_count").notNull().default(0),

    /**
     * Set to true when the pre-expiry notification has been sent (3 calendar days before deadline).
     * Prevents duplicate pre-expiry alerts from the hourly job.
     */
    pre_expiry_notified: boolean("pre_expiry_notified").notNull().default(false),

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
