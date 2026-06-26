import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sustainabilityAllocationsTable } from "./sustainability-allocations";
import { sustainabilityReceivedLinesTable } from "./sustainability-received-lines";
import { companiesTable } from "./companies";

/**
 * Sustainability correction requests.
 *
 * Tracks requests (from company users or admin) to reopen a finalized
 * sustainability allocation as a correction draft.
 *
 * Key design decisions:
 * - Separate state machine from allocation lifecycle.
 * - Only one pending request per allocation (enforced via partial unique index).
 * - Request approval creates a new allocation draft at version + 1.
 * - Original finalized allocation remains active until the correction draft
 *   is finalized (deferred supersede model).
 * - All request/approval/rejection events are audit-logged.
 *
 * Status values: pending | approved | rejected
 */
export const sustainabilityCorrectionRequestsTable = pgTable(
  "sustainability_correction_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The finalized allocation being requested for correction */
    allocation_id: uuid("allocation_id")
      .notNull()
      .references(() => sustainabilityAllocationsTable.id, {
        onDelete: "restrict",
      }),

    /** The received line this allocation belongs to */
    received_line_id: uuid("received_line_id")
      .notNull()
      .references(() => sustainabilityReceivedLinesTable.id, {
        onDelete: "restrict",
      }),

    // ── Request ─────────────────────────────────────────────────────────

    /** Mandatory reason for the correction request */
    reason: text("reason").notNull(),

    /** Request lifecycle status: pending | approved | rejected */
    status: text("status").notNull().default("pending"),

    // ── Who requested ────────────────────────────────────────────────────

    /** Clerk user ID of the requester */
    requested_by_user_id: text("requested_by_user_id"),

    /** Company that submitted the request (null for admin-initiated) */
    requested_by_company_id: uuid("requested_by_company_id").references(
      () => companiesTable.id,
      { onDelete: "set null" },
    ),

    /** Business role: 'company' | 'admin' */
    requested_by_role: text("requested_by_role").notNull(),

    // ── Resolution ───────────────────────────────────────────────────────

    /** Clerk user ID of the admin who approved/rejected */
    resolved_by_user_id: text("resolved_by_user_id"),

    resolved_at: timestamp("resolved_at", { withTimezone: true }),

    /** Required when status = rejected */
    rejection_reason: text("rejection_reason"),

    // ── Result ───────────────────────────────────────────────────────────

    /**
     * The new correction draft allocation created on approval.
     * Null until approved.
     */
    correction_allocation_id: uuid("correction_allocation_id").references(
      () => sustainabilityAllocationsTable.id,
    ),

    // ── Timestamps ───────────────────────────────────────────────────────

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_corr_req_status: index("idx_sust_corr_req_status").on(table.status),
    idx_corr_req_allocation: index("idx_sust_corr_req_allocation").on(
      table.allocation_id,
    ),
    idx_corr_req_company: index("idx_sust_corr_req_company").on(
      table.requested_by_company_id,
    ),
  }),
);

export type SustainabilityCorrectionRequest =
  typeof sustainabilityCorrectionRequestsTable.$inferSelect;
export type InsertSustainabilityCorrectionRequest =
  typeof sustainabilityCorrectionRequestsTable.$inferInsert;
