import {
  pgTable,
  text,
  uuid,
  numeric,
  integer,
  timestamp,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { contractsTable } from "./contracts";
import { materialCategoriesTable } from "./material-categories";
import { unitOptionsTable } from "./unit-options";

/**
 * A single material line within a contract.
 * One contract can have multiple material lines (e.g. Plastic, Metal, Furniture).
 *
 * Immutability rule: lines are locked once the contract leaves draft status.
 * material_label and unit_label are stored at creation time to preserve audit
 * integrity if the referenced lookup entry is later renamed or deactivated.
 *
 * Revenue share (seller_pct / buyer_pct) is passive stored data only.
 * No calculation or verification logic.
 */
export const contractMaterialsTable = pgTable(
  "contract_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    contract_id: uuid("contract_id")
      .notNull()
      .references(() => contractsTable.id, { onDelete: "cascade" }),

    /** Optional FK to material_categories lookup. Nullable to allow free-text only. */
    material_category_id: uuid("material_category_id").references(
      () => materialCategoriesTable.id,
      { onDelete: "restrict" },
    ),

    /** Required display label stored at creation time. Preserved even if category is renamed. */
    material_label: text("material_label").notNull(),

    /** Optional FK to unit_options lookup. Nullable to allow free-text only. */
    unit_option_id: uuid("unit_option_id").references(
      () => unitOptionsTable.id,
      { onDelete: "restrict" },
    ),

    /** Required display label stored at creation time. Preserved even if unit is renamed. */
    unit_label: text("unit_label").notNull(),

    price_per_unit: numeric("price_per_unit", {
      precision: 12,
      scale: 3,
    }).notNull(),

    /** Optional passive revenue share percentage for the seller. No enforcement logic. */
    seller_pct: numeric("seller_pct", { precision: 5, scale: 2 }),

    /** Optional passive revenue share percentage for the buyer. No enforcement logic. */
    buyer_pct: numeric("buyer_pct", { precision: 5, scale: 2 }),

    sort_order: integer("sort_order").notNull().default(0),

    /**
     * Determines eligibility for sustainability diversion reporting.
     * Mirrors waste_listings.is_processed_output.
     * false = original generator waste (eligible).
     * true = processed output (ineligible - prevents double-counting).
     * null = unknown/pending classification (ineligible until classified).
     * Defaults to null (no default false).
     */
    is_processed_output: boolean("is_processed_output"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_contract_materials_contract: index(
      "idx_contract_materials_contract_id",
    ).on(table.contract_id),
  }),
);

export type ContractMaterial = typeof contractMaterialsTable.$inferSelect;
export type InsertContractMaterial =
  typeof contractMaterialsTable.$inferInsert;
