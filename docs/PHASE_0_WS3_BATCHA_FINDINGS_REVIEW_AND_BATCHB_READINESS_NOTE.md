# WS3 Batch A Findings Review & Batch B Readiness Note

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only-Except-As-Approved Platform Audit)
**Nature of this document: review and analysis only. Not an execution plan. Batch B has not started and this document does not authorize it.**

---

## 1. What Batch A Proved

- **The core non-admin marketplace loop is real and works end-to-end**, not just in code: a company can list material, another company can browse and offer, the seller can accept, and a deal is formed automatically — all confirmed live, not inferred from WS1's static code reading.
- **The admin-approval gate for listing creation is genuinely enforced server-side**, not just a UI restriction — confirmed via the exact `403 CompanyIncomplete` → `403 CompanyPending` → `201` progression, matching WS1's `requireCompany.ts` code mapping precisely.
- **Cross-language content display is not uniformly broken** — listing/offer content (material, city, tagged notes) rendered correctly regardless of viewer language; the bilingual bug is now known to be scoped to company-profile fields (name/city on the dashboard, and now also on the deal page), not the whole platform.
- **VAT (15%) is calculated and applied live** on offer amounts — first real confirmation this logic runs in production, not just in a schema field.
- **Deal formation is immediate and automatic** on offer acceptance — no separate admin step, no delay, matching the WS1 code-level expectation.
- **Transport is explicitly and correctly gated behind payment confirmation** in the live UI, matching the code-level state ordering found in WS1.
- **The manual-handoff authentication method is a workable, repeatable Phase 0 methodology** — proven now across two separate accounts, with zero credential exposure.

## 2. What Remains Unknown

- Why `buyer_is_verified` changed from `false` to `true` between offer creation and acceptance, with no observed admin action.
- Whether the seller-must-be-approved / buyer-can-act-unverified asymmetry is intentional platform design or a gap.
- What the **payment proof** screen actually requires (a reference number? a file upload? a specific format?) — untested.
- What the **transport/shipment** step's actual UI and requirements look like, and whether it requires a dedicated Transporter account or can be self-served by Generator/Receiver.
- What the **receipt/completion** step looks like, and whether the timer/auto-block behaviors described in WS1's document review (48h receipt window, buyer auto-block after 2 failed receipts) are real in the live product.
- What the "7 items remaining to complete the electronic manifest" reference actually entails — not opened.
- Whether the deal reference format `TDW-2026-9F6688` is the same object family as the `TDW-CTR-####-####` format seen in WS1's document review, or a genuinely different subsystem (marketplace deals vs. Contract Lite).
- Whether an admin's view of this same deal shows consistent data with what Generator/Receiver see (echoing WS1's "40/35/5" cross-screen consistency concern, now for a different record type) — not checked, since admin is out of scope.

## 3. Findings Mapping to WS4 (UI/UX)

- Generic, non-actionable publish-failure error message — never told the user the real reason (`CompanyIncomplete`/`CompanyPending`) or what to do about it.
- Onboarding gives no advance warning that marketplace activity will be blocked pending admin approval — discovered only via a failed action.
- Dashboard bilingual company-data display bug (unchanged from WS2, reproduced on both accounts).
- Minor bilingual-mixing artifact: unit label "1 kg" rendered in English inside an otherwise fully-Arabic deal page.
- No dedicated listing title field — relies on an auto-generated material+quantity title, which may limit differentiation between similar listings from the same seller.

## 4. Findings Mapping to WS5 (Source-of-Truth)

- `sale_type` stored as `"auction"` in the API/database while the UI always says "استقبال عروض" / "receive offers" — a real code-vs-product-language mismatch.
- `buyer_is_verified` inconsistency across the offer lifecycle (false at creation, true at acceptance) — needs a schema/business-logic trace to explain.
- Deal reference format `TDW-2026-9F6688` needs reconciling against the `TDW-CTR-####-####` pattern documented elsewhere.
- `material_category_name_ar`/`material_category_name_en` both returned `null` in the listing API response despite a category having been actively selected — worth checking whether this is a join/serialization gap.
- Company `roles` array showed only `["generator"]` (singular) despite the onboarding UI presenting role selection as a multi-select checkbox group — worth reconciling which is authoritative.
- Full, real field schemas for company/listing/offer/deal records are now documented as evidence (in the Batch A log) — usable as a head start for any later formal DB schema mapping pass.

