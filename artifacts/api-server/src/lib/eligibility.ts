import { computeCompanyLicenseValidity } from "./license-validity";

// ─────────────────────────────────────────────────────────────────────────────
// Shared eligibility types
// ─────────────────────────────────────────────────────────────────────────────

export type EligibilityReason =
  | "OwnListing"            // producer cannot bid on their own listing
  | "ListingClosed"         // listing status is not "open"
  | "CompanyIncomplete"     // no license submitted (profile incomplete)
  | "CompanyPending"        // license under admin review
  | "CompanyRejected"       // license rejected by admin
  | "CompanyExpired"        // admin-set expired license status
  | "OfferSubmissionBlocked"// admin-set submission block
  | "TermsNotAccepted"      // T&C not accepted during onboarding
  | "LicenseRequired"       // listing is LICENSED_ONLY, company has no approved MWAN license
  | "LicenseExpired"        // listing is LICENSED_ONLY, license expiryDate has passed
  | "MissingCapability"     // company doesn't have a required service capability
  | "SensitiveMaterial"     // material category is sensitive and requires a license
  | "TargetingRestricted";  // listing is targeted and this company is excluded

export interface EligibilityResult {
  allowed: boolean;
  reason: EligibilityReason | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input shape for the pure (no-DB) check
// ─────────────────────────────────────────────────────────────────────────────

export interface EligibilityListing {
  status: string;
  company_id: string;
  eligible_company_type?: string | null;
  targeting_type?: string | null;
  target_company_id?: string | null;
}

export interface EligibilityCompany {
  id: string;
  license_status?: string | null;
  license_number?: string | null;
  licenses_json?: string | null;
  offer_submission_blocked?: boolean | null;
  accepted_terms_at?: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure eligibility check (no DB queries — mirrors frontend logic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all stateless eligibility checks that do not require DB queries.
 * These mirror the frontend `checkEligibility()` function exactly.
 * DB-dependent checks (targeting category lookup, capability matching,
 * sensitive material flag) must be applied on top in the route handler.
 */
export function checkPureEligibility(
  listing: EligibilityListing,
  company: EligibilityCompany,
): EligibilityResult {
  const deny = (reason: EligibilityReason): EligibilityResult => ({ allowed: false, reason });
  const allow: EligibilityResult = { allowed: true, reason: null };

  // 1. Own listing — producer cannot bid
  if (company.id === listing.company_id) return deny("OwnListing");

  // 2. Listing must be open
  if (listing.status !== "open") return deny("ListingClosed");

  // 3. T&C acceptance
  if (!company.accepted_terms_at) return deny("TermsNotAccepted");

  // 4. Admin submission block
  if (company.offer_submission_blocked) return deny("OfferSubmissionBlocked");

  // 5. Company approval status
  const ls = company.license_status;
  if (!ls)               return deny("CompanyIncomplete");
  if (ls === "pending")  return deny("CompanyPending");
  if (ls === "rejected") return deny("CompanyRejected");
  if (ls === "expired")  return deny("CompanyExpired");

  // 6. LICENSED_ONLY listings — require approved + non-expired MWAN license
  if (listing.eligible_company_type === "LICENSED_ONLY") {
    const hasLicense = Boolean(company.license_number) && ls === "approved";
    if (!hasLicense) return deny("LicenseRequired");

    const validity = computeCompanyLicenseValidity(company.licenses_json);
    if (validity === "Expired") return deny("LicenseExpired");
  }

  // 7. Targeting (specific_company) — pure check when target_company_id is available
  if (
    listing.targeting_type === "specific_company" &&
    listing.target_company_id &&
    listing.target_company_id !== company.id
  ) {
    return deny("TargetingRestricted");
  }

  return allow;
}
