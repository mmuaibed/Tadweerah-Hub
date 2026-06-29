# Execution Authority

Version: v1.1

Execution Authority controls every action that starts, connects to, or exercises a live Tadweerah runtime. Discovery Mode may inspect and verify reachability, but it must never choose a startup strategy or environment profile autonomously.

## 1. Who Approves Startup

Startup may be approved only by the project owner or an explicitly delegated human operator.

Approval must name:
- official startup profile
- backend command, if backend startup is allowed
- frontend command, if frontend startup is allowed
- required ports
- approved environment profile
- approved database target
- approved browser/UAT profile
- whether builds are allowed
- where logs and screenshots may be written

## 2. Official Startup Profiles

No startup profile is approved until it is documented by name.

Each official profile must define:
- profile name
- purpose
- backend command
- frontend command
- ports
- required env files or variable sources
- API target expected by the frontend
- database target
- browser/UAT profile
- allowed commands
- forbidden commands
- output/log folder
- stop conditions

Possible profile names, not yet approved:
- `local-readonly-discovery`
- `local-uat`
- `staging-uat`
- `production-readonly`

## 3. Approved Environment Profiles

Environment profile must be explicit before startup.

Allowed profile types only after approval:
- local env profile
- staging/UAT env profile
- production readonly env profile

The AI may inspect env variable names and presence. It must not select, apply, copy, edit, or synthesize env values unless the approved profile explicitly allows it.

## 3A. Environment Resolution

Every startup profile must distinguish these environment sources:

- Current process environment: variables already present in the shell/process that will run commands.
- Approved env file source: a named local file explicitly approved by the human operator for the current task/session.
- Dotenv-loaded runtime environment: variables loaded by a runtime/tool from an approved env file during startup.
- Vite frontend env: frontend-exposed variables such as `VITE_*`; these may affect browser behavior but do not satisfy backend env requirements.
- Unknown/missing env: any required value not present in the current process and not available from an approved env file source.

Rules:
- The AI may inspect env file names and variable names.
- The AI must not print secrets.
- The AI must not copy values from `.env.example` into runtime.
- The AI must not assume `.env.example` is an approved env source.
- A profile may allow `.env.local`, `.env.development`, or another named local env file only after human approval.
- If a required variable can only be found in an unapproved env file, startup remains blocked.
- If a variable is present but cannot be classified as local/safe without revealing the secret, report the classification result only.

## 4. Approved Databases

Database target must be named before startup.

Approved database target types:
- no database
- local development database
- staging/UAT database
- production readonly database

The AI must stop before startup if the database target is unknown, ambiguous, remote-but-unauthorized, or likely to receive writes.

Migrations, seeds, schema pushes, and data repair scripts always require separate explicit approval.

## 5. Approved Browser / UAT Profiles

Browser/UAT profile must be named before browser journey discovery.

Examples:
- anonymous browser
- signed-in test user
- producer account
- buyer account
- recycler/processor account
- transporter account
- admin account

The AI must not use real-user credentials discovered in files, logs, browser storage, or environment variables. If login is required and the approved UAT profile is missing credentials/session, stop and ask the human operator.

## 6. When Autonomous Startup Is Allowed

Autonomous startup is allowed only when all are true:
- the current task explicitly permits startup
- a named official startup profile exists
- the human operator approved that profile for the current task/session
- environment profile is approved
- database target is approved
- browser/UAT profile is approved
- startup commands exactly match the approved profile
- commands do not install, migrate, seed, deploy, commit, push, delete, or change persistent env variables
- logs/screenshots are written only to the approved folder

If any item is missing, autonomous startup is not allowed.

## 7. When Startup Must Stop And Request Human Approval

Stop and ask when:
- no official startup profile exists
- the profile is not approved for the current task/session
- env values are missing, ambiguous, or from an unapproved profile
- required env is only present in `.env.example` or another unapproved env file
- database target is unknown or remote without approval
- frontend API target is unknown or non-local when local discovery is expected
- startup requires a build and builds were not explicitly approved
- startup may write to a database
- credentials or browser session are required but missing
- command differs from the approved profile
- profile points to staging, UAT, or production
- logs or screenshots would be written outside the approved folder

## 8. Current Tadweerah Status

As of TAOS v1.1:
- `local-readonly-discovery` exists as an official startup profile.
- Known local commands are authorized only within that profile and only after Environment Resolution passes.
- Pre-Phase 3-B browser journey discovery must stop before startup if `DATABASE_URL` is missing, unknown, remote-looking, or only available from an unapproved env source.
