import {
  db,
  dealsTable,
  wasteListingsTable,
  contractShipmentsTable,
  contractMaterialsTable,
  contractsTable,
  sustainabilityReceivedLinesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Safely derives a sustainability received line for a completed deal.
 * Does not block execution on failure.
 */
export async function deriveReceivedLineForDeal(dealId: string): Promise<void> {
  try {
    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal || deal.status !== "completed") return;

    const [listing] = await db
      .select()
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, deal.listing_id))
      .limit(1);

    if (!listing) return;

    let finalQty = deal.actual_quantity;
    let qtySource: "platform_confirmed" | "estimated" = "platform_confirmed";

    if (!finalQty && listing.quantity) {
      finalQty = listing.quantity;
      qtySource = "estimated";
    }
    
    if (!finalQty) {
      console.warn(`[sustainability] Deal ${dealId} has no actual or estimated quantity. Cannot derive line.`);
      return;
    }

    if (!listing.material || !listing.unit) {
      console.warn(`[sustainability] Deal ${dealId} listing has no material or unit. Cannot derive line.`);
      return;
    }

    const numericQty = Number(finalQty);
    let isEligible = true;
    let reason = null;

    if (numericQty <= 0) {
      isEligible = false;
      reason = "non_positive_quantity";
    } else if (listing.is_processed_output !== false) {
      isEligible = false;
      reason = "processed_output_or_unclassified";
    }

    await db
      .insert(sustainabilityReceivedLinesTable)
      .values({
        parent_entity_type: "deal",
        parent_entity_id: deal.id,
        line_seq: 1,
        source_line_type: "listing",
        source_line_id: listing.id,
        seller_company_id: deal.producer_company_id,
        buyer_company_id: deal.buyer_company_id,
        material_category_id: listing.material_category_id,
        material_label: String(listing.material),
        final_received_qty: String(numericQty),
        final_received_unit: listing.unit,
        quantity_source: qtySource,
        location_label: listing.city,
        is_eligible: isEligible,
        ineligibility_reason: reason,
        derived_by: "system:auto_derive",
      })
      .onConflictDoNothing({
        target: [
          sustainabilityReceivedLinesTable.parent_entity_type,
          sustainabilityReceivedLinesTable.parent_entity_id,
          sustainabilityReceivedLinesTable.line_seq,
        ],
      });

  } catch (err) {
    console.error(`[sustainability] Failed to derive received line for deal ${dealId}:`, err);
  }
}

/**
 * Safely derives a sustainability received line for a closed contract shipment.
 * Does not block execution on failure.
 */
export async function deriveReceivedLineForShipment(shipmentId: string): Promise<void> {
  try {
    const [shipment] = await db
      .select()
      .from(contractShipmentsTable)
      .where(eq(contractShipmentsTable.id, shipmentId))
      .limit(1);

    if (!shipment || shipment.status !== "closed") return;

    const [contract] = await db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.id, shipment.contract_id))
      .limit(1);

    if (!contract) return;

    const [material] = await db
      .select()
      .from(contractMaterialsTable)
      .where(eq(contractMaterialsTable.id, shipment.material_line_id))
      .limit(1);

    if (!material) return;

    const finalQty = shipment.final_weight;
    
    if (!finalQty) {
      console.warn(`[sustainability] Shipment ${shipmentId} has no final_weight. Cannot derive line.`);
      return;
    }

    if (!material.material_label || !material.unit_label) {
      console.warn(`[sustainability] Shipment ${shipmentId} material has no material_label or unit_label. Cannot derive line.`);
      return;
    }

    const numericQty = Number(finalQty);
    let isEligible = true;
    let reason = null;

    if (numericQty <= 0) {
      isEligible = false;
      reason = "non_positive_quantity";
    } else if (!material.material_category_id) {
      isEligible = false;
      reason = "unclassified";
    }

    await db
      .insert(sustainabilityReceivedLinesTable)
      .values({
        parent_entity_type: "contract_shipment",
        parent_entity_id: shipment.id,
        line_seq: 1,
        source_line_type: "contract_material",
        source_line_id: material.id,
        seller_company_id: contract.seller_company_id,
        buyer_company_id: contract.buyer_company_id,
        material_category_id: material.material_category_id,
        material_label: material.material_label,
        final_received_qty: String(numericQty),
        final_received_unit: material.unit_label,
        quantity_source: "platform_confirmed",
        location_label: null,
        is_eligible: isEligible,
        ineligibility_reason: reason,
        derived_by: "system:auto_derive",
      })
      .onConflictDoNothing({
        target: [
          sustainabilityReceivedLinesTable.parent_entity_type,
          sustainabilityReceivedLinesTable.parent_entity_id,
          sustainabilityReceivedLinesTable.line_seq,
        ],
      });

  } catch (err) {
    console.error(`[sustainability] Failed to derive received line for shipment ${shipmentId}:`, err);
  }
}
