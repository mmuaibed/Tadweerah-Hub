# WS5-A — Deal, Listing, Payment & Transport Source-of-Truth Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit)
**Method:** Analysis of all existing WS2/WS3 evidence logs and screenshots, plus **read-only source-code inspection** of `artifacts/api-server/src/routes/{deals,offers,listings}.ts`, `lib/db/src/schema/{companies,waste-listings}.ts`, `artifacts/tadweerah/src/components/deal-panel.tsx`, `artifacts/tadweerah/src/lib/listing-ref.ts`, and `artifacts/tadweerah/src/i18n/index.tsx`. **No new live UI actions were performed.** No code/config changes, no DB access, no admin action, no commits, no deploys, no transport/shipment click, no receipt/completion action.

---

## 1. Executive Summary

The core marketplace flow (listing → offer → deal → payment) is implemented consistently end-to-end, and every figure a user actually sees (material, quantity, price, VAT, total) traces back cleanly to real, well-defined source data. The problems found are narrower and more specific than "the data model is unreliable" — they are:

1. **One specific field (`transport_responsibility`) has an incomplete code path** — correctly joined in 1 of 7 places the deal gets re-serialized, silently `null` everywhere else, and the frontend's binary logic converts that `null` into a confidently-wrong "buyer responsible" statement. This is the most consequential bug found.
2. **A payment-proof file requirement is enforced only in the UI's button-disabled logic**, contradicting its own visible "(optional)" label — and the developer's own well-written explanatory error message for this exact case exists in the code but is unreachable, because the button is disabled before that message can ever fire.
3. **A verification-status question is now closed.** The formula is consistent and correct everywhere it's used; the founder confirmed both test companies were approved, which fully explains the earlier-observed change. Retained only as a product/UX note: approval and verification semantics should be clearer in the UI and audit trail.
4. Several smaller items (sale_type naming, deal-reference format, city free-text) turned out to be **intentional design choices with reasonable rationale**, not bugs — documented below so they aren't mistaken for defects later.

**Bottom line:** the transport-responsibility bug is real, precisely located, and confirms the founder's decision to defer live transport testing was correct — testing now would exercise the bug's fallback path, not real seller-responsibility behavior.

---

## 2. Source-of-Truth Map

