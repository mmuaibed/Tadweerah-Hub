# Startup Profile: local-readonly-discovery

Version: v1.1
Status: Approved profile, blocked until Environment Resolution confirms a local-only database source and browser/UAT profile is sufficient for the requested journey.
Last updated: 2026-06-28
Verified by: Human-approved TAOS profile definition
Confidence: Medium
Evidence: TAOS Execution Authority v1.0, package scripts, prior local run-method discovery
Known gaps: Database target is unknown unless resolved through current process env or a human-approved local env file source. Browser/UAT profile is anonymous only unless later approved. Runtime env values are not verified.

## 1. Profile Name

`local-readonly-discovery`

## 2. Purpose

Allow Pre-Phase 3-B browser journey discovery to run locally in a controlled, read-only way.

This profile is for observation, browser navigation, screenshots, health checks, and documentation only. It does not authorize data fixes, implementation, migrations, commits, deploys, or source-code changes.

## 3. Approved Backend Command

```powershell
$env:PORT="8080"; $env:NODE_ENV="development"; pnpm --filter @workspace/api-server run build; pnpm --filter @workspace/api-server run start
```

## 4. Approved Frontend Command

```powershell
$env:PORT="8081"; $env:BASE_PATH="/"; pnpm --filter @workspace/tadweerah run dev
```

## 5. Ports

- Backend: `8080`
- Frontend: `8081`

## 6. Approved Environment Profile

Approved profile: existing local environment only.

Rules:
- Do not select, copy, or synthesize env values from `.env.example` without human approval.
- Do not assume `.env.example` is an approved env source.
- Do not print secrets.
- Do not change persistent environment variables.
- Temporary shell-scoped variables are allowed only when they exactly match the approved commands above.

Environment Resolution:
- Current process environment is acceptable if `DATABASE_URL` is present and clearly local.
- A named local env file source may be acceptable only after human approval.
- Dotenv-loaded runtime env is acceptable only if it loads from an approved local env file source.
- Vite frontend env may confirm frontend API behavior, but it does not satisfy backend database requirements.
- Unknown or missing env blocks startup.

This profile remains blocked until one of these is true:
1. `DATABASE_URL` is present in the current process and is clearly local, or
2. A human explicitly approves a named local env file source that contains `DATABASE_URL` and the value is classified as local without printing it.

## 7. Approved Database Target

Default: unknown.

Startup is blocked until Environment Resolution confirms a local-only database target.

Stop if:
- `DATABASE_URL` is missing.
- `DATABASE_URL` is unknown.
- `DATABASE_URL` is only available from `.env.example` or another unapproved env file.
- `DATABASE_URL` points to staging or production.
- The database target is ambiguous.

## 8. Approved Browser / UAT Profile

Default: not yet approved.

Startup/browser discovery is blocked for authenticated journeys until the human operator approves the browser/UAT profile.

Rules:
- If login is required, stop and ask for the account profile.
- Do not invent credentials.
- Do not use real-user credentials discovered in files, logs, browser storage, or environment variables.

## 9. Builds

Backend build is allowed only because backend start depends on `dist/index.mjs`.

No other builds are allowed.

## 10. Allowed Commands

- Read-only inspection.
- Port checks.
- Health checks.
- Approved backend command.
- Approved frontend command.
- Browser navigation.
- Screenshots.
- Logs written only under `docs/pre-phase-3b-visual-journey/`.

## 11. Forbidden Commands

- Installs.
- Migrations.
- Database writes.
- Source-code edits.
- Deletes.
- Commits.
- Pushes.
- Deploys.
- Environment variable changes outside the current temporary shell session.

## 12. Stop Conditions

Stop before startup or continue only after human approval if:
- `DATABASE_URL` is missing.
- Database target is unknown.
- Database target is only available from an unapproved env file.
- Database target is staging or production unless explicitly approved.
- Clerk/auth profile is missing.
- Frontend API target is non-local or ambiguous.
- Approved commands fail.
- Command differs from this profile.
- Login is required without an approved UAT account profile.

## 13. Output / Log Folder

All logs, screenshots, and browser journey discovery output must be written only under:

```text
docs/pre-phase-3b-visual-journey/
```

## 14. Current Completion State

Profile definition is complete.

Execution remains blocked until the next task explicitly confirms:
- database target through Environment Resolution
- browser/UAT profile
- permission to run the approved backend command
- permission to run the approved frontend command
