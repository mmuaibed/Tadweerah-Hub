# Architecture Memory

Last updated: 2026-06-28
Verified by: Codex read-only file inspection
Confidence: High for repo structure, Medium for runtime behavior
Evidence: root `package.json`, `pnpm-workspace.yaml`, app package manifests, route files, shared library package manifests
Known gaps: Browser reachability and production deployment state were not verified.

Frontend:
- React 19
- Vite
- TypeScript
- Wouter routing
- TanStack React Query
- Clerk auth
- Location: `artifacts/tadweerah`

Backend:
- Node.js
- Express 5
- TypeScript
- Clerk Express middleware
- Drizzle ORM
- Location: `artifacts/api-server`

Workspace:
- Package manager: `pnpm`
- Shared DB/schema: `lib/db`
- API Zod/types: `lib/api-zod`
- React API client: `lib/api-client-react`
- API spec/codegen: `lib/api-spec`

Major app folders:
- `artifacts/tadweerah/src/pages`
- `artifacts/tadweerah/src/components`
- `artifacts/api-server/src/routes`
- `artifacts/api-server/src/services`
- `lib/db/src/schema`

Evidence rule:
- Code evidence describes what exists in files.
- It does not prove current browser reachability or active user flow.
