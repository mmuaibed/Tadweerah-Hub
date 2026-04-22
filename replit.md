# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Tadweerah (تدويرة) — Saudi B2B recycling platform

A Saudi B2B MVP connecting waste producers, recycling buyers, and transport carriers.

### Brand standards (Project Charter)
- **Logo**: `/logo.png` (recycling mark + "Tadweerah / تدويرة" wordmark). The wordmark's typeface is logo-only — never used inside the system.
- **Primary**: blue `hsl(223, 67%, 50%)` — extracted from the wordmark.
- **Secondary**: green `hsl(125, 47%, 45%)` — extracted from the recycling mark.
- **System font**: Tajawal (300/400/500/700/900) for both Arabic and English.
- **Layout**: every signed-in page wraps content in `<AppLayout>` — single source of truth for header (logo + language toggle + sign-out) + content frame.
- **Empty states**: use `<EmptyState>` component everywhere data may be empty.
- **Error messages**: bilingual user-facing strings in `i18n/index.tsx` — never surface raw API errors.

### Naming convention
- DB column names + JSON API keys: `snake_case` (e.g. `company_id`, `waste_listing_id`, `price_hint`, `created_at`).
- TypeScript symbols: `camelCase`/`PascalCase`.
- Path params for resources: `/:waste_listing_id` (full noun, not just `:id`).

### Module roadmap (build module-by-module, classify Simple/Medium/Complex first)
- M1 Auth & Company Onboarding — DONE
- M2 Waste Listings (producer create/list/close + buyer marketplace) — DONE & UAT-approved
- M3 Listing detail page + clickable cards + confirm-close — DONE, pending UAT
- M4 Offers / Negotiation
- M5 Transport bids (carrier)
- M6 Trip lifecycle / proof of delivery
- M7 Notifications

### M2 — approved deferred improvements (revisit before launch)
1. Custom AR/EN validation messages on forms (replace browser defaults).
2. Make `<ListingCard>` clickable / add "View details" CTA — will land in M3.
3. Buyer dashboard: stronger value messaging.
4. Decide & document the rule: can a closed listing be reopened? (current behaviour: no — `close` is one-way).
5. Image upload for listings — postponed until core flow stabilises.

### M2 — known technical limitations (non-blocking)
- City filter is exact-match, case-sensitive.
- No DB indexes on `waste_listings.company_id` / `status` (acceptable at MVP volume).
- `quantity numeric(12,3)` overflows above ~10⁹ — surfaces as generic 500.
- M8 Payments / wallet
- M9 Admin
- Deferred (Complex): CR verification (manual for MVP), Nafath login (post-MVP)

### Bilingual rule
Arabic default + English toggle, RTL/LTR via `<html dir>`. Tiny custom i18n hook (`src/i18n/index.tsx`) — NO heavy i18n library.

### Stack additions
- **Frontend**: Vite + React + wouter, shadcn/ui, Tailwind v4, TanStack Query, Clerk (`@clerk/react` + shadcn theme)
- **Auth**: Clerk (modal sign-in/up from landing + dedicated `/sign-in`, `/sign-up` pages via Clerk proxy)
- **DB**: `companies` table (one company per user, enforced by ownerUserId uniqueness check in route)

### Endpoints (cumulative)
**M1**
- `GET /healthz`
- `GET /me` → `{ userId, email?, company? }`
- `POST /companies` → creates company for current user (409 if user already has one)

**M2 — listings** (all require auth + a company; role-gated via `requireCompany([...])` middleware)
- `POST /listings` (producer only) → create waste listing
- `GET /listings` (buyer only) → marketplace, filters: `?material=&city=`
- `GET /listings/mine` (producer only) → own listings
- `GET /listings/:waste_listing_id` (any company) → detail
- `POST /listings/:waste_listing_id/close` (owner producer only) → set status=closed

### Frontend routes (cumulative)
- `/` — landing (signed-in → /dashboard)
- `/sign-in/*?`, `/sign-up/*?` — Clerk pages
- `/onboarding/company` — company creation form (signed-in + no company)
- `/dashboard` — role-based action cards (signed-in + has company)
- `/listings/new` — producer only: new listing form
- `/listings/mine` — producer only: own listings + close (with confirm)
- `/listings/:waste_listing_id` — all roles: detail page, role-gated actions
- `/marketplace` — buyer only: browse open listings with material+city filters

### Shared UI components
- `AppLayout` — header + content wrapper (mandatory for every page)
- `EmptyState` — empty/error states
- `ListingCard` — card with ref ID, status badge, optional "View Details" CTA (`href` prop)
- `RoleRoute` — frontend role gate (mirrors backend requireCompany)
- `ConfirmDialog` — AlertDialog wrapper for destructive confirms (irreversible actions)

### Access control pattern
- **API**: `requireAuth` → `requireCompany([allowedTypes])` middleware chain.
- **Frontend**: `<RoleRoute allow={[...]}>` mirror — non-allowed roles redirected to `/dashboard`.
- Carrier role has no M2 surface (waits until M5 transport bids).

### Notes for next module
- Use `useGetMe` + `getGetMeQueryKey` pattern for invalidation after writes.
- `CreateCompanyBody` is exported from `@workspace/api-zod` as a zod runtime schema only (TypeScript type collision was removed — use `z.infer<typeof CreateCompanyBody>` if a server-side type is needed). Frontend gets the type from `@workspace/api-client-react` (Orval-generated `api.schemas.ts`).
- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`.
