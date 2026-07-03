# WS4-B — Visual & Partner Demo Readiness Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Method:** Visual re-inspection of existing WS2/WS3 screenshots plus synthesis of WS4-A, WS5-A, WS5-B findings and CR-001 Sponsor requirements. **No new live UI actions.** No mockups, no designs, no code/config changes, no DB access, no admin action, no commits, no deploys, no transport/shipment/receipt/completion action, no document deletion.

---

## 1. Executive Summary

Visually, Tadweerah is **further along than its functional bugs suggest.** The homepage is a genuinely modern, well-composed B2B SaaS marketing page — clean typography, a credible product mockup, sensible trust-signal iconography (Saudi platform / documented workflow / protected data). The in-app screens (dashboard, marketplace, deal flow) use a consistent, professional component system (cards, badges, tabs, confirmation modals) that does not look like a prototype. **The visual layer is not the primary risk to Sponsor's "impressive, enterprise-ready" goal — the functional and data-trust issues already documented in WS4-A are.** Where visuals *do* let the platform down, it's almost always because a functional/data issue surfaces visually (raw untranslated text, a dead-end button, a contradictory status message) rather than because the layout or component design itself looks unfinished.

## 2. Visual Maturity Assessment

- **Design system:** consistent card/badge/button styling across marketing site and app — same green/navy palette, same typographic scale, same icon language throughout every screen reviewed.
- **Componentry:** real, reusable patterns are visible (stat cards, status badges, tabbed detail panels, confirmation modals with consistent Cancel/Confirm placement) — this is evidence of an actual design system, not ad hoc screens.
- **Maturity verdict:** **mid-to-late MVP, not early prototype.** The visual foundation would support a partner demo today; the *content* shown during a live demo is the variable that needs managing (see §11, §15).

## 3. Homepage Readiness Assessment

**Ready for partner/regulator exposure as-is**, in both languages. Specifics observed directly (re-inspected screenshot, English version): clean top nav with clear CTAs ("Log in" / "Register," green pill button), a credible product-mockup graphic showing realistic in-app cards (material listings with status badges, a deal-status progress indicator with icons for Offer→Deal→Transport→Close, a sustainability bar chart), and a footer trust-signal strip (Saudi platform · Built for businesses · Documented workflow · Protected data · Documentation & sustainability reporting) with matching icons. The Arabic version mirrors this structure correctly (RTL layout, equivalent content). **This is the single strongest visual asset in the platform today** and aligns well with the Sponsor's "impressive, trusted" goal already.

## 4. Dashboard Readiness Assessment

**Structurally ready; content-dependent for full readiness.** Re-inspected screenshot confirms: a clean welcome header, a 5-card activity-summary row (deal value, completed deals, offers made/received, listings) with appropriate icons, a "start your first journey" CTA banner, two role-oriented action panels ("For producers" / "For buyers"), and a well-organized "Platform tools" grid (7 cards: listings, participations, reports, team, company info, contracts, sustainability data entry) each with icon + title + description + call-to-action link. This is a genuinely well-composed dashboard layout. **The only readiness gap is content, not layout:** the bilingual company-name/city bug (WS2/WS4-A) is the one thing on this exact screen that would visibly undercut trust in front of a bilingual audience.

## 5. Marketplace/Listing-Card Readiness

**Cards are informative and reasonably professional** — each shows material, reference number, status badge, transport-responsibility label, quantity, city, tagged location notes, post date, offer-window countdown, price, and seller name, with a clear "View Details" action. Aggregate stats header (listings available / cities / material types / with price hint) adds a marketplace-health signal a partner would find reassuring. **Readiness gap:** the free-text city field means a curated demo dataset is essential — any leftover typo-laden test data (like "dammmam") would read as unprofessional the moment a partner scrolls the marketplace. This is a **content-curation** risk, not a card-design risk.

## 6. Deal Details / Contract Lite Visual Trust Assessment

The deal page's tabbed structure (Listing Info / Received Offers / Deal Details / Payment Details / Print-Download) is clean and appropriately dense for a B2B trust document. The financial summary (subtotal, 15% VAT, total, settlement type, deal date) is presented clearly. **The visual design of this screen is not the problem — its content can be actively wrong** (the transport-responsibility contradiction, WS4-A §9) at exactly the moment a partner would be looking closely for trust signals. **Recommendation: do not judge this screen as demo-ready or not on looks alone — it must not be shown live with an in-progress deal until the underlying data bug is fixed or the demo deal is engineered to avoid triggering it (e.g., stop before the payment-confirmed stage).**

