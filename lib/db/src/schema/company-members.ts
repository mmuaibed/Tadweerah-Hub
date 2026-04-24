import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * Members of a company.
 *
 * Rules (Phase 1):
 * - Each user_id may belong to exactly one company (enforced by UNIQUE(user_id)).
 * - The creating user is automatically added as role='owner'.
 * - Owners can invite additional users as role='member'.
 * - Members have the same operational access as owners (no route restrictions in Phase 1).
 * - Only the owner can add/remove members.
 */
export const companyMembersTable = pgTable(
  "company_members",
  {
    company_id: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    /** Clerk user ID of the member. */
    user_id: text("user_id").notNull(),
    /** 'owner' | 'member' */
    role: text("role").notNull().default("member"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("company_members_user_unique").on(t.user_id),
  ],
);

export type CompanyMember = typeof companyMembersTable.$inferSelect;
