import { type SustainabilityReceivedLine } from "@workspace/db";

export interface AllocationDraftValidationResult {
  totalAllocated: number;
  allocatedPercentage: number;
  gap: number;
  gapPercentage: number;
  isFullyAllocated: boolean; // within tolerance
}

export function validateAllocationDraft(
  receivedLine: SustainabilityReceivedLine,
  lines: { quantity: number | string }[],
  tolerancePct: number = 0
): AllocationDraftValidationResult {
  const finalReceived = Number(receivedLine.final_received_qty);
  
  if (finalReceived <= 0) {
    return {
      totalAllocated: 0,
      allocatedPercentage: 0,
      gap: 0,
      gapPercentage: 0,
      isFullyAllocated: false,
    };
  }

  const totalAllocated = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const gap = finalReceived - totalAllocated;
  const gapPercentage = (Math.abs(gap) / finalReceived) * 100;
  const allocatedPercentage = (totalAllocated / finalReceived) * 100;

  return {
    totalAllocated,
    allocatedPercentage,
    gap,
    gapPercentage,
    isFullyAllocated: gapPercentage <= tolerancePct
  };
}
