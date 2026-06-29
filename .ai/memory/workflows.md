# Workflow Memory

Last updated: 2026-06-28
Verified by: Codex read-only route and file inspection
Confidence: Medium
Evidence: frontend `App.tsx`, sustainability page files, API route files, DB schema files
Known gaps: Browser journey was blocked because the local Tadweerah app was not running; active reachability is not yet verified.

Current Pre-Phase 3-B goal:
- Visual Journey & Active Path Discovery
- Discovery only unless explicitly changed
- Browser evidence is preferred over code assumptions
- This is Pre-Phase 3-B only.
- It must not become Phase 3-B.
- It must not implement data fixes.

Sustainability-related frontend routes identified:
- `/sustainability/allocations`
- `/sustainability/allocations/:id`
- `/reports`
- `/reports/sustainability/:id/print`

Related frontend pages:
- `artifacts/tadweerah/src/pages/sustainability-allocations.tsx`
- `artifacts/tadweerah/src/pages/sustainability-allocation-detail.tsx`
- `artifacts/tadweerah/src/pages/reports.tsx`
- `artifacts/tadweerah/src/pages/sustainability-print.tsx`

Related backend/API areas:
- `artifacts/api-server/src/routes/sustainability.ts`
- `artifacts/api-server/src/routes/reports.ts`
- `artifacts/api-server/src/services/sustainability-derivation.ts`
- `artifacts/api-server/src/services/sustainability-validation.ts`

Related database schema:
- `lib/db/src/schema/sustainability-allocations.ts`
- `lib/db/src/schema/sustainability-allocation-lines.ts`
- `lib/db/src/schema/sustainability-received-lines.ts`
- `lib/db/src/schema/sustainability-reports.ts`
- `lib/db/src/schema/sustainability-pathways.ts`
- `lib/db/src/schema/sustainability-report-field-config.ts`
- `lib/db/src/schema/sustainability-correction-requests.ts`

Active-path rule:
- A route is `code-present only` until reached through browser navigation or visible UI.
- Do not classify a route, status, or workflow as `Active` from code evidence alone.
