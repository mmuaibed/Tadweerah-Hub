# Tadweerah — Operational Rules & Notifications Audit
> Last updated: 2026-06-09 | Session: 6b53fc3f
> Status: DOCUMENTATION ONLY — no application code changed

> **Legend:**
> - 🟢 **Current behavior** — what the deployed code does today
> - 🎯 **Target behavior** — what is needed for pilot readiness
> - ⚠️ **Gap** — action required
> - 🔍 **Needs manual verification**
> - 🚫 **Requires backend deploy** — Cloud Run build + redeploy required

---

## Pilot Philosophy

> For early pilot and Al Qaryan demo, the following principle applies:
>
> **Avoid irreversible automatic cancellation or closure where possible.**
> Prefer: *delayed / needs admin verification / pending admin action*.
> Do NOT automatically: cancel, close, block, reverse financial status,
> or release quantities — without a human review step.

This principle is not yet fully implemented. The audit below identifies
where the current system diverges from it.

---

## 1. Deal Lifecycle Timer Rules

All timers enforced hourly by `artifacts/api-server/src/jobs/expire-deals.ts`.
🚫 Any change to timer values or logic requires backend deploy.

### 1.1 Expiry Thresholds

| Deal Status | 🟢 Current threshold | Override | Who triggers | Configurable? |
|-------------|---------------------|----------|--------------|---------------|
| `active` / `payment_submitted` | 31 calendar days from `created_at` | `extended_until` if set | Hourly job | ❌ Hard-coded (`MS.active`) |
| `payment_confirmed` | 8 calendar days from `payment_confirmed_at` | `extended_until` if set | Hourly job | ❌ Hard-coded (`MS.payment_confirmed`) |
| `dispatched` | 72 hours from `dispatched_at` | **No extension allowed** | Hourly job | ❌ Hard-coded (`MS.dispatched`) |
| `receipt_pending` | 48 hours from `receipt_pending_since` | Not applicable | Hourly job (auto-complete) | ❌ Hard-coded (`RECEIPT_PENDING_MS`) |

🎯 **Target:** All duration constants should eventually be admin-configurable without
a code change. For pilot, the current values are acceptable; they must be
explicitly acknowledged by the CTO before launch.

### 1.2 Extension Rules
🟢 **Current:** Producer can extend once, pre-dispatch, adding 7 days (`extended_until = now + 7d`).
`extension_count` tracks usage (max 1, enforced in `routes/deals.ts`).
After extension, `pre_expiry_notified` is reset so the 3-day warning fires again.

| Parameter | Value | Location | Configurable? |
|-----------|-------|----------|---------------|
| Max extensions | 1 | `routes/deals.ts` L877 | ❌ Hard-coded |
| Extension duration | 7 days | `routes/deals.ts` L886 | ❌ Hard-coded |

---

## 2. Receipt Confirmation — Current vs Target

> ⚠️ **This is the highest-risk lifecycle gap for pilot readiness.**

### 2.1 🟢 Current Behavior (buyer `confirm-receipt`)
```
dispatched
  → buyer calls POST /deals/:id/confirm-receipt
  → status = receipt_pending
  → received_at = now, received_by = buyer, receipt_pending_since = now
  → Notification sent to producer: "Buyer confirmed receipt. Deal will auto-complete in 48h"
  → 48h later (hourly job): status = completed (AUTO, no human review)
```

### 2.2 🎯 Target Behavior (pilot)
```
dispatched
  → buyer calls confirm-receipt
  → status = completed IMMEDIATELY  (deal is done, no waiting)
  → Both parties notified of completion

dispatched (no buyer confirmation within 48h)
  → deal should be escalated to admin view / flagged as "needs verification"
  → Admin reviews, verifies shipment, and either:
       (a) force-completes after verification, OR
       (b) investigates delay with parties
  → System should NOT auto-complete blindly during pilot
```

