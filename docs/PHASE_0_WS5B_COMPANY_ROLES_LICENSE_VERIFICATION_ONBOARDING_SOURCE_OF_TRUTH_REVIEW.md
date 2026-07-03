# WS5-B — Company, Roles, License, Verification & Onboarding Source-of-Truth Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit)
**Method:** WS2/WS3 evidence plus **read-only source-code inspection** of `artifacts/api-server/src/routes/{companies,listings,offers}.ts`, `artifacts/api-server/src/middlewares/requireCompany.ts`, `lib/db/src/schema/{companies,company-roles,mwan-role,company-actions,company-action-selections}.ts`, and prior WS5-A conclusions. **No new live UI actions.** No code/config changes, no DB access, no admin action, no commits, no deploys, no transport/shipment click, no receipt/completion action.

---

## 1. Executive Summary

Company onboarding is gated by a single, clean, well-documented authorization primitive (`requireCompany()`) that treats listing creation and offer submission **identically** — both require `license_status = "approved"` for mutating actions. What looks like "duplicated" role/activity concepts at onboarding is, on inspection, **four distinct, individually well-documented data model concepts** stacked in one UI screen: a legacy field, a real regulatory classification, a purely descriptive "intent" field, and a separate (not directly examined here) capability/eligibility system. None of this is broken code — it's under-communicated design. The one genuine structural gap is bilingual company data: `companies.name` and `companies.city` are single plain-text columns with no language dimension at all, so the WS2 bilingual-display bug is a **schema limitation**, not a display bug that a UI fix alone could resolve.

---

## 2. Company Data Source-of-Truth Map

| Field | Captured at onboarding? | Required/Optional | Storage | Later used for |
|---|---|---|---|---|
| `name` | Yes | Required (2-120 chars, server-validated) | `companies.name` — single `text`, `NOT NULL`, no language column | Displayed everywhere verbatim; **no separate ar/en value exists** |
| `city` | Yes | Required (2-80 chars, server-validated) | `companies.city` — single `text`, `NOT NULL` | Same as name; free-text, no master-data lookup |
| `contactPhone` | Yes | Required | `companies.contactPhone` | Contact display on deal counterparty screens |
| `commercialRegistration` (CR) | Yes | Effectively required for marketplace participation (see §4) | `companies.commercialRegistration` — nullable `text` | Gate input for `is_verified`/`buyer_is_verified` formula |
| `license_number` | Yes, at onboarding step "Licenses" | Labeled optional in UI | `companies.license_number` | Reviewed by admin; drives `license_status` transition |
| `license_status` | Not user-entered — system/admin-controlled | N/A | `companies.license_status` enum (`null`/`pending`/`approved`/`rejected`/`expired`) | **The single authorization gate** for listing creation and offer submission (see §4) |
| MWAN role(s) | Yes, onboarding step "Activity & Roles" | Required (at least one) | `company_roles` junction table, `mwan_role` enum (`generator`/`receiver`/`transporter`) | Some deal-panel display logic (e.g., transport-responsibility role checks in WS5-A); real regulatory classification |
| Legacy `type` | **Not separately entered** — auto-derived from the MWAN role selection via a mapping table | N/A (system-derived) | `companies.type` enum (`producer`/`buyer`/`carrier`) | Still actively used in at least one live query (buyer-notification targeting, `listings.ts` line 819) |
| "Activities" (sell/buy/process/transport) | Yes, same onboarding step, presented alongside roles | Required (at least one) | `company_action_selections` → `company_actions` lookup table | **Explicitly documented as "user intent... not eligibility enforcement... onboarding UX and future filtering"** — not used to gate anything today |
| Capabilities | Not part of this test company's onboarding flow observed | — | `company_capabilities` (separate system, not deeply examined in this pass) | **The actual eligibility/enforcement mechanism** referenced by name in the `company_actions` code comment, and confirmed live in `listings.ts` (`svc.requires_license` check, lines 566-575) |
| Company category | Yes | Optional | `companies.company_category_id` | Descriptive/filtering only, not examined further here |

