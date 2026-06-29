# Pre-Phase 3-B Partner Review Package

## 1. Purpose of Pre-Phase 3-B

Pre-Phase 3-B was a visual journey discovery pass for Tadweerah's sustainability and reporting experience.

The goal was to verify what users can actually reach in the browser before starting Phase 3-B implementation or source-of-truth work. This phase did not fix behavior, change data, deploy code, or approve any implementation direction.

The review focused on:

- Which sustainability and report paths are active in the current browser experience.
- Which paths are blocked, empty, or unconfirmed.
- Where quantity terminology may confuse received quantities with allocated, distributed, or approved quantities.
- What Phase 3-B should investigate next.

## 2. What Was Tested

Discovery covered the approved Tadweerah browser target:

- `https://tadweerah.com`

The evidence was collected through read-only browser navigation and supporting discovery notes. No mutation-capable actions were performed.

Tested areas included:

- Anonymous access to the public site and protected sustainability/report routes.
- Seller/producer dashboard entry points.
- Buyer/processor/recycler sustainability allocations and reports.
- Admin reporting and sustainability governance visibility.
- Visual routes related to allocation drafts, approved reports, and sustainability report access.

## 3. Personas Covered

| Persona | What Was Reached | Summary |
|---|---|---|
| Anonymous | Public landing page | The app rendered on the custom domain, but protected sustainability/report routes were not active anonymously. |
| Seller/Producer | Dashboard, reports, sustainability allocation entry | Seller/producer can see reports and sustainability entry points, but the sustainability allocation list was empty for the tested account. |
| Buyer/Processor/Recycler | Dashboard, allocation list, allocation details, reports | Buyer/processor/recycler had the clearest active sustainability journey, including allocation detail screens. |
| Admin | Admin panel, admin reports, sustainability records | Admin could see sustainability governance/reporting records, including versioned approved rows. |

## 4. Current Visual Journey Summary

The current active sustainability journey is strongest for the buyer/processor/recycler role.

The buyer/processor/recycler dashboard leads to sustainability allocations, where allocation rows and detail screens are visible. One approved allocation detail showed a complete visual summary: received quantity, distributed quantity, remaining quantity, percentage, and approved status.

The seller/producer journey confirms that reports and sustainability entry points exist, but the tested seller/producer account did not have eligible received materials ready for sustainability data entry.

The admin journey confirms that sustainability records are visible from the admin reports area, including approved and replaced versions. Admin actions such as reopening or report viewing were not clicked because they were either mutation-risk or not fully confirmed as safe read-only navigation.

The anonymous journey confirms that the public app renders, but sustainability and reports are not active anonymously.

## 5. Confirmed Active Paths

Browser-confirmed active paths include:

- `/`
- `/dashboard`
- `/reports`
- `/sustainability/allocations`
- `/sustainability/allocations/:id`
- `/admin`
- Admin reports sustainability tab within `/admin`

These paths are active only in the persona contexts where they were reached through browser navigation.

## 6. Blocked or Unconfirmed Paths

Blocked or unconfirmed paths include:

- `https://tadweerah-staging.web.app`: blocked by current Clerk/domain rendering behavior during discovery.
- Anonymous `/reports`: redirected or returned to public experience.
- Anonymous `/sustainability/allocations`: redirected or returned to public experience.
- `/reports/sustainability/:id/print`: not browser-confirmed during this phase.
- Sustainability report detail pages opened through `عرض التقرير`: visible in reports, but not clicked during this phase.
- Admin sustainability detail actions: visible, but not opened in this phase.
- Admin correction/revision details: not confirmed as a safe read-only journey.

No route should be called obsolete based on this evidence alone.

## 7. The 40 / 35 / 5 Observation

The most important quantity observation came from the buyer/processor/recycler journey.

Buyer/processor allocation detail for `TDW-CTR-2026-0006-S010` showed:

- `40 طن` received.
- `35 طن` distributed.
- `5 طن` remaining.
- `87.5%`.
- Status `معتمد`.

Admin sustainability records showed the same reference:

- `TDW-CTR-2026-0006-S010`.
- `40 طن`.
- Status `معتمد`.
- Version `2`.

This does not prove a defect by itself. It does show that Phase 3-B must carefully verify whether reports display received quantity, distributed quantity, approved allocation quantity, or another source value.

## 8. Why This Matters

This matters because sustainability reporting is likely to be reviewed by partners, buyers, operators, or compliance stakeholders.

If one screen emphasizes `40 طن` received while another business context expects `35 طن` distributed or approved, users may misunderstand what the report represents. The risk is not only text wording. It may be a data-source and source-of-truth question.

That makes this a Phase 3-B audit item, not a quick label change.

## 9. What Is Not Fixed Yet

Nothing was fixed during Pre-Phase 3-B.

The following remain unresolved:

- No source-code changes were made.
- No database values were changed.
- No report source-of-truth decision was made.
- No implementation fix was approved.
- The report detail or print route was not confirmed in a controlled read-only flow.
- Admin correction/revision flows were not safely confirmed.
- Quantity semantics still need Phase 3-B review.

## 10. What Phase 3-B Should Investigate

Phase 3-B should investigate:

- Which backend fields drive received, distributed, remaining, and approved quantities.
- Whether sustainability reports should show received quantity, allocated quantity, approved quantity, or multiple values.
- Whether `/reports/sustainability/:id/print` is active and read-only.
- Whether `عرض التقرير` is safe read-only navigation in each role.
- Whether admin `تفاصيل` and correction/revision flows can be reviewed safely.
- Whether visible terminology is consistent across seller, buyer, admin, and report screens.
- Whether the `40 / 35 / 5` case is expected behavior or a source-reading risk.

## 11. Visual Diagrams Summary

The visual diagrams are maintained in:

- `08A_VISUAL_DIAGRAMS.md`

They include:

- Persona Journey Map.
- Active Route Map.
- Sustainability Allocation Flow.
- Reports Flow.
- `40 / 35 / 5` Evidence Map.
- Terminology Flow Diagram.

The Mermaid Markdown diagrams are the editable source of truth. Static exports may be created later, but should not replace the Markdown diagrams.

## 12. Decision Points for Founders

Recommended founder/partner decisions:

- Confirm whether Pre-Phase 3-B evidence is sufficient to close discovery.
- Approve a separate documentation-link task to reference these findings from `PROJECT_MAP.md`.
- Confirm Phase 3-B scope around sustainability report source-of-truth.
- Decide whether report detail/print routes need controlled read-only UAT before implementation.
- Decide whether admin correction/revision visibility needs a separate safe discovery pass.
- Treat the `40 / 35 / 5` case as a Phase 3-B investigation item, not an approved fix.

## Review Boundary

This package is for executive review and planning only.

It does not approve implementation, data changes, deployment, report logic changes, or correction-flow changes.
