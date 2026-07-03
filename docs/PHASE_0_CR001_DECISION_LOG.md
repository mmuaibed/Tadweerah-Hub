# CR-001 — Sponsor Expanded Requirements and PMO Amendments

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit)
**Record type:** Formal decision-log entry.

**Status: Approved with amendments.**

---

## A. Sponsor Expanded Requirements Summary

The Sponsor wants Tadweerah to become a highly trusted, impressive, bilingual, governed, intelligent, and enterprise-ready platform for large companies and regulatory stakeholders, while remaining lean, cost-conscious, and avoiding premature full rebuild.

**Key Sponsor priorities:**

1. Unify Arabic and English terminology across routes, pages, reports, tabs, fields, buttons, statuses, Deal Details, payment, transport, onboarding, dashboard, and marketplace.
2. Review whether Arabic terms fit the Saudi market and whether English terms fit comparable B2B marketplace / recycling / circular economy platforms.
3. Review whether field labels and business terms come from DB, i18n, hardcoded UI text, backend enums, or admin-configurable sources.
4. Evaluate whether some labels/master data should be admin-configurable to reduce programming intervention, while preserving governance and report stability.
5. Review page layout, tabs, icons, homepage, dashboard, marketplace cards, and overall UI/UX.
6. Add future option notes for visual redesign / identity refresh / separate lightweight prototype, but not actual designs in Phase 0.
7. Review reports, Deal Details, Contract Lite, trust outputs, payment requests, platform fees, and regulatory confidence.
8. Future billing direction:
   - Marketplace/deal flow: Tadweerah platform commission = 2.5%.
   - Buyer offer/bid amount should clearly state it excludes Tadweerah platform commission.
   - Tadweerah platform fee should be separate from seller-buyer transaction.
   - Contract flow proposed fee = 10 SAR/ton, not final, should be configurable later.
   - Avoid invoice/tax invoice terminology until legal/ZATCA status is confirmed.
9. End of Phase 0 should update authoritative documents and reduce confusion/file sprawl by marking/archiving superseded files, not deleting.
10. WS11 should include two next-phase paths:
    - Path 1: improve current platform.
    - Path 2: separate lightweight redesign/prototype exploration for comparison only.
11. Add expert AI/technical recommendations for reaching a strong, governed, trusted MVP with reasonable time and effort.

## B. PMO Decision

**Approved with amendments.**

## C. PMO Amendments

**A1 — Recover journey completeness via a controlled buyer-responsibility transport path.**
- Seller-responsibility transport remains deferred due to confirmed defect **TDW-TRANS-001** (the transport-responsibility propagation bug identified in `PHASE_0_WS3_TRANSPORT_RESPONSIBILITY_CONSISTENCY_REVIEW.md`).
- One additional controlled transport test using explicit buyer responsibility is **approved in principle** as a WS3 evidence exception.
- **Do not execute it yet.** Prepare a separate plan and require Founder approval before execution.

**A2 — Re-baseline the timeline.**
- Revised realistic duration: **8–12 working days.**
- Escalation trigger: **15 working days.**
- Result-based completion still governs.

**A3 — Hold read-only line on design and fee-document work.**
- Phase 0 may produce option notes and requirements.
- Phase 0 must not produce mockups, layouts, actual document designs, or fee-document designs.
- Design work belongs to Phase 0B or the separate prototype track.

**A4 — Documentation cleanup means mark and archive, never delete.**
- Do not delete documents during Phase 0.
- Mark superseded files and archive them clearly.
- Actual deletion requires explicit Sponsor approval later, outside Phase 0.

**A5 — Terminology market-fit requires human/market validation.**
- AI can produce internal consistency review and first-pass recommendations.
- Saudi regulatory, MWAN, industrial-sector, ZATCA-adjacent, and market terminology must be flagged for human validation.
- Every terminology recommendation must carry a confidence tag.
- "Externally validated" can only be assigned by human/market review.

**A6 — Invoice/tax caution.**
- Do not use invoice/tax invoice language for Tadweerah documents unless legal/ZATCA status is confirmed.
- Prefer "payment request," "platform fee request," or "fee statement" for now.
- Invoice/tax language is compliance-sensitive and should be mapped to WS8/compliance register.

**A7 — Milestone-based timeline split.**
The revised timeline must be split into explicit deliverable milestones so the Sponsor can track:
- When current-platform findings are completed.
- When the current-platform improvement plan is completed.
- When proposed new-version requirements are completed.
- When the final two-path decision pack is completed.

## D. Updated Sequence

1. WS4-A Expanded
2. WS4-B
3. WS5-C
4. WS5-D / WS10
5. WS8
6. WS9
7. WS11

## E. Read-Only Boundary

**Phase 0 produces:**
- Evidence
- Findings
- Requirements
- Option notes
- Backlog items
- Decision packs
- Milestone tracking

**Phase 0 does not produce:**
- Code fixes
- Config changes
- DB changes
- Deployments
- Document deletions
- UI designs/mockups
- Fee document designs
- Tax invoice artifacts

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This is a governance/decision-log record. No code/config/DB/admin/deploy/design/deletion actions occurred in the preparation of this document.*
