# Tadweerah â€” Readiness Findings & Risks
> Last updated: 2026-06-09 | Session: 6b53fc3f
> Status: DOCUMENTATION ONLY â€” no application code changed

> **Legend:**
> - ðŸŸ¢ Current behavior | ðŸŽ¯ Target behavior | âš ï¸ Gap
> - ðŸ”´ High risk | ðŸŸ¡ Medium risk | ðŸŸ¢ Low risk
> - ðŸš« Requires backend deploy | ðŸ–¥ï¸ Frontend-only fix | ðŸ“‹ Decision/documentation
> - ðŸ” Needs manual verification

---

## Executive Summary

> **Overall Readiness: 7.5 / 10**
> This is suitable for **supervised internal UAT and limited pilot preparation** only.
> It is NOT yet ready for a strong Al Qaryan demo or unsupervised pilot without
> completing the phases listed below.

The core platform architecture is sound. The deal state machine, contract system,
admin API controls, notification pipeline, and audit trail are correctly implemented.

However, three critical issues prevent a 9.5+ readiness rating:

1. **Deal receipt lifecycle does not match target pilot behavior** â€” buyer confirming
   receipt should complete the deal immediately; the current 48h auto-complete fires
   blindly without admin review.
2. **Contract Lite has not been deeply audited** â€” the UI, shipment lifecycle,
   weight policy behavior, and Al Qaryan UAT scenario are unknown.
3. **Admin operations UI is incomplete** â€” cancel and force-complete require raw API
   calls; parties are not notified after admin overrides.

---

## Section 1: High-Priority Findings (ðŸ”´)

### H1 â€” Deal Receipt Lifecycle Mismatch (CRITICAL)
**Severity: ðŸ”´ High | Deploy: ðŸš« Yes | Phase: Deal Lifecycle Correction**

ðŸŸ¢ **Current:** Buyer calling `confirm-receipt` moves the deal to `receipt_pending`.
48 hours later, the hourly job auto-completes it. No admin review occurs.

ðŸŽ¯ **Target:** Buyer confirms receipt â†’ deal completes **immediately**.
If no receipt confirmed within 48h â†’ escalate to admin, do NOT auto-complete.

**Why this matters:**
- A buyer may confirm receipt of an incorrect/partial shipment, completing the deal
  when it should be disputed
- Conversely, the 48h wait is unnecessary friction when both parties agree
- Auto-completing sensitive real-world transactions without a human review step
  violates the pilot principle

**Code locations:** `routes/deals.ts` L693â€“767 + `jobs/expire-deals.ts` L304â€“358

**Recommended fix:**
1. Change `confirm-receipt` endpoint: `dispatched â†’ completed` directly
2. Change hourly job: after 48h without receipt, flag as "needs admin review" instead of auto-complete
3. Add admin endpoint or UI view for "receipt not confirmed / needs verification"

---

### H2 â€” Admin UI Missing Deal Override Buttons (CRITICAL for demo)
**Severity: ðŸ”´ High | Deploy: ðŸ–¥ï¸ Frontend only | Phase: Admin Operations MVP**

ðŸŸ¢ **Current:** `POST /admin/deals/:id/cancel` and `POST /admin/deals/:id/force-complete`
exist as production-ready API endpoints. The admin panel (`pages/admin.tsx`) Deals tab
shows MWAN readiness scores but has **no buttons to trigger these actions**.

ðŸŽ¯ **Target:** Admin can cancel, force-complete, or request payment resubmission
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

### H3 â€” Buyer Not Warned Before Deal Expires
**Severity: ðŸ”´ High | Deploy: ðŸš« Yes | Phase: Notification/Timer Safety**

ðŸŸ¢ **Current:** Pre-expiry warning (3 days before deadline) sent to **producer only**.
Buyer receives no advance notice.

ðŸŽ¯ **Target:** Both buyer and producer receive the 3-day pre-expiry warning.

**Fix:** Add one `notifyDealStageChange` call for `buyer_company_id` in
`jobs/expire-deals.ts` Step 1 (~L138). ðŸš« Requires backend deploy.

---

### H4 â€” Admin Overrides Send No Notifications to Parties
**Severity: ðŸ”´ High | Deploy: ðŸš« Yes | Phase: Admin Operations MVP**

ðŸŸ¢ **Current:** Admin cancel, force-complete, and payment resubmission write to
audit_log but send no notification to buyer or producer. Parties discover status
changes by refreshing the dashboard.

ðŸŽ¯ **Target:** Any admin status change on a deal must notify both affected parties
with an appropriate in-app notification and email.

