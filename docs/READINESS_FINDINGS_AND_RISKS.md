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

## Section 1: High-Priority Findings (🔴)

### H1 — Deal Receipt Lifecycle Mismatch (RESOLVED Phase 2-A)
**Severity: ✅ Resolved | Deploy: 🚫 Required | Phase: Deal Lifecycle Correction**

🟢 **Updated Behavior (Phase 2-A):** Buyer confirming receipt directly completes the deal.
The 48h blind auto-complete job was disabled. Deals stuck in `receipt_pending` >48h are now escalated to logs for admin verification.

~~🎯 **Target:** Buyer confirms receipt → deal completes **immediately**.~~
~~If no receipt confirmed within 48h → escalate to admin, do NOT auto-complete.~~

**Status:** Fixed in `routes/deals.ts` L693–767 + `jobs/expire-deals.ts` L304–358.

---

### H2 — Admin UI Missing Deal Override Buttons (CRITICAL for demo)
**Severity: 🔴 High | Deploy: 🖥️ Frontend only | Phase: Admin Operations MVP**

🟢 **Current:** `POST /admin/deals/:id/cancel` and `POST /admin/deals/:id/force-complete`
exist as production-ready API endpoints. The admin panel (`pages/admin.tsx`) Deals tab
shows MWAN readiness scores but has **no buttons to trigger these actions**.

🎯 **Target:** Admin can cancel, force-complete, or request payment resubmission
directly from the admin panel UI, with:
- Visible previous + new status
- Required reason field
- Confirmation dialog
- Immediate UI refresh

**Risk for demo:** During the Al Qaryan pilot, if a deal gets stuck, the operator
must use curl or Postman. This is unacceptable for a live demo.

**Recommended fix:** Add action buttons to the existing Deals tab in `admin.tsx`.
Reuse `callAdmin()` pattern already in the file. No backend changes needed.

---

### H3 — Buyer Not Warned Before Deal Expires
**Severity: 🔴 High | Deploy: 🚫 Yes | Phase: Notification/Timer Safety**

🟢 **Current:** Pre-expiry warning (3 days before deadline) sent to **producer only**.
Buyer receives no advance notice.

🎯 **Target:** Both buyer and producer receive the 3-day pre-expiry warning.

**Fix:** Add one `notifyDealStageChange` call for `buyer_company_id` in
`jobs/expire-deals.ts` Step 1 (~L138). 🚫 Requires backend deploy.

---

### H4 — Admin Overrides Send No Notifications to Parties
**Severity: 🔴 High | Deploy: 🚫 Yes | Phase: Admin Operations MVP**

🟢 **Current:** Admin cancel, force-complete, and payment resubmission write to
audit_log but send no notification to buyer or producer. Parties discover status
changes by refreshing the dashboard.

🎯 **Target:** Any admin status change on a deal must notify both affected parties
with an appropriate in-app notification and email.

**Fix:** Add `notifyDealStageChange` calls in `routes/admin.ts` after each deal mutation.
Reason must be included in the notification body. 🚫 Requires backend deploy.

---

## Section 2: Medium-Priority Findings (🟡)

### M1 — Transport Quote "Select" Does Not Assign Transporter
**Severity: 🟡 Medium | Deploy: 🚫 Yes (if fixed) | Phase: Admin Operations MVP**

🟢 **Current:** `PATCH /admin/transport-quotes/:id/select` changes quote `status`
to `'selected'` only. Does not update `transporter_company_id` on the transport
request. TR remains in `pending` status. No notification sent to transporter.

🎯 **Target:** Selecting a quote should assign the transporter to the TR and
transition TR status (e.g., to `assigned` or `confirmed`).

⚠️ **Operational risk:** Ops staff may believe they have assigned a transporter
when they have only annotated a preference. This could result in a no-show
transport during Al Qaryan demo. **Verify this is understood by ops team before
using quote-select operationally.**

---

### M2 — Admin Cannot Cancel Dispatched or Receipt-Pending Deals Without Safeguards
**Severity: 🟡 Medium | Deploy: 🚫 Yes (if expanded) | Phase: Admin Operations MVP**

🟢 **Current:** `POST /admin/deals/:id/cancel` rejects `dispatched` and
`receipt_pending` statuses. Only `force-complete` is available for these states.

