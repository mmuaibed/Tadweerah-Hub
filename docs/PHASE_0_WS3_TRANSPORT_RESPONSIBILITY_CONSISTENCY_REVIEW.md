# Transport Responsibility Consistency Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit)
**Method:** Analysis of existing WS3 screenshots/logs plus **read-only source-code inspection** (`artifacts/api-server/src/routes/deals.ts`, `artifacts/tadweerah/src/components/deal-panel.tsx`, `artifacts/tadweerah/src/i18n/index.tsx`). **No new state-changing UI actions were performed.** No transport click, no shipment confirmation, no receipt/completion, no admin, no DB, no code/config changes, no commit, no deploy.

---

## 1. Transport Responsibility Selected at Listing Creation

**"المورّد (البائع)" (Supplier/Seller)** — selected explicitly on the listing-creation wizard's "من المسؤول عن النقل؟" (Who is responsible for transport?) field (WS3 Batch A, step 1 of the listing wizard).

## 2. Transport Responsibility Shown on the Marketplace Listing Card

**"المورّد (البائع)"** — confirmed displayed on the marketplace card when Receiver Co browsed listings (WS3 Batch A, marketplace-visibility check): `"بلاستيك #LIST-3DCB20 مفتوح المورّد (البائع) 1 كجم الرياض"`. The listing's own API response (`POST /api/listings`) also recorded `"transport_responsibility":"seller"` at creation time. **Listing-level data is correct and consistent.**

## 3. Transport Responsibility Shown on Deal Details After Offer Acceptance

**Not explicitly checked at that exact moment** in the original Batch A pass (the "Deal Details" tab reviewed in WS3-A did not include a transport-responsibility row in its financial-summary output). The deal-record API response at accept time (`POST /api/offers/:id/accept`) was not separately captured for this field in the original logs.

## 4. Transport Responsibility Shown After Payment Confirmation

**"النقل مسؤولية المشتري. بانتظار المشتري لاختيار طريقة النقل."** ("Transport is the buyer's responsibility. Waiting for the buyer to choose a transport method.") — shown on the Generator/Seller's own deal view, directly contradicting the seller-responsibility choice made at listing creation (§1–2). Confirmed via WS3 Batch B-2A screenshot and API response.

## 5. Deal-Level Value Observed

**`transport_responsibility: null`** — confirmed in **three separate API responses**: offer acceptance (`/api/offers/:id/accept`), payment submission (`/api/deals/:id/submit-payment`), and payment confirmation (`/api/deals/:id/confirm-payment`). Never populated with `"seller"` at the deal-record level at any point observed.

## 6. Listing-Level Value Observed

**`transport_responsibility: "seller"`** — confirmed at listing creation (§2) and displayed correctly on the marketplace card. The listing's own data is correct throughout; the problem is isolated to the deal record/response layer.

## 7. How Does the UI Derive Transport Responsibility? (Code-Confirmed, Not Inferred)

Found the exact mechanism in `artifacts/api-server/src/routes/deals.ts`:

- A helper function `serializeDeal(deal, counterparty, listingExtra?)` builds every deal API response. Its transport field is set as: `transport_responsibility: listingExtra?.transport_responsibility ?? null` (line 59).
- `listingExtra` is meant to carry the **listing's** `transport_responsibility`, fetched via a join to `wasteListingsTable` (lines 117–121).
- **Only one call site passes `listingExtra`** — the deal-fetch/offer-accept-adjacent endpoint (line 282: `serializeDeal(deal, counterparty, listingExtra ?? undefined)`).
- **Every other deal-mutation endpoint omits the third argument entirely:** `submit-payment` (line 380), `confirm-payment` (line 466), `confirm-dispatch` (line 659), `confirm-receipt`/complete (line 748), `cancel` (line 824), `extend` (line 907) — all call `serializeDeal(updated, counterparty!)` with **no `listingExtra`**, so `listingExtra` is `undefined` and the field always resolves to `null` in their responses.
- On the frontend (`deal-panel.tsx`), every consumer of this field uses a **binary ternary with no "unknown" branch**, e.g.:
  ```
  const isTransportResponsible = deal.transport_responsibility === "seller" ? role === "producer" : role === "buyer";
  ```
  and
  ```
  return deal.transport_responsibility === "seller" ? t("deal.transport.not_responsible_seller") : t("deal.transport.not_responsible_buyer");
  ```
  Since `null !== "seller"`, every one of these ternaries falls to its "buyer" branch — which is exactly how the seller's screen ends up displaying `t("deal.transport.not_responsible_buyer")` = *"Transport is the buyer's responsibility..."* (confirmed exact string match in `artifacts/tadweerah/src/i18n/index.tsx` line 944).

**This is a fully code-confirmed causal chain, not a guess.**

## 8. Classification

**Both a data-propagation bug and a fallback/default bug — not Unknown.**

- **Primary: data propagation bug (backend).** 6 of 7 deal-serialization call sites forget to fetch/pass the listing's `transport_responsibility`, so it silently reverts to `null` the moment any deal-mutation action happens (starting from the very first one after acceptance).
- **Secondary, compounding: fallback/default bug (frontend).** The UI's `=== "seller" ? A : B` pattern has no explicit handling for `null`/unknown — it silently treats "not seller" as "definitely buyer," actively asserting a specific (wrong) answer instead of showing an "unclear" state. This is what turns a missing-data bug into a visibly wrong, confident-sounding statement to the user.
- Not a UI display bug in isolation, and not a terminology/copy bug — the copy strings themselves (`not_responsible_seller` / `not_responsible_buyer`) are accurate translations of what the code is (incorrectly) told to say.