## 3. Roles / Activities / License Terminology Map

**Four distinct concepts exist, not two, and each has a clear, separate documented purpose in code — but nothing in the onboarding UI itself explains this separation to the user.**

1. **MWAN role** (`generator` / `receiver` / `transporter`, `company_roles` table) — the real, MWAN-eManifest-aligned regulatory classification. Multi-select by design ("a company can simultaneously act in multiple MWAN-defined roles" — `company-roles.ts` comment).
2. **Legacy `type`** (`producer` / `buyer` / `carrier`, `companies.type` column) — **not a second user choice.** It is silently, automatically derived from the MWAN role selection via an explicit bidirectional mapping table in `companies.ts` (`LEGACY_TO_MWAN` / `MWAN_TO_LEGACY`, lines 118-126). Kept "for backward compatibility" per the schema comment, and confirmed **still actively read** by at least one live query.
3. **"Activities"** (sell/buy/process/transport materials, `company_actions`/`company_action_selections`) — explicitly commented in both the schema file and the route handler as **"user intent declarations," "not eligibility enforcement," used for "onboarding UX and future filtering."** This is intentionally descriptive-only, by design, today.
4. **Capabilities** (`company_capabilities`) — the actual mechanism referenced when the code needs to enforce something license-related on a per-service basis (`svc.requires_license` check in `listings.ts`). Not deeply traced in this pass (out of the given evidence/code scope), but its existence and stated purpose ("eligibility/enforcement") is confirmed via the `company_actions` comment that explicitly distinguishes itself from it.

**Classification: not duplicated/confusing fields by engineering accident — each has a distinct, documented purpose.** The confusion is a **communication/UX gap**: the onboarding screen presents #1 and #3 side by side with visually equal weight, giving no indication that one drives real classification and multi-role permissions while the other currently does nothing beyond being stored for "future filtering."

## 4. Eligibility and Authorization Matrix

| Action | Gate | Enforcement point | Notes |
|---|---|---|---|
| Create listing | `requireAuth` + `requireCompany()` (default options — no `allowUnapproved`) | `listings.ts` `POST /listings`, backed by `requireCompany.ts` | Blocks `rejected` (always), `null`/`pending` (unless approved) |
| Browse listings | `requireAuth` + `requireCompany()` | `listings.ts` `GET /listings` | Same default gate — a `GET`, so **not** subject to the mutation-only approval check (see below) |
| Submit offer | `requireAuth` + `requireCompany()` (default options) | `offers.ts` `POST /listings/:id/offers` | **Same gate as listing creation** — this corrects the WS5-A working assumption that offer submission was ungated; it uses the identical shared middleware with identical default behavior |
| Accept/reject offer | `requireAuth` + `requireCompany()` | `offers.ts` `POST /offers/:id/accept` / `/reject` | Same gate |
| View/access deal pages | `requireAuth` + `requireCompany()` | `deals.ts` routes (per WS5-A trace) | Same gate |
| Update own company profile | `requireAuth` + `requireCompany({ allowUnapproved: true })` | (profile update routes) | **Deliberately exempted** so an unapproved company can still submit its own data for review — this is the one place the default gate is intentionally relaxed |

**Key correction to WS5-A:** `requireCompany.ts`'s own documentation (lines 30-38) is unambiguous: *"Approval gate (applied to all non-GET/HEAD requests): rejected → always blocked; null → blocked unless allowUnapproved=true; pending → blocked unless allowUnapproved=true; approved → always allowed."* Since offer submission is a `POST` using the default (no `allowUnapproved`) options, **it is gated exactly the same way listing creation is.** The earlier open question ("is offer submission deliberately ungated relative to listing creation?") is **resolved: no, it is not ungated — both share one identical authorization primitive.**

