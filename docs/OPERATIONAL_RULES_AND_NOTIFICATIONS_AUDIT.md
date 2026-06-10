# Tadweerah â€” Operational Rules & Notifications Audit
> Last updated: 2026-06-09 | Session: 6b53fc3f
> Status: DOCUMENTATION ONLY â€” no application code changed

> **Legend:**
> - ðŸŸ¢ **Current behavior** â€” what the deployed code does today
> - ðŸŽ¯ **Target behavior** â€” what is needed for pilot readiness
> - âš ï¸ **Gap** â€” action required
> - ðŸ” **Needs manual verification**
> - ðŸš« **Requires backend deploy** â€” Cloud Run build + redeploy required

---

## Pilot Philosophy

> For early pilot and Al Qaryan demo, the following principle applies:
>
> **Avoid irreversible automatic cancellation or closure where possible.**
> Prefer: *delayed / needs admin verification / pending admin action*.
> Do NOT automatically: cancel, close, block, reverse financial status,
> or release quantities â€” without a human review step.

This principle is not yet fully implemented. The audit below identifies
where the current system diverges from it.

---

## 1. Deal Lifecycle Timer Rules

All timers enforced hourly by `artifacts/api-server/src/jobs/expire-deals.ts`.
ðŸš« Any change to timer values or logic requires backend deploy.

### 1.1 Expiry Thresholds

| Deal Status | ðŸŸ¢ Current threshold | Override | Who triggers | Configurable? |
|-------------|---------------------|----------|--------------|---------------|
| `active` / `payment_submitted` | 31 calendar days from `created_at` | `extended_until` if set | Hourly job | âŒ Hard-coded (`MS.active`) |
| `payment_confirmed` | 8 calendar days from `payment_confirmed_at` | `extended_until` if set | Hourly job | âŒ Hard-coded (`MS.payment_confirmed`) |
| `dispatched` | 72 hours from `dispatched_at` | **No extension allowed** | Hourly job | âŒ Hard-coded (`MS.dispatched`) |
| `receipt_pending` | 48 hours from `receipt_pending_since` | Not applicable | Hourly job (auto-complete) | âŒ Hard-coded (`RECEIPT_PENDING_MS`) |

ðŸŽ¯ **Target:** All duration constants should eventually be admin-configurable without
a code change. For pilot, the current values are acceptable; they must be
explicitly acknowledged by the CTO before launch.

### 1.2 Extension Rules
ðŸŸ¢ **Current:** Producer can extend once, pre-dispatch, adding 7 days (`extended_until = now + 7d`).
`extension_count` tracks usage (max 1, enforced in `routes/deals.ts`).
After extension, `pre_expiry_notified` is reset so the 3-day warning fires again.

| Parameter | Value | Location | Configurable? |
|-----------|-------|----------|---------------|
| Max extensions | 1 | `routes/deals.ts` L877 | âŒ Hard-coded |
| Extension duration | 7 days | `routes/deals.ts` L886 | âŒ Hard-coded |

---

## 2. Receipt Confirmation â€” Current vs Target

> âš ï¸ **This is the highest-risk lifecycle gap for pilot readiness.**

### 2.1 ðŸŸ¢ Current Behavior (buyer `confirm-receipt`)
```
dispatched
  â†’ buyer calls POST /deals/:id/confirm-receipt
  â†’ status = receipt_pending
  â†’ received_at = now, received_by = buyer, receipt_pending_since = now
  â†’ Notification sent to producer: "Buyer confirmed receipt. Deal will auto-complete in 48h"
  â†’ 48h later (hourly job): status = completed (AUTO, no human review)
```

### 2.2 ðŸŽ¯ Target Behavior (pilot)
```
dispatched
  â†’ buyer calls confirm-receipt
  â†’ status = completed IMMEDIATELY  (deal is done, no waiting)
  â†’ Both parties notified of completion

dispatched (no buyer confirmation within 48h)
  â†’ deal should be escalated to admin view / flagged as "needs verification"
  â†’ Admin reviews, verifies shipment, and either:
       (a) force-completes after verification, OR
       (b) investigates delay with parties
  â†’ System should NOT auto-complete blindly during pilot
```

### 2.3 Gap Analysis
| Dimension | Current | Target |
|-----------|---------|--------|
| Buyer confirms receipt | â†’ receipt_pending (waits 48h) | â†’ completed immediately |
| 48h no receipt | â†’ auto-complete (blind) | â†’ admin escalation flag |
| Admin review step | None | Required before auto-complete |
| `producer-confirm-receipt` endpoint | âŒ Does not exist | May not be needed if buyer receipt = complete |
| ðŸš« Fix requires | `routes/deals.ts` + `jobs/expire-deals.ts` | Backend deploy |

