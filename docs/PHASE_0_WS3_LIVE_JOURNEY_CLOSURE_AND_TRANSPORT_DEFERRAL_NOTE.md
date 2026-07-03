# WS3 Live Journey Closure & Transport Deferral Note

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only-Except-As-Approved Platform Audit)

---

## 1. What WS3 Successfully Validated Live

Using the two founder-approved test accounts (`[PHASE0-AUDIT] Generator Co` / `[PHASE0-AUDIT] Receiver Co`, per WS2), WS3 confirmed the following stages of the core marketplace journey actually work end-to-end in the live product, not just in code:

- **Listing creation after company approval** — blocked until Generator Co's company was admin-approved (expected authorization behavior, not a bug), then succeeded.
- **Marketplace visibility** — the listing was correctly visible to Receiver Co, with all fields matching.
- **Offer submission** — Receiver Co submitted a test offer successfully.
- **Offer acceptance** — Generator Co reviewed and accepted the offer.
- **Deal formation** — a deal (`TDW-2026-9F6688`) was created automatically on acceptance.
- **Payment proof submission** — Receiver Co submitted a payment reference and a founder-approved placeholder file.
- **Seller payment confirmation** — Generator Co confirmed receipt of payment, moving the deal to `payment_confirmed`.

## 2. Where WS3 Stops

**Before transport/shipment. Before receipt/completion.** The "Confirm shipment" action is visible on the Generator side but has not been clicked. No further live-journey progression will occur until the founder decides otherwise.

## 3. Why Transport Is Deferred

A confirmed `transport_responsibility` propagation/display bug contaminates the current live path for this deal: the listing correctly recorded "seller" responsibility, but every deal-mutation response after offer-acceptance silently drops this to `null`, which the frontend's binary logic then displays as "buyer responsibility." **A live transport test right now would exercise the known buggy null→buyer fallback path, not the intended seller-responsibility behavior** — it would not produce meaningful evidence about how transport is actually supposed to work.

## 4. Confirmed Critical Findings (Full List, Carried Forward From WS2/WS3)

1. **`transport_responsibility` seller→null→buyer display bug** — root-caused to specific missing code in `deals.ts` (6 of 7 deal-serialization call sites omit the listing join); compounded by frontend binary-ternary logic with no "unknown" state.
2. **Payment-proof file labeled optional but required in practice** — the submit button stayed disabled without a file attached, despite the UI and DOM both marking it optional.
3. **Buyer verification status remains inconsistent** — `buyer_is_verified`/`is_verified` values conflicted across screens and lifecycle stages (false at offer creation, true at acceptance and after; a "Verified" badge shown even when the field read false) — needs authorization-model review, not resolved.
4. **Dashboard bilingual raw company-data issue** — company name/city entered in one language do not adapt to the viewer's selected UI language; reproduced on both test accounts.
5. **Free-text city typo propagated across screens** — "dammmam" (typo) was accepted at entry with no validation and persisted through onboarding, dashboard, and deal counterparty data.
6. **`sale_type="auction"` vs. UI "receive offers"** — a code/product terminology mismatch.
7. **Deal reference format needs reconciliation** — `TDW-2026-9F6688` (marketplace deal) vs. `TDW-CTR-####-####` (Contract Lite, a separate subsystem per WS1) — not yet confirmed whether/how these relate.
8. **Contract/Deal Details has no separate contract reference** — the deal reference is the only reference number; no distinct "contract" object exists for this deal type.
9. **Print/export exists but layout needs WS4 manual review** — the "Print/Download deal report" action calls the browser's native print dialog, which automation cannot capture; closed with limitation pending manual visual review.

## 5. Recommended Next Workstream

**Proceed to WS5 Source-of-Truth review before any further transport/receipt live testing.** The transport-responsibility bug and several of the other findings above (sale_type mismatch, deal reference format, verification-status inconsistency) are all data-model/source-of-truth questions best resolved by a systematic WS5 pass — using the exact file/line evidence already captured in this session — rather than by further live UI testing, which would keep running into the same underlying data issues without new information.

---

## Hard Limits (confirmed observed throughout)

No code/config changes. No DB access. No admin action. No commits. No deploys. No transport click. No receipt/completion action.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This is a closure/summary document only — no new browser actions, no code/DB/Clerk changes were performed to produce it.*
