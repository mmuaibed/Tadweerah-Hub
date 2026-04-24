/**
 * In-app notifications for company users.
 *
 * Notifications are created by the platform (e.g. when an offer is received,
 * accepted, or rejected) and displayed in the user's notification centre.
 * Each notification is scoped to a company (all users of that company see it).
 */
import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Recipient company. All users of this company can see the notification. */
  company_id: uuid("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  /**
   * Internal type key. Used for grouping and client-side rendering decisions.
   * Examples: offer_received, offer_accepted, offer_rejected, deal_payment_due,
   *           listing_closing_soon, offer_withdrawn
   */
  type: text("type").notNull(),
  title_ar: text("title_ar").notNull(),
  title_en: text("title_en").notNull(),
  body_ar: text("body_ar"),
  body_en: text("body_en"),
  /** Whether all users in this company have read this notification */
  is_read: boolean("is_read").notNull().default(false),
  /** Entity the notification links to (e.g. the listing, offer, or deal) */
  related_entity_type: text("related_entity_type"),
  related_entity_id: uuid("related_entity_id"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  read_at: timestamp("read_at", { withTimezone: true }),
});

export type Notification = typeof notificationsTable.$inferSelect;