---

## 3. Pre-Expiry Warning System

### 3.1 ðŸŸ¢ Current Behavior
- Fires when `deadline - now â‰¤ 3 calendar days` AND `deadline > now`
- Fires **once per deal** (guarded by `pre_expiry_notified = true`)
- After extension, `pre_expiry_notified` resets so warning fires again

### 3.2 Who Receives It
| Party | Receives warning? | Risk |
|-------|-----------------|------|
| Producer | âœ… Yes | â€” |
| Buyer | âŒ No | ðŸ”´ High â€” buyer unaware deal may expire |

### 3.3 ðŸŽ¯ Target Behavior
Both buyer and producer receive the 3-day pre-expiry warning.

### 3.4 âš ï¸ Risk Classification
Classified **HIGH** because:
- If deal expires, buyer loses money already submitted for payment
- Buyer has no warning this is coming
- Fix is trivial (one `notifyDealStageChange` call for buyer_company_id)
- ðŸš« Requires backend deploy to `jobs/expire-deals.ts`

### 3.5 Admin Control Needed?
ðŸŽ¯ Target: Admin should be able to view deals within 3 days of expiry without
waiting for the notification. A dashboard filter for "expiring soon" would
mitigate this risk without a code change. Does not exist currently.

---

## 4. Auto-Complete System (receipt_pending â†’ completed)

### 4.1 ðŸŸ¢ Current Behavior
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

### 4.3 ðŸŽ¯ Target Behavior
Auto-complete should NOT fire during pilot without admin oversight.
Preferred approach:
- After 48h with no dispute: flag deal as "pending admin verification"
- Admin reviews and force-completes with reason noted in audit log
- ðŸš« Requires backend deploy to `jobs/expire-deals.ts`

### 4.4 Rich Completion Email â€” Confirmed Not Wired
> âœ… **Resolved.** Full codebase search across all `artifacts/api-server/src/**/*.ts` files
> confirmed: `sendDealCompletionEmail` appears **only once** â€” at its definition in
> `lib/email.ts:395`. There are **zero call sites** anywhere in the codebase.
>
> **The rich deal completion email (with deal detail table) is never sent under any
> lifecycle path** â€” not on buyer receipt confirmation, not on auto-complete, not on
> admin force-complete, and not on any other transition.
>
> This is a documentation and operational gap. Parties receive only the generic
> `deal_completed` in-app + generic email when a deal completes. The richer
> `sendDealCompletionEmail` HTML template (dealRef, completionDate, counterparty,
> quantity, finalAmount, manifestRef) is unused dead code.
>
> ðŸš« Wiring this function requires a backend code change + Cloud Run deploy.

---

## 5. Receipt Failure Tracking

### 5.1 ðŸŸ¢ Current Behavior
Triggered when a `dispatched` deal expires (buyer failed to confirm receipt within 72h).

```
buyer.receipt_failures_count += 1
if receipt_failures_count >= 2:
    buyer.offer_submission_blocked = true
    audit log: severity=warn
```

### 5.2 Admin Reset
`PATCH /admin/companies/:id/unblock-offers` â€” clears block and resets count.
Full audit log created. ðŸ” Verify this endpoint is accessible from the admin UI (currently Companies tab).

### 5.3 ðŸŽ¯ Target Behavior Concerns

| Concern | Current | Target |
|---------|---------|--------|
| Buyer notified when blocked | âŒ No notification | âœ… Should receive in-app + email |
| Block triggers | 2 dispatched-deal expirations (auto) | Should require admin review before blocking |
| Reset | Admin-only | âœ… Appropriate |

> âš ï¸ Under the target pilot principle, auto-blocking a buyer without a human review step
> is a high-risk automatic action. A dispatch expiry may be due to carrier delay,
> not buyer negligence. Recommend: flag for admin review first; admin confirms block.
> ðŸš« Requires backend deploy if logic changed.

---

## 6. Email & Notification Classification

### 6.1 Full Notification Inventory