## 7. Payment and Transport Stage Visual Clarity

The payment-proof form (reference field + drag-and-drop file zone, clearly labeled accepted formats and size limit) looks clean and standard for this kind of B2B flow. The confirmation-modal pattern used for both offer-acceptance and payment-confirmation ("this cannot be undone," clear Cancel/Confirm buttons) is a **genuine trust-building UX pattern already present** and worth explicitly preserving in any future redesign. The transport stage itself has never been visually observed (deferred pending TDW-TRANS-001 resolution) — cannot be assessed.

## 8. Tabs, Icons, Layout, and Hierarchy Findings

- Icon usage is consistent and purposeful (not decorative-only) across dashboard tool cards, deal-status timeline, and marketplace stat headers.
- Tab navigation within the deal page is a sensible pattern for information density, though a partner unfamiliar with the platform might not immediately notice "Payment Details" appears only once relevant (a minor discoverability note, not a defect).
- Onboarding's numbered step indicator (1–4, with labels) gives clear progress feedback — a good hierarchy pattern already in place and worth keeping regardless of any future redesign path.
- No layout-breaking issues (overlapping elements, misaligned grids, broken RTL mirroring) were observed in any reviewed screenshot.

## 9. Screens Acceptable for MVP

- Homepage (both languages).
- Sign-up / sign-in.
- Dashboard layout/structure (content caveat per §4).
- Marketplace grid (content-curation caveat per §5).
- Onboarding wizard structure.
- Offer submission and acceptance flow, including confirmation modals.

## 10. Screens Acceptable for Internal Demo Only

- **Payment-proof submission screen** — fine to show internally with the team's awareness of the dead-end button, but not for an unassisted or high-stakes external run-through.
- **Company profile page showing a single test company's data** — fine internally where the audience already knows it's test data; not for a scenario where a large-company/regulatory viewer would notice the bilingual gap.
- **Deal Details page mid-lifecycle** — fine to walk through internally with narration explaining the known transport-responsibility issue; not fine to let a partner click through unsupervised.

## 11. Screens Not Recommended for Al Qaryan / Large-Company / Regulatory Demo Before Improvement

- Deal Details page **once a deal reaches payment-confirmed and transport becomes visible** — the contradictory responsibility message is a real risk in front of a sophisticated audience.
- Payment-proof submission, if the audience is expected to interact live rather than watch a guided walkthrough.
- Any screen displaying a company's name/city in a language other than how it was entered, if the audience includes a bilingual reviewer likely to notice.
- Onboarding's license/compliance step, if a live self-signup is attempted rather than a pre-approved demo account.
- Print/export output — unknown quality; do not show until manually reviewed by a human (WS3-A2, still open).

## 12. Light-Polish Opportunities on the Current Platform

- Fix the two live-tested dead-ends (payment-proof button, transport-responsibility bug) — small, well-scoped engineering fixes already traced in WS5-A.
- Surface specific error reasons instead of generic fallbacks — a copy/logic change, not a redesign.
- Curate/clean demo data (fix or replace the "dammmam"-style test records) before any partner-facing session.
- Fix the recurring "1 kg"-in-English-inside-Arabic unit-label artifact — trivial, high-visibility polish item.
- Add a brief onboarding explainer for the roles/activities/license relationship — copy-only, no redesign needed.

## 13. Deeper Redesign Opportunities for Later Path 2 Prototype

- A true bilingual data model (separate ar/en fields) is a **schema-level** change, not a light-polish item — appropriate to plan for a Path 2 exploration or a scheduled Path 1 backend milestone, not a quick fix.
- Consolidating the four-concept role/activity/type/capability model (WS5-B) into a single, more legible mental model for users is a genuine information-architecture redesign question, best explored deliberately rather than patched incrementally.
- A dedicated "trust/compliance" visual language (e.g., a persistent verification/audit-trail indicator on company and deal screens) would directly serve the Sponsor's "regulatory confidence" goal and is more of a design *addition* than a fix.

## 14. What Must Not Be Redesigned Before Source-of-Truth Fixes

