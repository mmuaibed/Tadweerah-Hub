import { useMemo } from "react";
import { useT } from "@/i18n";
import { checkEligibility, type EligibilityReason, type EligibilityResult } from "@/lib/eligibility";
import type { EligibilityListing, EligibilityCompany } from "@/lib/eligibility";

export type { EligibilityReason, EligibilityResult };

// ─────────────────────────────────────────────────────────────────────────────
// Enriched result returned by the hook
// ─────────────────────────────────────────────────────────────────────────────

export interface EligibilityDecision extends EligibilityResult {
  /** Short heading for the blocking UI panel */
  title: string | null;
  /** Explanatory message for the blocking UI panel */
  message: string | null;
  /** Severity: used for colouring the blocking panel */
  severity: "info" | "warning" | "error" | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reason → severity mapping
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<EligibilityReason, EligibilityDecision["severity"]> = {
  OwnListing:             "info",
  ListingClosed:          "info",
  CompanyIncomplete:      "warning",
  CompanyPending:         "info",
  CompanyRejected:        "error",
  CompanyExpired:         "error",
  OfferSubmissionBlocked: "error",
  TermsNotAccepted:       "warning",
  LicenseRequired:        "info",
  LicenseExpired:         "error",
  MissingCapability:      "warning",
  SensitiveMaterial:      "warning",
  TargetingRestricted:    "info",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Centralised eligibility hook.
 *
 * Usage:
 * ```tsx
 * const { allowed, reason, title, message, severity } = useEligibility(listing, me?.company);
 * ```
 *
 * Pass `listing` and `company` — both should be the raw API shapes.
 * Returns a stable, memoised decision object on every render.
 */
export function useEligibility(
  listing: EligibilityListing | null | undefined,
  company: EligibilityCompany | null | undefined,
): EligibilityDecision {
  const { t } = useT();

  return useMemo<EligibilityDecision>(() => {
    if (!listing) {
      return { allowed: false, reason: null, title: null, message: null, severity: null };
    }

    const result = checkEligibility(listing, company);

    if (result.allowed || !result.reason) {
      return { allowed: true, reason: null, title: null, message: null, severity: null };
    }

    const r = result.reason;
    const titleKey = `eligibility.${r}.title` as const;
    const descKey  = `eligibility.${r}.desc`  as const;

    return {
      allowed:  false,
      reason:   r,
      title:    t(titleKey),
      message:  t(descKey),
      severity: SEVERITY_MAP[r],
    };
  }, [listing, company, t]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export input types for consumers
// ─────────────────────────────────────────────────────────────────────────────

export type { EligibilityListing, EligibilityCompany };
