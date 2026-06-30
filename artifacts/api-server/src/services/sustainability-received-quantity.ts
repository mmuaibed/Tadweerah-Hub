import { resolveSustainabilityPhysicalWeight } from "./sustainability-physical-weight";

export type SustainabilityWeightBasis = "destination_weight" | "source_weight" | "unavailable";

export interface SustainabilityReceivedQuantityReadModel {
  actual_sustainability_received_qty: string | null;
  received_qty: string | null;
  actual_sustainability_received_weight: string | null;
  sustainability_weight_basis: SustainabilityWeightBasis;
  is_ready_for_allocation: boolean;
  legacy_final_received_qty: string | null;
  ineligibility_reason: string | null;
}

export interface SustainabilityAllocationMetrics {
  reportable_qty: string | null;
  remaining_qty: string | null;
  coverage_pct: string | null;
  raw_remaining_qty: string | null;
  over_allocated_qty: string | null;
  coverage_raw_pct: string | null;
  remaining_qty_data_risk: boolean;
}

/**
 * Derives the active source of truth for sustainability quantities.
 * Strictly enforces precedence: destination_weight > source_weight.
 * Replaces direct reads of the legacy `final_received_qty` DB column.
 */
export function deriveActualSustainabilityReceivedQtyForLine(
  receivedLine: { 
    final_received_qty: string | null;
    is_eligible?: boolean;
    ineligibility_reason?: string | null;
    parent_entity_type?: string | null;
  },
  parentDetails: {
    destination_weight?: string | number | null;
    source_weight?: string | number | null;
    deal_actual_quantity?: string | number | null;
    listing_quantity?: string | number | null;
    is_processed_output?: boolean | null;
    has_valid_material?: boolean;
  }
): SustainabilityReceivedQuantityReadModel {
  let activeQty: string | null = null;
  let basis: SustainabilityWeightBasis = "unavailable";
  let isReady = false;
  let reason = receivedLine.ineligibility_reason ?? null;

  if (receivedLine.parent_entity_type === "deal") {
    // Deal derivation logic
    if (parentDetails.deal_actual_quantity) {
      activeQty = String(parentDetails.deal_actual_quantity);
      basis = "destination_weight"; // Using actual_quantity as final destination weight proxy
    } else if (parentDetails.listing_quantity) {
      activeQty = String(parentDetails.listing_quantity);
      basis = "source_weight"; // Using listing_quantity as source weight proxy
    }

    const hasQty = Number(activeQty) > 0;
    
    if (reason === "processed_output_or_unclassified") {
      if (parentDetails.is_processed_output === true) {
        reason = "processed_output";
      } else {
        if (hasQty && parentDetails.has_valid_material) {
          isReady = true;
          reason = null;
        } else if (parentDetails.is_processed_output === null) {
          reason = "unclassified";
        }
      }
    } else {
      isReady = hasQty && Boolean(parentDetails.has_valid_material);
      if (!isReady && !reason) reason = "unclassified";
    }

  } else if (receivedLine.parent_entity_type === "contract_shipment") {
    // Shipment derivation logic
    activeQty = resolveSustainabilityPhysicalWeight(parentDetails.source_weight, parentDetails.destination_weight);
    
    if (parentDetails.destination_weight && !isNaN(Number(parentDetails.destination_weight)) && Number(parentDetails.destination_weight) > 0) {
      basis = "destination_weight";
    } else if (parentDetails.source_weight && !isNaN(Number(parentDetails.source_weight)) && Number(parentDetails.source_weight) > 0) {
      basis = "source_weight";
    }

    if (!activeQty) {
      activeQty = "0";
      isReady = false;
      reason = "missing_physical_quantity";
    } else {
      const hasQty = Number(activeQty) > 0;
      if (reason === "non_positive_quantity" || reason === "missing_buyer_quantity") {
        if (!parentDetails.has_valid_material) {
          isReady = false;
          reason = "unclassified";
        } else {
          isReady = hasQty;
          reason = null;
        }
      } else if (reason === "processed_output_or_unclassified") {
        if (!parentDetails.has_valid_material) {
          reason = "unclassified";
        } else {
          isReady = hasQty;
          reason = null;
        }
      } else {
        isReady = hasQty && Boolean(parentDetails.has_valid_material);
        if (!isReady && !reason) reason = "unclassified";
      }
    }
  } else {
    // Fallback to legacy
    activeQty = receivedLine.final_received_qty;
    isReady = Boolean(receivedLine.is_eligible);
  }

  return {
    actual_sustainability_received_qty: activeQty,
    received_qty: activeQty,
    actual_sustainability_received_weight: activeQty,
    sustainability_weight_basis: basis,
    is_ready_for_allocation: isReady,
    legacy_final_received_qty: receivedLine.final_received_qty,
    ineligibility_reason: reason
  };
}

/**
 * Derives the active allocation metrics from the derived received basis.
 */
export function deriveSustainabilityAllocationMetrics(
  receivedQtyStr: string | null,
  allocatedQtyNum: number = 0
): SustainabilityAllocationMetrics {
  const receivedNum = Number(receivedQtyStr);
  const isValidReceived = !isNaN(receivedNum) && receivedNum > 0;
  
  const reportableNum = allocatedQtyNum > 0 ? allocatedQtyNum : 0;
  
  let remainingNum = 0;
  let rawRemainingNum = 0;
  let overAllocatedNum = 0;
  let dataRisk = false;
  let coveragePct: string | null = null;
  let rawCoveragePct: string | null = null;

  if (isValidReceived) {
    rawRemainingNum = receivedNum - reportableNum;
    remainingNum = Math.max(0, rawRemainingNum);
    if (rawRemainingNum < 0) {
      overAllocatedNum = Math.abs(rawRemainingNum);
      dataRisk = true;
    }
    
    const pct = (reportableNum / receivedNum) * 100;
    coveragePct = Math.min(100, pct).toFixed(2);
    rawCoveragePct = pct.toFixed(2);
  }

  return {
    reportable_qty: String(reportableNum),
    remaining_qty: String(remainingNum),
    coverage_pct: coveragePct,
    raw_remaining_qty: String(rawRemainingNum),
    over_allocated_qty: String(overAllocatedNum),
    coverage_raw_pct: rawCoveragePct,
    remaining_qty_data_risk: dataRisk,
  };
}
