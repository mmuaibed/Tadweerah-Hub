# WS5-D / WS10 — Reports, Payment Requests, Platform Fees & Trust Outputs Review, and Current-Platform Improvement Plan

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Method:** Synthesis of WS4-A, WS4-B, WS5-A, WS5-B, WS5-C, and the WS5-C Addendum, plus targeted read-only source inspection. **No new live UI actions.** No code/config/DB/admin/commit/deploy actions, no mockups, no fee-document designs, no document deletion, no transport/shipment/receipt/completion action.

---

## 0. Platform Fee / Commission Naming Decision Requirement

*(Per founder instruction, resolved before any further review of payment requests, platform fees, or trust outputs.)*

### Options Assessed

| Option | Clarity to buyer | Clarity to seller | B2B marketplace fit | Saudi business fit | Legal/tax sensitivity | Separates Tadweerah from seller entitlement? | Works for 2.5% marketplace flow? | Works for 10 SAR/ton contract flow? |
|---|---|---|---|---|---|---|---|---|
| **Platform Fee** | High — generic, immediately understood | High | High — common across SaaS/marketplace platforms internationally | Medium — needs human validation | Low — no invoice/agency connotation | Yes, if paired with an explicit seller-entitlement label | Yes | Yes |
| **Tadweerah Platform Fee** | High — same as above, plus explicitly names who charges it | High | High | Medium — needs human validation | Low | Yes, most clearly of all options | Yes | Yes |
| **Tadweerah Commission** | Medium — "commission" implies a percentage cut, which fits the 2.5% marketplace case well but reads oddly against a flat 10 SAR/ton amount | Medium — same issue | Medium — "commission" is standard in brokerage/agency contexts, less standard for a flat per-ton logistics-style charge | Low — "commission"/عمولة carries agency/brokerage connotations that may need a closer look in a Saudi commercial-law context | **Medium — "commission" language is more likely to invite agency/brokerage-style legal characterization** | Yes | Yes, naturally | **Weak fit — awkward for a flat per-ton fee** |
| **Service Fee** | Medium — generic, slightly consumer-app in tone (delivery apps, ride-hailing) | Medium | Medium — less common in enterprise/B2B marketplace contexts specifically | Medium | Low | Yes | Yes | Yes |
| **Marketplace Fee** | High for the marketplace flow specifically | High for the marketplace flow specifically | High for marketplace deals | Medium | Low | Yes | Yes, by name | **Poor fit — Contract Lite is explicitly not the open marketplace (WS1), so this name would misdescribe the fee in that context** |

### Recommendation

**Adopt "Tadweerah Platform Fee" (رسوم منصة تدويرة) as the single canonical term, for both the 2.5% marketplace/deal flow and the proposed 10 SAR/ton contract flow.** Reasoning:

- It is **calculation-method-agnostic** — unlike "commission" (which linguistically implies a percentage cut) or "marketplace fee" (which implies the open marketplace specifically), "Platform Fee" works equally naturally whether the amount is a percentage or a flat per-ton rate.
- It **explicitly brands who is charging it**, which matters in a bilingual, multi-party document where "the fee" alone could be ambiguous (a buyer might otherwise wonder if this refers to a bank transfer fee, a government fee, or something else).
- It reads as **enterprise-neutral**, consistent with the Sponsor's "impressive, enterprise-ready" positioning, avoiding the more consumer-app connotation of "service fee."
- **Retire "Tadweerah Commission" as a synonym** — using two names for one concept was itself flagged as a confirmed risk in the WS5-C Addendum; this recommendation resolves that by choosing one.

**Pair this with a distinctly-named seller-side figure — recommend "Amount Due to Seller" (صافي مستحقات البائع)** — so "Total" (what the buyer pays), "Tadweerah Platform Fee" (what the platform takes), and "Amount Due to Seller" (what the seller nets) are three clearly distinguished labels, never conflated under one word.

**Legal/tax sensitivity note:** the word "عمولة" (commission) in Arabic commercial usage carries agency/brokerage connotations that may warrant closer review in a Saudi commercial-law context; this is flagged, not resolved, here. **No legal or ZATCA validation is claimed for any of the above** — this is a terminology and product recommendation only.

**Confidence tags:** clarity/marketplace-fit assessments above are **High internal confidence**. Saudi business-user fit is **Low — requires human validation**. Legal/tax-sensitivity characterization is **Requires regulatory/legal validation**.

---

## 1. Executive Summary

