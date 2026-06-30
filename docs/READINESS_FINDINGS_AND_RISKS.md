# Tadweerah – Readiness Findings & Risks
> Last updated: 2026-06-30 | Phase 3-B Batch 1A-R Staging Apply Closed
> Status: Phase 3-B Batch 1A-R (Historical Sustainability Correction) successfully closed functionally and safely on staging. Target data aligned via `audit_log` with no commercial side-effects. Production correction remains a separate gate. Batch 1C remains unapproved. CLT-1 code complete — migration + deploy pending explicit approval

> **Legend:**
> - 🟢 Current behavior | 🎯 Target behavior | ⚠️ Gap
> - 🔴 High risk | 🟡 Medium risk | 🟢 Low risk
> - 🚫 Requires backend deploy | 🖥️ Frontend-only fix | 📋 Decision/documentation
> - 🔍 Needs manual verification

---

## Executive Summary

> **Overall Readiness: 9.7 / 10**
> This is suitable for **final pilot UAT and launch preparation**.
> It is nearly ready for an unsupervised Strategic Partner demo, pending final verification.

The core platform architecture is sound. The deal state machine, contract system,
admin API controls, notification pipeline, audit trail, reports engine, and
admin dashboards are correctly implemented in code.

The final steps to achieve full pilot launch readiness involve:

1. **Final End-to-End UAT** — across seller, receiver/factory, transporter, and admin.
2. **Minor Administrative UI Additions** — adding the missing `force-complete` deal action to the admin panel UI.
3. **Operational Notification Hardening** — adding the buyer's 3-day deal expiry warning and admin override notifications.

---

## Section 1: Resolved Findings (Phases 2-A & 2-C)

* **H1 — Deal Receipt Mismatch**
  * Status: resolved in Phase 2-A.
* **H2 — Admin UI Missing Override Buttons**
  * Status: resolved in Phase 2-C.
  * Evidence: admin force-complete and reopen controls.
* **H3 — Buyer Not Warned Before Expiry**
  * Status: implemented/deployed in Phase 2-C.
  * Note: live verification deferred unless safe DB strategy is approved.
* **H4 — Admin Overrides Send No Notifications**
  * Status: resolved in Phase 2-C.
  * Evidence: cancel, force-complete, reopen notifications UAT passed.
* **M2 — Cannot Cancel Dispatched Deals**
  * Status: resolved/mitigated through admin override tools and reopen recovery.

---

## Section 2: Active & Deferred Risks

> **Principle:** Remaining risks after Phase 2-D must be intentional, current, and actionable.

### M1 — Transport Quote "Select" Does Not Assign
**Severity: 🟢 Low / 🟡 Medium | Phase: Post-Pilot Polish**
- **Current:** Quote status changes, but true transporter assignment is not tracked.
- **Recommended:** Defer true assignment logic; optional label polish (e.g. "Shortlist Only") later.

---

### M3 — Buyer Blocked Silently (No Notification)
**Severity: 🟡 Medium | Phase: TBD**
- **Current:** `offer_submission_blocked = true` triggers silently.
- **Recommended:** Needs founder/product decision on whether blocking should be automatic or manual, and whether notifications are required.

---

### M4 — Contract Lite Notifications
**Severity: 🟡 Medium | Phase: Phase 2-E**
- **Current:** Contract Lite notification architecture patched (`283270e`) and deployed to staging (`tadweerah-api-00085-rg9`); pending manual Contract Lite UAT.
  - Contract notification documentation aligned.
  - Contract completed notification added.
  - Shipment email noise mitigated.
- **Still Pending:** Final Contract Lite UAT, Strategic Partner weight policy founder confirmation, and Contract UX manual UAT.

---

### M5 — Rich Deal Completion Email Not Wired
**Status: ✅ Closed in Phase 3-A2**
- **Implementation:** Deal completion email is now sent on verified state transitions (`POST /deals/:deal_id/confirm-receipt` and `POST /admin/deals/:id/force-complete`). Missing or ambiguous recipient/category data will log a warning and safely skip sending without failing the transaction. Hardcoded fallbacks removed.

---

### M6 — Hard-Coded Timer Values
**Severity: 🟢 Low | Phase: Phase 3-B**
- **Current:** All timers are constants.
- **Recommended:** Known limitation. Defer post-pilot unless pilot requires configurability.

---

### SIR-3B — Branded Sustainability Report Print/PDF + Company Logo
**Status: ✅ Accepted on Staging — 2026-06-26**

#### What was delivered
- Dedicated print route: `/reports/sustainability/:allocationId/print` (browser print / Save as PDF; no server-side PDF generator).
- Arabic RTL A4 single-page layout. Report fits one A4 page for normal records.
- Tadweerah logo rendered from central asset `/logo.png`.
- Company logo upload added to Company Profile (`شعار الشركة / Company Logo`):
  - Saved via `حفظ التغييرات / Save Changes` in a single unified flow.
  - No separate upload button required.
  - Max 2 MB, JPEG/PNG/WebP only. SVG deferred.
  - Stored in GCS bucket `tadweerah-staging-listing-images` at `companies/{id}/logo-{timestamp}-{random}.{ext}`.
- `companies.logo_url` nullable column added via migration `0006_add_company_logo_url.sql`. Zero impact on existing rows.
- CORS applied to staging bucket for `https://tadweerah-staging.web.app` and `https://tadweerah.com`.
- Processor logo rendered in print report when `logo_url` is set; falls back to company name only — no `LOGO` placeholder, no broken image icon.
- Pathway rows, quantities, and percentages correct and unchanged.
- No certificate / verified / certified / CO₂e / carbon wording.
- `POST /api/companies/mine/logo` endpoint — auth: `requireAuth` + `requireCompany`; company ID sourced server-side only.
- `GET /api/companies/mine` returns `logo_url`.
- `GET /api/reports/sustainability/:id` returns `processor_logo_url`.

#### Commits
| Layer | Commit |
|---|---|
| Backend (logo upload + report endpoint) | `00ea84141f3097d1e0eefdeb50cf1321dabb2f0a` |
| Frontend UX (integrate logo into Save Changes) | `e642089 ux(company-profile): integrate logo upload into Save Changes button` |

#### Active backend revision
`tadweerah-api-00121-8kk` — 100% traffic

#### Deferred from SIR-3B
| Item | Reason deferred |
|---|---|
| SIR-3C consolidated multi-material report | Not needed for single-material MVP |
| SIR-2D admin reopen / versioned allocation governance | ✅ Implemented locally — pending staging migration + deploy |
| Server-side PDF generator | Browser print is sufficient for MVP |
| CO₂e / certificates / verified / certified / assurance language | Not approved for this phase |
| Company logo delete/cleanup of old GCS objects on replace | Low priority, not a blocker |
| Dedicated company-assets GCS bucket | Currently reuses `listing-images` bucket |

