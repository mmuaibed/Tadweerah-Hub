import { sustainabilityAllocationsTable, sustainabilityAllocationLinesTable, sustainabilityReceivedLinesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { HttpError } from "../middlewares/errorHandler";

export type GuardrailInput = {
  parentEntityType: "contract_shipment" | "deal";
  parentEntityId: string;
  proposedReceivedQty: string | number | null;
};

export type GuardrailResult = 
  | { checked: false; reason: "received_line_not_created" }
  | { checked: true; status: "pass" };

export async function assertReceivedQtyNotBelowAllocated(
  dbOrTx: any,
  input: GuardrailInput
): Promise<GuardrailResult> {
  // Resolve existing received line
  const [receivedLine] = await dbOrTx
    .select({ id: sustainabilityReceivedLinesTable.id })
    .from(sustainabilityReceivedLinesTable)
    .where(
      and(
        eq(sustainabilityReceivedLinesTable.parent_entity_type, input.parentEntityType),
        eq(sustainabilityReceivedLinesTable.parent_entity_id, input.parentEntityId)
      )
    )
    .limit(1);

  if (!receivedLine) {
    return { checked: false, reason: "received_line_not_created" };
  }

  const proposedVal = Number(input.proposedReceivedQty);
  if (!Number.isFinite(proposedVal)) {
    throw new HttpError(
      422,
      "InvalidProposedQuantity",
      "Proposed received quantity must be a valid finite number."
    );
  }
  
  // Sum active finalized non-superseded allocation lines
  // Note: Only allocations with status="finalized" are counted.
  // Excludes draft, needs_review, and superseded.
  const allocations = await dbOrTx
    .select({
      id: sustainabilityAllocationsTable.id,
      quantity: sustainabilityAllocationLinesTable.quantity
    })
    .from(sustainabilityAllocationsTable)
    .innerJoin(
      sustainabilityAllocationLinesTable,
      eq(sustainabilityAllocationLinesTable.allocation_id, sustainabilityAllocationsTable.id)
    )
    .where(
      and(
        eq(sustainabilityAllocationsTable.received_line_id, receivedLine.id),
        eq(sustainabilityAllocationsTable.status, "finalized")
      )
    );

  let finalizedAllocatedQty = 0;
  const affectedAllocationIds = new Set<string>();

  for (const alloc of allocations) {
    finalizedAllocatedQty += Number(alloc.quantity || 0);
    affectedAllocationIds.add(alloc.id);
  }

  // Prevent invalid state: proposed_received_qty < active_finalized_allocated_qty
  // Compare values properly (toFixed up to 3 to avoid floating point issues if necessary, but numeric is fine).
  // E.g., if proposed is 34 and allocated is 35, it throws 409.
  if (Math.round(proposedVal * 1000) < Math.round(finalizedAllocatedQty * 1000)) {
    const delta = proposedVal - finalizedAllocatedQty;
    
    // As requested: business validation error / 409 Conflict
    const err = new HttpError(
      409, 
      "AllocationExceedsReceivedQuantity", 
      "Received quantity cannot be reduced below finalized allocated quantity."
    );
    // Add additional payload details as requested
    (err as any).details = {
      received_line_id: receivedLine.id,
      parent_entity_type: input.parentEntityType,
      parent_entity_id: input.parentEntityId,
      proposed_received_qty: proposedVal,
      finalized_allocated_qty: finalizedAllocatedQty,
      over_allocated_qty: Math.abs(delta),
      delta: delta,
      affected_allocation_ids: Array.from(affectedAllocationIds),
      message_ar: "لا يمكن تخفيض الكمية المستلمة إلى أقل من الكمية المخصصة المعتمدة.",
      message_en: "Received quantity cannot be reduced below finalized allocated quantity."
    };
    
    throw err;
  }

  return { checked: true, status: "pass" };
}
