/**
 * Returns a short human-readable reference ID for a listing UUID.
 * Example: "a3f2b1c4-..." → "#LIST-A3F2B1"
 * Pure function, no DB change required.
 */
export function listingRef(id: string): string {
  return `#LIST-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
