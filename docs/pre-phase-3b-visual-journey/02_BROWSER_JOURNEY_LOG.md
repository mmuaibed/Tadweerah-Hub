# 02 Browser Journey Log

## Scope

- Mode: Discovery Mode
- Startup profile: `staging-readonly-uat`
- Date: 2026-06-28
- Approved output location: `docs/pre-phase-3b-visual-journey/`
- Browser/UAT profile: anonymous browser only
- Current approved browser target: `https://tadweerah.com`
- Approval basis: `docs/pre-phase-3b-visual-journey/03_URL_RESOLUTION.md`
- Target routes:
  - `/`
  - `/sustainability/allocations`
  - `/reports`
  - `/sustainability/allocations/:id` if visible through navigation
  - `/reports/sustainability/:id/print` if visible through navigation

## Constraints

- No source-code edits.
- No installs.
- No builds.
- No migrations or database writes.
- No local backend/frontend startup.
- No commits, pushes, or deploys.
- No login and no invented credentials.
- No `POST`, `PUT`, `PATCH`, or `DELETE` actions.
- No creating, editing, finalizing, correcting, approving, or submitting allocations/reports.
- No Clerk setting changes.
- No tokens or secrets printed.
- Screenshots and output written only under `docs/pre-phase-3b-visual-journey/`.

## Evidence Log

| Item | Evidence Type | Evidence | Status |
| --- | --- | --- | --- |
| TAOS profile loaded | Documentation evidence | `.ai/profiles/staging-readonly-uat.md` read before browser navigation | Complete |
| Original staging URL | Browser/Network evidence | `https://tadweerah-staging.web.app` rendered blank shell; Clerk rejected origin and allowed `tadweerah.com` | Blocked |
| URL resolution | Documentation evidence | `03_URL_RESOLUTION.md` identified `https://tadweerah.com` as strongest candidate, requiring owner approval | Complete |
| Custom-domain approval | Documentation evidence | User approved `https://tadweerah.com` as temporary read-only anonymous target | Complete |
| `/` custom-domain render | Browser evidence | `https://tadweerah.com/` rendered public Tadweerah landing page | Renders |
| `/sustainability/allocations` custom-domain attempt | Browser evidence | Direct navigation ended at `https://tadweerah.com/` and showed public landing page | Reached host, no active allocation journey |
| `/reports` custom-domain attempt | Browser evidence | Direct navigation ended at `https://tadweerah.com/` and showed public landing page | Reached host, no active report journey |
| Network request methods | Network evidence | Browser tool surface did not expose sanitized method/path capture; no warning/error logs captured on custom domain | Limited |

## Browser Journey

| Screen | Attempted URL | Final URL | Previous Screen | Visible Title/Headings | Labels/Statuses/Quantities | Actions | Screen Type | Next Possible Actions | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public home | `https://tadweerah.com/` | `https://tadweerah.com/` | Direct navigation to approved custom-domain target | Title: `Tadweerah`; headings: `من المصدر إلى المعالجة — مسار موثّق للمواد القابلة للتدوير`, `لماذا تدويرة؟`, `لمن هذه المنصة؟` | Labels: `تدويرة`, `Notifications (F8)`; statuses: none; quantities: no business quantities visible | `English`, `ابدأ الآن`, `تسجيل الدخول`, `ليس لديك حساب؟ أنشئ حساب شركتك الآن`; links: `الدعم`, logo `/` | Public landing page | Login/start actions visible, not clicked | `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-root.png` |
| Allocations route attempt | `https://tadweerah.com/sustainability/allocations` | `https://tadweerah.com/` | Public home | Same public landing page headings | No allocation labels, statuses, or quantities visible | Same public landing page actions | Redirect/fallback to public landing page; not allocation draft/approval/revision | Login/start actions visible, not clicked | `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-sustainability-allocations.png` |
| Reports route attempt | `https://tadweerah.com/reports` | `https://tadweerah.com/` | Allocations route attempt | Same public landing page headings | No report list statuses or quantities visible | Same public landing page actions | Redirect/fallback to public landing page; not report list/final report | Login/start actions visible, not clicked | `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-reports.png` |
| Prior default staging allocations route | `https://tadweerah-staging.web.app/sustainability/allocations` | `https://tadweerah-staging.web.app/sustainability/allocations` | Direct navigation to original approved staging target | Title: `Tadweerah`; no visible headings | No labels, statuses, or quantities visible | No visible buttons or links | Blank app shell | Blocked by Clerk origin/domain error | `docs/pre-phase-3b-visual-journey/screenshots/staging-sustainability-allocations.png` |
| Prior default staging reports route | `https://tadweerah-staging.web.app/reports` | `https://tadweerah-staging.web.app/reports` | Default staging allocations blank shell | Title: `Tadweerah`; no visible headings | No labels, statuses, or quantities visible | No visible buttons or links | Blank app shell | Blocked by Clerk origin/domain error | `docs/pre-phase-3b-visual-journey/screenshots/staging-reports.png` |