**Fix:** Add `notifyDealStageChange` calls in `routes/admin.ts` after each deal mutation.
Reason must be included in the notification body. ðŸš« Requires backend deploy.

---

## Section 2: Medium-Priority Findings (ðŸŸ¡)

### M1 â€” Transport Quote "Select" Does Not Assign Transporter
**Severity: ðŸŸ¡ Medium | Deploy: ðŸš« Yes (if fixed) | Phase: Admin Operations MVP**

ðŸŸ¢ **Current:** `PATCH /admin/transport-quotes/:id/select` changes quote `status`
to `'selected'` only. Does not update `transporter_company_id` on the transport
request. TR remains in `pending` status. No notification sent to transporter.

ðŸŽ¯ **Target:** Selecting a quote should assign the transporter to the TR and
transition TR status (e.g., to `assigned` or `confirmed`).

âš ï¸ **Operational risk:** Ops staff may believe they have assigned a transporter
when they have only annotated a preference. This could result in a no-show
transport during Al Qaryan demo. **Verify this is understood by ops team before
using quote-select operationally.**

---

### M2 â€” Admin Cannot Cancel Dispatched or Receipt-Pending Deals Without Safeguards
**Severity: ðŸŸ¡ Medium | Deploy: ðŸš« Yes (if expanded) | Phase: Admin Operations MVP**

ðŸŸ¢ **Current:** `POST /admin/deals/:id/cancel` rejects `dispatched` and
`receipt_pending` statuses. Only `force-complete` is available for these states.

ðŸŽ¯ **Target pilot behavior (conservative):**
- Do NOT simply expand cancel to cover these states without safeguards
- For dispatched/receipt_pending: admin should be able to flag as "operational hold" or "disputed"
- Force-complete with mandatory reason is the appropriate path for verified arrivals
- True cancellation post-dispatch requires: mandatory reason + CTO approval + audit trail + party notification

---

### M3 â€” Buyer Blocked Silently (No Notification)
**Severity: ðŸŸ¡ Medium | Deploy: ðŸš« Yes | Phase: Notification/Timer Safety**

ðŸŸ¢ **Current:** When `offer_submission_blocked = true` triggers (2 receipt failures),
no email or in-app notification is sent. Buyer discovers block on next offer attempt.

ðŸŽ¯ **Target:** Buyer receives a notification when blocked, explaining the reason.
Additionally, the auto-block itself should ideally require admin confirmation under
the pilot principle (carrier delays should not penalize buyers).

---

### M4 â€” Contract Lite Has No Notifications
**Severity: ðŸŸ¡ Medium | Phase: Contract Lite Deep Audit**

ðŸŸ¢ **Current:** No notification or email fires on any contract state change.
This is intentional (ops-internal tool).

ðŸŽ¯ **Target (undecided):** Whether contract notifications are needed for Al Qaryan
pilot is a **founder/CTO decision**. Cannot be determined from code alone.
Add to Phase-CLT scope.

---

### M5 â€” Rich Deal Completion Email Is Defined But Never Called (Confirmed)
**Severity: ðŸŸ¡ Medium | Deploy: ðŸš« Yes (to wire it) | Resolved: âœ…**

âœ… **Confirmed by full codebase search** (`artifacts/api-server/src/**/*.ts`):
`sendDealCompletionEmail` appears **exactly once** â€” at its function definition in
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
ðŸš« Requires backend code change + Cloud Run deploy.

---

### M6 â€” All Timer Values are Hard-Coded
**Severity: ðŸŸ¡ Medium | Deploy: ðŸš« Yes (to change) | Phase: Post-Pilot**

All deal lifecycle durations are compile-time constants in `jobs/expire-deals.ts`:
`MS.active` (31d), `MS.payment_confirmed` (8d), `MS.dispatched` (72h),
`MS.pre_expiry_warn` (3d), `RECEIPT_PENDING_MS` (48h).
Extension values are inline in `routes/deals.ts`.

ðŸŽ¯ **Target:** These should become admin-configurable (stored in DB or env).
This is a post-pilot improvement, but must be acknowledged before launch.

---

## Section 3: Single Source of Truth Audit

> This section identifies places where logic, values, or behavior is
> duplicated, inconsistent, or has unclear ownership.

