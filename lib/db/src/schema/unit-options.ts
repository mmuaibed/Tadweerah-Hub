import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

/**
 * Admin-managed lookup table for units of measurement.
 * Replaces the hardcoded wasteUnitEnum for new listings.
 * Existing listings keep their enum value; new listings reference this table.
 */
export const unitOptionsTable = pgTable("unit_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Internal stable key used in logic and filtering (e.g. "kg", "ton"). Never changes. */
  key: text("key").notNull().unique(),
  name_ar: text("name_ar").notNull(),
  name_en: text("name_en").notNull(),
  symbol: text("symbol").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
});

export type UnitOption = typeof unitOptionsTable.$inferSelect;
