import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * Lightweight issue/feedback records submitted by users during pilot.
 * No ticketing system — inspect via DB for now.
 */
export const issueReportsTable = pgTable("issue_reports", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** Clerk user ID of the reporter. */
  user_id: text("user_id").notNull(),

  /** Company of the reporter, if any. */
  company_id: uuid("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),

  /** Issue description provided by the user. */
  message: text("message").notNull(),

  /** Lifecycle: open → resolved. */
  status: text("status").notNull().default("open"),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IssueReport = typeof issueReportsTable.$inferSelect;