**What this means for the live-observed `buyer_is_verified: false` at offer-creation time:** given the offer request succeeded (`201`, not `403`), Receiver Co's `license_status` **must** have already been something other than `null`/`pending`/`rejected` at that exact moment (i.e., already `"approved"`, consistent with the founder's confirmation that both test companies were approved). The `false` value in that specific response is therefore most plausibly explained by the **other half** of the verification formula — `commercialRegistration` reading as empty/falsy in that particular query — rather than by `license_status` timing. This is a narrower, still-open technical detail (not reopening the founder-closed verification finding, which remains closed), noted in §7 for anyone who later wants to trace it further; it does not change the "not a bug, explained by approval status" conclusion the founder has already confirmed.

**Frontend vs. backend enforcement:** the frontend's `RouteGuard`/`CompanyRoute` (per WS1's earlier code mapping) only checks *whether a company exists*, not its `license_status` — the actual approval gate is enforced **entirely server-side**, in `requireCompany.ts`. The frontend's role is limited to interpreting the resulting `403` error codes (`CompanyIncomplete`/`CompanyPending`/`CompanyRejected`) and, per the earlier WS3 findings, doing so with a **generic, unhelpful message** rather than surfacing the specific reason.

## 5. Confirmed Findings

1. **Onboarding fields are minimal and clearly validated** — name/city/phone with simple length checks, CR optional-but-effectively-required, license number genuinely optional at entry (approval is what's required, not the license number itself, per §4's gate logic being keyed on `license_status` not `license_number` presence).
2. **`companies.type` is not a duplicate user decision** — it's silently derived from the MWAN role choice via an explicit mapping table. Not a source of data inconsistency by itself.
3. **"Activities" are confirmed decorative/future-use only**, by the code's own documentation, in two independent places (schema comment and route-handler comment).
4. **Offer submission and listing creation share one identical authorization gate** — corrects the WS5-A assumption of an asymmetry.
5. **`companies.name`/`companies.city` have no bilingual storage capability at all** — confirmed structurally, not inferred (see §7).

## 6. Items That Are Expected Behavior But Need Documentation

- The four-concept role/activity/type/capability model (§3) — expected, intentional, but undocumented to the end user.
- `companies.type`'s auto-derivation from MWAN role — expected, but invisible; a curious engineer reading the API response would see a field they never explicitly set.
- The identical listing/offer approval gate (§4) — expected and consistent, but the generic frontend error messaging (already flagged in WS3) means users can't easily tell this is happening.
- License number being optional at entry while `license_status` approval is the real, non-optional gate — expected design (admin can approve/reject even without every field filled?), but this two-step relationship (submit optionally → get gated on approval regardless) is not explained anywhere in the UI.

## 7. Unknowns Requiring Later Founder/Product Decision

