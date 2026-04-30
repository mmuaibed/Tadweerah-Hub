import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { transportRequestsTable } from "./transport-requests";

/**
 * MWAN eManifest stub — Phase 2/3 placeholder.
 *
 * This table is schema-only in MVP.
 * It represents the future integration point with MWAN's national manifest system.
 * No API routes are created until Phase 2 integration begins.
 */
export const manifestStatusEnum = pgEnum("manifest_status", [
  "draft",
  "submitted",
  "accepted",
  "rejected",
]);

export const manifestRecordsTable = pgTable("manifest_records", {
  id: uuid("id").primaryKey().defaultRandom(),

  transport_request_id: uuid("transport_request_id")
    .notNull()
    .references(() => transportRequestsTable.id, { onDelete: "restrict" }),

  /** Future: ID assigned by MWAN after manifest submission. */
  external_manifest_id: text("external_manifest_id"),

  status: manifestStatusEnum("status").notNull().default("draft"),

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ManifestRecord = typeof manifestRecordsTable.$inferSelect;