| Event | Type key | Recipient(s) | Email? | Admin control needed? | Timing configurable? | Implies state change? | Pilot recommendation |
|-------|----------|-------------|--------|----------------------|---------------------|----------------------|---------------------|
| New offer on listing | `offer_received` | Producer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Outbid | `outbid` | Previous top buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Offer accepted | `offer_accepted` | Buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Offer rejected | `offer_rejected` | Buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Private deal invitation | `private_deal_invitation` | Target buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Deal expiry warning | `deal_expiry_warning` | **Producer only** | âœ… Yes | ðŸŽ¯ Needs admin view | ðŸŽ¯ Should be configurable | ðŸ”´ YES â€” precedes expiry | ðŸ”´ Fix to include buyer; add admin "expiring soon" view |
| Deal expired | `deal_expired` | Producer + Buyer | âœ… Yes | ðŸŽ¯ Admin should review | ðŸŽ¯ Should be configurable | ðŸ”´ YES â€” terminal state | âš ï¸ Monitor; avoid auto-expiry if possible |
| Deal auto-completed (48h) | `deal_completed` | Producer + Buyer | âœ… Yes | ðŸŽ¯ Admin should review | ðŸŽ¯ Should be configurable | ðŸ”´ YES â€” terminal state | ðŸ”´ Change to escalation, not auto-complete |
| Buyer receipt confirmed | `deal_receipt_pending` | Producer | âœ… Yes | No | No | ðŸŸ¡ Yes â€” starts 48h timer | ðŸŽ¯ Should become â†’ immediate completion |
| Goods dispatched | `deal_dispatched` | Buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Payment submitted | (deal stage) | Producer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Payment confirmed | (deal stage) | Buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| Deal cancelled (producer) | `deal_cancelled` | Buyer | âœ… Yes | No | No | ðŸ”´ Yes â€” terminal | âœ… Keep as-is |
| Deal extended | `deal_extended` | Buyer | âœ… Yes | No | No | No | âœ… Keep as-is |
| New listing published | `new_listing_published` | Eligible buyers | âœ… Yes | No | No | No | âœ… Keep as-is |

### 6.2 Ops-Only Emails

| Event | Recipient | Env var | Status | Risk |
|-------|-----------|---------|--------|------|
| New transport request | Ops email | `TRANSPORT_REQUEST_EMAIL` | âœ… Wired | ðŸ” Verify env set |
| Issue report submitted | Support email | `SUPPORT_EMAIL` | âœ… Wired | ðŸ” Verify env set |
| Deal completion (rich HTML) â€” `sendDealCompletionEmail` | Company owner | `RESEND_API_KEY` | âŒ **Defined but NOT called anywhere** | ðŸ”´ Rich completion email never fires |

### 6.3 Notification Delivery Architecture
```
Event (route or job)
  â†’ notifyDealStageChange() / typed helper
      â†’ INSERT notifications row (in-app, always)
      â†’ if sendMail:true â†’ lookupOwnerEmail(companyId)
            â†’ Clerk API â†’ owner email
            â†’ sendEmail() â†’ Resend (fire-and-forget)
```
**Resilience:** No retry. Clerk down â†’ email skipped silently. Resend down â†’ in-app only.
**Hourly job:** All notify calls use `void` (fully fire-and-forget).

---

## 7. Admin Deal Override Rules

> âš ï¸ **Admin overrides carry significant operational risk if used without safeguards.**
> Each admin action affecting deal status must have:
> - Required reason/note (body param)
> - Visible previous + new status in the UI
> - Audit log entry (all current admin routes already write to audit_log âœ…)
> - Notification to affected parties (currently missing âš ï¸)
> - Clear semantic distinction between cancel, force-complete, reopen, and step-back

### 7.1 Admin Cancel
| Dimension | Current | Target |
|-----------|---------|--------|
| Allowed from | active, payment_submitted, payment_confirmed | Same + guidance on use |
| Blocked from | dispatched, receipt_pending, expired | See recommended MVP below |
| Reason field | âœ… Optional body param, logged in audit | ðŸŽ¯ Should be required |
| Notification to parties | âŒ None | ðŸŽ¯ Should notify both parties |

**For dispatched or receipt_pending deals â€” Recommended MVP (no reckless expand):**
- Do NOT simply expand cancel permissions
- Add a "flag as disputed / operational hold" status or admin note field
- Admin can apply `force-complete` after physical verification
- If cancellation is truly needed post-dispatch, it must have: mandatory reason, CTO approval, audit log, party notification
- ðŸš« Any change requires backend deploy

### 7.2 Admin Force Complete
| Dimension | Current | Target |
|-----------|---------|--------|
| Allowed from | Any non-terminal | Same |
| Audit log | âœ… severity=warn | âœ… Keep |
| Notification to parties | âŒ None | ðŸŽ¯ Should notify both |
| `received_at` set if missing | âœ… Yes | âœ… Keep |
| Reason required | Optional | ðŸŽ¯ Should be required |

### 7.3 Payment Resubmission
| Dimension | Current | Target |
|-----------|---------|--------|
| Allowed from | active, payment_submitted | Same |
| Fields cleared | payment_reference, payment_proof_url, payment_submitted_at, payment_confirmed_at | âœ… Appropriate |
| Buyer notification | âŒ None â€” buyer sees `active` in UI | ðŸŽ¯ Should send "please resubmit" notification |

