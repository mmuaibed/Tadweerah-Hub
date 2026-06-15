import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const adminFindingsTable = pgTable("admin_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  area: text("area").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
  source_label: text("source_label"),
  description: text("description"),
  internal_notes: text("internal_notes"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
