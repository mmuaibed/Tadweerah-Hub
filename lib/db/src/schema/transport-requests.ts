import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { dealsTable } from "./deals";

/**
 * Transport request status machine — aligned with MWAN eManifest concept.
 *
 * pending       — created by producer/buyer, awaiting transporter assignment
 * accepted      — transporter confirmed the job
 * manifest_ready — all required fields complete; ready for MWAN manual entry
 * in_transit    — goods physically picked up and en route
 * delivered     — goods delivered to receiver
 * closed        — all parties confirmed, settled
 * cancelled     — request cancelled before completion
 */
export const transportRequestStatusEnum = pgEnum("transport_request_status", [
  "pending",
  "accepted",
  "manifest_ready",
  "in_transit",
  "delivered",
  "closed",
  "cancelled",
]);

export const transportRequestsTable = pgTable("transport_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  deal_id: uuid("deal_id")
    .notNull()
    .references(() => dealsTable.id, { onDelete: "restrict" }),

  created_by_company_id: uuid("created_by_company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "restrict" }),

  /** Assigned transporter (carrier company). Null until accepted. */
  transporter_company_id: uuid("transporter_company_id").references(
    () => companiesTable.id,
    { onDelete: "set null" },
  ),

  status: transportRequestStatusEnum("status").notNull().default("pending"),

  /** City or address of waste pickup (generator/producer site). */
  pickup_city: text("pickup_city"),

  /** City or address of waste delivery (receiver site). */
  delivery_city: text("delivery_city"),

  /** Waste description to appear on MWAN manifest (plain text for MVP). */
  waste_description: text("waste_description"),

  /** Vehicle plate number — required before marking pickup/in-transit. */
  vehicle_plate: text("vehicle_plate"),

  notes: text("notes"),

  planned_pickup_at: timestamp("planned_pickup_at", { withTimezone: true }),
  actual_pickup_at:  timestamp("actual_pickup_at",  { withTimezone: true }),
  delivered_at:      timestamp("delivered_at",       { withTimezone: true }),
  closed_at:         timestamp("closed_at",          { withTimezone: true }),
  cancelled_at:      timestamp("cancelled_at",       { withTimezone: true }),

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TransportRequest = typeof transportRequestsTable.$inferSelect;
