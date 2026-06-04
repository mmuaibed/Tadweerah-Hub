import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const companyInvitationsTable = pgTable("company_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .references(() => companiesTable.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  invited_by: text("invited_by").notNull(), // Clerk User ID
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'cancelled' | 'expired'
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  accepted_at: timestamp("accepted_at", { withTimezone: true }),
  cancelled_at: timestamp("cancelled_at", { withTimezone: true }),
  expires_at: timestamp("expires_at", { withTimezone: true }),
}, (t) => ({
  statusCheck: sql`CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired'))`,
  roleCheck: sql`CHECK (role = 'member')`,
  uniquePending: uniqueIndex("company_invitations_unique_pending_email_company")
    .on(t.company_id, sql`lower(${t.email})`)
    .where(sql`status = 'pending'`),
}));

export const companyInvitationsRelations = relations(
  companyInvitationsTable,
  ({ one }) => ({
    company: one(companiesTable, {
      fields: [companyInvitationsTable.company_id],
      references: [companiesTable.id],
    }),
  }),
);