- **Deal Details / transport UI** — redesigning this screen's visuals before the `transport_responsibility` propagation bug (TDW-TRANS-001) is fixed would risk baking a prettier version of the same wrong information into a new design.
- **Payment-proof form** — redesigning it before deciding whether the file is truly required or truly optional would repeat the same label-vs-behavior mismatch in a new visual shell.
- **Company profile/dashboard bilingual display** — any visual redesign of these screens should wait for the schema-level bilingual fix, or it will simply re-skin the same raw-text problem.

## 15. Partner-Demo Show / Fix-First / Do-Not-Show Matrix

| Screen | Show as-is | Fix-first | Do not show |
|---|---|---|---|
| Homepage (AR/EN) | ✓ | | |
| Sign-up/Sign-in | ✓ | | |
| Onboarding (guided, pre-approved account) | ✓ | | |
| Onboarding (live self-signup) | | | ✓ (approval-wall surprise risk) |
| Dashboard (same-language company data) | ✓ | | |
| Dashboard (cross-language company data) | | | ✓ (bilingual bug visible) |
| Marketplace grid (curated data) | ✓ | | |
| Marketplace grid (uncurated test data) | | ✓ (clean data first) | |
| Listing creation | ✓ | | |
| Offer submission/acceptance | ✓ | | |
| Payment-proof submission (guided/narrated) | ✓ | | |
| Payment-proof submission (unassisted) | | ✓ | |
| Deal Details pre-payment | ✓ | | |
| Deal Details post-payment-confirmation (transport visible) | | | ✓ (until TDW-TRANS-001 fixed) |
| Print/export output | | | ✓ (unreviewed) |

## 16. Mapping to Workstreams

| Finding | WS4 | WS5 | WS9 | WS10 | WS11 |
|---|---|---|---|---|---|
| Homepage/dashboard/marketplace visual maturity (positive finding) | ✓ primary | — | — | — | ✓ (Path 1 asset to preserve) |
| Confirmation-modal pattern (positive finding) | ✓ primary | — | ✓ (keep in any redesign) | — | ✓ |
| Demo-data curation need | ✓ | — | ✓ | — | — |
| Bilingual schema fix as prerequisite to redesign | ✓ | ✓ | ✓ | — | ✓ (Path 2 comparison criterion) |
| Transport/payment fixes as prerequisite to redesign | ✓ | ✓ | ✓ | — | — |
| Four-concept model IA redesign candidate | ✓ | ✓ | — | — | ✓ (Path 2 candidate) |
| Trust/compliance visual language (new capability) | — | — | ✓ | — | ✓ primary (Path 2 candidate) |

## 17. Recommendations

1. **Proceed next to WS5-C.** Nothing found in WS4-B blocks it — the visual layer is largely sound, and WS5-C's remaining source-of-truth work does not depend on visual/demo-readiness conclusions.
2. **Buyer-responsibility transport exception timing:** consistent with WS4-A's recommendation — prepare/hold, and if executed, do so alongside or after WS4-B/WS5-C rather than before, so the newly-observed transport/receipt screens can be captured with WS4-quality visual review at the same time, rather than needing a second pass later.
3. **WS8 should remain after WS4-B**, unchanged — this review found no new security-relevant visual finding that would argue for resequencing.

---

# WS4-B Closure Decision

**Date:** 2026-07-03
**Founder decision:** Close WS4-B as completed ahead of baseline.

**Status: Completed ahead of baseline.**

**Accepted conclusions:**
1. The current visual/design layer is more mature than earlier findings may suggest.
2. Homepage, dashboard, cards, badges, and confirmation modals are broadly partner-presentable at the visual layer.
3. The major risk is not broad visual immaturity, but specific data/functional/terminology defects surfacing through an otherwise solid interface.
4. Current visual refresh or redesign must not proceed before source-of-truth fixes, otherwise it may simply re-skin incorrect data or unclear governance.
5. Screens/areas flagged as do-not-redesign-before-fix are carried forward to WS5-C, WS5-D/WS10, and WS9.
6. Buyer-responsibility transport exception remains plan-only and not executed.

**WS4-B is now closed on this basis.** Per standing instruction, it will not be reopened unless new evidence contradicts what's documented here.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This document is visual review of existing screenshots plus synthesis of prior findings. No new live UI actions, no mockups, no designs, no code/config changes, no DB access, no admin action, no commits, no deploys, no transport/shipment/receipt/completion action, no document deletion.*
