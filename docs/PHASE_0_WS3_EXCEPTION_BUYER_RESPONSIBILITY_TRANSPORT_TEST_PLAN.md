# WS3 Exception Plan — Buyer-Responsibility Transport End-to-End Evidence Test

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only-Except-As-Approved Platform Audit), CR-001 Amendment A1
**Status: PLAN ONLY. Approved in principle by PMO (CR-001, Amendment A1). NOT approved for execution. Founder approval required before any step runs.**

---

## Purpose

Recover Gate 3 journey completeness by testing shipment, receipt, and completion using a deliberately explicit **buyer-responsibility** scenario — since the seller-responsibility path is blocked by a confirmed defect.

**Important:**
- This is **not** the seller-responsibility path.
- Seller-responsibility transport remains deferred due to **TDW-TRANS-001** (confirmed data-propagation bug, `PHASE_0_WS3_TRANSPORT_RESPONSIBILITY_CONSISTENCY_REVIEW.md`).
- **Do not execute this test yet.**

---

## 1. Why This Test Is Needed for Gate 3

Gate 3 requires evidence covering the full non-admin deal lifecycle through receipt/completion. WS3 Batch A/B-1/B-2A evidenced everything through payment confirmation, but stopped before transport because the seller-responsibility path is contaminated by TDW-TRANS-001 — continuing on that path would only exercise the bug's fallback behavior, not real platform behavior. A **buyer-responsibility** scenario sidesteps the bug entirely (per the code trace in WS5-A, the frontend's role-gating logic resolves to "buyer" whenever `transport_responsibility` isn't correctly read as `"seller"` — meaning a *genuinely* buyer-responsible deal is, if anything, the path least likely to be affected by this specific defect) and lets Gate 3 close with real evidence rather than remaining permanently blocked.

## 2. Why the Existing Deal (`TDW-2026-9F6688`) Should Not Be Used

- It already selected **seller** responsibility at listing creation — reusing it would still be testing the buggy/contradictory path, not a clean buyer-responsibility scenario.
- It has already progressed to `payment_confirmed` — its listing is closed and its offer is resolved; the deal object itself cannot be "rewound" to test a different responsibility setting without DB access (out of scope).
- Its `payment_proof_url` already contains the founder-approved placeholder file tied to the original test reference — reusing the same deal risks conflating two distinct test scenarios in one evidence trail.

## 3. Is a New Test Listing/Deal Required?

**Yes.** A new listing must be created with **"buyer" explicitly selected** as transport responsibility at creation time, then carried through a fresh offer → acceptance → payment → transport → receipt → completion cycle.

## 4. Required Accounts/Roles

Only the two already-approved test accounts — no new accounts needed:
- **Generator/Seller:** `mmuaibed+seller2@outlook.com` (`[PHASE0-AUDIT] Generator Co` / "شركة تجريبية (١)")
- **Receiver/Buyer:** `mmuaibed+buyer3@outlook.com` (`[PHASE0-AUDIT] Receiver Co` / "Test recycler company")

Both are already admin-approved (confirmed by founder). No Transporter Co or other new account is required for this scenario, since "buyer-responsibility" means the buyer self-manages transport (per the `deal.transport.buyer_self_managed_seller` i18n string found in WS3-A2/WS5-A) rather than requiring a third-party transporter account.

## 5. Required Test Naming and Tagging

- New listing description/location-notes: `[AUDIT-TEST-20260702]` or `[PHASE0-AUDIT]` prefix, consistent with the existing convention.
- Suggested distinguishing tag for this specific exception test: `[PHASE0-AUDIT] TRANSPORT-EXCEPTION-BUYER-RESP-001`, so this evidence trail is clearly distinguishable from the original `TDW-2026-9F6688` trail in later review.
- Any new payment reference/placeholder file: same pattern as Batch B-1 (`[PHASE0-AUDIT] TEST-REF-....`, a fresh clearly-fake placeholder image if a file is again found to be required in practice).

## 6. Exact Stop Conditions

