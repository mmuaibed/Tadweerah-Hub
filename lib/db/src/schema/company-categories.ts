import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

/**
 * Admin-managed lookup table for company business categories.
 * These are DESCRIPTIVE categories (e.g. Manufacturer, Recycler)
 * separate from the platform ROLE (producer/buyer/carrier).
 */
export const companyCategoriesTable = pgTable("company_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name_ar: text("name_ar").notNull(),
  name_en: text("name_en").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
});

export type CompanyCategory = typeof companyCategoriesTable.$inferSelect;
