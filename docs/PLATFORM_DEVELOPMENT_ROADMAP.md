# Tadweerah Platform Development Roadmap

> Last updated: 2026-06-27 | Post SIR-2D Closure

## Platform Governance Principles
**Lesson Learned from SIR-2D:**
- Adding a new helper function is not enough unless all live endpoints are explicitly refactored to use it.
- Do not create parallel old/new logic paths.
- Display, save, finalize, and admin correction flows must share canonical resolvers/state models.
- Avoid fallback patches that hide the root cause.
- Future work should identify and remove duplicate resolvers, temporary logic, legacy paths, and conflicting old/new flows.

## Priority 1 — Customer-Impact Stabilization
**Goal:** *Will this affect the customer’s confidence or decision to use Tadweerah?*
**Scope:**
- Review customer-visible marketplace/deal/contract/shipment/report flows.
- Ensure states are clear and consistent.
- Remove customer-facing technical artifacts such as raw UUIDs.
- Verify customer can complete key workflows without Tadweerah/dev intervention.
- Ensure Arabic/English UI is clean where customers see it.

## Priority 2 — Customer Reports & Trust Outputs
**Scope:**
- Sustainability report polish from the customer perspective.
- Keep claims conservative: no CO₂e/certified/verified claims unless formally implemented.
- Show operation reference/material/quantity/pathways/dates clearly.
- Preserve Tadweerah branding.
- Document what is in SIR-3B/SIR-2D and what remains future.

## Priority 3 — Correction & Governed Flexibility
**Scope:**
- Correction drafts.
- Reopen requests.
- Draft/finalized/superseded lifecycle.
- Audit trail and reason requirements.
- No direct mutation of finalized records.
- One canonical resolver/state model.

## Priority 4 — Admin Phase 2 — Operations Console & Reporting Governance
**Scope:**
- Safe Admin report viewing.
- Deep links/source navigation across Admin tabs.
- Full operational reporting model.
- Complete analytical exports.
- Delayed/stuck operations dashboard.
- Governed admin actions such as reopen/rollback/force-complete/mark-reviewed.
- Admin permission levels.
- Short-lived admin viewing token/cookie or formal Clerk admin role.
- Cross-tenant report access regression tests.
- Audit log hardening.

## Priority 5 — Platform Cleanup Audit
**Scope:**
- Identify temporary files/scripts/fallback logic.
- Detect duplicate old/new paths.
- Detect duplicate resolvers.
- Identify stale UAT/test/orphan records.
- Recommend cleanup order without risky data mutation.
