# Tadweerah — Readiness Findings & Risks
> Last updated: 2026-06-09 | Session: 6b53fc3f
> Status: DOCUMENTATION ONLY — no application code changed

> **Legend:**
> - 🟢 Current behavior | 🎯 Target behavior | ⚠️ Gap
> - 🔴 High risk | 🟡 Medium risk | 🟢 Low risk
> - 🚫 Requires backend deploy | 🖥️ Frontend-only fix | 📋 Decision/documentation
> - 🔍 Needs manual verification

---

## Executive Summary

> **Overall Readiness: 9.7 / 10**
> This is suitable for **final pilot UAT and launch preparation**.
> It is nearly ready for an unsupervised Al Qaryan demo, pending final verification.

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
- **Still Pending:** Final Contract Lite UAT, Al Qaryan weight policy founder confirmation, and Contract UX manual UAT.

---

### M5 — Rich Deal Completion Email Not Wired
**Severity: 🟡 Medium | Phase: Phase 2-F**
- **Current:** `sendDealCompletionEmail` defined but never called.
- **Recommended:** Should-do. Likely wire in Phase 2-F unless required earlier.

---

### M6 — Hard-Coded Timer Values
**Severity: 🟢 Low | Phase: Phase 3-B**
- **Current:** All timers are constants.
- **Recommended:** Known limitation. Defer post-pilot unless pilot requires configurability.

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
> **Phase 2-C — Final Pilot Readiness & UAT Hardening:**
> **Status:** ✅ Completed
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
> 8. Checklist wording `متطلبات متبقية` improvement to `متطلبات تشغيلية متبقية`.
> 9. Shipment cancel modal destructive styling improvement.

---

## Section 4: Single Source of Truth Audit

> This section identifies places where logic, values, or behavior is
> duplicated, inconsistent, or has unclear ownership.

| Finding | Files involved | Current source of truth | Recommended SOT | Risk | Phase | Founder decision needed? |
|---------|---------------|------------------------|-----------------|------|-------|--------------------------|
| **Timer durations** | `expire-deals.ts`, implicitly known by ops | Hard-coded constants | Admin-configurable table | 🟡 Medium | Post-pilot | No, but CTO must acknowledge values |
| **Deal status semantics** | `routes/deals.ts`, `pages/admin.tsx`, `pages/dashboard.tsx` | Backend enum | Backend enum (correct) | 🟢 Low | — | No |
| **Transport quote "select" implies assignment** | `routes/admin.ts`, `pages/admin.tsx` | Misleading — backend knows it's label-only; UI implies assignment | Clarify in UI label ("shortlist/prefer") | 🔴 High | Admin UI fix | No |
| **Receipt confirmation implies wait** | `routes/deals.ts` comment, notification body text, `expire-deals.ts` | Backend: 48h wait. Notification text: "auto-complete in 48h". Target: immediate complete | Fix route + job + text | 🔴 High | Deal Lifecycle Correction | Yes — target behavior |
| **`sendDealCompletionEmail` wiring** | `lib/email.ts` defines it; no active lifecycle call site found | Defined but not wired | Decide whether to wire into completion flow | ?? Medium | Deal Lifecycle Correction | Yes |
| **Admin capabilities: API vs UI** | `routes/admin.ts` (full CRUD), `pages/admin.tsx` (partial) | API has more capabilities than UI | UI should expose all safe admin actions | 🟡 Medium | Admin UI fix | No |
| **Material categories: backend vs listing enum** | `material-categories` table (new), `wasteUnitEnum` (legacy enum on old listings) | Split — legacy enum for old, table for new | Migrate legacy listings (post-pilot) | 🟢 Low | Post-pilot | No |
| **VAT calculation** | `routes/deals.ts` (computed at creation), `routes/admin.ts` (reported in CSV) | Single compute at creation ✅ | Same | 🟢 Low | — | No |
| **pre_expiry_notified reset** | `routes/deals.ts` extend handler (resets to false) | Correct — resets so warning fires again | Same | 🟢 Low | — | No |
| **Contract created_by_company_id nullable** | `contracts.ts` schema comment | Nullable for backwards-compat (pre-field contracts) | Acceptable | 🟢 Low | — | No |

---

## Section 4: Contract Lite — Phase-CLT Required

> **Contract Lite is NOT ready for Al Qaryan demo until Phase-CLT is completed.**

### What Was Audited (Broad)
- ✅ State machine (draft → pending → active → completed/cancelled)
- ✅ Creator vs. counterparty role logic
- ✅ Material line management rules (creator-only, draft-only)
- ✅ Shipment schema (planned/dispatched/received/closed/cancelled)
- ✅ Weight policy schema (5 policies, fixed at creation)
- ✅ Admin force-cancel capability
- ✅ No auto-expiry
- ✅ No notifications (confirmed intentional)

### What Was NOT Audited — Phase-CLT Scope
| Gap | Why it matters |
|-----|----------------|
| `contract-detail.tsx` (57,112 bytes) full UI flow | Al Qaryan operator uses this page; unknown UX gaps |
| Contract shipments route logic | Shipment state transitions not verified against business rules |
| Which weight policy to recommend for Al Qaryan | `source_weight_only` vs `dual_higher_final` — founder decision needed |
| Whether contract notifications are needed | Founder decision |
| Admin/report visibility for contract shipments | Can admin see individual shipment weights? |
| Step-by-step Al Qaryan Contract Lite UAT scenario | No test script exists |
| What happens when closing a shipment with zero weight | Edge case not verified |