---

### SIR-3C — Consolidated Multi-Material Sustainability Report (Deferred)
**Status: ⏸ Deferred — not a current gap**

- **Trigger:** Required when contract shipments support multiple material lines, or when users need a single print report for all materials under one commercial reference.
- **Current MVP behavior (safe and accepted):**
  - One deal → one listing → one material → one received line → one allocation → one print report.
  - One contract shipment → one `material_line_id` → one material → one received line → one allocation → one print report.
  - `sustainability_received_lines.line_seq` is already the extension point (currently always `1`).
  - Users with multiple materials under one shipment reference print separate reports per material.
- **What SIR-3C requires:**
  - Derivation creates multiple received lines per shipment (one per contract material line).
  - New API: `GET /reports/sustainability/by-ref/:commercialRef` returning an array of finalized allocations.
  - Updated print page rendering a multi-material table.
  - No DB schema migration required.

## Section 3: Phase 2-B Closed (Notification Polish & Deployment)

> **Phase 2-B closure confidence: 9.7/10**
>
> **Completed & Implemented Tracks:**
> The following are implemented and included in final Phase 2-C UAT/hardening:
> 1. Notifications/reference/deep links.
> 2. Open-listing receiver/factory eligibility.
> 3. Seller publish confirmation.
> 4. Listing email enrichment.
> 5. Listing card main/subcategory display.
> 6. Contract flow exists and is operationally implemented.
> 7. Contract notifications exist.
> 8. Admin dashboard/stats exist.
> 9. Admin reports exist.
> 10. Deals reports exist.
> 11. Contract reports exist.
> 12. Shipment/transport reports exist.
> 13. Company/user-facing reports exist.
>
> **UAT Confirmed for Phase 2-B:**
> - Seller publish-confirmation email: pass.
> - Qualified receiver/factory new-listing email: pass.
> - Enriched email details: pass.
> - Listing card main/subcategory display for seller and buyer: pass.
> - `LIST-...` references visible: pass.
> - Backend revision deployed for notification enrichment: `tadweerah-api-00082-lc2`.
> - Frontend deployed after listing-card fix: `e5722e7`.
> 
> **Phase 2-C â€” Final Pilot Readiness & UAT Hardening:**
> **Status:** âœ… Completed
> Admin override hardening successfully deployed and verified via UAT.
> - **Deployed Backend Revision:** `tadweerah-api-00084-bnw`
> - **Deployed Frontend Commit:** `7422819`
>
> **Implemented Admin Controls:**
> - Force-complete deal (reason required, notifies parties)
> - Admin cancel deal (reason required, notifies parties)
> - Reopen terminal deals (from completed/cancelled, clears `received_at` / `cancelled_at`, notifies parties)
> - Payment proof resubmission request
> - Buyer 3-day expiry warning
>
> **UAT Outcome:** PASSED (Force-Complete, Reopen, Cancel verified manually).
>
> **Deferred beyond Phase 2-C:**
> 1. Category-targeted listing notifications.
> 2. Deeper material/category/capability matching for recipient eligibility.
> 3. Dedicated notification type for seller publish confirmation.
> 4. Parent-level frontend taxonomy optimization.
> 5. Broader branded email template redesign.
> 6. Buyer expiry warning live verification (deferred unless safe DB strategy is approved).
> 7. i18n dictionary refactor for admin action strings.
> 8. Checklist wording `Ù…ØªØ·Ù„Ø¨Ø§Øª Ù…ØªØ¨Ù‚ÙŠØ©` improvement to `Ù…ØªØ·Ù„Ø¨Ø§Øª ØªØ´ØºÙŠÙ„ÙŠØ© Ù…ØªØ¨Ù‚ÙŠØ©`.
> 9. Shipment cancel modal destructive styling improvement.

---

## Section 4: Single Source of Truth Audit

> This section identifies places where logic, values, or behavior is
> duplicated, inconsistent, or has unclear ownership.

| Finding | Files involved | Current source of truth | Recommended SOT | Risk | Phase | Founder decision needed? |
|---------|---------------|------------------------|-----------------|------|-------|--------------------------|
| **Timer durations** | `expire-deals.ts`, implicitly known by ops | Hard-coded constants | Admin-configurable table | ðŸŸ¡ Medium | Post-pilot | No, but CTO must acknowledge values |
| **Deal status semantics** | `routes/deals.ts`, `pages/admin.tsx`, `pages/dashboard.tsx` | Backend enum | Backend enum (correct) | ðŸŸ¢ Low | â€” | No |
| **Transport quote "select" implies assignment** | `routes/admin.ts`, `pages/admin.tsx` | Misleading â€” backend knows it's label-only; UI implies assignment | Clarify in UI label ("shortlist/prefer") | ðŸ”´ High | Admin UI fix | No |
| **Receipt confirmation implies wait** | `routes/deals.ts` comment, notification body text, `expire-deals.ts` | Backend: 48h wait. Notification text: "auto-complete in 48h". Target: immediate complete | Fix route + job + text | ðŸ”´ High | Deal Lifecycle Correction | Yes â€” target behavior |
| **`sendDealCompletionEmail` wiring** | `lib/email.ts` defines it; no active lifecycle call site found | Defined but not wired | Decide whether to wire into completion flow | ?? Medium | Deal Lifecycle Correction | Yes |
| **Admin capabilities: API vs UI** | `routes/admin.ts` (full CRUD), `pages/admin.tsx` (partial) | API has more capabilities than UI | UI should expose all safe admin actions | ðŸŸ¡ Medium | Admin UI fix | No |
| **Material categories: backend vs listing enum** | `material-categories` table (new), `wasteUnitEnum` (legacy enum on old listings) | Split â€” legacy enum for old, table for new | Migrate legacy listings (post-pilot) | ðŸŸ¢ Low | Post-pilot | No |
| **VAT calculation** | `routes/deals.ts` (computed at creation), `routes/admin.ts` (reported in CSV) | Single compute at creation âœ… | Same | ðŸŸ¢ Low | â€” | No |
| **pre_expiry_notified reset** | `routes/deals.ts` extend handler (resets to false) | Correct â€” resets so warning fires again | Same | ðŸŸ¢ Low | â€” | No |
| **Contract created_by_company_id nullable** | `contracts.ts` schema comment | Nullable for backwards-compat (pre-field contracts) | Acceptable | 🟢 Low | — | No |
| **Operational Truth Audit (v5 Drawio)** | `deals.ts`, `expire-deals.ts`, `admin.tsx` | Deal receipt immediately completes; listings have no auto-expiry job; transport quote lite is active. **Note: v5 exported exactly as-is to PDF/PNG in docs/exports/operational-truth-v5 for internal study without simplification.** | Native architecture matches backend code | 🟢 Low | Documentation | No |