- Stop immediately after **completion** status is reached and captured — no further action once the lifecycle closes.
- Stop if the transport step requires a role/account not currently available (e.g., an actual Transporter Co) — do not create one unilaterally; pause and ask.
- Stop if any screen requests real payment, real document upload of a sensitive nature, or anything resembling a real financial transaction.
- Stop if any real-named company/partner record appears anywhere — no interaction with it.
- Stop if Cloudflare Turnstile or similar bot-protection appears unexpectedly on any authenticated screen — no workaround attempts, per the standing decision from WS2.
- Stop if the deal unexpectedly shows the same transport-responsibility contradiction despite selecting "buyer" explicitly — this itself would be a significant new finding requiring immediate reporting, not silent continuation.
- Stop if an admin-adjacent screen or action becomes reachable unexpectedly from either non-admin account.

## 7. Ensuring Buyer Responsibility Is Explicitly Selected

At listing creation (step 1 of the wizard), select **"المشتري" (Buyer)** in response to "من المسؤول عن النقل؟" (Who is responsible for transport?) — the opposite of what was selected for the original test deal. This selection will be screenshotted as explicit before-state evidence, and the resulting listing's API response (`transport_responsibility: "buyer"`) will be captured to confirm it was recorded correctly at the source before any deal-mutation steps have a chance to lose it.

## 8. Evidence to Capture

At every stage, per the established WS3 evidence pattern (screenshot + run-log with role/language/timestamp/purpose + relevant API response fields):

1. **Listing** — creation, with explicit "buyer" transport-responsibility selection confirmed in both the UI and the API response.
2. **Offer** — Receiver Co submits a test offer.
3. **Deal** — formed on acceptance; confirm `transport_responsibility` reads correctly (or note if the same null-propagation issue appears here too, which would itself be a new finding).
4. **Payment proof** — submitted with a fresh `[PHASE0-AUDIT]`-tagged reference (and placeholder file if again found necessary).
5. **Payment confirmation** — Generator Co confirms receipt.
6. **Transport/shipment** — the buyer-responsibility transport flow, observed and captured step by step (this is new territory not yet seen in any prior WS3 pass).
7. **Receipt** — buyer confirms receipt of goods.
8. **Completion** — deal reaches its terminal `completed` state.

Each stage gets its own run-log entry and screenshot(s), consistent with all prior WS3 batches.

## 9. Risks

- **Irreversibility:** as with prior deal actions, several of these steps (offer acceptance, payment confirmation, receipt confirmation) are one-way for this test deal.
- **Unknown territory:** transport, receipt, and completion screens have never been observed live in this audit — the plan cannot fully anticipate their exact forms/fields the way earlier, already-seen steps could be planned precisely. Expect to pause and ask if an unanticipated screen or requirement appears (per §6).
- **Possible discovery of additional defects:** since this is genuinely new territory, this test may surface new findings (in either direction — confirming the platform works well here, or finding new gaps) that would need their own documentation and possibly their own founder checkpoint mid-test.
- **Scope creep risk:** the temptation to "just also check X" once transport/receipt screens are visible for the first time — mitigated by the explicit stop-after-completion condition in §6.

## 10. Founder Approval Required Before Execution

**This plan is not approved for execution.** It is approved *in principle* at the PMO level (CR-001, Amendment A1) as a concept, but a separate, explicit Founder go-ahead is required before any browser action begins. Suggested approval format: approve the plan as scoped above, request changes, or defer entirely.

## 11. Confirmation: No Real Records, Customers, Partners, or Payment Data

Confirmed in advance, as a binding constraint on execution if approved: no real bank/payment reference, no real invoice/tax document, no real customer/partner name (including "Al Qaryan"), and no real financial transaction will be used or created at any point in this test. Only the two existing, already-approved `[PHASE0-AUDIT]` test companies and clearly-fake, tagged test data will be used throughout.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001 Amendment A1. This is a plan only — no browser actions, no new listings/offers/deals, and no code/DB/Clerk changes were performed to produce it. Execution requires explicit Founder approval.*
