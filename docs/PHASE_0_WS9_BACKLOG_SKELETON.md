# WS9 — V2 / Improvement Backlog (Skeleton)

**Date:** 2026-07-03
**Status: Phase 0 CLOSED by Founder approval, 2026-07-03 (`PHASE_0_WS11_FINAL_DECISION_PACK.md` §13). This backlog carries forward unchanged as the primary Phase 1 planning input — closure did not add, remove, resolve, or downgrade any item below.** Codex-reconciled, founder terminology direction recorded (§5), pending human/domain/legal validation and the Phase 1 human technical owner gate (§7) — neither of which was resolved by Phase 0 closure.
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1, Multi-Agent Investigation & Review model.

---

## Purpose

WS9 consolidates every backlog/fix-first/future-improvement item raised across WS1, WS4-A, WS4-B, WS5-A, WS5-B, WS5-C, the WS5-C Addendum, WS5-D/WS10, and WS8 into one prioritized register, so Milestone-level and WS11 decision-making has a single place to look. This skeleton is the consolidation pass; it is deliberately left open in four places (below) pending inputs that do not exist yet.

**No implementation occurs in WS9 or anywhere in Phase 0.** This is a backlog register, not a build plan.

---

## 1. Consolidated Backlog — Current-Platform Fixes

| # | Item | Priority | Category | Source | Status |
|---|---|---|---|---|---|
| 1 | Payment-proof label/behavior mismatch (label says optional, disabled-button makes it required). **Founder-approved wording direction:** "Payment Proof" (إثبات السداد), not "Transfer Proof"; required state labeled "Payment Proof (Required)" (إثبات السداد (مطلوب)) | Critical | UX + logic fix | WS5-A, WS4-A §7, WS5-D/WS10 §6; wording per Founder Terminology Direction 2026-07-03, item 5 | Open — wording approved in principle; payment/legal/accounting validation still required before real-money rollout |
| 2 | Transport-responsibility propagation bug (TDW-TRANS-001) — 6 of 7 `serializeDeal()` call sites missing `listingExtra` join | Critical | Data/backend fix | WS3 Transport Review, WS5-A, WS5-D/WS10 §6 | Open |
| 3 | Platform Fee naming — "Tadweerah Platform Fee" / "رسوم منصة تدويرة" | Critical (pre-launch) | Terminology, already decided | WS5-D/WS10 §0 | **Resolved — Founder-ratified** |
| 4 | "Amount Due to Seller" definition, distinct from buyer's "Total" | Critical (pre-launch) | Terminology + future data model | WS5-D/WS10 §0 | **Resolved — Founder-ratified** |
| 5 | "Verified"/موثّق word-collision with generic marketing copy. **Founder-approved direction:** "Verified Company" (تم التحقق من الشركة), used only as an actual verification badge/status — never as generic marketing language elsewhere | High | Copy fix | WS5-C Addendum §4.4, WS5-D/WS10 §6; Founder Terminology Direction 2026-07-03, item 1 | Founder product decision recorded — approved in principle, not legal/regulatory certification |
| 6 | Role naming — **not** a single-term standardization. **Founder-approved contextual model:** Generator/مولّد النفايات for regulatory/onboarding/role-identity context, Seller/البائع for marketplace/transactional context, "Producer" retired as a primary role term; Receiver/مستقبل النفايات for regulatory/onboarding context, Buyer/المشتري for marketplace/transactional context, Processor/Recycler/Factory remain capabilities/categories only | High | Copy fix, multi-surface, contextual (not universal) | WS5-C Addendum §4.4, WS5-D/WS10 §6; Founder Terminology Direction 2026-07-03, items 2-3 | Founder product direction recorded — approved in principle; Saudi B2B/domain validation still recommended before large external rollout |
| 6a | "Receive offers" wording — split by surface | Low | Copy fix | Founder Terminology Direction 2026-07-03, item 4 | **Founder-approved, safe decision, no further validation flagged.** Listing status: "Open for offers" (مفتوح لاستقبال العروض); action/module wording: "Receive offers" (استقبال العروض) |
| 7 | Deal-vs-Contract explainer copy | High | Copy fix | WS5-C Addendum §4.1, WS5-D/WS10 §3/§6 | Open |
| 8 | `cities` admin-managed master-data table | High | Data model addition | WS5-B, WS5-C §13, WS5-D/WS10 §9 | Open |
| 9 | Dispatch/receipt/completion terminal-state wording — technically resolved by Codex; residual item is a product decision on whether to unify wording | High → Medium | Terminology + verification | WS5-C Addendum §4.3, WS5-D/WS10 §6, Codex EXT-CODEX-001/002/003 | **Root mechanism resolved (Codex, Pass 3).** Deal `dispatched` displays as "Goods in Transit," not "Dispatched" — live collision risk lower than assumed. Remaining decision (unify wording or leave as-is) folded into §5 Founder Terminology Ratification. |
| 10 | Human review of actual PDF/print output | High | Verification | WS3-A2, WS5-D/WS10 §2 | Open |
| 11 | Onboarding hierarchy copy for roles/activities/capabilities | High | Copy + IA fix | WS5-B, WS4-A, WS5-D/WS10 §6 | Open |
| 12 | Unit-label rendering leak — root cause **identified** across 3 code paths (raw concatenation, legacy-unit defaulting, translation-fallback-to-raw) | High | Rendering + data-integrity fix | WS4-A §5, `PH0-OPEN-UNIT-LABEL-001`, Codex EXT-CODEX-005/006/007 | **Root cause identified (Codex, Pass 3) — not yet fixed.** See items 12a-12c below. |
| 12a | Fix raw `${quantity} ${unit}` concatenation in `pending-actions.tsx`, `reports.tsx`, `admin.tsx` to route through i18n unit labels | Medium | Rendering fix | Codex EXT-CODEX-005 | Open |
| 12b | Fix `toLegacyUnit()` in `listing-new.tsx` silently defaulting non-kg/ton units to `"kg"` — causes divergence between the legacy `unit` field and `unit_option_id` | High | Data-integrity fix | Codex EXT-CODEX-006 | Open |
| 12c | Fix sustainability/print pages' raw-value fallback when a unit translation key doesn't exactly match `ton`/`kg` | Medium | Rendering fix | Codex EXT-CODEX-007 | Open |
| 13 | Protected-label flag for VAT/subtotal/total (and future fee labels) | Medium | Governance addition | WS5-C §8, WS5-D/WS10 §7 | Open |
| 14 | Clarify "Impact report" vs. "Sustainability report" | Medium | Product decision | WS5-C Addendum §4.5, WS5-D/WS10 §2 | Open — needs human/product validation |
| 15 | Genuine cross-language transactional content check | Medium | Verification | `PH0-OPEN-AR-EN-001` | Open |
| 16 | Client-side payment-proof validation mechanism — confirmed: `payment_proof_url` is a client-generated base64 `FileReader` data URL embedded inline in the JSON payload, not a reference to a separately-stored/validated file | High | Security/data-integrity | WS8 §6, Codex EXT-CODEX-008/009/010 | **Mechanism confirmed (Codex, Pass 3).** Two implications: (a) the existing WS8 recommendation (server-side validation / dedicated upload endpoint) stands; (b) new consideration — inline base64 storage means no separate file-storage/CDN layer and potential payload/DB-row-size growth (item 16a). |
| 16a | Evaluate payload/DB-row-size implications of storing payment-proof files as inline base64 data URLs; consider moving to a dedicated upload endpoint with real file storage | Medium | Architecture/security | Codex EXT-CODEX-009 | Open — new item from Codex reconciliation |
| 17 | Build a separate Tadweerah Platform Fee proof/payment-request flow (2.5% fee, distinct from the buyer's proof of paying the seller's deal amount) — not yet implemented anywhere in the codebase | High (pre-launch) | Future billing / data model + product | Founder operational clarification 2026-07-03 (`PHASE_0_WS3_POST_PAYMENT_TRANSPORT_CONTINUATION_ADDENDUM.md`); ties to WS5-D/WS10 §0/§4 "Tadweerah Platform Fee"/"Amount Due to Seller" naming | Open — requires product implementation plus legal/accounting review (VAT treatment, payment-proof storage design) before it ships. Not a current-platform defect — a design gap for the intended future commercial flow. |
| 18 | Fix raw, untranslated i18n key rendering literally on screen (observed: "deal.stage.action.expired.buyer" on an expired-deal state) | High | Low-effort cleanup, but visible (PMO classification) | Directly observed via screenshot review, `PHASE_0_WS3_POST_PAYMENT_TRANSPORT_CONTINUATION_ADDENDUM.md` §2 (WS3-PP-03), §4 item 1 | Open — new finding, missing/broken translation key, same general class as the unit-label leak but a distinct defect. **Not a Phase 0 closure blocker; hard-wall it (make unreachable) in any demo build.** |
| 19 | Implement carrier/vehicle-assignment step in the transport-request flow — currently explicitly labeled "Coming soon" in the admin panel | Medium | Genuine feature gap — belongs in V2 opportunity backlog, not cleanup (PMO classification) | `PHASE_0_WS3_POST_PAYMENT_TRANSPORT_CONTINUATION_ADDENDUM.md` §2 (WS3-PP-06), §4 item 2; founder operational clarification item 6 | Open — confirms this part of the founder's described intended flow is not yet functional, not a bug in an existing feature. **Not a Phase 0 closure blocker.** |
| 20 | Investigate whether the transport-request reference format (observed sequential/zero-padded, e.g. TDW-2026-000004) is backed by a governed DB sequence; if so, use as the model to upgrade the marketplace deal-reference format (already recommended, WS5-C §3, item 29 above) | Low | Investigation / data model | `PHASE_0_WS3_POST_PAYMENT_TRANSPORT_CONTINUATION_ADDENDUM.md` §2 (WS3-PP-06), §4 item 3 | Open — unconfirmed observation, needs a Codex-scope code check before treating as a real precedent. **Not a Phase 0 closure blocker.** |
| 21 | Investigate the "electronic manifest completion counter" UI element ("N items remaining to complete the electronic manifest") observed live on a deal screen — not previously documented or investigated in Phase 0 | Medium | Needs-investigation + human/regulatory validation (PMO classification, not ordinary cleanup) | `PHASE_0_WS3_POST_PAYMENT_TRANSPORT_CONTINUATION_ADDENDUM.md` §2 (WS3-PP-02), §4 item 4; `PHASE_0_WS11_FINAL_DECISION_PACK.md` §4 (PMO classification table) | Open — new observation, function and MWAN-integration depth unknown. **Not a Phase 0 closure blocker.** Dual-tracked: also appears on WS11's partner-readiness "never claim as validated" list, since it touches regulatory-alignment surface and could become a compliance-claim risk if shown externally before validation. |
| 22 | Extend the موثّق word-collision fix (Verified Company badge, already Founder-approved in principle) to cover deal-level "documented"/"موثّق" language, now confirmed live on the deal-completion and in-transit screens, not just the company badge and marketing copy | Medium | Terminology governance — scope expansion to deal-state level (PMO classification) | `PHASE_0_WS3_POST_PAYMENT_TRANSPORT_CONTINUATION_ADDENDUM.md` §3.6; WS5-C Addendum §4.4 item 35; `PHASE_0_WS11_FINAL_DECISION_PACK.md` §6 (Path A/B scope-expansion note) | Open — product decision on whether deal-level and company-level "موثّق" uses should both be revisited or are intentionally distinct; not resolved by any Phase 0 document to date. **Not a Phase 0 closure blocker; feeds the Path A/B repair-effort estimate as a scope-expansion note.** |
| 23 | Terminology unification review of platform notifications (in-app, email, status-change, payment, transport/shipment, receipt/completion, admin/team notifications if present) — notifications carry user-facing terminology and may still use old or inconsistent wording not yet covered by the terminology register | High | Low-priority terminology cleanup (PMO classification) | Founder note, 2026-07-03 | Open — WS9/Phase 1 terminology cleanup item, not yet reviewed in any Phase 0 workstream. Must align against: Verified Company vs. documented/completed deal wording; the Generator/Seller contextual model; the Receiver/Buyer contextual model; "Payment Proof"/إثبات السداد; "Tadweerah Platform Fee"; transport responsibility; shipment/dispatch/receipt/completion statuses. **Not treated as a blocker for WS11 finalization** — no evidence found in Phase 0 of a critical partner-demo issue caused by notification wording specifically. |

