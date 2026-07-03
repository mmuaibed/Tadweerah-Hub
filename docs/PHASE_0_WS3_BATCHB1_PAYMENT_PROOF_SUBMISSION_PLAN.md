# WS3 Batch B-1 — Payment Proof Submission Plan

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only-Except-As-Approved Platform Audit)
**Status: PLAN ONLY. Not executed. Requires explicit founder approval before any step runs.**

---

## 1. Objective

Extend the already-evidenced marketplace journey one stage further: verify what happens when the Receiver/Buyer submits a payment reference for the existing deal, using clearly fake/test data. This confirms the deal's next lifecycle transition (`awaiting payment` → `payment submitted`) live, without ever confirming payment or proceeding further.

## 2. Account/Role to Use

**Receiver/Buyer only** — `mmuaibed+buyer3@outlook.com` ("Test recycler company"). This is the side WS3-A already found the payment-proof form on; Generator/Seller is not needed for submission itself (only for a later, separate, non-executed confirm-payment step that is explicitly out of scope here).

## 3. Current Deal State (as of WS3-A/A2)

- Deal reference: `TDW-2026-9F6688`
- Status: "بانتظار تأكيد الدفع (حوالة بنكية)" (awaiting payment confirmation, bank transfer)
- Listing `#LIST-3DCB20`: closed (auto-closed on offer acceptance)
- Total incl. VAT: 5.75 SAR (5 SAR + 0.75 SAR VAT)
- No payment reference submitted yet.

## 4. Required Payment-Proof Data or File (observed in WS3-A, not yet submitted)

From the Receiver-side deal view, the payment section shows:
- **"رقم الحوالة / مرجع الدفع" (bank transfer number / payment reference) — marked required (`*`).** Appears to be a free-text field; no format constraint was visible in the read-only check.
- **"إثبات الدفع / إيصال الحوالة (اختياري)" (proof of payment / transfer receipt) — explicitly optional.** File upload, accepts JPG/PNG/PDF, up to 5MB.
- Submit button: "إرسال مرجع الدفع" (Submit payment reference).

## 5. Safe Fake/Test Payment-Proof Approach

- **Reference number field:** enter a clearly fake, tagged value, e.g. `[PHASE0-AUDIT] TEST-REF-0001` — not a real bank transfer number, not formatted to resemble a real IBAN/reference in any deceptive way.
- **File upload:** **recommend skipping entirely**, since it's optional. This avoids needing to fabricate anything that could resemble a real bank receipt/document, and keeps the test footprint minimal. If the form turns out to silently require a file despite being labeled optional, stop and ask rather than inventing a receipt-like image.
- No real bank details, no real invoice, no real customer/partner name, no "Al Qaryan," at any point.

## 6. Evidence to Capture Before Submission

- Fresh screenshot of the deal's payment section in its current (pre-submission) state.
- Exact field labels, placeholder text, and any validation/format hints not already documented in WS3-A.
- Timestamp.

## 7. Evidence to Capture After Submission

- Screenshot of the resulting confirmation/status message on the Receiver side.
- The new deal/offer status label and its underlying API value (e.g., expected code-level state `payment_submitted` per WS1's mapping — to be confirmed, not assumed).
- Any new fields added to the deal record (e.g., a stored payment reference, submission timestamp).
- A read-only check of the Generator/Seller side afterward, **observing only** whether a "confirm payment" action now appears — **not clicking it**.

## 8. Status/Value Fields to Track for WS5

- The exact status string/enum value at this stage, to extend the already-documented `CompanyIncomplete → CompanyPending → (listing) 201 → (offer) pending → accepted` lifecycle one step further.
- Whether "المبلغ التقديري" (estimated amount) vs. "المبلغ النهائي" (final amount) — identical so far — begin to diverge at this stage (an open question carried from WS3-A).
- Whether the payment reference is stored in a dedicated field visible via API response, and its exact field name.
- Any timestamp field marking submission time.

## 9. Stop Conditions

- **Stop immediately after submission confirmation is captured** — do not proceed to click any "confirm payment" action, even from the Generator side (observation only).
- Stop if the reference-number field enforces a format that only accepts something resembling a real bank/IBAN number in a way that can't be satisfied with an obviously-fake placeholder.
- Stop if the file-upload field turns out to be effectively required despite its "optional" label.
- Stop if uploading anything appears to trigger a third-party service call (e.g., document/OCR scanning) that could send data externally.
- Stop if any admin notification, admin queue, or admin approval step appears to be triggered as a side effect.
- Stop if any real-named or partner-related data appears anywhere in this flow.
- Stop if the deal moves further than expected (e.g., automatically into a transport or completion state) without an explicit separate confirm step.

## 10. Founder Approval Required Before Execution

**This plan is not approved for execution.** Please confirm before I proceed:
- Approve as scoped above (reference-number only, no file upload), **or**
- Approve including a fake test file upload (if so, confirm what kind of placeholder file is acceptable), **or**
- Request changes to this plan, **or**
- Defer Batch B-1 entirely for now.

---

## Hard Limits (restated)

No real bank data. No real payment reference. No real invoice. No real customer/partner names. No Al Qaryan. No payment confirmation. No transport. No receipt/completion. No admin. No DB access. No code/config changes. No commit. No deploy.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This is a planning document only — no browser actions, no form submissions, and no deal-state changes were performed to produce it.*