1. **Why did `buyer_is_verified` read `false` at offer-creation despite `license_status` apparently already being non-blocking at that moment?** (§4) — most likely explained by `commercialRegistration` being empty in that specific read; not independently confirmed. Low priority given the founder has already closed the broader verification finding.
2. **Whether `capabilities`/`company_capabilities` should be more directly connected to the "Activities" concept** — right now they are explicitly described as separate systems, but a founder/product decision may be wanted on whether "Activities" should eventually feed into real eligibility (per the schema comment's own "and future filtering" language, which suggests this was anticipated).
3. **Whether `companies.type` should eventually be removed** now that its only remaining necessity (a specific notification-targeting query) could presumably be rewritten against `company_roles` — an engineering cleanup decision, not urgent.

## 8. Onboarding UX Findings (Consolidated From WS2)

- **No personal full-name field exists anywhere** — only email + password captured for account creation; both test dashboards greet by company name.
- **Activities/roles confusion** — now explained in code terms (§3) but still a real UX-clarity gap for end users, who see no indication that one set of checkboxes matters more than the other.
- **MWAN/license ambiguity** — the license-number field is optional at entry, but the true gate is `license_status` approval, which the UI never explains is coming or how to prepare for it.
- **Free-text city typo acceptance** — "dammmam" passed a 2-80 character length check with no other validation, then propagated through onboarding summary, dashboard, and later deal counterparty data (three+ screens).
- **Verification email deliverability** — the Receiver Co onboarding verification email was auto-classified as Junk/Spam by Outlook, a real-world first-run risk.
- **Dashboard bilingual data issue** — company name/city entered in one language render as raw, untranslated text regardless of the viewer's selected UI language, now confirmed as a schema limitation (§2), not fixable by UI logic alone.

## 9. Engineering Trace Table

| Area | File | Line(s) | Symbol |
|---|---|---|---|
| Onboarding form (frontend) | `artifacts/tadweerah/src/pages/onboarding.tsx` | (per WS1/WS2 mapping) | Multi-step wizard |
| Company creation (backend) | `artifacts/api-server/src/routes/companies.ts` | 41-56, 109-126, 182-196 | `POST /companies` |
| Company profile storage | `lib/db/src/schema/companies.ts` | 27-33 | `companiesTable` |
| MWAN role storage | `lib/db/src/schema/company-roles.ts`, `mwan-role.ts` | full files | `companyRolesTable`, `mwanRoleEnum` |
| Legacy type derivation | `artifacts/api-server/src/routes/companies.ts` | 114-126 | `LEGACY_TO_MWAN` / `MWAN_TO_LEGACY` |
| "Activities" storage (non-enforcing) | `lib/db/src/schema/company-actions.ts`, `company-action-selections.ts` | full files | `companyActionsTable`, `companyActionSelectionsTable` |
| Activities captured at creation | `artifacts/api-server/src/routes/companies.ts` | 109-112, 182 | `action_ids` |
| `license_status` enum + lifecycle | `lib/db/src/schema/companies.ts` | 15-25, 55-59 | `licenseStatusEnum` |
| Approval gate (shared, listings + offers) | `artifacts/api-server/src/middlewares/requireCompany.ts` | 1-99 | `requireCompany()` |
| Listing-creation approval gate usage | `artifacts/api-server/src/routes/listings.ts` | 504-543 | `POST /listings` |
| Offer-submission approval gate usage | `artifacts/api-server/src/routes/offers.ts` | 409-414 | `POST /listings/:id/offers` |
| Capability-based license enforcement (separate system) | `artifacts/api-server/src/routes/listings.ts` | 566-596 | `svc.requires_license`, `matCat.is_sensitive` checks |
| Legacy `type` still in live use | `artifacts/api-server/src/routes/listings.ts` | 813-819 | buyer-notification targeting query |
| Verification formula (offer) | `artifacts/api-server/src/routes/offers.ts` | 61 | `buyerIsVerified` |
| Verification formula (deal) | `artifacts/api-server/src/routes/deals.ts` | 30 | `isVerified` |
| City/name storage (no bilingual columns) | `lib/db/src/schema/companies.ts` | 30, 32 | `name`, `city` columns |
| Dashboard/company display (i18n) | `artifacts/tadweerah/src/i18n/index.tsx` | (per WS1/WS2 mapping) | Bilingual dictionary — has no mechanism for per-entity language-tagged data |

## 10. UI/UX Impact Table

| Finding | User-visible impact | Severity |
|---|---|---|
| Activities/roles shown with equal visual weight, different real effect | Users may believe selecting "activities" affects their eligibility when it currently doesn't | Medium |
| License-optional-at-entry vs. approval-required-for-action | Users can complete onboarding feeling "done," then hit an unexplained block later | High (already observed live in WS3) |
| No bilingual company-data storage | Company identity displays incorrectly/inconsistently for any bilingual audience — a real professionalism issue for a platform serving Arabic and English users | High |
| Free-text city, no validation beyond length | Typos permanently visible across the platform | Medium |
| Verification email to Junk | Real users may miss their verification code entirely | Medium-High (deliverability, not platform logic) |

## 11. Mapping to Workstreams

| Finding | WS4 (UI/UX) | WS5 (Source-of-Truth) | WS8 (Authorization) | WS9 (V2 Backlog) |
|---|---|---|---|---|
| Roles/Activities/Type/Capabilities four-concept model | ✓ (explain to users) | ✓ (primary, now documented) | — | ✓ (simplify/consolidate) |
| Listing/offer shared approval gate | ✓ (surface clearly in UI) | ✓ (confirmed, corrects WS5-A) | ✓ (confirms consistent enforcement) | — |
| Bilingual company-data schema gap | ✓ | ✓ (primary — structural) | — | ✓ (primary — schema change) |
| City free-text | ✓ | ✓ | — | ✓ (master-data table) |
| Legacy `type` still live | — | ✓ (primary) | — | ✓ (cleanup candidate) |
| Verification email deliverability | ✓ (real-user risk) | — | — | ✓ |

## 12. Recommended Future Fixes / Backlog Items (Not Implemented)

1. Add ar/en (or a language-tagged) storage model for `companies.name` and `companies.city` — the only real fix for the bilingual-display bug; a UI-only patch cannot solve a single-column schema.
2. Add onboarding-flow copy explaining the difference between "roles" (real classification) and "activities" (descriptive only, for now).
3. Surface the specific `CompanyIncomplete`/`CompanyPending`/`CompanyRejected` reasons in the UI instead of a generic error (already recommended in WS3; reinforced here with the exact shared code location, `requireCompany.ts`).
4. Consider retiring `companies.type` once its one remaining live dependency (buyer-notification targeting) is rewritten against `company_roles`.
5. Add basic format/lookup validation for `city` beyond a length check (ties to the master-data recommendation already on record).
6. Confirm and, if needed, harden verification-email deliverability (SPF/DKIM/sender reputation) — outside this audit's technical scope to diagnose further.

**No fixes have been made. This is a documentation deliverable only.**

## 13. Recommendation on Further Live Testing

**No further live testing is needed before moving to WS4 or WS8.** Every question in this review was answerable from existing evidence plus source-code reading — the code is well-commented enough that the underlying model is now fully documented without needing to re-run or extend the WS3 live journey. The one narrow open item (§7.1, the `commercialRegistration`-read nuance) is low-priority and doesn't block either WS4 (UI/UX) or WS8 (authorization) from proceeding using what's already documented here and in WS5-A.

---

# WS5-B Closure Decision

**Date:** 2026-07-03
**Founder decision:** Close WS5-B as completed.

**Status: Completed.**

**Accepted conclusions:**
1. Offer submission and listing creation share the same company approval middleware/gate.
2. The earlier hypothesis that offer submission might be deliberately ungated is rejected.
3. The `buyer_is_verified=false` detail at offer-creation time remains only a low-priority loose end, likely related to the `commercialRegistration` half of the formula at that moment, not a reopened authorization finding.
4. Activities vs Roles is resolved as four concepts: MWAN roles (regulatory classification), legacy `type` field (auto-derived/backward-compatibility), Activities (onboarding intent/future filtering, not enforcement), and Capabilities (the actual enforcement system).
5. The issue is not that the backend has no model; the issue is that the onboarding UI presents these concepts without enough explanation or hierarchy.
6. Bilingual company data is a structural limitation: `companies.name` and `companies.city` are single plain-text columns. Proper Arabic/English parity requires product/schema design, not just copy/UI polish.
7. No further live testing is needed before WS4 or WS8 based on WS5-B.

**WS5-B is now closed on this basis.** Per standing instruction, it will not be reopened unless new evidence contradicts what's documented here.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This document is analysis only: existing evidence plus read-only source-code inspection. No code/config changes, no DB access, no admin action, no new live UI journey, no commits, no deploys, no transport/shipment click, no receipt/completion action.*
