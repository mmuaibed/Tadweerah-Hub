import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n";
import type { LicenseValidity } from "@/lib/license-validity";
import { formatDaysUntilExpiry } from "@/lib/license-validity";

interface MwanLicenseBadgeProps {
  /** Admin-controlled approval status */
  licenseStatus?: string | null;
  /** Auto-computed validity from expiryDate */
  licenseValidity?: LicenseValidity | string | null;
  /** First license's expiry date (for tooltip/detail text) */
  expiryDate?: string | null;
  /** Whether to show the expiry tooltip */
  showExpiry?: boolean;
  size?: "sm" | "md";
}

/**
 * Unified MWAN license badge component.
 *
 * Display rules:
 * - Not approved                       → nothing (caller handles admin status badge separately)
 * - Approved + Active / None           → green "مرخص من موان"
 * - Approved + ExpiringSoon            → yellow "مرخص من موان" + tooltip
 * - Approved + Expired                 → red "ترخيص منتهي"
 */
export function MwanLicenseBadge({
  licenseStatus,
  licenseValidity,
  expiryDate,
  showExpiry = false,
  size = "sm",
}: MwanLicenseBadgeProps) {
  const { t, lang } = useT();

  if (licenseStatus !== "approved") return null;

  const validity = (licenseValidity as LicenseValidity) ?? "None";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  if (validity === "Expired") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 text-red-700 font-semibold ${padding}`}
        title={t("license.validity.expired.title")}
      >
        <ShieldAlert className={iconSize} />
        {t("license.validity.expired.badge")}
      </span>
    );
  }

  if (validity === "ExpiringSoon") {
    const tooltip = showExpiry
      ? formatDaysUntilExpiry(expiryDate, lang) ?? t("license.validity.expiring_soon.tooltip")
      : t("license.validity.expiring_soon.tooltip");
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 font-semibold ${padding}`}
        title={tooltip ?? undefined}
      >
        <Shield className={iconSize} />
        {t("license.mwan.badge")}
        <span className="text-amber-500 opacity-80">⚠</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold ${padding}`}
      title={showExpiry ? (formatDaysUntilExpiry(expiryDate, lang) ?? undefined) : undefined}
    >
      <ShieldCheck className={iconSize} />
      {t("license.mwan.badge")}
    </span>
  );
}