---

## Section 4: Contract Lite â€” Phase-CLT Required

> **Contract Lite is NOT ready for Strategic Partner demo until Phase-CLT is completed.**

### What Was Audited (Broad)
- âœ… State machine (draft â†’ pending â†’ active â†’ completed/cancelled)
- âœ… Creator vs. counterparty role logic
- âœ… Material line management rules (creator-only, draft-only)
- âœ… Shipment schema (planned/dispatched/received/closed/cancelled)
- âœ… Weight policy schema (5 policies, fixed at creation)
- âœ… Admin force-cancel capability
- âœ… No auto-expiry
- âœ… No notifications (confirmed intentional)

### What Was NOT Audited â€” Phase-CLT Scope
| Gap | Why it matters |
|-----|----------------|
| `contract-detail.tsx` (57,112 bytes) full UI flow | Strategic Partner operator uses this page; unknown UX gaps |
| Contract shipments route logic | Shipment state transitions not verified against business rules |
| Which weight policy to recommend for Strategic Partner | `source_weight_only` vs `dual_higher_final` â€” founder decision needed |
| Whether contract notifications are needed | Founder decision |
| Admin/report visibility for contract shipments | Can admin see individual shipment weights? |
| Step-by-step Strategic Partner Contract Lite UAT scenario | No test script exists |
| What happens when closing a shipment with zero weight | Edge case not verified |


### Contract Lite UAT Scenario (Phase 2-E)
Example UAT scenario to verify the Strategic Partner `dual_source_final` policy:
1. `source_weight` = 10.5 tons
2. `destination_weight` = 10.4 tons
3. `policy` = `dual_source_final`
4. **Expected `final_weight`** = 10.5
5. **Expected `final_value`** = price_per_ton Ã— 10.5

**UAT must verify:**
- Selected policy is visible before counterparty confirmation.
- Source and destination weights are visible.
- `final_weight` follows selected policy.
- `final_value` follows `final_weight` Ã— price.

**Report Terminology & VAT rules (MVP):**
- Arabic: `ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø­Ù†Ø§Øª Ù„Ù„ÙØªØ±Ø© Ù…Ù† ... Ø¥Ù„Ù‰ ...` / `ØªÙ‚Ø±ÙŠØ± Ø´Ø­Ù†Ø§Øª Ø§Ù„Ø¹Ù‚Ø¯ Ù„Ù„ÙØªØ±Ø© Ù…Ù† [date] Ø¥Ù„Ù‰ [date]` / `ØªÙ‚Ø±ÙŠØ± Ø´Ø­Ù†Ø§Øª Ø§Ù„Ø¹Ù‚ÙˆØ¯ Ù„Ù„ÙØªØ±Ø© Ù…Ù† [date] Ø¥Ù„Ù‰ [date]`
- English: `Shipment Report for the period from ... to ...` / `Contract Shipment Report for the period from [date] to [date]` / `Contract Shipments Report for the period from [date] to [date]`
- Must never use "invoice", "settlement", or "payment claim" terminology. It is an operational report.
- VAT Behavior: `final_value` is treated as value excluding VAT. VAT (15%) and Total (incl VAT) are calculated dynamically for the report only.

**Report UAT Items:**
- Reports page default remains marketplace deals.
- Contracts tab appears and loads correctly via `GET /reports/contract-shipments`.
- Contracts tab default visibly shows `Ù…ØºÙ„Ù‚Ø©`.
- Dispatched/cancelled rows do not appear by default.
- Date filters act strictly on `closed_at`.
- Contract ref filter supports visible `TDW-CTR-...`.
- Company route restricts data strictly to seller/buyer participation. Admin route sees all.
- Count card label is clear (`Ø¹Ø¯Ø¯ Ø§Ù„Ø´Ø­Ù†Ø§Øª Ø§Ù„Ù…ØºÙ„Ù‚Ø©` for closed, `Ø¹Ø¯Ø¯ Ø§Ù„Ø´Ø­Ù†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙˆØ¶Ø©` for all).
- Financial totals match closed rows.
- Weight policy labels show Arabic values, not raw `source/destination/higher`.
- Export button says `ØªØµØ¯ÙŠØ± Ù…Ù„Ù`.
- CSV export works and respects filters and includes VAT columns.
- No invoice/settlement/payment-claim wording appears.

**Screenshots to capture:**
- Contract policy selected.
- Shipment source/destination weights.
- `final_weight` and `final_value`.
- Expected notifications.

### Phase-CLT Deliverables
- Exact user steps (seller role, buyer role) for full contract + shipment flow
- Roles involved and what each party can/cannot do
- Shipment lifecycle map with source/destination weight entry points
- Weight policy recommendation for Strategic Partner
- UI gaps found in `contract-detail.tsx`
- Admin/reporting visibility gaps
- Whether notifications are needed (founder decision required)
- Whether any code changes are required before demo
- Estimated time if code changes needed + deploy assessment

---

## Section 5: Admin Master Data / Dropdown Management

### Current State
| Entity | Backend CRUD | Admin UI | Safe to expose freely? |
|--------|-------------|----------|----------------------|
| Material categories | âœ… Full CRUD (key, names, parent_id, is_sensitive, MWAN fields) | âŒ API-only | âœ… Yes â€” but protect `key` field from edits |
| Unit options | âœ… Full CRUD (key, symbol, bilingual) | âŒ API-only | âœ… Yes â€” but protect `key` field |
| Company categories | âœ… Full CRUD | âŒ API-only | âœ… Yes |
| Capabilities | âŒ Read-only via `/lookup/capabilities` â€” no admin write endpoint | âŒ None | N/A â€” endpoint needed first |
| Lifecycle status values | Not configurable (DB enums) | N/A | ðŸš« Must NOT be editable â€” they drive backend logic |
| Payment/financial fields | Not configurable | N/A | ðŸš« Must NOT be editable |

### Recommendation
A simple admin-panel "Master Data" tab could expose:
- Material categories + subcategories (activate/deactivate/reorder/rename)
- Unit options (activate/deactivate/reorder)
- Company categories
- Capabilities (requires new backend endpoint first)

**Protection rules:**
- `key` fields must be read-only in UI (used in eligibility logic)
- `is_sensitive` flag on material categories must be clearly labeled (triggers license check)
- Lifecycle/status/payment fields must never be exposed as editable dropdowns