| Finding | Files involved | Current source of truth | Recommended SOT | Risk | Phase | Founder decision needed? |
|---------|---------------|------------------------|-----------------|------|-------|--------------------------|
| **Timer durations** | `expire-deals.ts`, implicitly known by ops | Hard-coded constants | Admin-configurable table | ðŸŸ¡ Medium | Post-pilot | No, but CTO must acknowledge values |
| **Deal status semantics** | `routes/deals.ts`, `pages/admin.tsx`, `pages/dashboard.tsx` | Backend enum | Backend enum (correct) | ðŸŸ¢ Low | â€” | No |
| **Transport quote "select" implies assignment** | `routes/admin.ts`, `pages/admin.tsx` | Misleading â€” backend knows it's label-only; UI implies assignment | Clarify in UI label ("shortlist/prefer") | ðŸ”´ High | Admin UI fix | No |
| **Receipt confirmation implies wait** | `routes/deals.ts` comment, notification body text, `expire-deals.ts` | Backend: 48h wait. Notification text: "auto-complete in 48h". Target: immediate complete | Fix route + job + text | ðŸ”´ High | Deal Lifecycle Correction | Yes â€” target behavior |
| **`sendDealCompletionEmail` wiring** | `lib/email.ts` defines it; no active lifecycle call site found | Defined but not wired | Decide whether to wire into completion flow | 🟡 Medium | Deal Lifecycle Correction | Yes |
| **Admin capabilities: API vs UI** | `routes/admin.ts` (full CRUD), `pages/admin.tsx` (partial) | API has more capabilities than UI | UI should expose all safe admin actions | ðŸŸ¡ Medium | Admin UI fix | No |
| **Material categories: backend vs listing enum** | `material-categories` table (new), `wasteUnitEnum` (legacy enum on old listings) | Split â€” legacy enum for old, table for new | Migrate legacy listings (post-pilot) | ðŸŸ¢ Low | Post-pilot | No |
| **VAT calculation** | `routes/deals.ts` (computed at creation), `routes/admin.ts` (reported in CSV) | Single compute at creation âœ… | Same | ðŸŸ¢ Low | â€” | No |
| **pre_expiry_notified reset** | `routes/deals.ts` extend handler (resets to false) | Correct â€” resets so warning fires again | Same | ðŸŸ¢ Low | â€” | No |
| **Contract created_by_company_id nullable** | `contracts.ts` schema comment | Nullable for backwards-compat (pre-field contracts) | Acceptable | ðŸŸ¢ Low | â€” | No |

---

## Section 4: Contract Lite â€” Phase-CLT Required

> **Contract Lite is NOT ready for Al Qaryan demo until Phase-CLT is completed.**

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
| `contract-detail.tsx` (57,112 bytes) full UI flow | Al Qaryan operator uses this page; unknown UX gaps |
| Contract shipments route logic | Shipment state transitions not verified against business rules |
| Which weight policy to recommend for Al Qaryan | `source_weight_only` vs `dual_higher_final` â€” founder decision needed |
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

| Area | Score | Condition for 9.5+ |
|------|-------|--------------------|
| Deal lifecycle correctness | **6/10** | Fix receipt confirmation flow + admin escalation path |
| Notification coverage | **7/10** | Add buyer pre-expiry warning; admin override notifications |
| Admin operational control | **6.5/10** | Add deal action buttons to admin UI; notify after overrides |
| Contract Lite | **5/10** | Complete Phase-CLT deep audit |
| Master data configurability (API) | **9.5/10** | Already very good |
| Master data UI | **4/10** | Admin UI panel for master data needed |
| Email infrastructure | **8/10** | Verify env vars; decide whether to wire `sendDealCompletionEmail` |
| Audit trail | **10/10** | Comprehensive and correct |
| Transport operations | **6.5/10** | Clarify quote selection semantics |
| **Overall** | **7.5/10** | Not yet ready for unsupervised Al Qaryan demo |

---

## Section 8: 2â€“3 Day Execution Plan

> This plan assumes the team proceeds from this documentation session.
> Days are approximate 6-hour working days.

---

### Phase 0 â€” Docs Finalization (Current session)
- **Type:** Documentation only
- **Deploy:** None
- **Estimated time:** Complete
- **Exit criteria:** All three docs reviewed, corrected, committed. Open questions catalogued.

---

