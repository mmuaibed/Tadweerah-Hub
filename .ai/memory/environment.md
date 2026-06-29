# Environment Memory

Version: v1.1
Last updated: 2026-06-28
Verified by: Codex read-only local inspection
Confidence: Medium
Evidence: `package.json`, `.replit`, Vite/API server configs, local port probes, TAOS `local-readonly-discovery` profile
Known gaps: App was not running locally during the last check; runtime credentials and database connectivity were not verified. `DATABASE_URL` was missing from the current process during the last startup attempt.

Project runs as a pnpm workspace.

Known local app status:
- Tadweerah was not running when checked.
- Ports `8080`, `8081`, `8082`, and `5173` timed out.

Known local commands:

Backend API:
```powershell
$env:PORT="8080"; $env:NODE_ENV="development"; pnpm --filter @workspace/api-server run build; pnpm --filter @workspace/api-server run start
```

Frontend:
```powershell
$env:PORT="8081"; $env:BASE_PATH="/"; pnpm --filter @workspace/tadweerah run dev
```

Important constraints (Execution Authority):
- NEVER start backend or frontend servers without explicit human approval of an official startup profile.
- `local-readonly-discovery` is an approved startup profile, but startup remains blocked until Environment Resolution passes.
- Do not infer environment profile from `.env.example`, `.env.local`, shell variables, or prior conversation.
- Do not assume `.env.example` is an approved runtime source.
- Do not copy or synthesize env values into runtime.
- Do not choose a database target; it must be named by the human operator.
- Do not choose a browser/UAT account profile; it must be named by the human operator.
- Do not install packages unless explicitly approved.
- Do not run builds unless explicitly approved for the task.
- Do not run migrations or database writes unless explicitly approved.
- Do not change environment variables unless explicitly approved.

## Environment Resolution Memory

Recognized source types:
- Current process environment: variables already available in the running shell/process.
- Approved env file source: named local env file explicitly approved by the human operator.
- Dotenv-loaded runtime environment: variables loaded by tooling at runtime from an approved env source.
- Vite frontend env: frontend `VITE_*` variables; useful for browser behavior but not backend database approval.
- Unknown/missing env: required values not present or not from an approved source.

Rules:
- Inspect env file names and variable names only unless value classification is explicitly needed.
- Never print secrets.
- Never use `.env.example` as runtime input unless explicitly approved, and even then do not print values.
- For `local-readonly-discovery`, backend startup requires `DATABASE_URL` to be either present in the current process and clearly local, or present in a human-approved local env file source and classified as local without printing the value.
