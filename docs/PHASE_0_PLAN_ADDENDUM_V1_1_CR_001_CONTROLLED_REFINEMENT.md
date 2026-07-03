# Phase 0 Plan Addendum v1.1 — CR-001 Controlled Refinement

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit)
**Status:** Approved with amendments (CR-001).

**This addendum extends the original Phase 0 charter (`CLAUDE.md`, at the repo root). It does not replace it. All original Phase 0 rules — read-only scope, evidence-backed findings, no code/DB/admin/deploy actions without explicit approval, secrets never printed, outputs practical for a non-technical founder — remain in full force. This document layers the Sponsor's expanded requirements and the PMO's approved amendments on top of that unchanged foundation.**

---

## 1. Why This Addendum Exists

The Sponsor expanded the requirements for what Phase 0 should ultimately produce — moving beyond a pure technical audit toward a governed path to an enterprise-trusted, bilingual, regulator-ready platform. The PMO reviewed this expansion and approved it **with amendments** that keep Phase 0 strictly read-only while broadening its analytical scope. This addendum records that full direction in one place.

## 2. Sponsor Expanded Requirements (Full Text)

The Sponsor wants Tadweerah to become a highly trusted, impressive, bilingual, governed, intelligent, and enterprise-ready platform for large companies and regulatory stakeholders, while remaining lean, cost-conscious, and avoiding premature full rebuild.

**Key Sponsor priorities:**

1. Unify Arabic and English terminology across routes, pages, reports, tabs, fields, buttons, statuses, Deal Details, payment, transport, onboarding, dashboard, and marketplace.
2. Review whether Arabic terms fit the Saudi market and whether English terms fit comparable B2B marketplace / recycling / circular economy platforms.
3. Review whether field labels and business terms come from DB, i18n, hardcoded UI text, backend enums, or admin-configurable sources.
4. Evaluate whether some labels/master data should be admin-configurable to reduce programming intervention, while preserving governance and report stability.
5. Review page layout, tabs, icons, homepage, dashboard, marketplace cards, and overall UI/UX.
6. Add future option notes for visual redesign / identity refresh / separate lightweight prototype, but not actual designs in Phase 0.
7. Review reports, Deal Details, Contract Lite, trust outputs, payment requests, platform fees, and regulatory confidence.
8. Future billing direction: 2.5% platform commission on marketplace/deal flow (buyer offer amount must clearly state it excludes commission); platform fee kept separate from the seller-buyer transaction; Contract flow proposed fee of 10 SAR/ton (not final, should be configurable later); avoid invoice/tax invoice terminology until legal/ZATCA status is confirmed.
9. End of Phase 0 should update authoritative documents and reduce confusion/file sprawl by marking/archiving superseded files, not deleting.
10. WS11 should include two next-phase paths: Path 1 (improve current platform) and Path 2 (separate lightweight redesign/prototype exploration for comparison only).
11. Add expert AI/technical recommendations for reaching a strong, governed, trusted MVP with reasonable time and effort.

## 3. PMO Decision and Amendments

**Decision: Approved with amendments.** Full detail recorded in `docs/PHASE_0_CR001_DECISION_LOG.md` — summarized here:

| # | Amendment | One-line summary |
|---|---|---|
| A1 | Buyer-responsibility transport exception | Approved in principle; plan-only for now; Founder approval required before execution |
| A2 | Re-baselined timeline | 8–12 working days, 15-day escalation trigger |
| A3 | Design/fee-document hold | Option notes and requirements only — no mockups, layouts, or fee-document designs in Phase 0 |
| A4 | Documentation cleanup | Mark and archive superseded files; never delete during Phase 0 |
| A5 | Terminology market-fit | Requires human/market validation; every recommendation carries a confidence tag |
| A6 | Invoice/tax caution | Use "payment request"/"platform fee request"/"fee statement" until ZATCA status confirmed |
| A7 | Milestone-based timeline | Split into explicit, trackable deliverable milestones |

## 4. Updated Workstream Sequence

WS4-A Expanded → WS4-B → WS5-C → WS5-D / WS10 → WS8 → WS9 → WS11

## 5. Read-Only Boundary (Unchanged in Spirit, Restated for This Phase)

**Produces:** evidence, findings, requirements, option notes, backlog items, decision packs, milestone tracking.
**Does not produce:** code fixes, config changes, DB changes, deployments, document deletions, UI designs/mockups, fee document designs, tax invoice artifacts.

## 6. Relationship to Other Governance Documents

- **`CLAUDE.md`** (repo root) — the original, unchanged Phase 0 charter. This addendum sits on top of it.
- **`docs/PHASE_0_CR001_DECISION_LOG.md`** — the formal decision-log entry this addendum summarizes.
- **`docs/PHASE_0_CR001_EXECUTION_STATUS_AHEAD_OF_BASELINE.md`** — informational note on pacing against the re-baselined timeline.
- **`docs/PHASE_0_MILESTONE_AND_PERFORMANCE_TRACKER.md`** — the single source of truth for milestone/performance reporting going forward.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This addendum extends, and does not replace, the original Phase 0 charter. No code/config/DB/admin/deploy/design/deletion actions occurred in the preparation of this document.*