| Value | Where it truly lives | How it reaches the deal/UI | Notes |
|---|---|---|---|
| **material** | `waste_listings.material` (listing row) | Referenced dynamically via join at read time; **not** copied into the `deals` row and **not** part of the deal-mutation API responses (`serializeDeal()` doesn't return it) | Never observed broken in this audit — because it's sourced from the original listing fetch, not re-fetched from the mutation-response payloads |
| **quantity** | `waste_listings.quantity` | Same as material | Same as above |
| **city/location** | `waste_listings.city` (`text`, `NOT NULL`, no FK) | Same as material | Free-text by design (see §9) |
| **unit price** | `deals.price_per_unit` — **copied into the deal row at creation time** from `offer.price_per_unit` | Stored directly on the deal | Stable once the deal exists |
| **subtotal (estimated_amount)** | `deals.estimated_amount` — set once, at deal-creation, from the accepted offer | Stored directly on the deal | Does not change after creation (confirmed: identical before/after payment submission and confirmation in live testing) |
| **final_amount** | `deals.final_amount` — **initialized equal to `estimated_amount` at creation**, later **overwritten at the dispatch step** (`final_amount = price_per_unit × actual_quantity`, `deals.ts` ~line 605) | Stored directly on the deal | **This is the exact mechanism and moment where estimated/final can diverge — confirmed in code, not observed live** since dispatch was never reached (deferred) |
| **VAT (`vat_rate`, `vat_amount`, `total_amount`)** | `deals.vat_rate` / `vat_amount` / `total_amount` — computed and stored once at deal creation | Stored directly on the deal | Confirmed unchanged through payment submission and confirmation |
| **transport_responsibility** | **Not a column on `deals` at all** — only ever exists on `waste_listings.transport_responsibility`, joined into the API response via an optional `listingExtra` parameter | **Correctly joined in only 1 of 7 response-building call sites** (see §3/§5) | **This is the confirmed bug** |
| **sale_type** | `waste_listings.sale_type` — enum `"auction" | "direct"`, defaults to `"auction"`, **immutable once published** | Set once at listing creation | Genuine internal model name, not a mislabel (see §7) |
| **buyer_is_verified / counterparty.is_verified** | Computed on-the-fly, both places, from the **same formula**: `!!(company.commercialRegistration && company.license_status === "approved")` | Computed fresh at offer-creation (`offers.ts`) and at every deal read (`deals.ts`) | Formula is consistent; the underlying `license_status` **data** is what changed between reads (see §8) |
| **Deal reference (`TDW-2026-9F6688`)** | Not stored — **derived client-side** from the deal's own UUID: `TDW-${year}-${id.replace(/-/g,"").slice(0,6).toUpperCase()}` (`listing-ref.ts`) | Computed on render | A designed convention, not a data field (see §6) |
| **payment_reference** | `deals.payment_reference` — set by the buyer's submit-payment action | Stored directly on the deal | Confirmed persisted correctly through both live tests |
| **payment_proof_url** | `deals.payment_proof_url` — stores the file as an inline base64 `data:` URL | Stored directly on the deal | Not a separate storage bucket/CDN link — a design choice worth flagging for scalability later, not a bug |

## 3. Confirmed Inconsistencies

### 3.1 Transport responsibility — data propagation bug (Primary, WS5)

- **Root file:** `artifacts/api-server/src/routes/deals.ts`
- `serializeDeal(deal, counterparty, listingExtra?)` sets `transport_responsibility: listingExtra?.transport_responsibility ?? null` (line 59).
- Of the 7 call sites, **only line 282** (the offer-accept-adjacent deal fetch) passes `listingExtra`. The other 6 — `submit-payment` (380), `confirm-payment` (466), `confirm-dispatch` (659), `confirm-receipt`/complete (748), `cancel` (824), `extend` (907) — call `serializeDeal(updated, counterparty!)` with no third argument, so the field is always `null` in their responses.
- **Frontend consumption**, `deal-panel.tsx`: every check is a binary ternary with no "unknown" branch, e.g. `deal.transport_responsibility === "seller" ? role === "producer" : role === "buyer"` (line 2216-2218) and `deal.transport_responsibility === "seller" ? t("...not_responsible_seller") : t("...not_responsible_buyer")` (line 2235-2237). Since `null !== "seller"`, these always resolve to the "buyer" branch.
- **Live confirmation:** listing correctly recorded `"seller"`; every deal-mutation response (`accept`, `submit-payment`, `confirm-payment`) returned `transport_responsibility: null`; the seller's own screen displayed *"Transport is the buyer's responsibility"* (`i18n` key `deal.transport.not_responsible_buyer`, line 944) as a direct, mechanical result.

### 3.2 Payment-proof file: labeled optional, enforced as required (WS4 + WS5)

- **UI label:** "إثبات الدفع / إيصال الحوالة (اختياري)" — explicitly says optional. **DOM `required` attribute is `false`.**
- **Actual enforcement, `deal-panel.tsx` line 2064:** `<Button ... disabled={loading || paymentProofProcessing || !paymentRef.trim() || !paymentProofDataUrl}>` — the submit button is hard-disabled whenever no proof file is attached.
- **The developer already wrote a correct, helpful error message for exactly this case** (`requestSubmitPayment()`, lines 1507-1510): *"يرجى إرفاق إيصال الحوالة قبل إرسال مرجع الدفع"* / "Please attach the transfer receipt before submitting payment details." **But this message can never display**, because the disabled-button guard prevents the click handler that contains it from ever running. The result observed live: a permanently inert button with zero explanation.
- **Classification: frontend-only.** The backend's `submit-payment` handler conditionally includes `payment_proof_url` in the request body only if present (`deal-panel.tsx` line 1538-1540: `if (paymentProofDataUrl) { body.payment_proof_url = ...}`), implying the backend itself may not strictly require it — this was not independently verified against the backend route's own validation, since the frontend never allows a no-file request to be sent at all.

### 3.3 Verification status — CLOSED, explained by approval timing (not a code bug)

- The verification formula is **identical and correct** in both places it's used: `offers.ts` line 61 (`buyerIsVerified`) and `deals.ts` line 30 (`isVerified`), both computing `!!(commercialRegistration && license_status === "approved")`.
- **Founder confirmation (2026-07-03): both test companies — Generator/Seller (`mmuaibed+seller2@outlook.com`) and Receiver/Buyer (`mmuaibed+buyer3@outlook.com`) — were approved by the founder/operator**, not only Generator Co. This fully explains the observed sequence: Receiver Co's `license_status` was not yet `"approved"` at offer-creation time (`buyer_is_verified: false`, correctly computed per `companies.license_status` starting at `pending` after a license number is submitted), then became `"approved"` once the founder's approval action reached it, which is why every subsequent read (`is_verified: true`) reflected the new, correct state.
- **Closed. Not classified as a code bug.** The formula is consistent everywhere it's used; the earlier appearance of inconsistency was fully a function of approval timing during this audit session, now confirmed by the founder.
- **Retained as a product/UX documentation note only** (see §8) — the underlying *semantics* of company approval, license verification, buyer verification, and the `counterparty.is_verified` field are not clearly surfaced to end users or in any audit trail, which is worth product/UX attention independent of the fact that the code itself behaved correctly throughout.

## 4. Unknowns Requiring Later Testing or Product Decision

1. ~~Did the founder's admin action approve only Generator Co, or Receiver Co as well?~~ **Resolved — founder confirmed both companies were approved (§3.3). Closed.**
2. **Does the backend independently enforce `payment_proof_url` as required, or would it accept a reference-only submission if the frontend allowed it?** — not verified, since the frontend blocks the request entirely; would require either a backend code read (not yet done at the route-handler-body level for this specific field) or a direct API call bypassing the frontend gate (a live-testing action, not performed here).
3. **What does `estimated_amount` vs. `final_amount` actually look like once they diverge?** — code confirms *where* divergence happens (dispatch, via `actual_quantity`), but this was never observed live, since dispatch was deferred.
4. **Whether offer submission is deliberately ungated by `license_status`, or whether that's a gap** relative to the schema comment's stated intent ("approved — admin approved; company may create listings **and submit offers**") — the code comment suggests offers *should* also require approval, but live testing showed an offer succeeding while the buyer's status read as unverified (`false`) at that moment (before the founder's approval reached it). This still needs an explicit product decision on whether offer submission should itself be gated the same way listing creation is — only a route-level code read of `offers.ts`'s POST handler (not yet done at that depth) would confirm whether a `license_status` check is genuinely absent there.

