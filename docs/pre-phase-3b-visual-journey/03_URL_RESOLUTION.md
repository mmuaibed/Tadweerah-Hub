# 03 URL Resolution

## Scope

- Mode: Discovery Mode
- Date: 2026-06-28
- Purpose: identify candidate browser-accessible Tadweerah URLs that may render with the current Clerk domain/origin configuration.
- Approved output location: `docs/pre-phase-3b-visual-journey/`
- Browser use: none in this task.

## Constraints

- Did not open any new browser URL.
- Did not log in.
- Did not modify Clerk settings.
- Did not modify source code.
- Did not deploy.
- Did not commit.
- Did not access the database.
- Did not print secret values or Clerk key values.

## Evidence Reviewed

| Evidence Source | Evidence Type | Relevant Finding |
| --- | --- | --- |
| `.firebaserc` | Config evidence | Default Firebase project is `tadweerah-staging`. |
| `firebase.json` | Config evidence | Firebase Hosting serves `artifacts/tadweerah/dist/public`; `/api/**` rewrites to Cloud Run service `tadweerah-api` in `europe-west1`; SPA routes rewrite to `/index.html`. |
| `scripts/deploy-frontend.ps1` | Config evidence | Frontend build reads `VITE_CLERK_PUBLISHABLE_KEY` from `artifacts/tadweerah/.env.production` and deploys Hosting to project `tadweerah-staging`. |
| `artifacts/tadweerah/scripts/check-env.mjs` | Config evidence | Frontend env validation expects the Clerk publishable key to decode to `clerk.tadweerah.com$` and rejects `VITE_CLERK_PROXY_URL` when set. |
| `artifacts/tadweerah/.env.production` | Config evidence | Contains `VITE_CLERK_PUBLISHABLE_KEY`; value was not printed. |
| `.env.example` | Config evidence | Contains Clerk and platform URL variable names; not treated as an approved runtime source. |
| `docs/PROJECT_MAP.md` | Documentation evidence | Frontend is Firebase Hosting on `tadweerah-staging` project and "also serves `tadweerah.com`"; `PLATFORM_URL` defaults to `https://tadweerah.com`. |
| `docs/AL_QARYAN_CONTRACT_LITE_UAT_SCRIPT.md` | Documentation evidence | Older UAT script names staging URL as `https://tadweerah-staging.web.app`. |
| `docs/READINESS_FINDINGS_AND_RISKS.md` | Documentation evidence | CORS was applied to staging bucket for `https://tadweerah-staging.web.app` and `https://tadweerah.com`. |
| `docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md` | Browser/Network evidence | Prior browser pass reached `https://tadweerah-staging.web.app` routes but rendered blank; console said Clerk production keys are allowed only for domain `tadweerah.com`. |

## Candidate URLs

| Candidate URL | Evidence Source | Classification | Likely Matches Clerk Allowed Origin/Domain? | Safe For Read-Only Browser UAT? | Needs Explicit Owner Approval Before Opening? |
| --- | --- | --- | --- | --- | --- |
| `https://tadweerah.com` | `docs/PROJECT_MAP.md` says Firebase Hosting project `tadweerah-staging` also serves `tadweerah.com`; `PLATFORM_URL` defaults to this URL; prior browser error names `tadweerah.com` as the allowed Clerk domain. | Custom-domain and production-like; documentation suggests it may be served by the staging Firebase project. | Likely yes, based on Clerk error and frontend env validation for `clerk.tadweerah.com`. | Conditionally safe only if owner confirms this custom domain is approved for read-only staging/UAT discovery and not production user traffic. | Yes. |
| `https://www.tadweerah.com` | Mentioned in generated operational/report text as `www.tadweerah.com`; not found as a Firebase Hosting target or approved UAT URL. | Production-like or unclear. | Possible, but not proven by hosting config; it is a subdomain of `tadweerah.com`. | Not safe without owner confirmation because hosting target and environment are unclear. | Yes. |
| `https://tadweerah-staging.web.app` | `.firebaserc`, `scripts/deploy-frontend.ps1`, project docs, and prior UAT docs identify Firebase project `tadweerah-staging` and this staging URL. | Staging Firebase default domain. | No, based on prior browser evidence: Clerk rejected this origin/domain and rendered a blank app shell. | Safe only for observing the known blank-shell blocker; not sufficient for current visual journey discovery. | Yes before reopening in this URL-resolution follow-up. |
| `https://tadweerah-staging.firebaseapp.com` | Inferred from Firebase project id `tadweerah-staging`; not directly documented as a UAT URL in inspected docs/config. | Staging Firebase default alternate domain; unclear because not directly documented. | Likely no, because it is not under `tadweerah.com` and would likely hit the same Clerk origin restriction as `web.app`. | Low value and not safe without owner approval because it is not a documented UAT URL. | Yes. |
| `https://tadweerah.sa` | Older env docs and `.env.example` reference `PLATFORM_URL` defaulting to `https://tadweerah.sa`; not confirmed in current Firebase/Clerk config. | Production-like or stale/unclear. | Likely no for current Clerk config, because prior browser error names `tadweerah.com`, not `tadweerah.sa`. | Not safe without owner confirmation; may be stale or unrelated to current staging. | Yes. |
| `https://clerk.tadweerah.com` | `artifacts/tadweerah/scripts/check-env.mjs` expects Clerk key domain `clerk.tadweerah.com$`. | Clerk auth/frontend API domain, not an app URL. | It is the Clerk domain, but not the Tadweerah application origin. | Not appropriate for app browser UAT. | Yes if anyone proposes opening it, but it should not be used as the app URL. |

