export function listingRef(id: string): string {
  return `#LIST-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/**
 * Returns a customer-facing deal reference derived from the deal UUID and creation year.
 * Example: deal id "a3f2b1c4-..." created in 2026 → "TDW-2026-A3F2B1"
 * Pure function, no schema change required.
 */
export function dealRef(id: string, createdAt?: string): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `TDW-${year}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