### 2.3 Gap Analysis (RESOLVED Phase 2-A)
| Dimension | 🟢 Current (Phase 2-A) | 🎯 Target |
|-----------|---------|--------|
| Buyer confirms receipt | → completed immediately | → completed immediately |
| 48h no receipt | → logs admin escalation flag | → admin escalation flag |
| Admin review step | Escalated to logs | Required before complete |
| `producer-confirm-receipt` endpoint | ❌ Does not exist | May not be needed |
| 🚫 Fix requires | — (Fixed in Phase 2-A) | — |

**Note (Phase 2-A):** Deal completion notifications currently lack a reliable `reference` ID and a direct `/deals/:dealId` deep link because the `dealsTable` schema does not support native deal references (unlike Contract Lite). Injecting this requires a DB migration. This is an accepted gap intentionally deferred to **Phase 2-B** (Notification reference standardization).

---

## 3. Pre-Expiry Warning System

### 3.1 🟢 Current Behavior
- Fires when `deadline - now ≤ 3 calendar days` AND `deadline > now`
- Fires **once per deal** (guarded by `pre_expiry_notified = true`)
- After extension, `pre_expiry_notified` resets so warning fires again

### 3.2 Who Receives It
| Party | Receives warning? | Risk |
|-------|-----------------|------|
| Producer | ✅ Yes | — |
| Buyer | ✅ Yes (Fixed in Phase 2-C) | — |

### 3.3 🎯 Target Behavior
Both buyer and producer receive the 3-day pre-expiry warning. (✅ Implemented)

### 3.4 ⚠️ Risk Classification
✅ **Implemented/deployed in Phase 2-C.** 
Note: Live verification is deferred unless a safe DB strategy is approved.

### 3.5 Admin Control Needed?
🎯 Target: Admin should be able to view deals within 3 days of expiry without
waiting for the notification. A dashboard filter for "expiring soon" would
mitigate this risk without a code change. Does not exist currently.

---

## 4. Auto-Complete System (receipt_pending → completed)

### 4.1 🟢 Current Behavior
- 48 hours after `receipt_pending_since` is set
- Sets `status = completed`, `updated_at = now`
- Notifies both parties with generic `deal_completed` notification
- **No admin review step**
- **No human action required**

### 4.2 Notifications Sent (on auto-complete)
Both parties receive in-app + email:
```
Type:    deal_completed
Producer body: "Review window passed with no dispute. Deal completed."
Buyer body:    "Deal completed after receipt confirmation."
```

### 4.3 🎯 Target Behavior
Auto-complete should NOT fire during pilot without admin oversight.
Preferred approach:
- After 48h with no dispute: flag deal as "pending admin verification"
- Admin reviews and force-completes with reason noted in audit log
- 🚫 Requires backend deploy to `jobs/expire-deals.ts`

### 4.4 Rich Completion Email — Confirmed Not Wired
> ✅ **Resolved.** Full codebase search across all `artifacts/api-server/src/**/*.ts` files
> confirmed: `sendDealCompletionEmail` appears **only once** — at its definition in
> `lib/email.ts:395`. There are **zero call sites** anywhere in the codebase.
>
> **The rich deal completion email (with deal detail table) is never sent under any
> lifecycle path** — not on buyer receipt confirmation, not on auto-complete, not on
> admin force-complete, and not on any other transition.
>
> This is a documentation and operational gap. Parties receive only the generic
> `deal_completed` in-app + generic email when a deal completes. The richer
> `sendDealCompletionEmail` HTML template (dealRef, completionDate, counterparty,
> quantity, finalAmount, manifestRef) is unused dead code.
>
> 🚫 Wiring this function requires a backend code change + Cloud Run deploy.

---

## 5. Receipt Failure Tracking

### 5.1 🟢 Current Behavior
Triggered when a `dispatched` deal expires (buyer failed to confirm receipt within 72h).

```
buyer.receipt_failures_count += 1
if receipt_failures_count >= 2:
    buyer.offer_submission_blocked = true
    audit log: severity=warn
```

### 5.2 Admin Reset
`PATCH /admin/companies/:id/unblock-offers` — clears block and resets count.
Full audit log created. 🔍 Verify this endpoint is accessible from the admin UI (currently Companies tab).

### 5.3 🎯 Target Behavior Concerns