ðŸ–¥ï¸ Frontend-only change for most; capabilities need ðŸš« backend deploy.

---

## Section 6: Assumptions and Manual Verification Needed

> The following cannot be confirmed from code alone. Each must be manually verified
> before pilot launch.

| # | Assumption | How to verify | Risk if wrong |
|---|-----------|--------------|---------------|
| 1 | `RESEND_API_KEY` is set in Cloud Run revision `00046-pnj` | Cloud Run console â†’ env vars | All transactional email silently disabled |
| 2 | `TRANSPORT_REQUEST_EMAIL` is set | Cloud Run console â†’ env vars | Ops never receives transport notifications |
| 3 | `SUPPORT_EMAIL` is set | Cloud Run console â†’ env vars | Issue reports not forwarded to support |
| 4 | Cloud Scheduler expire-deals job is running and last execution succeeded | Cloud Scheduler console â†’ job history | Deals never expire; no warnings fired |
| 5 | Contract Lite end-to-end flow works as expected in staging | Manual UAT walkthrough (Phase-CLT) | Demo fails at contract step |
| 6 | Admin UI deal actions (cancel/force-complete) work via raw API in staging | Test with curl against staging API + valid ADMIN_API_KEY | Admin cannot intervene in stuck deals |
| 7 | Quote "select" behavior is understood by ops team | Brief ops team; add UI label "shortlist only, not assigned" | Ops believes transporter is assigned when not |
| 8 | `sendDealCompletionEmail` is defined but not wired | Confirmed by search: appears only at function definition | Rich completion email never sent |
| 9 | Buyer receipt completion behavior correct after fix (if implemented) | Manual UAT in staging after deploy | Wrong status transition |
| 10 | Admin notifications reach parties after override (if implemented) | Manual test after deploy | Parties unaware of admin action |
| 11 | Listing status resets from `filled` to `open` when deal is cancelled | Code review of cancel handler in `routes/deals.ts` | Cancelled deals leave listing permanently filled |
| 12 | Pre-expiry warning fires correctly in staging | Manually or by adjusting a test deal's `created_at` to trigger 3-day window | Warnings never sent |

---

## Section 7: Revised Readiness Scoring

| Area | Score | Condition for 10/10 |
|------|-------|--------------------|
| Deal lifecycle correctness | **10/10** | Resolved in Phase 2-A. |
| Notification coverage | **9.5/10** | Add buyer pre-expiry warning; admin override notifications. |
| Admin operational control | **9.5/10** | Add `force-complete` button to admin UI; notify after overrides. |
| Contract Lite | **10/10** | Fully operational and notification-linked. |
| Master data configurability (API) | **9.5/10** | Already very good. |
| Reports & Dashboards | **10/10** | Comprehensive and live. |
| Email infrastructure | **9.5/10** | Enriched emails live; broader template redesign deferred. |
| Audit trail | **10/10** | Comprehensive and correct. |
| Transport operations | **9/10** | Add explicit transporter assignment flow if needed later. |
| **Overall** | **9.7/10** | Ready for final Phase 2-C UAT and pilot launch. |

---

## Section 8: Remaining Phase Roadmap

> This roadmap assumes completion of Phase 2-C hardening.

### 1. Phase 2-D â€” Readiness Risk Burn-down & Remaining Roadmap Alignment
- **Scope:** Current docs-only phase.

### 2. Phase 2-E â€” Contract Lite Pilot UAT & Strategic Partner Readiness
- **Priority:** Must do before pilot if Strategic Partner/contract workflow is the target path.
- **Scope:** Includes Contract Lite audit, Strategic Partner UAT script, weight/final quantity policy confirmation, and contract notification decision.
- **Status:** Contract Lite notification patch deployed. Contract Lite Shipment Report MVP implemented. Contract Detail operational UX (zero-weight block, notification handoffs, scroll/focus, list filters) implemented. Deployed to backend (`tadweerah-api-00089-jnt`) and frontend staging (`https://tadweerah-staging.web.app`), manual UAT passed, ready for pilot use.

### 3. Phase 2-F â€” Admin Email Notification Recipient Override
- **Priority:** Must do before external pilot/demo to handle owner separation requests.
- **Status:** âœ… Implemented, deployed, and UAT passed.
- **Scope:** Allows platform admin to specify an existing company member as the operational email notification recipient (`Ù…Ø³ØªÙ„Ù… ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¨Ø±ÙŠØ¯`) without changing the company owner (`Ù…Ø§Ù„Ùƒ Ø­Ø³Ø§Ø¨ Ø§Ù„Ø´Ø±ÙƒØ©`). Includes fallback logic to the default owner if the custom recipient is invalid or unset.

### 4. Phase 2-G & 2-H â€” Billing & Admin Reports Design Notes
- **Priority:** Done.
- **Status:** âœ… Design Approved (No Implementation Yet).
- **Scope:** Strategic design note establishing the billing/fee separation model and the architecture for dynamic, period-based management reports.
- **Documentation:** Logged in `docs/PHASE_2_G_H_DESIGN_NOTES.md`.

### 4. Phase 3-A1 â€” Admin Backup Allowlist
- **Priority:** Done.
- **Status:** âœ… Implemented and UAT passed.
- **Scope:** Fast, secure fallback for adding backup admin team members by leveraging the `VITE_TADWEERAH_ADMIN_EMAILS` environment variable to bypass onboarding, combined with the company invite flow for initial user record creation. Admin roles and `admin_invitations` tables deferred to future.
- **Note:** `info@tadweerah.com` is reserved for support routing. Backend remains protected by `ADMIN_API_KEY`.

### 5. Phase 3-A â€” Admin Master Data MVP
- **Priority:** Should do before broader operations if pilot requires frequent taxonomy/unit edits. Can defer if pilot taxonomy is stable.
- **Scope:** Admin CRUD UI for material categories and unit options.

### 5. Phase 3-B â€” Post-Pilot Workflow Configurability & Polish
- **Priority:** Post-pilot.
- **Scope:** Configurable timers, category-targeted notifications, i18n refactor, checklist wording polish, etc.

### 6. Phase 3-C â€” Multi-Branch / Multi-Site Operational Routing
- **Priority:** Post-pilot.
- **Scope:** Support for multiple operational sites/branches per company (`Ø§Ù„Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ© / Ø§Ù„ÙØ±ÙˆØ¹`). Each site can have its own notification recipient or team. Contracts, shipments, and listings may be associated with a specific site.
- **Routing Order:** Site/branch-level recipient (if linked) â†’ company-level `Ù…Ø³ØªÙ„Ù… ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¨Ø±ÙŠØ¯` â†’ company owner fallback.
- **Rules:** Routing remains role/site-based, not hardcoded by company name or city. Supports cases where the same company may be buyer in one transaction and seller in another.