With the naming question resolved (§0), this review examines reports, Deal Details, Contract Lite, payment-related outputs, and overall trust presentation, and converts the accumulated WS4/WS5 findings into a practical, prioritized improvement plan — the input Milestone 1B needs to close. **The core conclusion: Tadweerah's trust-output foundation (VAT math, confirmation modals, the sustainability-report governance pattern) is solid; the improvement plan is concentrated in a small, well-understood set of fixes plus the terminology-naming decisions this workstream and its predecessors have now made.**

## 2. Reports Review

- **Sustainability reports** remain the best-governed area in the codebase (`sustainability_report_field_config`, `is_system_field` protection) — no changes recommended to the underlying mechanism; recommend only the light enhancements already noted in WS5-C (§13: approval workflow, versioning).
- **"Impact report"** — still not clearly distinguished from "sustainability report" (WS5-C Addendum §4.5, item 42). Recommend a product decision on whether these are one deliverable or two before either is built out further or redesigned.
- **Deal-level financial summary** (subtotal/VAT/total) functions correctly and is presented clearly (WS3/WS4-A) — recommend adding it to the protected-label list (WS5-C §8) but no functional changes needed.
- **Print/export output** remains the one unreviewed report-adjacent artifact (WS3-A2). A separate `deal.pdf.download` ("Download PDF Summary") capability exists in the i18n dictionary distinct from the browser-print path noted in WS3-A2 — **these may be two different export mechanisms that were not fully distinguished in the earlier print check.** Recommend this be clarified and the actual PDF output reviewed by a human before any partner demo (consistent with WS4-B §11).

## 3. Deal Details / Contract Lite Trust-Output Review

- **Deal Details** (marketplace flow): clear, correctly-computed, but its trust value is undercut whenever the transport-responsibility defect is visible (WS4-A §9, WS4-B §6) — this remains the single highest-priority fix for this screen's trust output.
- **Contract Lite**: uses a genuinely *more* rigorous reference-numbering mechanism than the marketplace deal (a DB-backed atomic sequence vs. a client-derived UUID slice, WS5-C §3) — a real strength worth highlighting rather than hiding. However, its relationship to "Deal" is never explained to users (WS5-C Addendum §4.1, item 7) — the single highest-priority *terminology/UX* fix for trust output in this area, since a partner or regulator encountering both a "Deal" and a "Contract" for what feels like the same relationship could reasonably question the platform's internal consistency.
- **Recommendation:** before any partner-facing demo involving Contract Lite, add a one-line, plain-language distinction (e.g., "Marketplace Deals are matched through open listings; Contracts are pre-agreed recurring supply arrangements") — copy-only, no redesign required.

## 4. Payment Request / Platform Fee Structure Recommendations

*(Terminology and structure only — no fee-document design, per hard limits.)*

- Introduce "Tadweerah Platform Fee" as a distinct, always-visible line item, never merged into the buyer's or seller's own amounts (§0).
- Introduce "Amount Due to Seller" as the seller-facing net figure, distinct from "Total" (which should be clarified as buyer-facing once a fee exists — WS5-C Addendum §4.2, item 18).
- The buyer-facing offer/bid amount field should carry a persistent, always-visible note: "Excludes Tadweerah Platform Fee" / "لا يشمل رسوم منصة تدويرة" (already recommended in WS5-C §9, restated here with the now-resolved canonical name).
- Recommend "payment request" / "platform fee request" / "fee statement" as the only acceptable terms for any future document referencing what's owed — invoice/tax-invoice language remains off-limits pending legal/ZATCA confirmation (CR-001 A6, unchanged).
- Recommend the 10 SAR/ton contract-flow rate be implemented as **admin-configurable master data from day one** (WS5-C §13, recommendation 3), not a hardcoded constant, since it is explicitly "not final" per CR-001.

## 5. Regulatory Confidence Assessment

- **Strengths:** MWAN-aligned role model, e-Manifest reference hooks, a genuinely governed sustainability-reporting mechanism, and (newly confirmed here) a properly sequenced, audit-friendly Contract Lite reference-numbering system.
- **Gaps:** no visible approval/verification audit trail on the company profile (WS5-B, WS5-C Addendum §4.4 item 34); the "Verified" word-collision (WS5-C Addendum §4.4 item 35) actively weakens the platform's own trust signal to a discerning regulatory viewer; the city/location free-text gap (WS5-B/C) would raise questions from an institutional reviewer expecting structured location data.
- **Net assessment:** the regulatory-confidence *foundation* is genuinely stronger than the *presentation* — the fixes needed are concentrated in trust-signal clarity (the Verified word, the approval audit trail) rather than in rebuilding the underlying data model.

