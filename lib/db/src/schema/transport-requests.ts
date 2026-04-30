import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { dealsTable } from "./deals";
import { materialCategoriesTable } from "./material-categories";

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

/**
 * How transport is arranged for this request.
 *
 * platform     — producer/buyer posts to the platform; a registered carrier accepts
 * self_managed — producer/buyer uses their own fleet or a pre-arranged carrier;
 *                no platform-side carrier assignment needed
 */
export const transportModeEnum = pgEnum("transport_mode", [
  "platform",
  "self_managed",
]);

export const transportRequestsTable = pgTable("transport_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  deal_id: uuid("deal_id")
    .notNull()
    .references(() => dealsTable.id, { onDelete: "restrict" }),

  created_by_company_id: uuid("created_by_company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "restrict" }),

  /**
   * Transport mode — platform-managed or self-managed.
   * Defaults to 'platform' for backward compatibility with existing rows.
   */
  transport_mode: transportModeEnum("transport_mode").notNull().default("platform"),

  /**
   * Assigned transporter (carrier company on platform).
   * Only relevant for transport_mode = 'platform'. Null until accepted.
   */
  transporter_company_id: uuid("transporter_company_id").references(
    () => companiesTable.id,
    { onDelete: "set null" },
  ),

  /**
   * Free-text transporter name for self-managed mode
   * (own fleet, contracted third-party, etc.).
   */
  transporter_name: text("transporter_name"),

  status: transportRequestStatusEnum("status").notNull().default("pending"),

  /** City or address of waste pickup (generator/producer site). */
  pickup_city: text("pickup_city"),

  /** City or address of waste delivery (receiver site). */
  delivery_city: text("delivery_city"),

  /**
   * Human-readable manifest reference. Auto-generated on creation.
   * Format: TDW-{YYYY}-{6-digit seq}, e.g. TDW-2026-000001
   * Displayed on deal panel, TR list, MWAN summary.
   */
  manifest_ref: text("manifest_ref").unique(),

  /** Name of the waste generator / pickup facility (e.g. "Riyadh Industrial Complex"). */
  pickup_facility_name: text("pickup_facility_name"),

  /** Name of the receiving / treatment facility. */
  delivery_facility_name: text("delivery_facility_name"),

  /** Waste description to appear on MWAN manifest (plain text for MVP). */
  waste_description: text("waste_description"),

  /**
   * Optional override for the waste category on this transport request.
   * Falls back to the deal's listing category when null.
   */
  waste_category_id: uuid("waste_category_id").references(
    () => materialCategoriesTable.id,
    { onDelete: "set null" },
  ),
  waste_subcategory_id: uuid("waste_subcategory_id").references(
    () => materialCategoriesTable.id,
    { onDelete: "set null" },
  ),

  /** Vehicle plate number — required before dispatch confirmation. */
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