## Section 9: Go / No-Go Framing

### Ready for supervised internal UAT and pilot preparation:
âœ… Core deal flow (marketplace â†’ offer â†’ deal â†’ payment â†’ dispatch)
âœ… Audit trail
âœ… Master data API management
âœ… Admin company/license management
âœ… Report export (CSV)

### NOT ready without completing:
âš ï¸ Phase 1 (Contract Lite audit) â€” if Contract Lite is part of Strategic Partner scenario
âš ï¸ Phase 2 (Deal receipt lifecycle fix) â€” current behavior diverges from target
âš ï¸ Phase 3 (Admin UI deal actions) â€” admin cannot intervene without curl
âš ï¸ Assumptions verified (Â§Section 6) â€” email, scheduler, env vars

### Decisions Required from Founder/CTO Before Pilot
1. Accept or fix deal receipt flow (immediate vs 48h wait)?
2. Accept or change auto-complete without admin review?
3. Should contract notifications be sent during pilot?
4. Which weight policy for Strategic Partner (Contract Lite)?
5. Acknowledge hard-coded timer values as acceptable for pilot?
6. Should buyer auto-blocking require admin confirmation step?




## Risk Note: Admin Shipment Restore
Admin restore of shipments without DB migration relies on timestamps + audit log and is acceptable only for pilot. Long-term implementation should include cancelled_from_status and cancelled_reason columns in the database.


## Phase 3-A2 â€” Admin Wishlist & Findings Register
**Status:** âœ… Implemented and UAT Passed
**Goal:** Establish an internal tracking system within the Admin Panel to log operational findings, UAT issues, customer requests, and improvements (specifically for partners like Strategic Partner).
**Details:**
- Completely isolated feature using the `admin_findings` table.
- Has zero database relations to active deals, shipments, or users.
- Does not replace `issue_reports` (which remains for customer-facing support).
- The admin interface fully supports creating, editing, manual reordering via arrows, and hard deletion.
- Fully localized in Arabic within the Admin UI.
**Risks:** **Low Operational Risk** (completely decoupled from marketplace logic; UI changes confined to Admin Panel).

---

## Section 10: Phase SIR-2B Closed (Sustainability Draft Allocation UI & API)

> **Status:** ✅ Completed and Staging UAT Confirmed.
> 
> **Completed Scope (SIR-2A / SIR-2B / SIR-2AB Polish):**
> - **SIR-2A DB Prep:** Created `sustainability_received_lines`, `sustainability_allocations`, `sustainability_allocation_lines`. Added robust unique indexes for `(parent_entity_type, parent_entity_id)` and allocation drafting. No production DB changes were made.
> - **Derivation Logic:** Deployed `sustainability-derivation.ts` worker to securely create received lines when deals complete or contract shipments close.
> - **UX/UI implementation:** "إدخال بيانات الاستدامة" (Sustainability Data Entry) list view and diagnostic read-only detail view for ineligible sources.
> - **Read-Time Accuracy:** 
>   - Source references display as e.g., `صفقة / TDW-2026-648100` instead of raw UUIDs.
- Contracts tab appears and loads correctly via `GET /reports/contract-shipments`.
- Contracts tab default visibly shows `Ù…ØºÙ„Ù‚Ø©`.
- Dispatched/cancelled rows do not appear by default.
- Date filters act strictly on `closed_at`.
- Contract ref filter supports visible `TDW-CTR-...`.
- Company route restricts data strictly to seller/buyer participation. Admin route sees all.
- Count card label is clear (`Ø¹Ø¯Ø¯ Ø§Ù„Ø´Ø­Ù†Ø§Øª Ø§Ù„Ù…ØºÙ„Ù‚Ø©` for closed, `Ø¹Ø¯Ø¯ Ø§Ù„Ø´Ø­Ù†Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙˆØ¶Ø©` for all).
- Financial totals match closed rows.
- Weight policy labels show Arabic values, not raw `source/destination/higher`.
- Export button says `ØªØµØ¯ÙŠØ± Ù…Ù„Ù `.
- CSV export works and respects filters and includes VAT columns.
- No invoice/settlement/payment-claim wording appears.

**Screenshots to capture:**
- Contract policy selected.
- Shipment source/destination weights.
- `final_weight` and `final_value`.
- Expected notifications.

### Phase-CLT Deliverables
- Exact user steps (seller role, buyer role) for full contract + shipment flow
- Roles involved and what each party can/cannot do
- Shipment lifecycle map with source/destination weight entry points
- Weight policy recommendation for Strategic Partner
- UI gaps found in `contract-detail.tsx`
- Admin/reporting visibility gaps
- Whether notifications are needed (founder decision required)
- Whether any code changes are required before demo
- Estimated time if code changes needed + deploy assessment

---

## Section 5: Admin Master Data / Dropdown Management

### Current State
| Entity | Backend CRUD | Admin UI | Safe to expose freely? |
|--------|-------------|----------|----------------------|
| Material categories | âœ… Full CRUD (key, names, parent_id, is_sensitive, MWAN fields) | â Œ API-only | âœ… Yes â€” but protect `key` field from edits |
| Unit options | âœ… Full CRUD (key, symbol, bilingual) | â Œ API-only | âœ… Yes â€” but protect `key` field |
| Company categories | âœ… Full CRUD | â Œ API-only | âœ… Yes |
| Capabilities | â Œ Read-only via `/lookup/capabilities` â€” no admin write endpoint | â Œ None | N/A â€” endpoint needed first |
| Lifecycle status values | Not configurable (DB enums) | N/A | ðŸš« Must NOT be editable â€” they drive backend logic |
| Payment/financial fields | Not configurable | N/A | ðŸš« Must NOT be editable |

### Recommendation
A simple admin-panel "Master Data" tab could expose:
- Material categories + subcategories (activate/deactivate/reorder/rename)
- Unit options (activate/deactivate/reorder)
- Company categories
- Capabilities (requires new backend endpoint first)

**Protection rules:**
- `key` fields must be read-only in UI (used in eligibility logic)
- `is_sensitive` flag on material categories must be clearly labeled (triggers license check)
- Lifecycle/status/payment fields must never be exposed as editable dropdowns

ðŸ–¥ï¸  Frontend-only change for most; capabilities need ðŸš« backend deploy.

---

## Section 6: Assumptions and Manual Verification Needed

> The following cannot be confirmed from code alone. Each must be manually verified
> before pilot launch.

