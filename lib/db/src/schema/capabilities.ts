/**
 * Admin-managed lookup table for company capabilities.
 *
 * Capabilities describe what a company CAN DO (e.g. collect waste, recycle metal).
 * They are used for eligibility gating, matching, and filtering.
 *
 * Charter rule: `key` is the stable internal identifier used in business logic.
 * Labels (name_ar, name_en) are display-only and may be updated freely.
 */
import { pgTable, text, boolean, integer, uuid } from "drizzle-orm/pg-core";

export const capabilitiesTable = pgTable("capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Stable internal key. Used in logic and eligibility. Never changes. */
  key: text("key").notNull().unique(),
  name_ar: text("name_ar").notNull(),
  name_en: text("name_en").notNull(),
  description_ar: text("description_ar"),
  description_en: text("description_en"),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
});

export type Capability = typeof capabilitiesTable.$inferSelect;
