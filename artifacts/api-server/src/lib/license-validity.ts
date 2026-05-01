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
  // Normalise to start of day in UTC to avoid timezone drift
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryMs = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());

  const diffDays = Math.floor((expiryMs - todayMs) / 86_400_000);

  if (diffDays < 0) return "Expired";
  if (diffDays <= EXPIRING_SOON_DAYS) return "ExpiringSoon";
  return "Active";
}

/**
 * Given the raw licenses_json string from the DB, return the computed validity
 * for the company's primary (first) license.
 */
export function computeCompanyLicenseValidity(licensesJson: string | null | undefined): LicenseValidity {
  if (!licensesJson) return "None";
  try {
    const arr = JSON.parse(licensesJson) as Array<{ expiryDate?: string }>;
    if (!Array.isArray(arr) || arr.length === 0) return "None";
    return computeLicenseValidity(arr[0].expiryDate);
  } catch {
    return "None";
  }
}