## 5. Findings Mapping to WS8 (Authorization/Security-Readiness)

- The `buyer_is_verified` flip and the broader verification-state ambiguity is the primary item here — it sits alongside WS1's earlier finding that platform "admin" authorization is itself split between a frontend email-allowlist and a backend shared-secret key with no per-user identity. Together, these form a pattern worth a dedicated authorization-model review: **multiple, independently-observed inconsistencies in how "who is allowed to do what" is determined and displayed**, none individually catastrophic, but collectively suggesting the authorization model deserves a systematic pass rather than piecemeal fixes.
- The seller-approval/buyer-no-approval asymmetry (§2) is a second, related item for the same review — is a company able to transact (offer, and implicitly later pay/receive) before any approval check, while only listing/selling requires it? If so, is that a deliberate risk-based design choice or an oversight?

## 6. WS9 V2 Backlog Candidates

- Communicate the admin-approval requirement clearly during/after onboarding, before a user discovers it via a failed action.
- Surface real, actionable error reasons to end users instead of generic "check your data" messages.
- Reconcile the role-selection UX (multi-select checkboxes) with the actual stored `roles` data model (currently observed as effectively singular) — either fix the storage or fix the UI's implied promise.
- Address the underlying bilingual company-data storage/display gap (store per-language fields, or clearly label the entry language, rather than showing raw as-typed text regardless of viewer language).
- Align internal terminology (`sale_type: "auction"`) with product-facing language ("receive offers") to reduce confusion for future engineers and any data analysis work.
- Revisit whether the MWAN/license requirement should really apply to Generator-only companies, and if so, communicate it as effectively-required (not "optional") at onboarding time.

## 7. Risks Before Batch B

- **Payment proof mechanics are completely untested** — unknown what data/file it requires, and whether submitting even fake "proof" triggers real side effects (notification emails, audit-log entries, visible admin queue items).
- **Transport/shipment may require a Transporter account** — this audit is explicitly not authorized to create one without separate approval, so Batch B could stall mid-step exactly as Batch A did at the compliance gate, requiring another founder decision point.
- **Receipt/completion behavior (timers, auto-block logic) is undocumented in live behavior** — testing it may take real time to observe (e.g., waiting out a 48-hour window) or may require deliberately triggering an edge case (like a "failed receipt") that wasn't scoped or approved.
- **Verification-state ambiguity (§2, §5) could resurface** in more consequential ways once payment/transport actions are gated by role or verification checks — worth resolving conceptually before relying on this account's "verified" status for further testing.
- **Increasing "blast radius" of test data** — each further stage (payment, transport, receipt) plausibly creates more real-looking records (notifications, manifest entries, audit logs) that will eventually need cleanup, consistent with the founder's end-of-Phase-0 evidence-cleanup intent.

## 8. Recommended Scope for Batch B, If Founder Later Approves

A staged approach, mirroring what worked well in Batch A:

1. **Batch B-1 (smallest, lowest-risk): payment proof submission only** — Receiver submits proof, Generator confirms, capture the resulting deal-state transition. Stop immediately after payment is confirmed, before transport.
2. **Checkpoint:** review whether payment proof mechanics raised anything unexpected (real-looking data, unclear required fields, side effects) before continuing.
3. **Batch B-2: transport/shipment**, only after confirming whether it needs a dedicated Transporter account — if so, that becomes its own founder-approval decision point (creating `[PHASE0-AUDIT] Transporter Co`) before proceeding further, not something to decide unilaterally mid-batch.
4. **Batch B-3: receipt/completion**, as a final, separate small batch once B-1 and B-2 are understood.
5. Each sub-batch gets its own evidence log and checkpoint report, exactly like Batch A — no continuous, unsupervised run through all of Batch B at once.

## 9. Explicit Statement

**Batch B has not started.** No payment proof, transport/shipment, or receipt/completion action has been attempted, requested, or prepared beyond this written analysis. No admin action, database access, code edit, commit, or deploy occurred in the preparation of this document. This is a review artifact only — waiting for founder decision on whether, when, and in what scope to proceed.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This document is analysis of already-completed WS3 Batch A evidence — no new browser actions, no new accounts, no code/DB/Clerk changes were performed to produce it.*
