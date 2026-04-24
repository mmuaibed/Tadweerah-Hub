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
});

export type MaterialCategory = typeof materialCategoriesTable.$inferSelect;