### Phase 1 â€” Contract Lite Deep Audit + Al Qaryan UAT Script
- **Type:** Audit only (no implementation)
- **Recommended model:** Gemini Pro / Claude Sonnet Thinking (reasoning quality matters)
- **Deploy:** None
- **Estimated time:** 3â€“4 hours
- **Manual UAT required:** Yes (staging walkthrough)
- **Files to read:** `pages/contract-detail.tsx`, `routes/contracts.ts` shipment sub-routes (if any), `lib/db/src/schema/contract-shipments.ts` (already read), admin.ts contracts section
- **Exit criteria:**
  - Full Al Qaryan step-by-step UAT script written
  - Weight policy recommendation documented
  - UI gaps in `contract-detail.tsx` catalogued
  - Notification decision framed for founder
  - Known code changes (if any) scoped and deploy assessed

---

### Phase 2 â€” Deal Lifecycle Correction
- **Type:** Implementation
- **Recommended model:** Gemini Pro High or Claude Sonnet (precise code change)
- **Deploy:** ðŸš« Yes â€” backend `routes/deals.ts` + `jobs/expire-deals.ts`
- **Estimated time:** 3â€“4 hours (code) + 1â€“2 hours (staging verification)
- **Manual UAT required:** Yes â€” full deal flow from active â†’ dispatched â†’ buyer receipt â†’ completed
- **Scope:**
  - Change `confirm-receipt`: `dispatched â†’ completed` (direct)
  - Change hourly job: 48h no-receipt â†’ flag/escalate instead of auto-complete
  - Add notification to buyer on receipt-triggered completion
  - Update notification body text (remove "auto-complete in 48h" language)
- **Exit criteria:**
  - Manual UAT confirms: buyer receipt â†’ immediate complete
  - Manual UAT confirms: 48h without receipt does not auto-complete
  - Admin can view "needs verification" deals (even if just via status filter)

---

### Phase 3 â€” Admin Operations MVP
- **Type:** Implementation (mix of frontend + backend)
- **Recommended model:** Gemini Pro / Claude Sonnet
- **Deploy:** ðŸš« Yes (backend for notifications); ðŸ–¥ï¸ Frontend only (deal action buttons)
- **Estimated time:** 4â€“5 hours
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

### Phase 4 â€” Notification & Timer Safety Fixes
- **Type:** Implementation
- **Recommended model:** Any competent model
- **Deploy:** ðŸš« Yes â€” `jobs/expire-deals.ts`
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

### Phase 5 â€” Master Data / Dropdown UI Assessment
- **Type:** Audit + optional frontend implementation
- **Recommended model:** Any
- **Deploy:** ðŸ–¥ï¸ Frontend only (for most); ðŸš« backend for capabilities CRUD
- **Estimated time:** 2â€“3 hours
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

---

### Phase 6 â€” Final Manual UAT & Closure Report
- **Type:** Verification + documentation
- **Recommended model:** Any (structured report writing)
- **Deploy:** None (this is a verification phase)
- **Estimated time:** 2â€“3 hours
- **Scope:**
  - Full Al Qaryan scenario walkthrough in staging (producer + buyer + admin roles)
  - Verify all Phase 1â€“5 exit criteria
  - Decide whether to wire `sendDealCompletionEmail` into the completion flow
  - Verify listing status reset on deal cancel
  - Write closure report: UAT results, outstanding items, go/no-go recommendation
- **Exit criteria:**
  - All manual verification items in Â§Section 6 checked off
  - Go/no-go decision documented with any remaining risks accepted by CTO

---

## Section 9: Go / No-Go Framing

### Ready for supervised internal UAT and pilot preparation:
âœ… Core deal flow (marketplace â†’ offer â†’ deal â†’ payment â†’ dispatch)
âœ… Audit trail
âœ… Master data API management
âœ… Admin company/license management
âœ… Report export (CSV)

### NOT ready without completing:
âš ï¸ Phase 1 (Contract Lite audit) â€” if Contract Lite is part of Al Qaryan scenario
âš ï¸ Phase 2 (Deal receipt lifecycle fix) â€” current behavior diverges from target
âš ï¸ Phase 3 (Admin UI deal actions) â€” admin cannot intervene without curl
âš ï¸ Assumptions verified (Â§Section 6) â€” email, scheduler, env vars

### Decisions Required from Founder/CTO Before Pilot
1. Accept or fix deal receipt flow (immediate vs 48h wait)?
2. Accept or change auto-complete without admin review?
3. Should contract notifications be sent during pilot?
4. Which weight policy for Al Qaryan (Contract Lite)?
5. Acknowledge hard-coded timer values as acceptable for pilot?
6. Should buyer auto-blocking require admin confirmation step?




## Risk Note: Admin Shipment Restore
Admin restore of shipments without DB migration relies on timestamps + audit log and is acceptable only for pilot. Long-term implementation should include cancelled_from_status and cancelled_reason columns in the database.