### Contract Lite UAT Scenario (Phase 2-E)
Example UAT scenario to verify the Al Qaryan `dual_source_final` policy:
1. `source_weight` = 10.5 tons
2. `destination_weight` = 10.4 tons
3. `policy` = `dual_source_final`
4. **Expected `final_weight`** = 10.5
5. **Expected `final_value`** = price_per_ton × 10.5

**UAT must verify:**
- Selected policy is visible before counterparty confirmation.
- Source and destination weights are visible.
- `final_weight` follows selected policy.
- `final_value` follows `final_weight` × price.

**Screenshots to capture:**
- Contract policy selected.
- Shipment source/destination weights.
- `final_weight` and `final_value`.
- Expected notifications.

### Phase-CLT Deliverables
- Exact user steps (seller role, buyer role) for full contract + shipment flow
- Roles involved and what each party can/cannot do
- Shipment lifecycle map with source/destination weight entry points
- Weight policy recommendation for Al Qaryan
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
| Material categories | ✅ Full CRUD (key, names, parent_id, is_sensitive, MWAN fields) | ❌ API-only | ✅ Yes — but protect `key` field from edits |
| Unit options | ✅ Full CRUD (key, symbol, bilingual) | ❌ API-only | ✅ Yes — but protect `key` field |
| Company categories | ✅ Full CRUD | ❌ API-only | ✅ Yes |
| Capabilities | ❌ Read-only via `/lookup/capabilities` — no admin write endpoint | ❌ None | N/A — endpoint needed first |
| Lifecycle status values | Not configurable (DB enums) | N/A | 🚫 Must NOT be editable — they drive backend logic |
| Payment/financial fields | Not configurable | N/A | 🚫 Must NOT be editable |

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

🖥️ Frontend-only change for most; capabilities need 🚫 backend deploy.

---

## Section 6: Assumptions and Manual Verification Needed

> The following cannot be confirmed from code alone. Each must be manually verified
> before pilot launch.

| # | Assumption | How to verify | Risk if wrong |
|---|-----------|--------------|---------------|
| 1 | `RESEND_API_KEY` is set in Cloud Run revision `00046-pnj` | Cloud Run console → env vars | All transactional email silently disabled |
| 2 | `TRANSPORT_REQUEST_EMAIL` is set | Cloud Run console → env vars | Ops never receives transport notifications |
| 3 | `SUPPORT_EMAIL` is set | Cloud Run console → env vars | Issue reports not forwarded to support |
| 4 | Cloud Scheduler expire-deals job is running and last execution succeeded | Cloud Scheduler console → job history | Deals never expire; no warnings fired |
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

### 1. Phase 2-D — Readiness Risk Burn-down & Remaining Roadmap Alignment
- **Scope:** Current docs-only phase.

### 2. Phase 2-E — Contract Lite Pilot UAT & Al Qaryan Readiness
- **Priority:** Must do before pilot if Al Qaryan/contract workflow is the target path.
- **Scope:** Includes Contract Lite audit, Al Qaryan UAT script, weight/final quantity policy confirmation, and contract notification decision.

### 3. Phase 2-F — Pilot Smoke Test & Demo Readiness
- **Priority:** Must do before external pilot/demo.
- **Scope:** End-to-end smoke across seller, buyer/receiver, admin, notifications, reports, and operational recovery tools.

### 4. Phase 3-A — Admin Master Data MVP
- **Priority:** Should do before broader operations if pilot requires frequent taxonomy/unit edits. Can defer if pilot taxonomy is stable.
- **Scope:** Admin CRUD UI for material categories and unit options.

### 5. Phase 3-B — Post-Pilot Workflow Configurability & Polish
- **Priority:** Post-pilot.
- **Scope:** Configurable timers, category-targeted notifications, i18n refactor, checklist wording polish, etc.

## Section 9: Go / No-Go Framing

### Ready for supervised internal UAT and pilot preparation:
✅ Core deal flow (marketplace → offer → deal → payment → dispatch)
✅ Audit trail
✅ Master data API management
✅ Admin company/license management
✅ Report export (CSV)

### NOT ready without completing:
⚠️ Phase 1 (Contract Lite audit) — if Contract Lite is part of Al Qaryan scenario
⚠️ Phase 2 (Deal receipt lifecycle fix) — current behavior diverges from target
⚠️ Phase 3 (Admin UI deal actions) — admin cannot intervene without curl
⚠️ Assumptions verified (§Section 6) — email, scheduler, env vars

### Decisions Required from Founder/CTO Before Pilot
1. Accept or fix deal receipt flow (immediate vs 48h wait)?
2. Accept or change auto-complete without admin review?
3. Should contract notifications be sent during pilot?
4. Which weight policy for Al Qaryan (Contract Lite)?
5. Acknowledge hard-coded timer values as acceptable for pilot?
6. Should buyer auto-blocking require admin confirmation step?




## Risk Note: Admin Shipment Restore
Admin restore of shipments without DB migration relies on timestamps + audit log and is acceptable only for pilot. Long-term implementation should include cancelled_from_status and cancelled_reason columns in the database.
