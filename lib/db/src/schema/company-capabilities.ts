import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { capabilitiesTable } from "./capabilities";

/**
 * Join table: which capabilities a company has declared.
 * Used for matching, display, and future eligibility gating.
 *
 * Charter rule: capability matching is done via capabilitiesTable.key,
 * never by capability name.
 */
export const companyCapabilitiesTable = pgTable(
  "company_capabilities",
  {
    company_id: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    capability_id: uuid("capability_id")
      .notNull()
      .references(() => capabilitiesTable.id, { onDelete: "cascade" }),
  },
  (t) => [unique("company_capability_unique").on(t.company_id, t.capability_id)],
);

export type CompanyCapability = typeof companyCapabilitiesTable.$inferSelect;
