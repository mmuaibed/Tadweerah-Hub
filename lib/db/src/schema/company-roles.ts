import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { mwanRoleEnum } from "./mwan-role";

/**
 * Multi-role junction table.
 * A company can simultaneously act in multiple MWAN-defined roles.
 * Uses mwanRoleEnum (generator/receiver/transporter) — not the legacy
 * companyTypeEnum (producer/buyer/carrier) that lives on companies.type.
 */
export const companyRolesTable = pgTable(
  "company_roles",
  {
    company_id: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    role: mwanRoleEnum("role").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.company_id, t.role] }),
  }),
);

export type CompanyRole = typeof companyRolesTable.$inferSelect;