## 5. Engineering Trace Table

| Finding | File | Line(s) | Function/Symbol |
|---|---|---|---|
| Transport responsibility default-to-null | `artifacts/api-server/src/routes/deals.ts` | 59 | `serializeDeal()` |
| Only correct call site | `artifacts/api-server/src/routes/deals.ts` | 282 | (deal fetch/accept response) |
| 6 incomplete call sites | `artifacts/api-server/src/routes/deals.ts` | 380, 466, 659, 748, 824, 907 | submit-payment, confirm-payment, confirm-dispatch, confirm-receipt, cancel, extend |
| Frontend binary fallback (role gating) | `artifacts/tadweerah/src/components/deal-panel.tsx` | 2216-2218 | `isTransportResponsible` |
| Frontend binary fallback (message copy) | `artifacts/tadweerah/src/components/deal-panel.tsx` | 2235-2237 | inline ternary |
| i18n string confirmed | `artifacts/tadweerah/src/i18n/index.tsx` | 944-945 | `deal.transport.not_responsible_buyer` / `_seller` |
| Payment-proof disabled-button gate | `artifacts/tadweerah/src/components/deal-panel.tsx` | 2064 | Submit `<Button disabled={...}>` |
| Unreachable helpful error message | `artifacts/tadweerah/src/components/deal-panel.tsx` | 1507-1510 | `requestSubmitPayment()` |
| Verification formula (offer) | `artifacts/api-server/src/routes/offers.ts` | 61 | `serializeOffer()` → `buyerIsVerified` |
| Verification formula (deal) | `artifacts/api-server/src/routes/deals.ts` | 30 | `serializeDeal()` → `isVerified` |
| License status enum + lifecycle comment | `lib/db/src/schema/companies.ts` | 15-25, 55-59 | `licenseStatusEnum`, `license_status` column |
| final_amount recalculation | `artifacts/api-server/src/routes/deals.ts` | 601-605 | dispatch handler |
| Deal reference derivation | `artifacts/tadweerah/src/lib/listing-ref.ts` | 15-18 | `dealRef()` |
| Transport-request reference derivation (separate format) | `artifacts/tadweerah/src/lib/listing-ref.ts` | 21-25 | `trRef()` |
| sale_type enum + design intent comment | `lib/db/src/schema/waste-listings.ts` | 68-73, 150 | `saleTypeEnum` |
| City column definition | `lib/db/src/schema/waste-listings.ts` | 114 | `city: text("city").notNull()` |
| Deal-row fields copied at creation | `artifacts/api-server/src/routes/offers.ts` | 1129-1141 | offer-accept transaction, `dealsTable.values({...})` |

