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
- M3 Listing detail page + clickable cards + confirm-close — DONE & UAT-approved
- M4 Offers / Bidding — DONE & UAT-approved
- M4.5 Bug-fix & polish sprint — COMPLETE (Phase 1 backend + Phase 2 frontend; Phase 3 email TBD)
- M5 Transport bids (carrier)
- M6 Trip lifecycle / proof of delivery
- M7 Notifications

### M2 — approved deferred improvements (revisit before launch)
1. Custom AR/EN validation messages on forms (replace browser defaults).
2. Make `<ListingCard>` clickable / add "View details" CTA — will land in M3.
3. Buyer dashboard: stronger value messaging.
4. Decide & document the rule: can a closed listing be reopened? (current behaviour: no — `close` is one-way).
5. Image upload for listings — postponed until core flow stabilises.

### M4.5 — implemented (Phases 1+2)
**Backend (Phase 1)**
- F1 auto-reject on close: `POST /listings/:id/close` rejects all pending offers with `rejection_reason='listing_closed'`
- F3 mandatory rejection reason: `POST /offers/:id/reject` requires `rejection_reason` field
- F4 lower-offer acceptance reason: `POST /offers/:id/accept` requires `acceptance_reason` when offer < current highest pending
- F6 rank calculation: `/listings/:id/offers` (buyer view) returns `rank` + `total_offers`
- F8 ordering: `/listings/mine` ordered active-first, then offer_count DESC, then created_at DESC
- F9 status filter: `/listings/mine?status=open|closed`
- F10 ILIKE city search: `/listings?city=` uses case-insensitive partial match
- F11 duplicate rejection prevention: buyers with rejected offers cannot re-submit
- M2 `/offers/mine`: returns buyer's all offers with listing context, rank, and listing_accepted_total
- M3 offer aggregates: `offer_count` + `highest_offer_total` on listing responses

**DB additions (M4.5)**
- `listing_offers.rejection_reason` (text, nullable) — set on reject/auto-reject; visible to affected buyer only
- `listing_offers.acceptance_reason` (text, nullable) — set on accept when lower than highest; INTERNAL only

**Frontend (Phase 2)**
- F1 close warning: confirm dialog shows pending offer count
- F2 buyer status badge: rejection_reason displayed to buyer (translated from code)
- F3 RejectOfferDialog: radio group (price_too_low / quantity_mismatch / not_interested / other)
- F4 AcceptOfferDialog: conditional acceptance_reason textarea when accepting lower offer
- F6 RankBadge: medal + rank/total display; hidden when total_offers ≤ 1
- F7 my-listings tabs: Active / Closed tab filter
- F12/F13 CTAs: offer count badge + View Offers button on my-listing cards
- F14 quantity disclaimer: "* الكمية تقديرية" on all estimated total displays
- M2 /participations page: My Participations with tab filter + winner/rejection reason display
- Dashboard buyer card for Participations

### M2 — known technical limitations (non-blocking)
- City filter updated to ILIKE partial-match (was exact-match — now fixed).
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

**M4 — offers** (all require auth + company; role-gated)
- `POST /listings/:waste_listing_id/offers` (buyer only) → submit first offer; price must exceed current highest
- `PUT /listings/:waste_listing_id/offers/mine` (buyer only) → improve pending offer; new price must exceed current highest
- `GET /listings/:waste_listing_id/offers` (producer/owner → all with identities; buyer → own offer only)
- `GET /listings/:waste_listing_id/offers/summary` (any company) → `{ count, highest_price }` — anonymous
- `POST /offers/:offer_id/accept` (owner producer) → atomic: accept + reject others + close listing (SELECT FOR UPDATE)
- `POST /offers/:offer_id/reject` (owner producer) → reject single pending offer; requires `rejection_reason`
- `GET /offers/mine` (buyer only) → all buyer's offers with listing context, rank, listing_accepted_total

**M4 DB additions**
- `listing_offers` table: `id, waste_listing_id FK, buyer_company_id FK, price_per_unit, message, status(pending/accepted/rejected), created_at, updated_at, resolved_at, rejection_reason, acceptance_reason` — UNIQUE(waste_listing_id, buyer_company_id)
- `waste_listings.closed_at` (timestamptz, nullable) — set on acceptance or manual close

### Frontend routes (cumulative)
- `/` — landing (signed-in → /dashboard)
- `/sign-in/*?`, `/sign-up/*?` — Clerk pages
- `/onboarding/company` — company creation form (signed-in + no company)
- `/dashboard` — role-based action cards (signed-in + has company)
- `/listings/new` — producer only: new listing form
- `/listings/mine` — producer only: own listings + close (with confirm)
- `/listings/:waste_listing_id` — all roles: detail page, role-gated actions
- `/marketplace` — buyer only: browse open listings with material+city filters
- `/participations` — buyer only: My Participations (all submitted offers, with rank/status/reasons)

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
