import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * Lightweight issue/feedback records submitted by users during pilot.
 * Lifecycle: open → in_review → closed  (also accepts legacy "resolved")
 */
export const issueReportsTable = pgTable("issue_reports", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** Clerk user ID of the reporter. */
  user_id: text("user_id").notNull(),

  /** Company of the reporter, if any. */
  company_id: uuid("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),

  /** Optional subject line from the user. */
  subject: text("subject"),

  /** Issue description provided by the user. */
  message: text("message").notNull(),

  /** Optional contact phone provided by the user. */
  phone: text("phone"),

  /** Display name resolved from Clerk at submission time. */
  user_name: text("user_name"),

  /** Primary email resolved from Clerk at submission time. */
  user_email: text("user_email"),

  /** Lifecycle: open → in_review → closed (legacy: resolved). */
  status: text("status").notNull().default("open"),

  /** Internal admin note — not visible to the reporter. */
  admin_note: text("admin_note"),

  /** Set when status transitions to 'closed'. */
  closed_at: timestamp("closed_at", { withTimezone: true }),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IssueReport = typeof issueReportsTable.$inferSelect;