## 6. Deal Reference vs. Contract Reference

- **`TDW-2026-9F6688` is not a stored value** — it's computed client-side by `dealRef(id, createdAt)`: prefix `TDW-`, the deal's creation year, and the first 6 hex characters of the deal's own UUID, uppercased.
- A **separate function, `trRef()`**, generates transport-request references in the format `TDW-TR-{year}-{id6}` — same pattern, different type-prefix segment.
- **No separate "contract" object or reference exists for this marketplace deal.** The `TDW-CTR-####-####` format referenced in WS1's document review belongs to **Contract Lite**, a genuinely separate subsystem (`/contracts/*` routes, its own schema) — not something this deal ever passes through.
- **Classification: expected behavior / designed convention, not a mismatch.** Different record types (deal, transport request, contract) each get their own prefix segment under one shared `TDW-{segment}-{year}-{id6}` scheme. No product decision needed — just worth documenting so future analysts don't assume all `TDW-...` strings are the same record type.

## 7. `sale_type` Terminology

- **`waste_listings.sale_type`** is a genuine, intentional two-value model: `"auction"` (buyers compete by price within an offer window; producer picks the best offer) vs. `"direct"` (producer names a fixed price, first buyer to accept wins). Defaults to `"auction"`, **immutable once published**.
- The Arabic/English UI copy ("استقبال عروض" / "receive offers") is a **reasonable user-facing description** of what the `"auction"` model does — it is not a mistranslation, it's a different audience-appropriate label for the same concept.
- **Recommendation: document/alias, don't rename.** The internal enum name is meaningful to engineers (distinguishes from `"direct"`); the UI copy is meaningful to users. The only real risk is a future engineer or analyst assuming `"auction"` implies a live bidding UI it doesn't have — a short glossary note in code comments or a data dictionary would fully resolve this without any renaming risk to the immutable, already-in-use enum value.

## 8. Buyer/Counterparty Verification — CLOSED

| Observation | Field | Value | Timing |
|---|---|---|---|
| Offer creation | `offer.buyer_is_verified` | `false` | Receiver Co submits offer (before founder approval reached it) |
| Offer acceptance / deal view | `deal.counterparty.is_verified` | `true` | Generator Co views accepted offer (after founder approved both companies) |
| Payment submission | `deal.counterparty.is_verified` | `true` | Receiver Co's own submit-payment response |
| Payment confirmation | `deal.counterparty.is_verified` | `true` | Generator Co confirms payment |

**Closed — explained by approval timing, confirmed by the founder (2026-07-03): both Generator/Seller and Receiver/Buyer test companies were approved**, not only Generator Co as originally assumed. **Not a display-snapshot artifact and not a formula inconsistency** — both computation sites (`offers.ts` line 61, `deals.ts` line 30) use the identical, correct formula `!!(commercialRegistration && license_status === "approved")`, and the value change simply tracks the real `license_status` transition for Receiver Co.

**Retained as a product/UX documentation note (not a bug):** the platform should make **company approval, license verification, buyer verification, and `counterparty.is_verified` semantics** clearer in the UI and in an audit trail — e.g., surfacing *when* and *by what action* a company's status changed, so this kind of question doesn't require a source-code trace to answer for a real company later. This is a clarity/traceability recommendation, not a defect.

## 9. City/Location Source of Truth

