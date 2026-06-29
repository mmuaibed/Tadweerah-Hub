# 04 Custom Domain Browser Discovery

## Scope

- Mode: Discovery Mode
- Date: 2026-06-28
- Startup profile: `staging-readonly-uat`
- Approved temporary browser target: `https://tadweerah.com`
- Approval basis: `docs/pre-phase-3b-visual-journey/03_URL_RESOLUTION.md`
- Browser/UAT profile: anonymous browser only
- Browser actions: direct read-only navigation only

## Constraints

- Did not log in.
- Did not submit forms.
- Did not click mutation-capable actions.
- Did not create, edit, finalize, correct, or approve allocations/reports.
- Did not perform `POST`, `PUT`, `PATCH`, or `DELETE` actions.
- Did not access database.
- Did not modify Clerk settings.
- Did not modify source code.
- Did not deploy or commit.
- Did not print tokens or secrets.

## Evidence Log

| Item | Evidence Type | Evidence | Status |
| --- | --- | --- | --- |
| Custom domain approval | Documentation evidence | User approved `https://tadweerah.com` as temporary target for read-only anonymous discovery | Complete |
| App render check | Browser evidence | `https://tadweerah.com/` rendered public Tadweerah landing page | Renders |
| `/sustainability/allocations` attempt | Browser evidence | Direct navigation ended at `https://tadweerah.com/` and showed public landing page, not allocation UI | Reached host, no active allocation journey |
| `/reports` attempt | Browser evidence | Direct navigation ended at `https://tadweerah.com/` and showed public landing page, not report UI | Reached host, no active report journey |
| Console errors | Browser evidence | No warning/error logs captured during custom-domain pass | No observed Clerk error |
| Network methods | Network evidence | Browser tool surface did not expose request method/path capture for this pass; page diagnostics showed script asset host/path only | Limited |

## Browser Journey

| Screen | Attempted URL | Final URL | Previous Screen | Visible Title/Headings | Visible Labels/Statuses/Quantities | Buttons/Actions Visible | Screen Type | Next Possible Actions | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public home | `https://tadweerah.com/` | `https://tadweerah.com/` | Direct navigation to approved target | Title: `Tadweerah`; headings: `من المصدر إلى المعالجة — مسار موثّق للمواد القابلة للتدوير`, `لماذا تدويرة؟`, `لمن هذه المنصة؟` | Labels: `تدويرة`, `Notifications (F8)`; statuses: none visible; quantities: no business quantities visible | `English`, `ابدأ الآن`, `تسجيل الدخول`, `ليس لديك حساب؟ أنشئ حساب شركتك الآن`; links: `الدعم` mailto, logo `/` | Public landing page | Login/start actions are visible but were not clicked | `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-root.png` |
| Allocations route attempt | `https://tadweerah.com/sustainability/allocations` | `https://tadweerah.com/` | Public home | Same public home title/headings | Same public home labels; no allocation statuses or quantities visible | Same public home actions | Redirect/fallback to public landing page; not allocation draft/approval/revision | Login/start actions visible; no allocation detail links visible | `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-sustainability-allocations.png` |
| Reports route attempt | `https://tadweerah.com/reports` | `https://tadweerah.com/` | Allocations route attempt | Same public home title/headings | Same public home labels; no report statuses or quantities visible | Same public home actions | Redirect/fallback to public landing page; not report list/final report | Login/start actions visible; no report detail/print links visible | `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-reports.png` |

## Visible Text Highlights

- `كل قيمة تستحق أن تعود`
- `منصة سعودية لتوثيق وإدارة تدفق المواد القابلة للتدوير`
- `من المصدر إلى المعالجة — مسار موثّق للمواد القابلة للتدوير`
- `ابدأ الآن`
- `تسجيل الدخول`
- `ليس لديك حساب؟ أنشئ حساب شركتك الآن`
- `تقارير تدعم الامتثال، الاستدامة، ومسؤولية المنتج`
- `للمنتجين`
- `للمعالجين والمصانع`
- `للناقلين المرخّصين`

## Links Observed

| Text | Href | Notes |
| --- | --- | --- |
| `تدويرة` | `/` | Normal navigation to public home |
| `الدعم` | `mailto:info@tadweerah.com` | External mail action; not clicked |

## Routes Not Active From Anonymous Browser Evidence

| Route | Evidence Type | Status | Reason |
| --- | --- | --- | --- |
| `/sustainability/allocations` | Browser evidence | Not active as allocation journey | Direct navigation ended at `/` and displayed public landing page. No allocation UI, statuses, quantities, or detail links appeared. |
| `/reports` | Browser evidence | Not active as report journey | Direct navigation ended at `/` and displayed public landing page. No report list, report statuses, quantities, or print links appeared. |
| `/sustainability/allocations/:id` | Browser evidence | Not reached | No allocation list or detail link was visible anonymously. |
| `/reports/sustainability/:id/print` | Browser evidence | Not reached | No report list, detail, or print link was visible anonymously. |

## Observed Facts

- `https://tadweerah.com/` renders the Tadweerah public landing page anonymously.
- The prior Clerk origin blocker seen on `https://tadweerah-staging.web.app` did not appear in this custom-domain pass.
- Anonymous direct navigation to `/sustainability/allocations` and `/reports` did not expose those product screens.
- Both scoped route attempts ended at `https://tadweerah.com/`.
- The only visible actions related to account entry were `ابدأ الآن`, `تسجيل الدخول`, and account creation text.
- No allocation/report detail links appeared.
- No mutation-capable action was clicked.

## Inferred Risks

- Anonymous discovery is sufficient to confirm the custom domain renders, but insufficient to inspect sustainability allocations or reports.
- The scoped routes appear to require an authenticated/session-aware path or route guard before the real journey is visible.
- A named UAT account profile is likely needed for Pre-Phase 3-B active path discovery.

## Open Questions

- Which named UAT account profile should be approved for sustainability allocation/report discovery?
- Which role should be used first: admin, processor, producer, buyer, recycler, transporter, or another project-defined UAT profile?
- Should the custom-domain target remain approved for the next signed-in read-only pass?

## Recommended Next Review

- Approve a named UAT account profile for read-only browser discovery on `https://tadweerah.com`.
- Keep mutation actions forbidden.
- Resume only after credentials/session handling is explicitly approved.

## Forbidden Actions

- Do not infer active sustainability journeys from code-present routes.
- Do not click login/start actions without a named UAT account profile.
- Do not create, edit, finalize, correct, approve, or submit anything during discovery.
- Do not use personal accounts unless explicitly approved.

## Session Continuity

Files created or updated:
- `docs/pre-phase-3b-visual-journey/04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md`
- `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-root.png`
- `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-sustainability-allocations.png`
- `docs/pre-phase-3b-visual-journey/screenshots/custom-domain-reports.png`

Evidence collected:
- Browser evidence for approved custom-domain root.
- Browser evidence for direct anonymous route attempts to `/sustainability/allocations` and `/reports`.
- Screenshot evidence for each attempted route.
- Browser console evidence: no warning/error logs captured during custom-domain pass.

Unresolved blockers:
- Anonymous profile cannot reach allocation/report journey screens.
- Named UAT account profile is not approved.

Exact recommended next prompt:
- "Approve a named UAT account profile for `staging-readonly-uat` on `https://tadweerah.com` for Pre-Phase 3-B read-only browser discovery. Do not create, edit, finalize, correct, approve, or submit anything; stop before any mutation-capable action."
