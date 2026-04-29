import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  date,
  index,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

/**
 * Contract lifecycle:
 * draft → pending_confirmation → active → completed | cancelled
 *
 * - draft: seller has created, not yet submitted to buyer
 * - pending_confirmation: seller submitted; waiting for buyer to confirm operational use
 * - active: both parties confirmed; shipments can be created
 * - completed: all shipments in terminal state; seller marks complete
 * - cancelled: either party cancelled; blocked if open shipments exist
 */
export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "pending_confirmation",
  "active",
  "completed",
  "cancelled",
]);

/**
 * Weight policy determines which weight is used as final_weight on shipment close.
 * Fixed at contract creation — never changes during contract lifetime.
 *
 * - source_weight_only: final_weight = source_weight
 * - destination_weight_only: final_weight = destination_weight
 * - dual_source_final: both recorded; final_weight = source_weight
 * - dual_destination_final: both recorded; final_weight = destination_weight
 * - dual_higher_final: both recorded; final_weight = max(source, destination)
 *
 * Variance between source and destination is documented only.
 * No reconciliation, tolerance, or dispute logic.
 */
export const weightPolicyEnum = pgEnum("weight_policy", [
  "source_weight_only",
  "destination_weight_only",
  "dual_source_final",
  "dual_destination_final",
  "dual_higher_final",
]);

export const contractsTable = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Tadweerah-generated immutable reference. Format: TDW-CTR-YYYY-NNNN */
    reference: text("reference").notNull().unique(),

    /** Optional external contract number from seller's own system */
    external_reference: text("external_reference"),

    seller_company_id: uuid("seller_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),

    buyer_company_id: uuid("buyer_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),

    start_date: date("start_date").notNull(),
    end_date: date("end_date"),

    status: contractStatusEnum("status").notNull().default("draft"),
    weight_policy: weightPolicyEnum("weight_policy").notNull(),

    /**
     * The company that initiated/created this contract draft.
     * Determines who can submit (creator) and who must confirm (counterparty).
     * Nullable for backwards-compat with contracts created before this field was added.
     */
    created_by_company_id: uuid("created_by_company_id").references(
      () => companiesTable.id,
      { onDelete: "set null" },
    ),

    /** Optional supporting document URL. Not an e-signature or legal instrument. */
    attachment_url: text("attachment_url"),
    notes: text("notes"),

    /** Timestamp when the buyer confirmed operational use of this contract */
    confirmed_at: timestamp("confirmed_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    cancelled_at: timestamp("cancelled_at", { withTimezone: true }),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_contracts_seller: index("idx_contracts_seller_company_id").on(
      table.seller_company_id,
    ),
    idx_contracts_buyer: index("idx_contracts_buyer_company_id").on(
      table.buyer_company_id,
    ),
    idx_contracts_status: index("idx_contracts_status").on(table.status),
  }),
);

export type Contract = typeof contractsTable.$inferSelect;
export type InsertContract = typeof contractsTable.$inferInsert;