| # | Assumption | How to verify | Risk if wrong |
|---|-----------|--------------|---------------|
| 1 | `RESEND_API_KEY` is set in Cloud Run revision `00046-pnj` | Cloud Run console â†’ env vars | All transactional email silently disabled |
| 2 | `TRANSPORT_REQUEST_EMAIL` is set | Cloud Run console â†’ env vars | Ops never receives transport notifications |
| 3 | `SUPPORT_EMAIL` is set | Cloud Run console â†’ env vars | Issue reports not forwarded to support |
| 4 | Cloud Scheduler expire-deals job is running and last execution succeeded | Cloud Scheduler console â†’ job history | Deals never expire; no warnings fired |
| 5 | Contract Lite end-to-end flow works as expected in staging | Manual UAT walkthrough (Phase-CLT) | Demo fails at contract step |
| 6 | Admin UI deal actions (cancel/force-complete) work via raw API in staging | Test with curl against staging API + valid ADMIN_API_KEY | Admin cannot intervene in stuck deals |
| 7 | Quote "select" behavior is understood by ops team | Brief ops team; add UI label "shortlist only, not assigned" | Ops believes transporter is assigned when not |
| 8 | `sendDealCompletionEmail` is defined but not wired | Confirmed by search: appears only at function definition | Rich completion email never sent |
| 9 | Buyer receipt completion behavior correct after fix (if implemented) | Manual UAT in staging after deploy | Wrong status transition |
| 10 | Admin notifications reach parties after override (if implemented) | Manual test after deploy | Parties unaware of admin action |
| 11 | Listing status resets from `filled` to `open` when deal is cancelled | Code review of cancel handler in `routes/deals.ts` | Cancelled deals leave listing permanently filled |
| 12 | Pre-expiry warning fires correctly in staging | Manually or by adjusting a test deal's `created_at` to trigger 3-day window | Warnings never sent |

---

## Section 7: Revised Readiness Scoring

| Area | Score | Condition for 10/10 |
|------|-------|--------------------|
| Deal lifecycle correctness | **10/10** | Resolved in Phase 2-A. |
| Notification coverage | **9.5/10** | Add buyer pre-expiry warning; admin override notifications. |
| Admin operational control | **9.5/10** | Add `force-complete` button to admin UI; notify after overrides. |
| Contract Lite | **10/10** | Fully operational and notification-linked. |
| Master data configurability (API) | **9.5/10** | Already very good. |
| Reports & Dashboards | **10/10** | Comprehensive and live. |
| Email infrastructure | **9.5/10** | Enriched emails live; broader template redesign deferred. |
| Audit trail | **10/10** | Comprehensive and correct. |
| Transport operations | **9/10** | Add explicit transporter assignment flow if needed later. |
| **Overall** | **9.7/10** | Ready for final Phase 2-C UAT and pilot launch. |

---

## Section 8: Remaining Phase Roadmap

> This roadmap assumes completion of Phase 2-C hardening.

### 1. Phase 2-D â€” Readiness Risk Burn-down & Remaining Roadmap Alignment
- **Scope:** Current docs-only phase.

### 2. Phase 2-E â€” Contract Lite Pilot UAT & Strategic Partner Readiness
- **Priority:** Must do before pilot if Strategic Partner/contract workflow is the target path.
- **Scope:** Includes Contract Lite audit, Strategic Partner UAT script, weight/final quantity policy confirmation, and contract notification decision.
- **Status:** Contract Lite notification patch deployed. Contract Lite Shipment Report MVP implemented. Contract Detail operational UX (zero-weight block, notification handoffs, scroll/focus, list filters) implemented. Deployed to backend (`tadweerah-api-00089-jnt`) and frontend staging (`https://tadweerah-staging.web.app`), manual UAT passed, ready for pilot use.

### 3. Phase 2-F â€” Admin Email Notification Recipient Override
- **Priority:** Must do before external pilot/demo to handle owner separation requests.
- **Status:** âœ… Implemented, deployed, and UAT passed.
- **Scope:** Allows platform admin to specify an existing company member as the operational email notification recipient (`Ù…Ø³ØªÙ„Ù… ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¨Ø±ÙŠØ¯`) without changing the company owner (`Ù…Ø§Ù„Ùƒ Ø­Ø³Ø§Ø¨ Ø§Ù„Ø´Ø±ÙƒØ©`). Includes fallback logic to the default owner if the custom recipient is invalid or unset.

### 4. Phase 2-G & 2-H â€” Billing & Admin Reports Design Notes
- **Priority:** Done.
- **Status:** âœ… Design Approved (No Implementation Yet).
- **Scope:** Strategic design note establishing the billing/fee separation model and the architecture for dynamic, period-based management reports.
- **Documentation:** Logged in `docs/PHASE_2_G_H_DESIGN_NOTES.md`.

### 4. Phase 3-A1 â€” Admin Backup Allowlist
- **Priority:** Done.
- **Status:** âœ… Implemented and UAT passed.
- **Scope:** Fast, secure fallback for adding backup admin team members by leveraging the `VITE_TADWEERAH_ADMIN_EMAILS` environment variable to bypass onboarding, combined with the company invite flow for initial user record creation. Admin roles and `admin_invitations` tables deferred to future.
- **Note:** `info@tadweerah.com` is reserved for support routing. Backend remains protected by `ADMIN_API_KEY`.

### 5. Phase 3-A â€” Admin Master Data MVP
- **Priority:** Should do before broader operations if pilot requires frequent taxonomy/unit edits. Can defer if pilot taxonomy is stable.
- **Scope:** Admin CRUD UI for material categories and unit options.

### 5. Phase 3-B â€” Post-Pilot Workflow Configurability & Polish
- **Priority:** Post-pilot.
- **Scope:** Configurable timers, category-targeted notifications, i18n refactor, checklist wording polish, etc.

### 6. Phase 3-C â€” Multi-Branch / Multi-Site Operational Routing
- **Priority:** Post-pilot.
- **Scope:** Support for multiple operational sites/branches per company (`Ø§Ù„Ù…ÙˆØ§Ù‚Ø¹ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ© / Ø§Ù„Ù Ø±ÙˆØ¹`). Each site can have its own notification recipient or team. Contracts, shipments, and listings may be associated with a specific site.
- **Routing Order:** Site/branch-level recipient (if linked) â†’ company-level `Ù…Ø³ØªÙ„Ù… ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¨Ø±ÙŠØ¯` â†’ company owner fallback.
- **Rules:** Routing remains role/site-based, not hardcoded by company name or city. Supports cases where the same company may be buyer in one transaction and seller in another.

## Section 9: Go / No-Go Framing

### Ready for supervised internal UAT and pilot preparation:
âœ… Core deal flow (marketplace â†’ offer â†’ deal â†’ payment â†’ dispatch)
âœ… Audit trail
âœ… Master data API management
âœ… Admin company/license management
âœ… Report export (CSV)