## 6. Practical Current-Platform Improvement Plan (Fix-First List)

*(Consolidated from every prior WS4/WS5 finding, prioritized. Documented only — nothing implemented.)*

| # | Fix | Type | Priority | Source |
|---|---|---|---|---|
| 1 | Payment-proof label/behavior mismatch | Copy + logic fix | Critical | WS5-A, WS4-A §7 |
| 2 | Transport-responsibility propagation bug (TDW-TRANS-001) | Data/backend fix | Critical | WS3 Transport Review, WS5-A |
| 3 | Resolve "Platform Fee" vs. "Tadweerah Commission" naming (done — §0) | Terminology decision | Critical (resolved here) | WS5-C Addendum, this document |
| 4 | Define "Amount Due to Seller" before any fee launches | Terminology + data model | Critical (pre-launch) | WS5-C Addendum §4.2 |
| 5 | Fix the "Verified"/موثّق word-collision | Copy fix | High | WS5-C Addendum §4.4 |
| 6 | Unify role naming (Generator/Producer/Seller; Receiver/Buyer/Processor) | Copy fix (multi-surface) | High | WS5-C Addendum §4.4 |
| 7 | Add Deal-vs-Contract explainer copy | Copy fix | High | WS5-C Addendum §4.1, this document §3 |
| 8 | Build a `cities` admin-managed master-data table | Data model addition | High | WS5-B/C |
| 9 | Reconcile dispatch/receipt/completion wording across deal and shipment subsystems | Terminology + verification | High | WS5-C Addendum §4.3 |
| 10 | Human-review the actual PDF/print output | Verification | High | WS3-A2, this document §2 |
| 11 | Add onboarding hierarchy copy for roles/activities/capabilities | Copy + IA fix | High | WS5-B, WS4-A |
| 12 | Fix unit-label rendering leak ("1 kg" in Latin characters) | Rendering fix | Medium | WS4-A §5 |
| 13 | Add protected-label flag to VAT/subtotal/total (and future fee labels) | Governance addition | Medium | WS5-C §8 |
| 14 | Clarify "impact report" vs. "sustainability report" | Product decision | Medium | This document §2 |
| 15 | Genuine cross-language transactional content check | Verification | Medium (open item) | `PH0-OPEN-AR-EN-001` |

## 7. Governance Improvements Recommended

- Extend the `is_system_field` pattern to financial labels (VAT/subtotal/total/platform fee/seller entitlement) before the fee feature launches.
- Add a minimal audit trail (`last_changed_by`/`last_changed_at`) to admin-managed master-data tables before extending the pattern to anything financial (WS5-C Addendum §6).
- Establish the WS5-C/Addendum terminology tables as the seed of a living glossary document, reviewed whenever a new user-facing concept is added.
- Route the invoice/tax-language standing rule (CR-001 A6) into the WS8 compliance register formally, so it's enforced procedurally rather than remembered informally.

## 8. Terminology Unification Plan

1. Decide and apply one canonical name per role (Generator/Receiver/Transporter recommended, per WS5-C Addendum §4.4) across onboarding, homepage marketing copy, and marketplace card labels.
2. Apply the "Tadweerah Platform Fee" / "Amount Due to Seller" naming decided in §0 consistently the moment the fee feature is designed — not retrofitted after.
3. Replace the Arabic "Verified" badge word with one that doesn't overlap with the marketing site's pervasive use of "موثّق" as a generic adjective.
4. Document the internal `sale_type = "auction"` → "receive offers" mapping so future engineers aren't confused by the discrepancy (a documentation fix, not a wording change).
5. Reconcile or explicitly document the deal-vs-shipment terminal-state vocabulary difference (dispatched/receipt_pending/completed vs. dispatched/received/closed).

## 9. Data/Source-of-Truth Improvement Plan