## Routes Not Browser-Reached

| Route | Evidence Type | Status | Reason |
| --- | --- | --- | --- |
| `/sustainability/allocations/:id` | Browser evidence | Not reached | No allocation list UI or visible allocation detail link was reachable anonymously. |
| `/reports/sustainability/:id/print` | Browser evidence | Not reached | No reports list UI or visible print/detail link was reachable anonymously. |

## Observed Facts

- `https://tadweerah.com/` renders the Tadweerah public landing page for an anonymous browser.
- The previous Clerk origin/domain blocker observed on `https://tadweerah-staging.web.app` did not appear on `https://tadweerah.com`.
- Anonymous direct navigation to `/sustainability/allocations` and `/reports` ended at `/`.
- No sustainability allocation list, allocation detail, report list, or print report UI was visible anonymously.
- Visible public actions include `ابدأ الآن`, `تسجيل الدخول`, and account creation text.
- No login was performed and no mutation-capable action was clicked.

## Inferred Risks

- Anonymous browser discovery is sufficient to verify the custom domain renders, but not sufficient for active sustainability allocation/report journey discovery.
- Allocation and report routes appear to require authentication or a role/session path before the real screens are visible.
- A named UAT account profile is likely required to continue Pre-Phase 3-B active path discovery.

## Open Questions

- Which named UAT account profile should be approved for sustainability allocation/report discovery?
- Which role should be used first for read-only journey discovery?
- Should `https://tadweerah.com` remain the approved target for the next signed-in UAT pass?

## Recommended Next Review

- Approve a named UAT account profile for read-only browser discovery on `https://tadweerah.com`.
- Continue to forbid create/edit/finalize/correction/approval/submit actions.
- Resume browser discovery only after UAT account profile approval.

## Forbidden Actions

- Do not implement fixes from this discovery report.
- Do not change Clerk configuration during discovery.
- Do not log in without an approved named UAT account profile.
- Do not classify redirected protected routes as active allocation/report journeys.
- Do not classify code-present routes as active without browser/current navigation evidence.

## Session Continuity

Files created or updated:
- `docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md`
- `docs/pre-phase-3b-visual-journey/04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-root.png`
- `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-sustainability-allocations.png`
- `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-reports.png`

Evidence collected:
- Documentation evidence from TAOS/profile files, `02_BROWSER_JOURNEY_LOG.md`, and `03_URL_RESOLUTION.md`.
- Browser evidence from approved custom-domain anonymous navigation to `/`, `/sustainability/allocations`, and `/reports`.
- Screenshot evidence for each custom-domain route attempt.
- Prior browser evidence from default Firebase staging URL blocker.

Unresolved blockers:
- Anonymous browser cannot reach allocation/report journey screens.
- No allocation/report detail IDs were discoverable through browser UI.
- Named UAT account profile is not approved and was not used.

Exact recommended next prompt:
- "Approve a named UAT account profile for `staging-readonly-uat` on `https://tadweerah.com` for Pre-Phase 3-B read-only browser discovery. Do not create, edit, finalize, correct, approve, or submit anything; stop before any mutation-capable action."
