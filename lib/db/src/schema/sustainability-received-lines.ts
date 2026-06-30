import {
  pgTable,
  text,
  uuid,
  numeric,
  boolean,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { materialCategoriesTable } from "./material-categories";

/**
 * The parent entity type that this received line belongs to.
 * Extensible for future transaction types.
 */
export const receivedLineParentTypeEnum = pgEnum(
  "sust_received_line_parent_type",
  ["deal", "auction", "contract", "contract_shipment", "manual"],
);

/**
 * Where this line was sourced from within the parent entity.
 * - listing        → derived from the deal's linked waste_listing
 * - contract_material → derived from the shipment's linked contract_material_line
 * - manual         → manually entered by admin or buyer (future)
 */
export const receivedLineSourceTypeEnum = pgEnum(
  "sust_received_line_source_type",
  ["listing", "contract_material", "manual"],
);

/**
 * How the quantity was determined.
 * - platform_confirmed → from deal.actual_quantity or shipment.final_weight
 * - estimated          → from deal.estimated_amount / listing quantity (fallback)
 * - manual_entry       → entered by buyer/admin
 */
export const quantitySourceEnum = pgEnum("sust_quantity_source", [
  "platform_confirmed",
  "estimated",
  "manual_entry",
]);

/**
 * Sustainability received lines — the canonical grain for sustainability reporting.
 *
 * Each row represents one material/category line received in a completed transaction.
 * Current system: one line per deal or contract shipment (single-material).
 * Future: multiple lines per deal/shipment when multi-material is supported.
 *
 * Key design decisions (v1.1):
 * - This is the unit of sustainability allocation, NOT the deal or shipment
 * - `final_received_qty` is the basis for pathway allocation (not commercial value)
 * - `is_eligible` is false when quantity = 0, listing.is_processed_output != false, etc.
 */
export const sustainabilityReceivedLinesTable = pgTable(
  "sustainability_received_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ── Parent reference ──────────────────────────────────────────────────

    /** The type of parent entity (deal, contract_shipment, future types) */
    parent_entity_type: receivedLineParentTypeEnum("parent_entity_type").notNull(),

    /** The ID of the parent entity */
    parent_entity_id: uuid("parent_entity_id").notNull(),

    /**
     * Sequence number within the parent entity. 1-based.
     * Currently always 1 (single-material). Future multi-material: 1, 2, 3...
     */
    line_seq: integer("line_seq").notNull().default(1),

    // ── Source reference (where this line was derived from) ────────────────

    /** The type of source record (listing, contract_material, manual) */
    source_line_type: receivedLineSourceTypeEnum("source_line_type").notNull(),

    /** The ID of the source record (waste_listings.id or contract_materials.id) */
    source_line_id: uuid("source_line_id"),

    // ── Counterparty references ──────────────────────────────────────────

    /** The seller/generator company */
    seller_company_id: uuid("seller_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),

    /** The buyer/processor company */
    buyer_company_id: uuid("buyer_company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),

    // ── Material details ─────────────────────────────────────────────────

    /**
     * Optional FK to material_categories for structured taxonomy lookup.
     * Nullable — legacy deals may not have a category ID.
     */
    material_category_id: uuid("material_category_id").references(
      () => materialCategoriesTable.id,
      { onDelete: "set null" },
    ),

    /**
     * Frozen material display label at time of derivation.
     * Preserved even if the referenced category is later renamed.
     */
    material_label: text("material_label").notNull(),

    // ── Quantity ──────────────────────────────────────────────────────────

    /**
     * The final confirmed received quantity — basis for sustainability allocation.
     * This is the Actual Sustainability Received Weight, NOT commercial value.
     */
    final_received_qty: numeric("final_received_qty", {
      precision: 12,
      scale: 3,
    }).notNull(),

    /**
     * The unit of measurement for final_received_qty.
     * Frozen at derivation time (e.g. "kg", "ton").
     */
    final_received_unit: text("final_received_unit").notNull(),

    /** How the quantity was determined */
    quantity_source: quantitySourceEnum("quantity_source").notNull(),

    // ── Location (future-ready) ──────────────────────────────────────────

    /** Optional location/city where the material was received */
    location_label: text("location_label"),

    // ── Eligibility ──────────────────────────────────────────────────────

    /**
     * @deprecated This field is a legacy cache and is NOT authoritative.
     * It does not reliably indicate allocation or reporting eligibility.
     * Use dynamically derived `is_ready_for_allocation` in the API instead.
     */
    is_eligible: boolean("is_eligible").notNull().default(true),

    /** 
     * @deprecated Legacy field.
     * Human-readable reason if not eligible 
     */
    ineligibility_reason: text("ineligibility_reason"),

    // ── Evidence metadata (future-ready) ─────────────────────────────────

    /**
     * JSONB array of evidence references (weighbridge tickets, photos, etc.)
     * Future-ready — not required in MVP.
     * Format: [{ type: "weighbridge_ticket", url: "...", uploaded_at: "..." }, ...]
     */
    evidence_metadata: jsonb("evidence_metadata"),

    // ── Derivation audit ─────────────────────────────────────────────────

    /** When this line was auto-derived or manually created */
    derived_at: timestamp("derived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /** Who/what created this line: "system:auto_derive", "admin:<user_id>", "buyer:<user_id>" */
    derived_by: text("derived_by").notNull().default("system:auto_derive"),

    /** Optional notes about this line */
    notes: text("notes"),

    // ── Timestamps ──────────────────────────────────────────────────────

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    idx_received_parent: index("idx_sust_received_parent").on(
      table.parent_entity_type,
      table.parent_entity_id,
    ),
    idx_received_buyer: index("idx_sust_received_buyer_company").on(
      table.buyer_company_id,
    ),
    idx_received_seller: index("idx_sust_received_seller_company").on(
      table.seller_company_id,
    ),
    idx_received_eligible: index("idx_sust_received_eligible").on(
      table.is_eligible,
    ),
    idx_received_material: index("idx_sust_received_material_cat").on(
      table.material_category_id,
    ),
    uq_received_parent_line: uniqueIndex("uq_sust_received_parent_line").on(
      table.parent_entity_type,
      table.parent_entity_id,
      table.line_seq,
    ),
  }),
);

export type SustainabilityReceivedLine =
  typeof sustainabilityReceivedLinesTable.$inferSelect;
export type InsertSustainabilityReceivedLine =
  typeof sustainabilityReceivedLinesTable.$inferInsert;