### NOT ready without completing:
âš ï¸  Phase 1 (Contract Lite audit) â€” if Contract Lite is part of Strategic Partner scenario
âš ï¸  Phase 2 (Deal receipt lifecycle fix) â€” current behavior diverges from target
âš ï¸  Phase 3 (Admin UI deal actions) â€” admin cannot intervene without curl
âš ï¸  Assumptions verified (Â§Section 6) â€” email, scheduler, env vars

### Decisions Required from Founder/CTO Before Pilot
1. Accept or fix deal receipt flow (immediate vs 48h wait)?
2. Accept or change auto-complete without admin review?
3. Should contract notifications be sent during pilot?
4. Which weight policy for Strategic Partner (Contract Lite)?
5. Acknowledge hard-coded timer values as acceptable for pilot?
6. Should buyer auto-blocking require admin confirmation step?




## Risk Note: Admin Shipment Restore
Admin restore of shipments without DB migration relies on timestamps + audit log and is acceptable only for pilot. Long-term implementation should include cancelled_from_status and cancelled_reason columns in the database.


## Phase 3-A2 â€” Admin Wishlist & Findings Register
**Status:** âœ… Implemented and UAT Passed
**Goal:** Establish an internal tracking system within the Admin Panel to log operational findings, UAT issues, customer requests, and improvements (specifically for partners like Strategic Partner).
**Details:**
- Completely isolated feature using the `admin_findings` table.
- Has zero database relations to active deals, shipments, or users.
- Does not replace `issue_reports` (which remains for customer-facing support).
- The admin interface fully supports creating, editing, manual reordering via arrows, and hard deletion.
- Fully localized in Arabic within the Admin UI.
**Risks:** **Low Operational Risk** (completely decoupled from marketplace logic; UI changes confined to Admin Panel).

---

## Section 10: Phase SIR-2B Closed (Sustainability Draft Allocation UI & API)

> **Status:** ✅ Completed and Staging UAT Confirmed.
> 
> **Completed Scope (SIR-2A / SIR-2B / SIR-2AB Polish):**
> - **SIR-2A DB Prep:** Created `sustainability_received_lines`, `sustainability_allocations`, `sustainability_allocation_lines`. Added robust unique indexes for `(parent_entity_type, parent_entity_id)` and allocation drafting. No production DB changes were made.
> - **Derivation Logic:** Deployed `sustainability-derivation.ts` worker to securely create received lines when deals complete or contract shipments close.
> - **UX/UI implementation:** "إدخال بيانات الاستدامة" (Sustainability Data Entry) list view and diagnostic read-only detail view for ineligible sources.
> - **Read-Time Accuracy:** 
>   - Source references display as e.g., `صفقة / TDW-2026-648100` instead of raw UUIDs.
>   - Material paths use Arabic hierarchy (e.g., `معادن / ألمنيوم`) dynamically overriding generic category codes.
>   - Quantities are strictly derived from trusted operational fields (e.g., `deal.actual_quantity` or `listing.quantity`), entirely avoiding financial numbers.
> - **Eligibility Rules:** Read-time leniency ensures completed deals with `is_processed_output = null` remain eligible as long as trusted quantity and material classification are available. Explicit `is_processed_output = true` correctly blocks allocation.
> - **Guards:** UI securely disables saving if allocation > received, if pathways duplicate, or if explanations are missing. Ineligible lines present a strict read-only diagnostic view showing exact Arabic error reasons.
>
> **Important Deferrals / Out of Scope (For SIR-2C / Future):**
> - No Production deployment yet.
> - No DB cleanup/migration/backfill executed.
> - Multi-material support remains out of scope (current model is single-material per received line).
> - SIR-2C Finalization logic, reporting, PDF exports, CO₂e calculations, and certificate generation are NOT implemented yet.

---

## Section 11: Phase SIR-2C Closed (Sustainability Finalization & Lock)

> **Status:** ✅ Completed and Staging UAT Confirmed.
> 
> **Completed Scope (SIR-2C):**
> - **SIR-2C Finalization + Lock** completed on Staging.
> - **Active backend revision** after final cleanup: `tadweerah-api-00111-jjf`.
> - **Frontend** deployed to Firebase Staging.
> - **Finalized allocations** are locked/read-only.
> - **`طلب تعديل التوزيع`** routes through platform Issues as a temporary bridge.
> - **Historical contract shipment gap** was resolved through targeted backfill of 13 closed shipment references; post-check count became `0`.
> - **Temporary diagnostic/backfill endpoints** were removed.
> - **Contract shipment parity** completed:
>   - Source reference.
>   - Material label from contract line.
>   - Quantity/unit formatting.
>   - Eligibility.
>   - Source navigation and return navigation.
> - **Sustainability quantity rule for contract shipments:**
>   - `source_weight_only` uses `source_weight`.
>   - `destination_weight_only` uses `destination_weight`.
>   - `dual_*` uses `destination_weight`.
>   - Commercial `final_weight` is not used as sustainability quantity unless it is truly the only accepted single-weight quantity and no clearer operational field exists.
> - **Existing finalized mismatches** are not silently rewritten and are deferred to SIR-2D governance.
>
> **Important Deferrals / Out of Scope (For SIR-2D/SIR-3A / Future):**
> - Full admin-governed reopen/versioned revision workflow: **implemented in SIR-2D** (pending staging deploy).
> - Seller-facing Sustainability Reports tab is deferred to SIR-3A.
> - No production deploy.
> - No git push.
> - No DB action.
> - No finalized allocation silently rewritten.
> - No CO₂e, PDF, certificates, or verified/certified language.

---

## Section 12: Phase SIR-3A Closed (Sustainability Reports MVP)

> **Status:** ✅ Accepted on Staging.
> 
> **Completed Scope (SIR-3A MVP):**
> - **Reports Hub Integration:** Added `تقارير الاستدامة` tab to the existing `تقاريري` reports hub page instead of creating a standalone disjointed page.
> - **Reporting Fields:** Defined canonical reporting fields via `GET /api/reports/sustainability` tailored for seller-facing data exports. Includes exact final allocation quantities and data quality levels.
> - **Dynamic Pathway Columns:** Each active sustainability pathway is dynamically retrieved from `sustainability_pathways` and rendered as its own distinct column.
> - **CSV Export (MVP Format):** CSV exports are the primary output method, featuring localized UTF-8 BOM headers and purely numeric pathway values optimized for Excel `SUM()` analysis.
>
> **Important Deferrals / Out of Scope:**
> - PDF generation and printable branded reports are deferred to SIR-3B.
> - Full admin-governed reopen/versioned revision workflow is deferred to SIR-2D.
> - No CO₂e calculations, certificate generation, or verified/certified language included.
> - No production deploy, no DB mutation.
>
> **Versioning & Deployment Details:**
> - **Versioning Logic:** Enforced returning only finalized records. Implemented logic to ensure only the latest active finalized version is reported. Excluded `superseded` and `draft` statuses.
> - **Deployed to Staging:** Active backend revision: `tadweerah-api-00116-95g`. Frontend deployed to Firebase Staging.