## Observed Facts

- Firebase project evidence points to `tadweerah-staging`.
- Firebase Hosting rewrites all non-API routes to `/index.html`, so direct SPA route paths should be technically hostable on whichever Hosting domain is approved.
- Deployment script builds the frontend with `VITE_CLERK_PUBLISHABLE_KEY` from `artifacts/tadweerah/.env.production` and deploys to Firebase project `tadweerah-staging`.
- The frontend env check requires the Clerk key domain to be `clerk.tadweerah.com$`.
- The prior browser journey showed Clerk rejecting `https://tadweerah-staging.web.app` with an allowed-domain message for `tadweerah.com`.
- Project documentation explicitly says Firebase Hosting project `tadweerah-staging` also serves `tadweerah.com`.

## Inferred Risks

- `https://tadweerah.com` is the strongest candidate to satisfy the current Clerk origin/domain configuration, but it is production-like and must not be opened without explicit owner approval for read-only UAT.
- The documented UAT URL `https://tadweerah-staging.web.app` may have become incompatible with the current Clerk production/custom-domain key.
- `https://www.tadweerah.com` and `https://tadweerah.sa` are not sufficiently evidenced as current staging app URLs.

## Open Questions

- Does `https://tadweerah.com` currently point to the Firebase Hosting project `tadweerah-staging` for UAT purposes?
- Is `https://tadweerah.com` safe to use for anonymous read-only Pre-Phase 3-B browser discovery, or is it live production traffic?
- Should the approved staging-readonly profile be updated to allow `https://tadweerah.com` as the browser target for this discovery phase?

## Recommended Next Review

- Ask the project owner to approve or reject opening `https://tadweerah.com` for anonymous read-only Pre-Phase 3-B browser discovery.
- If approved, update or supplement the `staging-readonly-uat` execution authority for this session with the exact URL.
- Then open only the approved candidate URL and resume browser journey discovery.

## Forbidden Actions

- Do not fix Clerk as part of URL resolution.
- Do not modify Clerk settings.
- Do not open candidate URLs without explicit owner approval.
- Do not log in without a named UAT account profile.
- Do not classify any candidate as active until reached through approved browser navigation.

## Session Continuity

Files created or updated:
- `docs/pre-phase-3b-visual-journey/03_URL_RESOLUTION.md`

Evidence collected:
- Firebase Hosting config and project target evidence.
- Deployment helper evidence.
- Frontend Clerk env validation evidence without printing key values.
- Project documentation evidence for `tadweerah.com` and `tadweerah-staging.web.app`.
- Prior browser blocker evidence from `02_BROWSER_JOURNEY_LOG.md`.

Unresolved blockers:
- No candidate URL is approved for browser opening in this task.
- `https://tadweerah.com` appears most likely to match Clerk, but is production-like and requires owner approval.

Exact recommended next prompt:
- "Approve `https://tadweerah.com` as the temporary browser target for `staging-readonly-uat` Pre-Phase 3-B anonymous read-only discovery, confirming it is safe for UAT and not production user traffic. Do not log in; if login is required, stop and ask for a named UAT account profile."
