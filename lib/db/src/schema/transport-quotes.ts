import { pgTable, uuid, text, integer, numeric, pgEnum, timestamp, index } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { transportRequestsTable } from "./transport-requests";

export const transportQuoteStatusEnum = pgEnum("transport_quote_status", [
  "submitted",
  "under_review",
  "selected",
  "rejected",
]);

export const transportQuotesTable = pgTable("transport_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  transport_request_id: uuid("transport_request_id")
    .notNull()
    .references(() => transportRequestsTable.id, { onDelete: "cascade" }),
  transporter_company_id: uuid("transporter_company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  price_total: numeric("price_total", { precision: 12, scale: 2 }).notNull(),
  truck_count: integer("truck_count").notNull().default(1),
  truck_type: text("truck_type"),
  notes: text("notes"),
  status: transportQuoteStatusEnum("status").notNull().default("submitted"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
(table) => ({
  idx_transport_quotes_tr_id: index("idx_transport_quotes_tr_id").on(
    table.transport_request_id,
  ),
  idx_transport_quotes_company_id: index("idx_transport_quotes_company_id").on(
    table.transporter_company_id,
  ),
}));

export type TransportQuote = typeof transportQuotesTable.$inferSelect;
export type NewTransportQuote = typeof transportQuotesTable.$inferInsert;