## 2. Consolidated Backlog — Security & Compliance

| # | Item | Priority | Category | Source | Status |
|---|---|---|---|---|---|
| 17 | Replace single shared-secret admin authorization with per-admin accounts and role-based permissions | Critical/High | Security architecture | WS8 §4/§13 | Open — needs human security review |
| 18 | Server-side validation (and dedicated upload endpoint) for payment-proof files | Critical/High | Security/data-integrity | WS8 §6/§13 | Open — needs human security review |
| 19 | Fix broken staging environment (`tadweerah-staging.web.app` Clerk `origin_invalid`) | High | Environment/DevOps | WS2, WS8 §8/§13 | Open |
| 20 | Document a PDPL-aligned data-retention and data-subject-rights policy | High | Compliance | WS8 §5/§11/§13 | Open — needs legal validation |
| 21 | Confirm ZATCA e-invoicing (Fatoora) applicability before any invoicing-adjacent feature | High | Compliance | WS8 §7/§11/§13, CR-001 A6 | Open — needs legal validation |
| 22 | Legal enforceability review of Contract Lite / Deal Details as evidentiary documents | Medium | Compliance | WS8 §11 | Open — needs legal validation |

## 3. Consolidated Backlog — Governance & Data Model

| # | Item | Priority | Category | Source | Status |
|---|---|---|---|---|---|
| 23 | Extend the `is_system_field` protection pattern to deal/contract/payment labels | Medium | Governance | WS5-C §13, WS5-D/WS10 §7 | Open |
| 24 | Build future platform-fee/commission rate as admin-configurable master data from day one | High (pre-build) | Governance/data model | WS5-C §13, WS5-D/WS10 §4 | Open |
| 25 | Assemble the deal/offer/listing/transport/shipment state-machine reference into one standalone document | Medium | Documentation/governance | WS5-C §7/§13 | Open |
| 26 | Add minimal change-history/versioning (`last_changed_by`/`last_changed_at`) to admin-managed master-data tables | Medium | Governance | WS5-C Addendum §6, WS5-D/WS10 §7 | Open |
| 27 | Establish a living "governed terminology dictionary" document | Medium | Governance | WS5-C §10/§13, WS5-C Addendum §6 | Open — draft exists (`PHASE_0_DRAFT_RECONCILED_TERMINOLOGY_REGISTER.md`), unratified |
| 28 | Bilingual schema support for `companies.name`/`city` and `waste_listings.city` | Critical (structural) | Data model | WS5-B, WS5-D/WS10 §9 | Open |
| 29 | Consider upgrading the marketplace deal-reference format to a governed DB sequence (matching Contract Lite's `contract_sequences` pattern) | Medium | Data model | WS5-C §3, WS5-D/WS10 §9 | Open |
| 30 | Retire legacy `companies.type` field once its one remaining live dependency is rewritten against `company_roles` | Low | Technical debt | WS5-B §12 | Open |

---

## 4. Codex Technical Trace Review — COMPLETE AND RECONCILED

**Status: Complete.** Codex was activated externally by the founder (`docs/PHASE_0_CODEX_TECHNICAL_TRACE_REVIEW_PROMPT.md`) and returned 10 findings, reconciled 2026-07-03 (`PHASE_0_EXTERNAL_AI_REVIEW_RECONCILIATION_LOG.md`, Pass 3): 8 Accepted, 1 Merged, 1 Duplicate.

- **Question A (dispatch distinction):** resolved — items 9 above.
- **Question B (`PH0-OPEN-UNIT-LABEL-001`):** root cause identified across three code paths — items 12/12a/12b/12c above.
- **Question C (payment-proof mechanism):** mechanism confirmed — items 16/16a above.

This gate is cleared. WS9 remains in draft only because of §5 and §7 below, not because of Codex.

## 5. Founder Terminology Direction — RECORDED (2026-07-03)

**Status: Founder product terminology direction recorded — approved in principle. This is NOT regulatory, legal, MWAN, ZATCA, or accounting validation.**

Full detail: `docs/PHASE_0_EXTERNAL_AI_REVIEW_RECONCILIATION_LOG.md`, "Founder Terminology Direction — Ratification Record." Summary:

1. **Verified badge:** "Verified Company" / تم التحقق من الشركة — badge/status use only, never generic marketing language.
2. **Generator/Producer/Seller:** contextual model, not single-term standardization — Generator/مولّد النفايات (regulatory/onboarding), Seller/البائع (marketplace/transactional), "Producer" retired.
3. **Receiver/Processor/Buyer:** contextual model — Receiver/مستقبل النفايات (regulatory/onboarding), Buyer/المشتري (marketplace/transactional), Processor/Recycler/Factory remain capability/category terms only.
4. **Receive offers:** "Open for offers"/مفتوح لاستقبال العروض (listing status) vs. "Receive offers"/استقبال العروض (action/module) — safe decision, no validation flag.
5. **Payment Proof:** "Payment Proof"/إثبات السداد (not "Transfer Proof"); required state "Payment Proof (Required)"/إثبات السداد (مطلوب) — UX clarity only; payment/legal/accounting validation still required before real-money rollout.

Reference documents: `docs/PHASE_0_DRAFT_RECONCILED_TERMINOLOGY_REGISTER.md` (updated to reflect this direction) and `docs/PHASE_0_EXTERNAL_ANTIGRAVITY_FOUNDER_TERMINOLOGY_RATIFICATION_BRIEF.md` (Antigravity's advisory brief — superseded by the Founder's actual direction above where they differ, e.g. the contextual role model vs. Antigravity's single-term recommendation).

**Human/domain/legal validation still required for:** items 2-3 (Saudi B2B/domain validation before large external rollout) and item 5 (payment/legal/accounting validation before official invoices, tax language, or real-money rollout). Everything already standing from prior workstreams (MWAN/ZATCA/Contract-enforceability/commission-عمولة/Impact-Report-clarification) remains open per §6 below.

## 6. PENDING — Human/Domain/Legal Validation

**Status: Pending, multiple items.**

- **Saudi B2B/domain validation for the Generator/Seller and Receiver/Buyer contextual terminology models** (Founder-approved in principle, item 5 above) before large external rollout.
- **Payment/legal/accounting validation for "Payment Proof" wording** (Founder-approved in principle, item 5 above) before official invoices, tax language, or real-money rollout.
- MWAN/regulatory wording accuracy ("مولّد النفايات," "مستقبل النفايات," "Licensed Transporter" framing, e-Manifest references).
- Industrial-sector terminology (material category names).
- ZATCA/invoice/tax wording (standing rule: absent until validated, CR-001 A6).
- "Commission"/عمولة legal/commercial-law sensitivity (WS5-D/WS10 §0).
- PDPL data-handling posture (WS8 §5/§11).
- Legal enforceability of Contract Lite/Deal Details (WS8 §11).
- Whether "Payment Proof" wording could still imply platform liability for clearing funds in some framing — carried forward for the same legal/accounting validation pass as above, not resolved by any AI.

## 7. PENDING — Human Accountable Technical Owner Before Phase 1 Implementation

**Status: Pending. Not yet assigned.**

Per `docs/PHASE_0_AI_AUTHORITY_CEILING.md` §5: no AI tool may be the last checkpoint before any code ships. A named human accountable technical owner — responsible for code review/approval, deploy decisions, rollback/incident response, and security/compliance accountability — **must be assigned before Phase 1 implementation begins.** This is a gating condition on Phase 1, not a Phase 0 deliverable, and is carried here so it is not lost when WS9 feeds into WS11's decision pack.

---

## Mapping to Path 1 / Path 2

- **Path 1 (improve current platform):** Items 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18, 19, 28 are the clearest Path 1 candidates — fixes to what exists today.
- **Path 2 (separate prototype exploration):** The onboarding information-architecture redesign (item 11, deeper version), a from-scratch trust/compliance visual language, and any full homepage/app identity refresh remain Path 2 candidates per WS4-B §13, not required to resolve the Path 1 items above.

## Status and Next Steps

1. ~~Codex Technical Trace Review is activated externally per founder instruction (not by Claude Code).~~ **Done.**
2. ~~Claude Code reconciles Codex's output when returned.~~ **Done (Pass 3, 2026-07-03).**
3. ~~WS9 is updated with reconciled Codex findings.~~ **Done — see items 9, 12/12a/12b/12c, 16/16a above.**
4. ~~Founder Terminology Direction recorded.~~ **Done (2026-07-03) — see §5 above.**
5. **Current status: draft, Codex-reconciled, founder terminology direction recorded, pending human/domain/legal validation and Phase 1 human technical owner gate.** This is the final status for WS9 as a Phase 0 planning artifact — the remaining items (§6 human/domain/legal validation, §7 technical owner assignment) are Phase 1-adjacent gates that do not require further Phase 0 action to close WS9 itself.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules, CR-001, and the Multi-Agent Investigation & Review model. This is a draft skeleton, not a finalized backlog. No code/config/DB/admin/deploy/live actions occurred in its preparation. Codex and Antigravity were not run by Claude Code to produce this document.*