🎯 **Target pilot behavior (conservative):**
- Do NOT simply expand cancel to cover these states without safeguards
- For dispatched/receipt_pending: admin should be able to flag as "operational hold" or "disputed"
- Force-complete with mandatory reason is the appropriate path for verified arrivals
- True cancellation post-dispatch requires: mandatory reason + CTO approval + audit trail + party notification

---

### M3 — Buyer Blocked Silently (No Notification)
**Severity: 🟡 Medium | Deploy: 🚫 Yes | Phase: Notification/Timer Safety**

🟢 **Current:** When `offer_submission_blocked = true` triggers (2 receipt failures),
no email or in-app notification is sent. Buyer discovers block on next offer attempt.

🎯 **Target:** Buyer receives a notification when blocked, explaining the reason.
Additionally, the auto-block itself should ideally require admin confirmation under
the pilot principle (carrier delays should not penalize buyers).

---

### M4 — Contract Lite Has No Notifications
**Severity: 🟡 Medium | Phase: Contract Lite Deep Audit**

🟢 **Current:** No notification or email fires on any contract state change.
This is intentional (ops-internal tool).

🎯 **Target (undecided):** Whether contract notifications are needed for Al Qaryan
pilot is a **founder/CTO decision**. Cannot be determined from code alone.
Add to Phase-CLT scope.

---

### M5 — Rich Deal Completion Email Is Defined But Never Called (Confirmed)
**Severity: 🟡 Medium | Deploy: 🚫 Yes (to wire it) | Resolved: ✅**

✅ **Confirmed by full codebase search** (`artifacts/api-server/src/**/*.ts`):
`sendDealCompletionEmail` appears **exactly once** — at its function definition in
`lib/email.ts:395`. There are **zero call sites** anywhere in the codebase.

**What this means:**
- The rich bilingual HTML email (dealRef, completionDate, counterparty name/CR,
  waste category, quantity, finalAmount, manifestRef) **is never sent**
- Parties receive only the generic `deal_completed` in-app notification + generic email
  on deal completion under any path (auto-complete, force-complete, or user-triggered)
- The function is **unused dead code** as of the current deployment

**Impact:** Both buyer and producer miss a formal, professional completion receipt
that would be important for compliance, record-keeping, and customer trust.

**To fix:** Wire `sendDealCompletionEmail` to the deal completion path(s).
🚫 Requires backend code change + Cloud Run deploy.

---

### M6 — All Timer Values are Hard-Coded
**Severity: 🟡 Medium | Deploy: 🚫 Yes (to change) | Phase: Post-Pilot**

All deal lifecycle durations are compile-time constants in `jobs/expire-deals.ts`:
`MS.active` (31d), `MS.payment_confirmed` (8d), `MS.dispatched` (72h),
`MS.pre_expiry_warn` (3d), `RECEIPT_PENDING_MS` (48h).
Extension values are inline in `routes/deals.ts`.

🎯 **Target:** These should become admin-configurable (stored in DB or env).
This is a post-pilot improvement, but must be acknowledged before launch.

---

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

## Section 8: 2–3 Day Execution Plan

> This plan assumes the team proceeds from this documentation session.
> Days are approximate 6-hour working days.

---

### Phase 0 — Docs Finalization (Current session)
- **Type:** Documentation only
- **Deploy:** None
- **Estimated time:** Complete
- **Exit criteria:** All three docs reviewed, corrected, committed. Open questions catalogued.

---

### Phase 1 — Contract Lite Deep Audit + Al Qaryan UAT Script
- **Type:** Audit only (no implementation)
- **Recommended model:** Gemini Pro / Claude Sonnet Thinking (reasoning quality matters)
- **Deploy:** None
- **Estimated time:** 3–4 hours
- **Manual UAT required:** Yes (staging walkthrough)
- **Files to read:** `pages/contract-detail.tsx`, `routes/contracts.ts` shipment sub-routes (if any), `lib/db/src/schema/contract-shipments.ts` (already read), admin.ts contracts section
- **Exit criteria:**
  - Full Al Qaryan step-by-step UAT script written
  - Weight policy recommendation documented
  - UI gaps in `contract-detail.tsx` catalogued
  - Notification decision framed for founder
  - Known code changes (if any) scoped and deploy assessed

---

