import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Admin-scoped in-app notifications.
 *
 * Separate from company `notifications` table because admin notifications
 * are global (not company-scoped) and have different lifecycle semantics.
 * The existing `notifications` table requires company_id NOT NULL.
 *
 * Append-only in practice; rows are never deleted.
 */
export const adminNotificationsTable = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),

  /**
   * Internal type key. Examples:
   *   sustainability.correction_requested
   *   sustainability.correction_approved
   */
  type: text("type").notNull(),

  title_ar: text("title_ar").notNull(),
  title_en: text("title_en").notNull(),
  body_ar: text("body_ar"),
  body_en: text("body_en"),

  is_read: boolean("is_read").notNull().default(false),

  /** Entity the notification links to */
  related_entity_type: text("related_entity_type"),
  related_entity_id: uuid("related_entity_id"),

  /** Deep link for admin action */
  action_url: text("action_url"),

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  read_at: timestamp("read_at", { withTimezone: true }),
});

export type AdminNotification = typeof adminNotificationsTable.$inferSelect;
export type InsertAdminNotification =
  typeof adminNotificationsTable.$inferInsert;
