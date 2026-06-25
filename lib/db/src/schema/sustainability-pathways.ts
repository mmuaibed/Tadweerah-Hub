import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

/**
 * GRI 306 pathway classification.
 * circular   = counts toward circular diversion rate (reuse, repair, recycling, material recovery)
 * energy     = energy recovery / alternative fuel — diverted from landfill but NOT circular
 * treatment  = safe treatment / neutralization
 * disposal   = certified disposal / landfill
 * residue    = process loss, rejects, contaminants
 * other      = unclassified — does NOT count as circular by default
 */
export const pathwayCategoryEnum = pgEnum("sustainability_pathway_category", [
  "circular",
  "energy",
  "treatment",
  "disposal",
  "residue",
  "other",
]);

/**
 * Sustainability pathways — the possible outcomes for received waste/material.
 * Seeded from GRI 306 waste management hierarchy.
 *
 * Key design decisions (v1.1):
 * - `is_circular_diversion = true` ONLY for approved circular pathways
 * - "other" pathway has `is_circular_diversion = false` by default
 * - Admin can add/deactivate pathways but cannot change `is_circular_diversion`
 *   for existing pathways without governance review
 */
export const sustainabilityPathwaysTable = pgTable(
  "sustainability_pathways",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Stable internal key — immutable after creation. Used in logic/filtering. */
    key: text("key").notNull().unique(),

    /** Arabic display label */
    name_ar: text("name_ar").notNull(),

    /** English display label */
    name_en: text("name_en").notNull(),

    /** GRI 306 category classification */
    category: pathwayCategoryEnum("category").notNull(),

    /**
     * Whether this pathway counts toward the circular diversion rate.
     * Only true for: reuse, repair_refurbishment, remanufacturing, recycling, material_recovery.
     * False for: energy_recovery, safe_treatment, certified_disposal, residue_loss, other.
     */
    is_circular_diversion: boolean("is_circular_diversion").notNull(),

    /**
     * Whether this pathway requires a free-text explanation from the processor.
     * Currently true only for "other".
     */
    requires_explanation: boolean("requires_explanation").notNull().default(false),

    /** Soft delete / deactivation. Deactivated pathways cannot be used in new allocations. */
    is_active: boolean("is_active").notNull().default(true),

    /** Display order in allocation forms and reports */
    sort_order: integer("sort_order").notNull().default(0),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_pathways_category: index("idx_sust_pathways_category").on(
      table.category,
    ),
    idx_pathways_active: index("idx_sust_pathways_active").on(table.is_active),
  }),
);

export type SustainabilityPathway =
  typeof sustainabilityPathwaysTable.$inferSelect;
export type InsertSustainabilityPathway =
  typeof sustainabilityPathwaysTable.$inferInsert;
