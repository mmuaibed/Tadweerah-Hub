import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sustainabilityAllocationsTable } from "./sustainability-allocations";
import { receivedLineParentTypeEnum } from "./sustainability-received-lines";

/**
 * Sustainability reports — generated report metadata and snapshots.
 *
 * One allocation can have multiple report generations (e.g. re-download, re-send).
 * The report_data_snapshot JSONB preserves the exact data used to render the PDF,
 * ensuring immutability even if source data is later corrected.
 */
export const sustainabilityReportsTable = pgTable(
  "sustainability_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Tadweerah-generated report number. Format: TDW-SIR-YYYY-NNNN */
    report_number: text("report_number").notNull().unique(),

    /** The type of parent entity this report covers (deal, contract, auction, etc.) */
    parent_entity_type: receivedLineParentTypeEnum("parent_entity_type").notNull(),

    /** The ID of the parent entity this report covers */
    parent_entity_id: uuid("parent_entity_id").notNull(),

    /** 
     * Optional. Used only if generating a report for a specific single line allocation.
     * Most reports are generated at the parent transaction level instead.
     */
    allocation_id: uuid("allocation_id").references(
      () => sustainabilityAllocationsTable.id,
      { onDelete: "set null" },
    ),

    /**
     * Report scope type — what entity the report covers.
     * deal, shipment, contract, date_range
     */
    scope_type: text("scope_type").notNull(),

    /** When this report was generated */
    generated_at: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Who generated this report */
    generated_by_user_id: text("generated_by_user_id"),

    /**
     * Methodology version at time of generation.
     * Format: "1.0", "1.1", etc.
     */
    methodology_version: text("methodology_version").notNull(),

    /**
     * Disclaimer version at time of generation.
     * Format: "1.0"
     */
    disclaimer_version: text("disclaimer_version").notNull(),

    /**
     * Full data snapshot used to render the PDF.
     * Ensures the PDF is reproducible even if source data changes.
     * Includes: transaction details, allocation lines, metrics, labels, wording.
     */
    report_data_snapshot: jsonb("report_data_snapshot").notNull(),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_reports_allocation: index("idx_sust_reports_allocation").on(
      table.allocation_id,
    ),
    idx_reports_scope: index("idx_sust_reports_scope_type").on(
      table.scope_type,
    ),
  }),
);

export type SustainabilityReport =
  typeof sustainabilityReportsTable.$inferSelect;
export type InsertSustainabilityReport =
  typeof sustainabilityReportsTable.$inferInsert;