1. Bilingual schema support for `companies.name`/`city` and `waste_listings.city` (WS5-B's structural finding — the prerequisite for fixing the bilingual display bug at its root).
2. `cities` master-data table (WS5-B/C).
3. Fix the 6-of-7 `serializeDeal()` call sites missing the `listingExtra` join (WS5-A, root cause of TDW-TRANS-001).
4. Consider upgrading the marketplace deal-reference format to a governed sequence, matching Contract Lite's already-proven `contract_sequences` pattern (WS5-C §3, Applicability Matrix).

## 10. Partner-Readiness Show / Fix-First / Do-Not-Show List

*(Consolidated and updated from WS4-B §15 with this review's new findings.)*

| Screen/output | Show as-is | Fix-first | Do not show |
|---|---|---|---|
| Homepage (AR/EN) | ✓ | | |
| Sustainability report output | ✓ (best-governed area) | | |
| Deal Details, pre-payment | ✓ | | |
| Deal Details, post-payment (transport visible) | | | ✓ (until TDW-TRANS-001 fixed) |
| Contract Lite reference/output | | ✓ (add deal-vs-contract explainer first) | |
| Company profile "Verified" badge | | ✓ (word-collision fix first) | |
| Payment-proof submission | | ✓ (label/behavior fix, or narrate live) | |
| Any screen naming the Generator/Receiver role inconsistently | | ✓ (naming unification first) | |
| Print/PDF export | | | ✓ (unreviewed) |
| Any future platform-fee/payment-request screen | | ✓ (must launch with §0's naming resolved) | |

## 11. Mapping to Workstreams

| Output | WS4 | WS5 | WS6 | WS8 | WS9 | WS11 |
|---|---|---|---|---|---|---|
| Platform Fee naming decision (§0) | — | ✓ primary | — | ✓ (compliance register input) | ✓ | ✓ (billing direction) |
| Fix-first list (§6) | ✓ | ✓ primary | — | — | ✓ primary | ✓ (Path 1 input) |
| Governance improvements (§7) | — | ✓ primary | — | ✓ | ✓ | — |
| Terminology unification plan (§8) | ✓ | ✓ primary | ✓ (feeds parity review) | — | ✓ | — |
| Data/SoT improvement plan (§9) | — | ✓ primary | — | — | ✓ primary | ✓ (Path 1/2 comparison) |
| Partner-readiness matrix (§10) | ✓ primary | ✓ | — | — | — | ✓ |

## 12. Recommendations

1. **Milestone 1B is substantively satisfied by this document** — the fix-first list, governance improvements, terminology unification plan, data/source-of-truth plan, and partner-readiness matrix requested for that milestone are all produced above.
2. **Proceed next to WS8**, consistent with every prior sequencing recommendation (WS4-A/B, WS5-C) — nothing found here argues for further delay, and WS8 now has a substantially more complete input set (the compliance-register items from §7/§0, the regulatory-confidence assessment from §5).
3. **Buyer-responsibility transport exception remains deferred**, unchanged — the dispatch/receipt/completion wording questions (§6 item 9) reinforce, rather than reduce, the value of resolving conceptual questions before that live test is executed.

---

# WS5-D / WS10 Closure Decision

**Date:** 2026-07-03
**Founder decision:** WS5-D / WS10 is accepted and closed. **Milestone 1B — Current Platform Improvement Plan is closed.**

**Status: Completed ahead of baseline.**

**Accepted conclusions:**
1. The document successfully converts WS4-A, WS4-B, WS5-A, WS5-B, WS5-C, and WS5-C Addendum findings into a practical current-platform improvement direction.
2. The canonical financial terminology recommendation is accepted for Phase 0 planning:
   - English: **Tadweerah Platform Fee**
   - Arabic: **رسوم منصة تدويرة**
3. "Tadweerah Commission" should be retired as the primary term to avoid a two-names-one-concept risk.
4. The recommended seller-side distinction is accepted: **Amount Due to Seller** — this helps avoid conflating platform fee, total amount, and seller entitlement.
5. "Commission / عمولة" terminology remains legal/commercially sensitive and should be human/legal reviewed before external use.
6. No legal, ZATCA, tax, or regulatory validation is claimed.
7. The document substantively satisfies Milestone 1B outputs: prioritized fix-first list, governance improvements, terminology unification plan, data/source-of-truth improvement plan, reports/payment-request/platform-fee direction, partner-readiness show/fix-first/do-not-show matrix.
8. Buyer-responsibility transport exception remains deferred and plan-only.
9. No implementation occurred.

**WS5-D / WS10 and Milestone 1B are now closed on this basis.** Per standing instruction, they will not be reopened unless new evidence contradicts what's documented here.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This document is synthesis of existing evidence, terminology-decision reasoning, and recommendations only. No new live UI actions, no code/config/DB/admin/commit/deploy actions, no mockups, no fee-document designs, no document deletion, no transport/shipment/receipt/completion action. No legal, tax, ZATCA, or Saudi-market validation is claimed — all such items are marked as requiring human/regulatory validation.*
