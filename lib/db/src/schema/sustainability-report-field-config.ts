import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Sustainability report field configuration — thin MVP registry.
 *
 * Controls which fields are visible in sustainability reports and their display properties.
 * Admin can adjust labels, visibility, and sort order for non-system fields.
 *
 * Design principle (v1.1):
 * "Make presentation flexible, but keep methodology governed."
 *
 * Fields with `is_system_field = true` are methodology-critical and MUST NOT be:
 * - Hidden from reports
 * - Removed
 * - Renamed in a misleading way
 *
 * 13 protected system fields are seeded by seed-sustainability.ts.
 */
export const sustainabilityReportFieldConfigTable = pgTable(
  "sustainability_report_field_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Stable internal key — immutable after creation */
    field_key: text("field_key").notNull().unique(),

    /** Arabic display label */
    label_ar: text("label_ar").notNull(),

    /** English display label */
    label_en: text("label_en").notNull(),

    /**
     * Whether this field is visible in reports.
     * System fields cannot be hidden (enforced by API, not just seed).
     */
    is_visible: boolean("is_visible").notNull().default(true),

    /**
     * Whether this is a methodology-critical system field.
     * System fields (is_system_field = true) CANNOT be:
     * - Hidden (is_visible = false)
     * - Deleted
     * - Renamed in a misleading way
     * Protected in seed + enforced by API.
     */
    is_system_field: boolean("is_system_field").notNull().default(false),

    /** Display order in reports and admin config */
    sort_order: integer("sort_order").notNull().default(0),

    /**
     * Which section of the report this field belongs to.
     * E.g. "header", "allocation", "metrics", "disclaimer", "footer"
     */
    section: text("section"),

    /** Optional description for admin UI tooltip */
    description: text("description"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_field_config_system: index("idx_sust_field_config_system").on(
      table.is_system_field,
    ),
    idx_field_config_section: index("idx_sust_field_config_section").on(
      table.section,
    ),
  }),
);

export type SustainabilityReportFieldConfig =
  typeof sustainabilityReportFieldConfigTable.$inferSelect;
export type InsertSustainabilityReportFieldConfig =
  typeof sustainabilityReportFieldConfigTable.$inferInsert;