- **`waste_listings.city`** is `text`, `NOT NULL`, with **no foreign key or lookup-table constraint** — confirmed free-text by current implementation (the schema file contains no reference to any cities master table anywhere near this column).
- The typo `"dammmam"` (entered once, at Receiver Co's onboarding) was traced across **company profile → dashboard → deal counterparty data** — three independent screens, all reading the same underlying free-text value with no normalization or validation at any layer.
- **Maps to WS9:** a bilingual Saudi-cities master-data table (with a foreign key from both `companies.city` and `waste_listings.city`) is the structural fix — this is a data-model addition, not a quick validation patch, so it belongs in the V2 backlog rather than a hotfix list.

## 10. UI/UX Impact Table

| Finding | User-visible impact | Severity |
|---|---|---|
| Transport responsibility bug | Seller and buyer likely both see contradictory/wrong guidance about who arranges transport, right at the step where real money and goods are involved | **High** |
| Payment-proof disabled button, no message | A real user following the "optional" label gets stuck with a dead button and zero explanation | **High** (blocks a core flow with no recovery path) |
| Verification badge inconsistency | A seller may see a "Verified" badge on an offer before/without knowing what triggered it — a trust-signal clarity issue | Medium |
| sale_type/"auction" internal naming | No end-user impact (never shown to users) — engineering/analyst clarity only | Low |
| Deal vs. contract reference formats | No end-user impact — internal/analyst clarity only | Low |
| City free-text | Typos and inconsistent city names propagate silently across the whole platform, affecting professionalism and later data aggregation/analytics | Medium |

## 11. Authorization/Security Implications

- The transport-responsibility bug has a mild authorization dimension: `isTransportResponsible` (deal-panel.tsx 2216-2218) gates which action buttons a user sees. A buggy read could show the wrong party a "confirm dispatch"-class action, or hide it from the party who should actually see it. Not a privilege-escalation risk (both parties are legitimate participants in their own deal), but a workflow-correctness/authorization-clarity issue.
- **The verification-status item is now closed as explained by approval timing (§3.3, §8) — not an authorization bug.** It is retained only as a product/UX clarity recommendation (make approval/verification semantics and their audit trail visible), not as a security finding.
- The transport-responsibility finding reinforces, rather than introduces, the authorization-model concerns already on record from WS1 (admin's own split frontend-allowlist/backend-shared-key model). Recommend a WS8 pass covering the transport role-gating impact alongside those earlier findings.

## 12. Recommended Fixes (Documented for Later — Not Implemented)

1. Add the missing `listingExtra` join to the 6 incomplete `serializeDeal()` call sites in `deals.ts`, so `transport_responsibility` is always correctly populated.
2. Change the frontend's binary ternaries (`=== "seller" ? A : B`) to an explicit three-state model (`"seller" | "buyer" | null/unknown`), so missing data is never silently asserted as a specific answer.
3. Either make the payment-proof file genuinely optional end-to-end (remove it from the disabled-button condition, and confirm/adjust backend acceptance accordingly), or make the UI label say "required" — and either way, ensure the already-written helpful error message can actually reach the user.
4. Confirm and document the actual company-approval trail for both test companies, and consider whether an audit-log-visible "who approved this and when" record would prevent this kind of ambiguity for real companies later.
5. Add a lightweight glossary/comment near `sale_type` and near the two reference-generation functions (`dealRef`/`trRef`) so the intentional-but-non-obvious naming choices don't get mistaken for bugs by a future reader.
6. Longer-term: a bilingual Saudi-cities master-data table, referenced by both `companies` and `waste_listings`.

**No fixes have been made. This is a documentation deliverable only.**

## 13. Mapping to Workstreams

| Finding | WS4 (UI/UX) | WS5 (Source-of-Truth) | WS8 (Authorization) | WS9 (V2 Backlog) |
|---|---|---|---|---|
| Transport responsibility bug | ✓ (confusing message) | ✓ (primary) | ✓ (role-gating impact) | ✓ (fix items #1-2) |
| Payment-proof optional/required mismatch | ✓ (primary) | ✓ (validation logic) | — | ✓ (fix item #3) |
| Verification/approval semantics (closed as bug; retained as clarity note) | ✓ (primary — UI/audit-trail clarity) | — | — | — |
| sale_type naming | — | ✓ (primary, low severity) | — | ✓ (glossary item) |
| Deal/contract reference formats | — | ✓ (primary, resolved as expected) | — | — |
| City free-text | ✓ (typo visible to users) | ✓ | — | ✓ (primary, master-data table) |
| Payment proof stored as base64 (not CDN) | — | ✓ (noted for scalability) | — | ✓ (possible future item) |

## 14. Recommendation on Transport/Receipt Live Testing

**Remain deferred, as already decided — this review does not change that.** The root cause is now fully documented with exact file/line references, so no further live testing is needed to *understand* the bug. If/when the founder wants to proceed:

- **Fastest path to unblock:** engineering applies fix #1 (add the missing joins) — a small, well-scoped, low-risk change per the trace table above — after which a fresh transport test would exercise real seller-responsibility behavior.
- **If testing is wanted before any fix:** run it as two explicitly-labeled scenarios (buggy-path-as-observed vs. a hypothetical post-fix expectation), not as a single test assumed to reflect correct behavior — consistent with the prior review's recommendation.
- Receipt/completion testing should wait until transport is unblocked, since it's the next stage in the same lifecycle and would inherit the same contamination risk in the interim.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This document is analysis only: existing evidence plus read-only source-code inspection. No code/config changes, no DB access, no admin action, no new live UI journey, no commits, no deploys, no transport/shipment click, no receipt/completion action.*
