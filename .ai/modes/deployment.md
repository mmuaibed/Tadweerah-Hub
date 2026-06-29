# Deployment Mode

Goal: prepare or execute an approved release.

Allowed only after explicit authorization:
- Build commands.
- Deployment commands.
- Environment checks.
- Release notes.
- Post-deploy verification.

Not allowed without explicit approval:
- Changing environment variables.
- Running migrations.
- Pushing to GitHub.
- Deploying Cloud Run or Firebase.

Rules:
- Confirm target environment before release.
- Record exact commands used.
- Verify backend and frontend separately.
- Capture any errors with timestamps and command output summaries.
- Stop immediately if credentials, permissions, or environment values are missing.

Known local commands discovered:

Backend:
```powershell
$env:PORT="8080"; $env:NODE_ENV="development"; pnpm --filter @workspace/api-server run build; pnpm --filter @workspace/api-server run start
```

Frontend:
```powershell
$env:PORT="8081"; $env:BASE_PATH="/"; pnpm --filter @workspace/tadweerah run dev
```