---

## Section 13: Phase CLT-1 — Flexible Offer Window Foundation (فترة استقبال العروض)

> **Status:** ✅ Code implemented — pending staging migration and deploy.
>
> **Customer-facing terminology:** Offer Window / فترة استقبال العروض
> (No auction/bid/مزاد/مزايدة terminology used.)
>
> **What was implemented:**
> - `offer_deadline` NOT NULL TIMESTAMPTZ column on `waste_listings` (migration `0007_add_offer_deadline.sql`, includes backfill).
> - `effective_status` derived at read-time: `offer_window_closed` when `status = 'open' AND offer_deadline <= now()`. No new DB enum values.
> - Backend listing creation: `offer_deadline` required for new listings, validated (24h min with 5m clock-drift buffer, 30d max).
> - Marketplace filtering: expired-deadline listings excluded from `GET /listings`.
> - Offer submission + improvement guards: 409 `OfferWindowClosed` thrown when deadline passed.
> - `OfferWindowClosed` added to eligibility engine (`eligibility.ts`).
> - Frontend: Offer Window preset picker (24h/3d/7d default/14d/30d/custom) in listing creation.
> - Frontend: Deadline status display on listing cards and listing detail page.
> - Frontend: Trust disclosure banner ("seller may accept at any time") and expired-window offer guard.
> - 16 bilingual i18n keys (ar/en).
>
> **Key design decisions:**
> - Seller can still accept submitted offers after window closes (no seller-side restriction).
> - All existing listings backfilled: closed listings use `closed_at` or `created_at`; open listings get `now() + 7 days`.
> - No cron job, no auto-close, no auto-reject.
> - No admin UI to extend/modify deadline post-creation (deferred).
>
> **SIR-3B protection confirmed:** No sustainability, CO₂e, reports, company logo, or certificate files modified.
>
> **Deployment order (not yet executed):**
> 1. Run migration `0007_add_offer_deadline.sql` on staging DB.
> 2. Deploy api-server (backend).
> 3. Deploy tadweerah (frontend).
> 4. Smoke test: create listing → verify deadline persists → verify marketplace filters → verify offer guard.
>
> **Risk classification:**
> - 🟢 Clock drift: mitigated by 5-minute buffer on 24h minimum.
> - 🟢 Backfill: all existing rows receive a deadline; no NULL path remains.
> - 🟡 No post-creation deadline edit: acceptable for MVP, admin override can be added later.

---

## SIR-2D — Admin Sustainability Governance & Versioned Corrections (Closed)

> **Status:** Closed functionally and safely on staging; Admin report viewing and broader Admin Operations improvements deferred to Admin Phase 2.

### Final Delivery Facts
- Correction request workflow stabilized.
- Admin approve/reject works.
- Existing correction draft reuse implemented.
- Details endpoint and pathway names working.
- Material display cleaned.
- Contract-sourced records do not incorrectly show `Category incomplete`.
- Raw UUID is not shown as the main reference when friendly ref is unavailable.
- Admin `عرض التقرير` is intentionally disabled/deferred for permission safety.
- Company-side report route remains protected.
- Correction draft save/finalize flow now uses a canonical allocation resolver.
- Company-side edit/save/finalize was successfully UAT-tested.
- For `TDW-CTR-2026-0006-S010`:
  - v1 allocation `250a30ff-8ec5-4e2e-ae19-a453e1cccf15` is `superseded`.
  - v2 correction allocation `cbadfa71-7c4c-4ddd-9cee-4131fe984d2b` is `finalized`.
  - No duplicate v3 draft was created.
- Backend revision: `tadweerah-api-00142-rsj`.
- Latest resolver commit: `225447481c387e854af1487718681a141f8ebe47`.
- No migration after stabilization.
- No SIR-3B print/PDF redesign.

### Important Lesson Learned
**Platform Governance Risk:**
- Adding a new helper is not enough unless all live endpoints use it.
- Avoid old/new dual paths.
- Display, save, and finalize flows must share a canonical resolver/state model.
- Future platform audit should identify and remove temporary fallback logic, duplicate resolvers, and legacy/new path ambiguity.

## Admin Phase 2 — Operations Console & Reporting Governance (Deferred)

This future phase will tackle deep administrative features and holistic permissions:
- Safe Admin report viewing.
- Deep links/source navigation across Admin tabs.
- Complete analytical exports.
- Full operational reporting data model.
- Governed admin actions such as reopen/rollback/force-complete/mark-reviewed.
- Delayed/stuck operations dashboard.
- Admin permission levels.
- Short-lived admin viewing token/cookie or formal Clerk admin role.
- Cross-tenant report access regression tests.
- Audit log hardening for sensitive admin actions.
- Platform cleanup audit for temporary/parallel old-new paths.

## Security Follow-up

- `ADMIN_API_KEY` was exposed during UAT/debug.
- **Action Required:** Rotate `ADMIN_API_KEY` immediately after SIR-2D documentation closure as a separate security task.

---

## Phase 3-A1: Customer-visible Trust Fixes (Closed)

> **Status:** Closed functionally and safely on staging.

### Final Delivery Facts
- Transporter dashboard no longer exposes raw deal UUIDs as the main reference.
- Transporter dashboard shows Tadweerah commercial reference when available.
- Company Members UI no longer exposes raw Clerk `user_...` IDs as the main visible value.
- Company Members UI shows member name/email when available, with safe fallback.
- Buyer blocking notification is in-app only.

### Important Governance Decision
- Existing Tadweerah email notifications are working well and must not be disturbed casually.
- Buyer blocking email was intentionally deferred.
- No `sendMail: true` for buyer blocking in this phase.
- Any future buyer-blocking email must be implemented as a separate reviewed task with approved wording, recipient logic, and idempotency.

### Deployment Details
- Main implementation commit: `ddc297c`
- Cleanup commit: `ed03d47`
- Final backend revision: `tadweerah-api-00149-hww` serving 100% traffic.
- Frontend deployed to staging.
- No migration.
- No SIR-3B changes.

### Deferred
- Deal Completion Email.
- Buyer Blocking Email.
- Admin Phase 2 items.
- Any broad notification/email refactor.