| Concern | Current | Target |
|---------|---------|--------|
| Buyer notified when blocked | ❌ No notification | ✅ Should receive in-app + email |
| Block triggers | 2 dispatched-deal expirations (auto) | Should require admin review before blocking |
| Reset | Admin-only | ✅ Appropriate |

> ⚠️ Under the target pilot principle, auto-blocking a buyer without a human review step
> is a high-risk automatic action. A dispatch expiry may be due to carrier delay,
> not buyer negligence. Recommend: flag for admin review first; admin confirms block.
> 🚫 Requires backend deploy if logic changed.

---

## 6. Email & Notification Classification

### 6.1 Full Notification Inventory

> **Phase 2-B Notification Reference Rules (Completed):**
> - Pre-deal notifications (offers, broadcasts) use `LIST-...` references and route to `/listings/:id`.
> - Post-deal lifecycle notifications use `TDW-...` references.
> - Contract Lite in-app notifications correctly route to `/contracts/:id`.
> - Open-listing notifications target approved/unblocked `company.type = "buyer"` OR `company_roles.role = "receiver"`, excluding the seller.
> - Listing notification emails are enriched with: `LIST-...`, city, main category, subcategory, quantity + unit.
> - Safe logging for open-listing notification broadcast exists.
> - **Deferred:** Category-targeted listing notifications, full material matching, and dedicated notification type for seller publish confirmation.

| Event | Type key | Recipient(s) | Email? | Admin control needed? | Timing configurable? | Implies state change? | Pilot recommendation |
|-------|----------|-------------|--------|----------------------|---------------------|----------------------|---------------------|
| New offer on listing | `offer_received` | Producer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Outbid | `outbid` | Previous top buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Offer accepted | `offer_accepted` | Buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Offer rejected | `offer_rejected` | Buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Private deal invitation | `private_deal_invitation` | Target buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Deal expiry warning | `deal_expiry_warning` | **Producer + Buyer** | ✅ Yes | 🎯 Needs admin view | 🎯 Should be configurable | 🔴 YES — precedes expiry | ✅ Fixed in Phase 2-C |
| Deal expired | `deal_expired` | Producer + Buyer | ✅ Yes | 🎯 Admin should review | 🎯 Should be configurable | 🔴 YES — terminal state | ⚠️ Monitor; avoid auto-expiry if possible |
| Deal auto-completed (48h) | `deal_completed` | Producer + Buyer | ✅ Yes | 🎯 Admin should review | 🎯 Should be configurable | 🔴 YES — terminal state | 🔴 Change to escalation, not auto-complete |
| Buyer receipt confirmed | `deal_receipt_pending` | Producer | ✅ Yes | No | No | 🟡 Yes — starts 48h timer | 🎯 Should become → immediate completion |
| Goods dispatched | `deal_dispatched` | Buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Payment submitted | (deal stage) | Producer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Payment confirmed | (deal stage) | Buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| Deal cancelled (producer) | `deal_cancelled` | Buyer | ✅ Yes | No | No | 🔴 Yes — terminal | ✅ Keep as-is |
| Deal cancelled (admin) | `deal_cancelled` | Producer + Buyer | ✅ Yes | — | — | 🔴 Yes — terminal | ✅ Added in Phase 2-C |
| Deal force-completed (admin) | `deal_completed` | Producer + Buyer | ✅ Yes | — | — | 🔴 Yes — terminal | ✅ Added in Phase 2-C |
| Deal reopened (admin) | `deal_reopened` | Producer + Buyer | ✅ Yes | — | — | 🔴 Yes — operational | ✅ Added in Phase 2-C |
| Deal extended | `deal_extended` | Buyer | ✅ Yes | No | No | No | ✅ Keep as-is |
| New listing published | `new_listing_published` | Eligible buyers | ✅ Yes | No | No | No | ✅ Keep as-is |

### 6.2 Ops-Only Emails

| Event | Recipient | Env var | Status | Risk |
|-------|-----------|---------|--------|------|
| New transport request | Ops email | `TRANSPORT_REQUEST_EMAIL` | ✅ Wired | 🔍 Verify env set |
| Issue report submitted | Support email | `SUPPORT_EMAIL` | ✅ Wired | 🔍 Verify env set |
| Deal completion (rich HTML) — `sendDealCompletionEmail` | Company owner | `RESEND_API_KEY` | ❌ **Defined but NOT called anywhere** | 🔴 Rich completion email never fires |

