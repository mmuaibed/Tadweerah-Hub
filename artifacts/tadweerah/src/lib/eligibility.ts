import { computeLicenseValidity } from "./license-validity";

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrored 1-to-1 from the backend eligibility module
// ─────────────────────────────────────────────────────────────────────────────

export type EligibilityReason =
  | "OwnListing"            // producer cannot bid on their own listing
  | "ListingClosed"         // listing status is not "open"
  | "CompanyIncomplete"     // no license submitted (profile incomplete)
  | "CompanyPending"        // license under admin review
  | "CompanyRejected"       // license rejected by admin
  | "CompanyExpired"        // admin-set expired license status
  | "OfferSubmissionBlocked"// admin blocked this company from submitting
  | "TermsNotAccepted"      // T&C not accepted during onboarding
  | "LicenseRequired"       // listing is LICENSED_ONLY, company has no approved MWAN license
  | "LicenseExpired"        // listing is LICENSED_ONLY, expiryDate has passed
  | "MissingCapability"     // company lacks a required service capability (backend-only check)
  | "SensitiveMaterial"     // sensitive material category (backend-only check)
  | "TargetingRestricted";  // listing targeting excludes this company

export interface EligibilityResult {
  allowed: boolean;
  reason: EligibilityReason | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input shapes (lightweight — only what the frontend has available)
// ─────────────────────────────────────────────────────────────────────────────

export interface EligibilityListing {
  status: string;
  company_id?: string | null;
  eligible_company_type?: string | null;
  targeting_type?: string | null;
  target_company_id?: string | null;
}

export interface EligibilityCompany {
  id?: string | null;
  license_status?: string | null;
  license_number?: string | null;
  /** ISO date string from the first license in licenses_json (if available) */
  primary_license_expiry?: string | null;
  /** Pre-computed validity from the /me API response */
  license_validity?: string | null;
  offer_submission_blocked?: boolean | null;
  accepted_terms_at?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure eligibility check — mirrors backend checkPureEligibility() exactly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a company may submit an offer on a listing.
 * Uses only data already available in the browser (no network calls).
 *
 * DB-dependent checks (capability matching, category targeting lookup,
 * sensitive material flag) are NOT run here; the backend enforces those.
 * The frontend uses this result for proactive messaging only.
 */
export function checkEligibility(
  listing: EligibilityListing,
  company: EligibilityCompany | null | undefined,
): EligibilityResult {
  const deny = (reason: EligibilityReason): EligibilityResult => ({ allowed: false, reason });
  const allow: EligibilityResult = { allowed: true, reason: null };

  if (!company?.id) return deny("CompanyIncomplete");

  // 1. Own listing — producer cannot bid
  if (listing.company_id && company.id === listing.company_id) return deny("OwnListing");

  // 2. Listing must be open
  if (listing.status !== "open") return deny("ListingClosed");

  // 3. T&C acceptance
  if (!company.accepted_terms_at) return deny("TermsNotAccepted");

  // 4. Admin submission block
  if (company.offer_submission_blocked) return deny("OfferSubmissionBlocked");

  // 5. Company approval status (admin-controlled)
  const ls = company.license_status;
  if (!ls)               return deny("CompanyIncomplete");
  if (ls === "pending")  return deny("CompanyPending");
  if (ls === "rejected") return deny("CompanyRejected");
  if (ls === "expired")  return deny("CompanyExpired");

  // 6. LICENSED_ONLY listings — require approved + non-expired MWAN license
  if (listing.eligible_company_type === "LICENSED_ONLY") {
    const hasLicense = Boolean(company.license_number) && ls === "approved";
    if (!hasLicense) return deny("LicenseRequired");

    // Use pre-computed validity from API, or compute from expiry date
    const validity =
      company.license_validity ??
      (company.primary_license_expiry
        ? computeLicenseValidity(company.primary_license_expiry)
        : "None");
    if (validity === "Expired") return deny("LicenseExpired");
  }

  // 7. Targeting (specific_company) — pure check
  if (
    listing.targeting_type === "specific_company" &&
    listing.target_company_id &&
    listing.target_company_id !== company.id
  ) {
    return deny("TargetingRestricted");
  }

  return allow;
}