### Phase 2 — Deal Lifecycle Correction
- **Type:** Implementation
- **Recommended model:** Gemini Pro High or Claude Sonnet (precise code change)
- **Deploy:** 🚫 Yes — backend `routes/deals.ts` + `jobs/expire-deals.ts`
- **Estimated time:** 3–4 hours (code) + 1–2 hours (staging verification)
- **Manual UAT required:** Yes — full deal flow from active → dispatched → buyer receipt → completed
- **Scope:**
  - Change `confirm-receipt`: `dispatched → completed` (direct)
  - Change hourly job: 48h no-receipt → flag/escalate instead of auto-complete
  - Add notification to buyer on receipt-triggered completion
  - Update notification body text (remove "auto-complete in 48h" language)
- **Exit criteria:**
  - Manual UAT confirms: buyer receipt → immediate complete
  - Manual UAT confirms: 48h without receipt does not auto-complete
  - Admin can view "needs verification" deals (even if just via status filter)

---

### Phase 3 — Admin Operations MVP
- **Type:** Implementation (mix of frontend + backend)
- **Recommended model:** Gemini Pro / Claude Sonnet
- **Deploy:** 🚫 Yes (backend for notifications); 🖥️ Frontend only (deal action buttons)
- **Estimated time:** 4–5 hours
- **Manual UAT required:** Yes
- **Scope:**
  - Frontend: Add cancel + force-complete + payment resubmission buttons to admin Deals tab
  - Frontend: Add confirmation dialog with reason field + previous/new status display
  - Backend: Add `notifyDealStageChange` after admin cancel/force-complete/resubmission
  - Backend: Make `reason` required (not optional) for cancel and force-complete
- **Exit criteria:**
  - Admin can cancel/force-complete a deal from the UI without curl
  - Both parties receive a notification after each admin action
  - Audit log confirms reason was recorded

---

### Phase 4 — Notification & Timer Safety Fixes
- **Type:** Implementation
- **Recommended model:** Any competent model
- **Deploy:** 🚫 Yes — `jobs/expire-deals.ts`
- **Estimated time:** 2 hours
- **Manual UAT required:** Yes (verify buyer receives warning)
- **Scope:**
  - Add buyer `pre_expiry_warning` notification (alongside existing producer notification)
  - Add buyer-blocked notification when `offer_submission_blocked` triggers
  - Verify (do NOT change yet): timer constants reviewed and acknowledged by CTO
- **Exit criteria:**
  - Both buyer and producer receive 3-day warning
  - Buyer receives blocked notification
  - Timer values documented and acknowledged

---

### Phase 5 — Master Data / Dropdown UI Assessment
- **Type:** Audit + optional frontend implementation
- **Recommended model:** Any
- **Deploy:** 🖥️ Frontend only (for most); 🚫 backend for capabilities CRUD
- **Estimated time:** 2–3 hours
- **Manual UAT required:** Yes
- **Scope:**
  - Assess: is a master data management UI tab in admin.tsx feasible?
  - If yes: add CRUD UI for material categories + unit options (soft-delete only)
  - Protect: `key` fields read-only; `is_sensitive` clearly labeled
  - Document: capabilities endpoint gap (no admin write API)
  - **Exit criteria:**
    - Admin can activate/deactivate material categories from UI
    - Admin can activate/deactivate unit options from UI
    - Capabilities gap documented with backend ticket if needed
  - **Progress Note:** Step 3A resolves the active-only GET limitation, providing admin read endpoints for active + inactive options necessary for the future UI. Step 3B provides a read-only Admin UI shell before introducing write actions.

---

### Phase 6 — Final Manual UAT & Closure Report
- **Type:** Verification + documentation
- **Recommended model:** Any (structured report writing)
- **Deploy:** None (this is a verification phase)
- **Estimated time:** 2–3 hours
- **Scope:**
  - Full Al Qaryan scenario walkthrough in staging (producer + buyer + admin roles)
  - Verify all Phase 1–5 exit criteria
  - Decide whether to wire `sendDealCompletionEmail` into the completion flow
  - Verify listing status reset on deal cancel
  - Write closure report: UAT results, outstanding items, go/no-go recommendation
- **Exit criteria:**
  - All manual verification items in §Section 6 checked off
  - Go/no-go decision documented with any remaining risks accepted by CTO

---

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
