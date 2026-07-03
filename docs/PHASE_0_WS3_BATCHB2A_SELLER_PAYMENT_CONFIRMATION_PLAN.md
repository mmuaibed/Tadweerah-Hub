# WS3 Batch B-2A — Seller Payment Confirmation Plan

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only-Except-As-Approved Platform Audit)
**Status: PLAN ONLY. Not executed. Requires explicit founder approval before any step runs.**

---

## 1. Objective

Verify the seller-side "confirm receipt of payment" step for the existing test deal, now that the buyer has submitted a payment reference (Batch B-1). This confirms the next lifecycle transition (`payment_submitted` → payment-confirmed) live, using only the already-existing test data — no new listings, offers, or accounts are needed.

## 2. Account/Role to Use

**Generator/Seller only** — `mmuaibed+seller2@outlook.com` ("شركة تجريبية (١)"), already authenticated from prior batches. Receiver/Buyer is not needed for this step.

## 3. Current Deal State Before Confirmation

- Deal: `TDW-2026-9F6688` (internal ID `9f6688f6-3312-4ad8-ab89-309843acc543`)
- Status: `payment_submitted`
- Payment reference on file: `[PHASE0-AUDIT] TEST-REF-0001`
- `payment_submitted_at`: `2026-07-03T04:31:12.773Z`
- `payment_confirmed_at`: `null`
- Generator's view currently shows: "المشتري أرسل مرجع الدفع — تحقق منه وأكّد استلام الدفع" (buyer sent the payment reference — verify and confirm receipt), with a visible, not-yet-clicked button.

## 4. Button/Action to Be Tested

**"تأكيد استلام الدفع (حوالة بنكية)" (Confirm receipt of payment — bank transfer)**, visible on the Generator/Seller's deal view at `https://tadweerah.com/listings/3dcb201c-39e5-4ea8-a2b5-843301580e63`. Based on the pattern observed in Batch A (offer acceptance) and Batch B-1 (payment submission), this action likely opens its own confirmation modal ("this action cannot be undone" style) requiring a second click — the plan accounts for that.

## 5. Evidence to Capture Before Clicking

- Fresh screenshot of the Generator view in its current pre-confirmation state.
- Full button/tab list (as already captured, for a clean before/after diff).
- Timestamp.

## 6. Expected Status Transition After Confirmation

Based on WS1's code-level deal state machine and the visible 4-stage UI timeline already documented (awaiting payment → payment confirmed → goods in transit → completed), confirming payment is expected to move the deal to a **"payment confirmed"** state (UI label previously observed as "تم تأكيد الدفع (الحوالة المستلمة)") and likely activate the "arrange transport" step that has been shown as an inactive/upcoming label since Batch A. **This plan does not include opening or interacting with that transport step** — only observing whether it becomes visible/active, exactly as Batch B-1 observed but did not click the "confirm receipt of payment" button.

## 7. Values to Track for WS5

- Deal `status` (exact string/enum value, not just the UI label)
- Payment status fields: `payment_confirmed_at` (expect it to populate with a timestamp)
- `payment_reference` (expect unchanged: `[PHASE0-AUDIT] TEST-REF-0001`)
- `estimated_amount` vs. `final_amount` (currently identical at 5 — watch whether this confirmation step is where they might diverge, per the open question carried since WS3-A)
- VAT/total fields (`vat_rate`, `vat_amount`, `total_amount` — expect unchanged: 0.15 / 0.75 / 5.75)
- `transport_responsibility` (currently `null` at the deal level despite `"seller"` on the listing — watch whether this gets populated at this stage)
- The next visible action/label shown after confirmation (to determine exactly what Batch B-2B, if ever approved, would need to test)

## 8. Stop Conditions

- **Stop immediately after the confirmation action and status capture** — do not click into any transport/shipment action that appears, even if it becomes active/enabled.
- Stop if a confirmation modal requires information beyond a simple yes/no (e.g., if it unexpectedly asks for additional payment details).
- Stop if any admin notification, admin queue, or admin approval step appears to be triggered as a side effect.
- Stop if any real-named or partner-related data appears anywhere in this flow.
- Stop if the deal moves further than expected (e.g., automatically into transport or completion) without a separate explicit step.

## 9. Risks

- **Irreversibility:** per the pattern seen in Batch A and B-1, this action likely opens a modal stating the action cannot be undone — once confirmed, the deal cannot be reverted to "awaiting payment" within this audit's scope (no admin/DB access to undo it). This is a one-way step for this test deal.
- **Possible automatic activation of the transport step:** the UI has consistently said "سيتم تفعيل خطوة النقل بعد تأكيد الدفع" (transport activates after payment confirmation) — confirming payment may immediately reveal a transport UI that wasn't visible before. The plan is to observe, screenshot, and stop without interacting with it, but the founder should be aware this next screen will very likely appear as a direct, unavoidable side effect of this single click.
- **Scripting-error risk (same class as Batch B-1's mis-click):** confirmation modals in this app have consistently required exact button-text matching; a repeat of the earlier mis-click type of error is possible but low-risk, since (per B-1) a failed/wrong click with no matching API call means no state change occurred — this will again be verified via network-response logging before treating any click as successful.

## 10. Founder Approval Required Before Execution

**This plan is not approved for execution.** Please confirm before I proceed:
- Approve as scoped above (confirm payment, capture resulting state, stop — no transport interaction), **or**
- Request changes to this plan, **or**
- Defer this step for now.

---

## Hard Limits (restated)

No transport/shipment. No receipt/completion. No admin. No DB access. No code/config changes. No commit. No deploy. No real payment data. No real customer/partner data. No Al Qaryan.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This is a planning document only — no browser actions, no clicks, and no deal-state changes were performed to produce it.*