### 6.3 Notification Delivery Architecture
```
Event (route or job)
  → notifyDealStageChange() / typed helper
      → INSERT notifications row (in-app, always)
      → if sendMail:true → lookupOwnerEmail(companyId)
            → Clerk API → owner email
            → sendEmail() → Resend (fire-and-forget)
```
**Resilience:** No retry. Clerk down → email skipped silently. Resend down → in-app only.
**Hourly job:** All notify calls use `void` (fully fire-and-forget).

---

## 7. Admin Deal Override Rules

> ⚠️ **Admin overrides carry significant operational risk if used without safeguards.**
> Each admin action affecting deal status must have:
> - Required reason/note (body param)
> - Visible previous + new status in the UI
> - Audit log entry (all current admin routes already write to audit_log ✅)
> - Notification to affected parties (currently missing ⚠️)
> - Clear semantic distinction between cancel, force-complete, reopen, and step-back

### 7.1 Admin Cancel
| Dimension | Deployed Behavior |
|-----------|-------------------|
| Allowed from | Any non-terminal status |
| Reason field | ✅ Required |
| Status change | Changes to `cancelled` |
| Audit log | ✅ Logged |
| Notification to parties | ✅ Seller and buyer notified |
| UAT | ✅ Passed (Phase 2-C) |

### 7.2 Admin Force Complete
| Dimension | Deployed Behavior |
|-----------|-------------------|
| Allowed from | Any non-terminal status |
| Reason field | ✅ Required |
| Status change | Changes to `completed` |
| Audit log | ✅ Logged |
| Notification to parties | ✅ Seller and buyer notified |
| UAT | ✅ Passed (Phase 2-C) |

### 7.3 Payment Resubmission
| Dimension | Current | Target |
|-----------|---------|--------|
| Allowed from | active, payment_submitted | Same |
| Fields cleared | payment_reference, payment_proof_url, payment_submitted_at, payment_confirmed_at | ✅ Appropriate |
| Buyer notification | ❌ None — buyer sees `active` in UI | 🎯 Should send "please resubmit" notification |

### 7.4 Admin Override Safeguards
All actions now implement the safeguards (reason, audit, notification).

### 7.5 Admin Reopen Deal
| Dimension | Deployed Behavior |
|-----------|-------------------|
| Route | `POST /admin/deals/:id/reopen` |
| Allowed from | Terminal deals only (`completed`, `cancelled`) |
| Status change | Restores validated previous non-terminal status from audit log |
| Field resets | Clears `cancelled_at`, clears `received_at`, resets `pre_expiry_notified = false` |
| Field updates | Sets `extended_until = now + 7 days` |
| Preservation | Preserves payment, transport, and shipment data |
| Notification to parties | ✅ Seller and buyer notified |
| UAT | ✅ Passed (Phase 2-C) |

---


## 8. Contract Lite Rules

> ⚠️ See §Contract Lite gap in PROJECT_MAP.md and §Phase-CLT in READINESS_FINDINGS_AND_RISKS.md

### 8.1 🟢 Current State Machine
| Transition | Who | Conditions | Notification |
|------------|-----|-----------|-------------|
| draft → pending_confirmation | Creator (seller or buyer) | ≥1 material line | ❌ None |
| pending_confirmation → active | Counterparty only | — | ❌ None |
| active → completed | Creator only | All shipments in terminal state | ❌ None |
| Any → cancelled (user) | Either party | No open shipments | ❌ None |
| Any → cancelled (admin) | Admin key | Ignores open shipments | ❌ None |

### 8.2 No Expiry Timer
🟢 Contracts have no auto-expiry. `end_date` is advisory.
🎯 Target: Contracts past `end_date` should appear in an admin "past-end-date" view.

### 8.3 🎯 Notification Decision Needed
Contract Lite is currently ops-internal (no notifications by design). Before Al Qaryan pilot,
a founder decision is needed: **should contract state changes send email/in-app notifications?**
This cannot be decided from code alone.

