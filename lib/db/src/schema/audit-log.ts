/**
 * Immutable audit log for platform-level events.
 *
 * Records who did what to which entity, when.
 * Append-only: rows are never updated or deleted.
 * Used for compliance, debugging, and admin oversight.
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const auditLogTable = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Clerk user ID (e.g. "user_2Hx..."). Null if system-generated. */
  user_id: text("user_id"),
  /** FK to companies.id. Null if action is not company-scoped. */
  company_id: uuid("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  /**
   * Internal action key. Examples:
   * listing.created, offer.submitted, offer.accepted, deal.payment_confirmed
   */
  action: text("action").notNull(),
  /** Entity type: "listing" | "offer" | "deal" | "company" | "user" */
  entity_type: text("entity_type"),
  /** UUID of the affected entity */
  entity_id: uuid("entity_id"),
  /** Free-form structured context (before/after values, metadata, etc.) */
  details: jsonb("details"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
