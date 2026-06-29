# Startup Profile: staging-readonly-uat

Version: v1.0
Status: Profile defined; staging URL requires explicit approval for each task/session before browser navigation.
Last updated: 2026-06-28
Verified by: Codex read-only documentation/config inspection
Confidence: Medium
Evidence: `.firebaserc`, `firebase.json`, `scripts/deploy-frontend.ps1`, and existing project docs referencing `https://tadweerah-staging.web.app`
Known gaps: Browser/UAT account profile is not approved. Current deployed staging state is not verified. User role is unknown until browser evidence is collected.

## 1. Profile Name

`staging-readonly-uat`

## 2. Purpose

Allow Pre-Phase 3-B browser journey discovery on the deployed staging application as a read-only UAT discovery profile.

This profile is for browser observation, visible UI capture, URL capture, screenshots, and read-only network evidence only. It does not authorize data changes, implementation, deployment, migrations, commits, or direct database access.

## 3. Approved Application Target

Candidate current Tadweerah staging URL:

```text
https://tadweerah-staging.web.app
```

Use only this staging URL after explicit human approval for the current task/session.

If the app redirects to production or another domain, stop immediately.

## 4. Backend / Frontend Startup

No local backend or frontend startup is allowed.

This profile uses the already deployed staging environment only.

## 5. Database Target

No direct database access is allowed.

Forbidden:
- Cloud SQL queries.
- Direct database reads.
- Direct database writes.
- Migrations.
- Seeds.
- Schema pushes.
- Data repair scripts.

All observations must come from browser UI and read-only network evidence only.

## 6. Browser / UAT Profile

Default browser/UAT profile: anonymous browser first.

Rules:
- If login is required, stop and ask for a named UAT account profile.
- Do not invent credentials.
- Do not use personal accounts unless explicitly approved.
- Do not inspect browser cookies, local storage, passwords, session stores, or tokens.

## 7. Allowed

- Open staging app in browser.
- Navigate reachable screens.
- Capture screenshots.
- Capture visible UI text.
- Capture current URL.
- Capture network request methods and endpoint paths.
- Record response field names only if available without exposing secrets.
- Write outputs only under `docs/pre-phase-3b-visual-journey/`.

## 8. Forbidden

- `POST`, `PUT`, `PATCH`, or `DELETE` actions unless explicitly approved.
- Creating allocations.
- Finalizing allocations.
- Requesting corrections.
- Editing data.
- Submitting forms.
- Confirming approvals.
- Direct database access.
- Local server startup.
- Source-code edits.
- Installs.
- Migrations.
- Commits.
- Pushes.
- Deploys.
- Printing secrets or tokens.

## 9. Stop Conditions

Stop immediately if:
- Login is required without an approved UAT account profile.
- A page requires an action that may mutate data.
- A network request is non-read-only.
- Staging URL is unclear or not approved for the current task/session.
- App redirects to production.
- Secrets or tokens may be exposed.
- User role is unclear.
- Browser evidence conflicts with the approved target.

## 10. Evidence Rules

Classify evidence as:
- Browser evidence
- Network evidence
- Code evidence
- Documentation evidence

Do not classify a path as `Active` unless it was reached in browser or is visible through current navigation.

Do not treat code-present routes as active.

## 11. Output / Log Folder

All screenshots, notes, and discovery output must be written only under:

```text
docs/pre-phase-3b-visual-journey/
```

## 12. Current Completion State

Profile definition is complete.

Execution remains blocked until the next task explicitly confirms:
- staging URL approval for `https://tadweerah-staging.web.app`
- browser/UAT profile: anonymous browser, or a named UAT account profile if login is required
- permission to open the staging URL in a browser
