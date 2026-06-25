import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sustainabilityAllocationsTable } from "./sustainability-allocations";
import { sustainabilityPathwaysTable } from "./sustainability-pathways";

/**
 * Sustainability allocation lines — individual pathway entries within an allocation.
 *
 * Each row assigns a portion of the received line's quantity to a specific pathway.
 * The sum of all lines for one allocation must equal 100% of the received quantity
 * (within the allocation tolerance).
 *
 * Key design decisions (v1.1):
 * - No auto-created lines: the system must NOT silently add residue/loss lines
 * - Each line is explicitly declared by the processor/buyer
 * - "other" pathway requires an explanation (explanation_text)
 */
export const sustainabilityAllocationLinesTable = pgTable(
  "sustainability_allocation_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Parent allocation */
    allocation_id: uuid("allocation_id")
      .notNull()
      .references(() => sustainabilityAllocationsTable.id, {
        onDelete: "cascade",
      }),

    /** The pathway this quantity is assigned to */
    pathway_id: uuid("pathway_id")
      .notNull()
      .references(() => sustainabilityPathwaysTable.id, {
        onDelete: "restrict",
      }),

    /**
     * Quantity assigned to this pathway, in the same unit as the parent received line.
     */
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),

    /**
     * Percentage of the total received quantity assigned to this pathway.
     * Stored for display convenience. Must match (quantity / total) * 100.
     */
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),

    /**
     * Required when the pathway has requires_explanation = true (e.g. "other").
     * Explains what was actually done with the material.
     */
    explanation_text: text("explanation_text"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_alloc_lines_allocation: index("idx_sust_alloc_lines_allocation").on(
      table.allocation_id,
    ),
    idx_alloc_lines_pathway: index("idx_sust_alloc_lines_pathway").on(
      table.pathway_id,
    ),
  }),
);

export type SustainabilityAllocationLine =
  typeof sustainabilityAllocationLinesTable.$inferSelect;
export type InsertSustainabilityAllocationLine =
  typeof sustainabilityAllocationLinesTable.$inferInsert;
