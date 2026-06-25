import {
  pgTable,
  text,
  uuid,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sustainabilityReceivedLinesTable } from "./sustainability-received-lines";

/**
 * Sustainability allocation lifecycle:
 * draft → finalized → superseded
 *                   → needs_review (if re-weigh/correction occurs post-finalization)
 *
 * needs_review → finalized (admin approves revised allocation)
 * superseded is terminal — old version preserved for audit trail.
 */
export const allocationStatusEnum = pgEnum("sustainability_allocation_status", [
  "draft",
  "finalized",
  "needs_review",
  "superseded",
]);

/**
 * Data Quality tiers (v1.1 C6 — renamed from "Confidence Level").
 * Reflects evidence completeness and data quality, NOT independent verification.
 */
export const dataQualityLevelEnum = pgEnum("sust_data_quality_level", [
  "high",
  "medium",
  "low",
]);

/**
 * Sustainability allocations — pathway allocation for a received line.
 *
 * Each allocation distributes 100% of the received line's quantity across pathways.
 * Draft saving is allowed. Finalization requires all quantities fully allocated.
 *
 * Key design decisions (v1.1):
 * - No silent balancing: system must NOT auto-create residue/loss lines to fill gaps
 * - Post-finalization edits require a written reason (revision_reason)
 * - Re-weigh/correction triggers needs_review status (C9)
 * - Old versions are superseded, never silently overwritten
 */
export const sustainabilityAllocationsTable = pgTable(
  "sustainability_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The received line this allocation distributes */
    received_line_id: uuid("received_line_id")
      .notNull()
      .references(() => sustainabilityReceivedLinesTable.id, {
        onDelete: "restrict",
      }),

    /** Allocation lifecycle status */
    status: allocationStatusEnum("status").notNull().default("draft"),

    /**
     * Version number for audit trail.
     * Starts at 1. Incremented when a finalized allocation is revised.
     */
    version: integer("version").notNull().default(1),

    /**
     * Required when version > 1. Explains why the allocation was revised.
     * Post-finalization edits require a written reason.
     */
    revision_reason: text("revision_reason"),

    // ── Tolerance ──────────────────────────────────────────────────────

    /**
     * Allocation tolerance percentage (max allowed gap between sum and 100%).
     * Default 2.00%. Gaps > tolerance must be explicitly rejected (400 Bad Request).
     * Tolerance NEVER means silent balancing (v1.1 C4).
     */
    allocation_tolerance_pct: numeric("allocation_tolerance_pct", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("2.00"),

    /** Recorded variance at finalization time */
    allocation_variance_pct: numeric("allocation_variance_pct", {
      precision: 5,
      scale: 2,
    }),

    // ── Data Quality (C6 — was "Confidence Level") ────────────────────

    /**
     * Data Quality tier: high | medium | low.
     * Reflects evidence completeness, NOT independent verification of pathways.
     */
    data_quality_level: dataQualityLevelEnum("data_quality_level"),

    /** Scoring breakdown explaining the data quality tier */
    data_quality_reason: text("data_quality_reason"),

    // ── Evidence flags ───────────────────────────────────────────────

    has_weighbridge_ticket: boolean("has_weighbridge_ticket")
      .notNull()
      .default(false),
    has_payment_proof: boolean("has_payment_proof").notNull().default(false),
    has_dispatch_evidence: boolean("has_dispatch_evidence")
      .notNull()
      .default(false),
    has_receipt_confirmation: boolean("has_receipt_confirmation")
      .notNull()
      .default(false),

    // ── Finalization ─────────────────────────────────────────────────

    /** Who finalized this allocation */
    finalized_by: text("finalized_by"),

    /** When this allocation was finalized */
    finalized_at: timestamp("finalized_at", { withTimezone: true }),

    // ── Timestamps ──────────────────────────────────────────────────

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_alloc_received_line: index("idx_sust_alloc_received_line").on(
      table.received_line_id,
    ),
    idx_alloc_status: index("idx_sust_alloc_status").on(table.status),
  }),
);

export type SustainabilityAllocation =
  typeof sustainabilityAllocationsTable.$inferSelect;
export type InsertSustainabilityAllocation =
  typeof sustainabilityAllocationsTable.$inferInsert;
