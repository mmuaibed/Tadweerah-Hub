/**
 * Resolves the best Google Maps URL for a location.
 *
 * Priority:
 * 1. Use `mapsUrl` directly if it is a valid https URL.
 * 2. If `address` is present, build a Maps search URL from address + city.
 * 3. Return null — city alone never generates a fallback URL.
 */
export function buildMapsUrl(
  mapsUrl: string | null | undefined,
  address: string | null | undefined,
  city: string | null | undefined,
): string | null {
  if (mapsUrl && mapsUrl.startsWith("https://")) return mapsUrl;
  if (address) {
    const query = [address, city].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
}
