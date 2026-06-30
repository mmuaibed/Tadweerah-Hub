/**
 * Resolves the Actual Sustainability Received Weight (وزن الاستلام الفعلي للاستدامة)
 * by evaluating source and destination weighbridge measurements.
 */
export function resolveSustainabilityPhysicalWeight(
  sourceWeight: string | number | null | undefined,
  destinationWeight: string | number | null | undefined
): string | null {
  const destNum = Number(destinationWeight);
  const isDestValid = !isNaN(destNum) && destNum > 0;

  const srcNum = Number(sourceWeight);
  const isSrcValid = !isNaN(srcNum) && srcNum > 0;

  if (isDestValid) {
    return String(destNum);
  }
  
  if (isSrcValid) {
    return String(srcNum);
  }

  return null;
}