## 9. Impact on Batch B-2B

- **Which role should be expected to act?** Per the original listing choice, **the seller (Generator Co)** should be the one to arrange/confirm transport — but the live UI currently tells the **seller** that transport is the **buyer's** responsibility, and would likely tell the **buyer** the same "buyer responsible" framing were the buyer to check (since the buyer-side ternaries have the identical `null`-defaults-to-buyer pattern). This needs confirming from the Receiver/Buyer side before any transport action is taken, since the two roles may currently be shown **contradictory or duplicate calls-to-action**.
- **What would "Confirm shipment" actually mean?** Given the bug, clicking it from the Generator side now might exercise a **code path or button label the seller wasn't actually supposed to see for a seller-responsibility deal** (the "تأكيد إرسال البضاعة" / "Confirm shipment" button and its associated hint text may differ depending on the buggy `transport_responsibility` reading) — testing it now would validate the **buggy path**, not the **intended (seller-responsible) path**.
- **Is the next transport test meaningful before this is clarified?** **Not fully.** A transport test run now would exercise whatever the `null`-defaulted-to-buyer logic does, which is not representative of what a real seller-responsibility deal is supposed to do. It would still produce *some* evidence (confirming the bug's downstream effects), but would not tell us how the platform behaves for a correctly-propagated seller-responsibility deal.

## 10. Mapping

- **WS5 (Source-of-Truth):** primary home for this finding — the exact code locations (file + line numbers) are already documented above and can be handed directly to engineering; `deals.ts` lines 25–59 (the `serializeDeal` helper) and lines 282/380/466/659/748/824/907 (the seven call sites, six of which are missing `listingExtra`).
- **WS4 (UI/UX):** secondary — the frontend's silent "assume buyer" fallback for missing data is a UX-trust issue (confidently telling a user something false rather than showing "pending/unknown"), independent of the backend bug.
- **WS8 (Authorization/role-gating):** relevant — `isTransportResponsible` (line 2216–2218 of `deal-panel.tsx`) gates which UI a user sees based on this same buggy field, meaning the wrong party may currently be shown transport actions/buttons meant for the other party. Worth a role-gating-correctness note alongside the earlier `buyer_is_verified` authorization findings from Batch A/B-1.
- **WS9 (V2 Backlog):** two candidate items — (a) fix the 6 missing `listingExtra` joins in `deals.ts` so every deal-mutation response correctly reflects the listing's transport choice; (b) change the frontend's binary ternaries to a three-state model (`seller` / `buyer` / `unknown`) so missing data never gets silently asserted as a specific answer.

## 11. Recommendation

**Defer a full transport test until this is understood — but a very narrow, low-risk B-2B variant remains meaningful if scoped carefully.**

- **Recommended path:** treat this review itself as sufficient documentation of the bug (code-confirmed, no further live testing needed to prove it) and **defer B-2B (transport readiness testing) until this is triaged by engineering**, since testing further would mainly exercise the buggy `null`→"buyer" path rather than real seller-responsibility behavior.
- **Alternative, if the founder wants live confirmation anyway:** create **two separate, clearly-labeled future transport scenarios** — one exercising the current (buggy) buyer-defaulted path as-is (documenting exactly what a user sees today), and one that would only be meaningful after the backend fix, exercising a genuinely seller-responsible deal. Do not conflate the two in a single test.
- **Not recommended:** proceeding with the originally-planned B-2B as if the deal's transport responsibility were correctly "seller" — it is not, and any test would silently be testing the wrong (buggy) path while appearing to test the intended one.

---

# Transport Responsibility Consistency Review — Closure

**Date:** 2026-07-03
**Status: Completed — root cause identified by read-only source-code inspection.**

**Founder decision:** Do not execute Batch B-2B. Defer live transport/shipment testing. Reason: the current live path is contaminated by a confirmed `transport_responsibility` propagation/display bug — testing transport now would exercise the known buggy null→buyer fallback path, not the intended seller-responsibility flow.

**Confirmed root cause:**
1. Backend `serializeDeal()` can include the listing's `transport_responsibility` through a `listingExtra` parameter.
2. Only the initial offer-accept response passes `listingExtra`.
3. Later deal action responses omit `listingExtra`: `submit-payment`, `confirm-payment`, `confirm-dispatch`, `confirm-receipt`, `cancel`, `extend`.
4. Therefore `transport_responsibility` silently falls back to `null` after later deal actions.
5. Frontend logic treats any non-"seller" value as buyer responsibility because it uses binary ternary logic without an unknown/null branch.
6. Result: a seller-responsibility listing can later be displayed as buyer-responsibility in deal screens.

**Classification:**
- **Primary: WS5 Source-of-Truth / data propagation bug.**
- **Secondary: WS4 UI/UX bug** — the UI confidently displays the wrong responsibility instead of "unknown."
- **Related: WS8 authorization/role-gating review** — transport actions may be shown or interpreted under the wrong responsibility model.
- **Backlog: WS9 V2 candidate** for a robust transport-responsibility model with explicit unknown-state handling.

**Founder decision on WS3:** Close live WS3 progression at the payment-confirmation stage. Do not proceed to transport/shipment, receipt/completion, admin, DB, code fix, commit, or deploy.

**This review is now closed on this basis.**

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This document is analysis only: existing evidence plus read-only source-code inspection. No transport click, no shipment confirmation, no receipt/completion, no admin, no DB access, no code/config changes, no commit, no deploy.*
