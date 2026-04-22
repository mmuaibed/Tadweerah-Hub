export function listingRef(id: string): string {
  return `#LIST-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
