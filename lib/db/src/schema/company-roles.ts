import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { companiesTable, companyTypeEnum } from "./companies";

/**
 * Multi-role junction table.
 * A company can simultaneously act as producer, buyer, and/or carrier.
 * Display labels map MWAN terminology: producer=generator, buyer=receiver, carrier=transporter.
 */
export const companyRolesTable = pgTable(
  "company_roles",
  {
    company_id: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    role: companyTypeEnum("role").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.company_id, t.role] }),
  }),
);

export type CompanyRole = typeof companyRolesTable.$inferSelect;