---

## 9. Listing Lifecycle Rules

### 9.1 Listing Status Values
```
open → filled (when offer accepted + deal created)
     → closed (producer manually closes)
     → cancelled
```

### 9.2 Re-open on Deal Cancel — Needs Verification
🔍 If a deal is cancelled, it is unclear from code alone whether the listing status
is reset from `filled` back to `open`. **Must verify in `routes/deals.ts` cancel logic.**

---

## 10. Transport Quote — Semantic Gap

### 10.1 🟢 Current Behavior
`PATCH /admin/transport-quotes/:id/select` sets `status = 'selected'` on the quote row only.
It does **not**:
- Update `transporter_company_id` on the transport request
- Change TR `status` from `pending`
- Notify the transporter company

### 10.2 🎯 Target Behavior
Quote selection should: assign transporter to TR, change TR status, and notify transporter.
🚫 Requires new backend endpoint + deploy.

### 10.3 ⚠️ Risk
Ops may mark a quote "selected" believing the transporter is assigned.
The transport request remains `pending`. The transporter receives no notification.
This is a **high operational risk** during pilot logistics coordination.

---

## 11. Operational Pre-Launch Checklist

### Must Verify Before Al Qaryan Demo
- [ ] 🔍 `RESEND_API_KEY` is set and active in Cloud Run `00046-pnj`
- [ ] 🔍 `TRANSPORT_REQUEST_EMAIL` is set to a monitored mailbox
- [ ] 🔍 `SUPPORT_EMAIL` is set for issue copies
- [ ] 🔍 `ADMIN_API_KEY` is strong and known only to admin
- [ ] 🔍 `VITE_TADWEERAH_ADMIN_EMAILS` includes all admin user emails
- [ ] 🔍 Cloud Scheduler is running and expire-deals job last run was successful
- [ ] 🔍 At least one material category exists and `is_active = true`
- [ ] 🔍 At least one unit option exists and `is_active = true`
- [ ] 🔍 Al Qaryan company is onboarded with `license_status = 'approved'`
- [ ] 🔍 Transport quote "select" behavior understood by ops team (label-only, not assignment)
- [ ] Decide whether to wire `sendDealCompletionEmail` into the completion flow
- [x] Test full deal lifecycle in staging with safe test data before live demo (✅ Passed Phase 2-C UAT)
- [x] Admin notifications reach parties after override (✅ Passed Phase 2-C UAT)
- [x] Buyer receipt completion behavior correct after fix (✅ Passed Phase 2-C UAT)

### Decisions Needed Before Pilot (Founder/CTO)
- [ ] Accept or fix receipt confirmation flow (immediate complete vs 48h wait)?
- [ ] Accept or change auto-complete without admin review?
- [ ] Should contracts send notifications during pilot?
- [ ] Is 72h dispatch window sufficient for Al Qaryan logistics?
- [ ] Should buyer-blocking require admin review before triggering?


## Admin Shipment Actions
- **Admin-only cancel**: Allowed for planned/dispatched shipments only. Does not send emails or in-app notifications during UAT. Logs shipment.cancelled_by_admin.
- **Admin-only restore**: Allowed for admin-cancelled shipments only. Reverts to planned or dispatched based on timestamps. Does not send emails/notifications during UAT. Logs shipment.restored_by_admin.

## 8. Admin List Management (Master Data)

> Added in Phase 1-B

**Master Data Deactivation Checks:**
- **Material categories/subcategories:** Deactivation is blocked if the category or subcategory is currently referenced by any active listing in waste_listings.
- **Unit options:** Deactivation is blocked if the unit is currently referenced by any active listing in waste_listings.
- **Company categories:** Deactivation is blocked if the category is currently referenced by any registered company in companies.
- **Key immutability:** All list option keys are strictly immutable after creation. Backend enforces this by stripping key from PATCH requests.
- **Hard deletion:** Not supported. `DELETE` HTTP methods have been safely routed to perform soft-deactivations and enforce reference checks.
- **Visibility:** Deactivated records disappear from public endpoints. Dedicated admin read endpoints expose active and inactive records to admins for governance.

