import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { companyActionsTable } from "./company-actions";

/**
 * Many-to-many join between companies and the action types they've declared.
 * Mirrors company_capabilities but for user-intent actions, not eligibility enforcement.
 */
export const companyActionSelectionsTable = pgTable(
  "company_action_selections",
  {
    company_id: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    action_id: uuid("action_id")
      .notNull()
      .references(() => companyActionsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.company_id, t.action_id] })],
);
