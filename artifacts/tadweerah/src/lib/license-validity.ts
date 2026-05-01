export type LicenseValidity = "Active" | "ExpiringSoon" | "Expired" | "None";

const EXPIRING_SOON_DAYS = 30;

/**
 * Compute license validity from an ISO date string (YYYY-MM-DD or full ISO).
 * - "None"         — no expiry date provided
 * - "Active"       — more than 30 days until expiry
 * - "ExpiringSoon" — ≤ 30 days until expiry but not yet expired
 * - "Expired"      — past the expiry date
 */
export function computeLicenseValidity(expiryDate?: string | null): LicenseValidity {
  if (!expiryDate || !expiryDate.trim()) return "None";

  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return "None";

  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryMs = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());

  const diffDays = Math.floor((expiryMs - todayMs) / 86_400_000);

  if (diffDays < 0) return "Expired";
  if (diffDays <= EXPIRING_SOON_DAYS) return "ExpiringSoon";
  return "Active";
}

/**
 * Format remaining days for tooltip display.
 */
export function formatDaysUntilExpiry(expiryDate?: string | null, lang: "ar" | "en" = "ar"): string | null {
  if (!expiryDate || !expiryDate.trim()) return null;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return null;

  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryMs = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
  const diffDays = Math.floor((expiryMs - todayMs) / 86_400_000);

  if (diffDays < 0) return null;
  if (diffDays === 0) return lang === "ar" ? "ينتهي اليوم" : "Expires today";
  if (diffDays === 1) return lang === "ar" ? "ينتهي غداً" : "Expires tomorrow";
  return lang === "ar" ? `ينتهي خلال ${diffDays} يوم` : `Expires in ${diffDays} days`;
}
