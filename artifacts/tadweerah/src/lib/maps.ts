/**
 * Resolves the best Google Maps URL for a location.
 *
 * Priority (per product spec):
 * 1. Use `mapsUrl` directly if it is a valid https URL.
 * 2. If `address` (National Address / Location Code) is present, search by address ONLY.
 *    City is NEVER appended to address — the address code is self-contained.
 * 3. If only `city` is present (no address, no mapsUrl), search by city alone.
 * 4. Return null when nothing is available.
 *
 * NOTE: `material_location_notes` (site details) must never be included in the query.
 */
export function buildMapsUrl(
  mapsUrl: string | null | undefined,
  address: string | null | undefined,
  city: string | null | undefined,
): string | null {
  if (mapsUrl && mapsUrl.startsWith("https://")) return mapsUrl;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  if (city) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`;
  return null;
}
