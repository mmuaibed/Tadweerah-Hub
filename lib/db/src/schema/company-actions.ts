import { pgTable, text, uuid, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Admin-managed lookup table of company action types (user intent declarations).
 * Separate from `capabilities` (eligibility/enforcement).
 * Used for onboarding UX and future filtering.
 */
export const companyActionsTable = pgTable("company_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name_ar: text("name_ar").notNull(),
  name_en: text("name_en").notNull(),
  description_ar: text("description_ar"),
  description_en: text("description_en"),
  requires_license: boolean("requires_license").notNull().default(false),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
});

export type CompanyAction = typeof companyActionsTable.$inferSelect;
