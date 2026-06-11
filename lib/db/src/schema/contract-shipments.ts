import {
  pgTable,
  text,
  uuid,
  numeric,
  pgEnum,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { contractsTable } from "./contracts";
import { contractMaterialsTable } from "./contract-materials";

/**
 * Shipment lifecycle:
 * planned → dispatched → received → closed | cancelled
 *
 * Terminal states: closed, cancelled.
 * closed shipments are immutable — final_weight and final_value cannot be edited.
 * cancelled is only allowed from planned or dispatched.
 */
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "planned",
  "dispatched",
  "received",
  "closed",
  "cancelled",
]);

export const contractShipmentsTable = pgTable(
  "contract_shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Tadweerah-generated immutable reference. Format: TDW-CTR-YYYY-NNNN-SMMM */
    reference: text("reference").notNull().unique(),

    contract_id: uuid("contract_id")
      .notNull()
      .references(() => contractsTable.id, { onDelete: "restrict" }),

    /** Which material line of the contract this shipment belongs to */
    material_line_id: uuid("material_line_id")
      .notNull()
      .references(() => contractMaterialsTable.id, { onDelete: "restrict" }),

    status: shipmentStatusEnum("status").notNull().default("planned"),

    /**
     * Source (seller-side) weight in the unit defined by the material line.
     * Required when weight_policy is source_weight_only, dual_source_final,
     * dual_destination_final, or dual_higher_final.
     */
    source_weight: numeric("source_weight", { precision: 12, scale: 3 }),

    /** Optional evidence uploaded during dispatch */
    source_ticket_url: text("source_ticket_url"),
    source_ticket_uploaded_by_company_id: uuid("source_ticket_uploaded_by_company_id"),

    /**
     * Destination (buyer-side) weight.
     * Required when weight_policy is destination_weight_only, dual_source_final,
     * dual_destination_final, or dual_higher_final.
     */
    destination_weight: numeric("destination_weight", {
      precision: 12,
      scale: 3,
    }),

    /** Optional evidence uploaded during receive */
    destination_ticket_url: text("destination_ticket_url"),
    destination_ticket_uploaded_by_company_id: uuid("destination_ticket_uploaded_by_company_id"),

    /**
     * Computed at close from weight_policy + recorded weights. Immutable after close.
     * source_weight_only / dual_source_final → source_weight
     * destination_weight_only / dual_destination_final → destination_weight
     * dual_higher_final → max(source_weight, destination_weight)
     */
    final_weight: numeric("final_weight", { precision: 12, scale: 3 }),

    /**
     * Computed at close: final_weight × material_line.price_per_unit. Immutable after close.
     */
    final_value: numeric("final_value", { precision: 14, scale: 3 }),

    notes: text("notes"),

    /** Set when shipment is created */
    planned_at: timestamp("planned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dispatched_at: timestamp("dispatched_at", { withTimezone: true }),
    received_at: timestamp("received_at", { withTimezone: true }),
    closed_at: timestamp("closed_at", { withTimezone: true }),
    cancelled_at: timestamp("cancelled_at", { withTimezone: true }),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_shipments_contract: index("idx_shipments_contract_id").on(
      table.contract_id,
    ),
    idx_shipments_material: index("idx_shipments_material_line_id").on(
      table.material_line_id,
    ),
    idx_shipments_status: index("idx_shipments_status").on(table.status),
  }),
);

export type ContractShipment = typeof contractShipmentsTable.$inferSelect;
export type InsertContractShipment =
  typeof contractShipmentsTable.$inferInsert;
