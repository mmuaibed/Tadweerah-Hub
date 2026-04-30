import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

/**
 * Admin-managed hierarchical material classification.
 * parent_id = null  → top-level category (e.g. Metals)
 * parent_id = <id>  → subcategory (e.g. Aluminum, Copper)
 *
 * New listings reference this table via material_category_id +
 * material_subcategory_id on the waste_listings table.
 * Existing listings keep their legacy material enum value.
 *
 * Taxonomy extension (MWAN-alignment, no integration):
 * regulatory_code — operator-assigned code, e.g. "WC-01", "H15"
 * hazard_level    — 'hazardous' | 'non_hazardous' | 'inert'
 * physical_state  — 'solid' | 'liquid' | 'gas' | 'sludge' | 'mixed'
 */
export const materialCategoriesTable = pgTable("material_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Internal stable key used in logic, eligibility, and filtering. Never changes. */
  key: text("key").notNull().unique(),
  name_ar: text("name_ar").notNull(),
  name_en: text("name_en").notNull(),
  parent_id: uuid("parent_id"),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
  /**
   * Admin-managed flag. When true, any offer on a listing that uses this
   * material category requires the buyer to have license_status = 'approved',
   * even if no specific capability is required by the listing.
   * Evaluated in POST /offers eligibility logic.
   */
  is_sensitive: boolean("is_sensitive").notNull().default(false),

  // ── Regulatory Taxonomy (MWAN-alignment) ────────────────────────────────
  /** Admin-assigned regulatory code, e.g. "WC-01", "H15-METAL". Nullable. */
  regulatory_code: text("regulatory_code"),
  /** Hazard classification: hazardous | non_hazardous | inert */
  hazard_level: text("hazard_level"),
  /** Physical form of the waste stream: solid | liquid | gas | sludge | mixed */
  physical_state: text("physical_state"),
});

export type MaterialCategory = typeof materialCategoriesTable.$inferSelect;
