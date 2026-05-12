/**
 * Immutable audit log for platform-level events.
 *
 * Records who did what to which entity, when, and which state transition occurred.
 * Append-only: rows are never updated or deleted.
 * Used for compliance, debugging, and admin oversight.
 *
 * Columns:
 *   actor_role    — business role of the actor (producer | buyer | seller | transporter | admin | system)
 *   status_before — entity status prior to the action (null if no status change or creation)
 *   status_after  — entity status after the action (null if no status change)
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
  /** Entity type: "listing" | "offer" | "deal" | "contract" | "contract_shipment" | "company" | "user" */
  entity_type: text("entity_type"),
  /** UUID of the affected entity */
  entity_id: uuid("entity_id"),
  /** Business role of the actor: "producer" | "buyer" | "seller" | "transporter" | "admin" | "system" */
  actor_role: text("actor_role"),
  /** Entity status before the action (null for creations or non-status-changing actions) */
  status_before: text("status_before"),
  /** Entity status after the action (null for non-status-changing actions) */
  status_after: text("status_after"),
  /** Free-form structured context (metadata, extra details, etc.) */
  details: jsonb("details"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