### 7.4 Recommended Admin Override Safeguards (all require backend deploy)
```
For ANY admin status change:
  1. reason (string) â€” required, not optional
  2. Audit log (already implemented âœ…)
  3. notifyDealStageChange to both parties (missing âš ï¸)
  4. UI confirmation dialog (frontend only, no deploy)
  5. Display previous + new status in confirmation dialog
```

---

## 8. Contract Lite Rules

> âš ï¸ See Â§Contract Lite gap in PROJECT_MAP.md and Â§Phase-CLT in READINESS_FINDINGS_AND_RISKS.md

### 8.1 ðŸŸ¢ Current State Machine
| Transition | Who | Conditions | Notification |
|------------|-----|-----------|-------------|
| draft â†’ pending_confirmation | Creator (seller or buyer) | â‰¥1 material line | âŒ None |
| pending_confirmation â†’ active | Counterparty only | â€” | âŒ None |
| active â†’ completed | Creator only | All shipments in terminal state | âŒ None |
| Any â†’ cancelled (user) | Either party | No open shipments | âŒ None |
| Any â†’ cancelled (admin) | Admin key | Ignores open shipments | âŒ None |

### 8.2 No Expiry Timer
ðŸŸ¢ Contracts have no auto-expiry. `end_date` is advisory.
ðŸŽ¯ Target: Contracts past `end_date` should appear in an admin "past-end-date" view.

### 8.3 ðŸŽ¯ Notification Decision Needed
Contract Lite is currently ops-internal (no notifications by design). Before Al Qaryan pilot,
a founder decision is needed: **should contract state changes send email/in-app notifications?**
This cannot be decided from code alone.

---

## 9. Listing Lifecycle Rules

### 9.1 Listing Status Values
```
open â†’ filled (when offer accepted + deal created)
     â†’ closed (producer manually closes)
     â†’ cancelled
```

### 9.2 Re-open on Deal Cancel â€” Needs Verification
ðŸ” If a deal is cancelled, it is unclear from code alone whether the listing status
is reset from `filled` back to `open`. **Must verify in `routes/deals.ts` cancel logic.**

---

## 10. Transport Quote â€” Semantic Gap

### 10.1 ðŸŸ¢ Current Behavior
`PATCH /admin/transport-quotes/:id/select` sets `status = 'selected'` on the quote row only.
It does **not**:
- Update `transporter_company_id` on the transport request
- Change TR `status` from `pending`
- Notify the transporter company

### 10.2 ðŸŽ¯ Target Behavior
Quote selection should: assign transporter to TR, change TR status, and notify transporter.
ðŸš« Requires new backend endpoint + deploy.

### 10.3 âš ï¸ Risk
Ops may mark a quote "selected" believing the transporter is assigned.
The transport request remains `pending`. The transporter receives no notification.
This is a **high operational risk** during pilot logistics coordination.

---

## 11. Operational Pre-Launch Checklist

### Must Verify Before Al Qaryan Demo
- [ ] ðŸ” `RESEND_API_KEY` is set and active in Cloud Run `00046-pnj`
- [ ] ðŸ” `TRANSPORT_REQUEST_EMAIL` is set to a monitored mailbox
- [ ] ðŸ” `SUPPORT_EMAIL` is set for issue copies
- [ ] ðŸ” `ADMIN_API_KEY` is strong and known only to admin
- [ ] ðŸ” `VITE_TADWEERAH_ADMIN_EMAILS` includes all admin user emails
- [ ] ðŸ” Cloud Scheduler is running and expire-deals job last run was successful
- [ ] ðŸ” At least one material category exists and `is_active = true`
- [ ] ðŸ” At least one unit option exists and `is_active = true`
- [ ] ðŸ” Al Qaryan company is onboarded with `license_status = 'approved'`
- [ ] ðŸ” Transport quote "select" behavior understood by ops team (label-only, not assignment)
- [ ] Decide whether to wire `sendDealCompletionEmail` into the completion flow
- [ ] ðŸ” Test full deal lifecycle in staging with safe test data before live demo

### Decisions Needed Before Pilot (Founder/CTO)
- [ ] Accept or fix receipt confirmation flow (immediate complete vs 48h wait)?
- [ ] Accept or fix auto-complete without admin review?
- [ ] Should contracts send notifications during pilot?
- [ ] Is 72h dispatch window sufficient for Al Qaryan logistics?
- [ ] Should buyer-blocking require admin review before triggering?


