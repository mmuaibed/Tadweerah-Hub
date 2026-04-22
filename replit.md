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

### Module roadmap (build module-by-module, classify Simple/Medium/Complex first)
- M1 Auth & Company Onboarding — DONE
- M2 Waste Listings (producer)
- M3 Marketplace browsing (buyer)
- M4 Offers / Negotiation
- M5 Transport bids (carrier)
- M6 Trip lifecycle / proof of delivery
- M7 Notifications
- M8 Payments / wallet
- M9 Admin
- Deferred (Complex): CR verification (manual for MVP), Nafath login (post-MVP)

### Bilingual rule
Arabic default + English toggle, RTL/LTR via `<html dir>`. Tiny custom i18n hook (`src/i18n/index.tsx`) — NO heavy i18n library.

### Stack additions
- **Frontend**: Vite + React + wouter, shadcn/ui, Tailwind v4, TanStack Query, Clerk (`@clerk/react` + shadcn theme)
- **Auth**: Clerk (modal sign-in/up from landing + dedicated `/sign-in`, `/sign-up` pages via Clerk proxy)
- **DB**: `companies` table (one company per user, enforced by ownerUserId uniqueness check in route)

### M1 endpoints
- `GET /healthz`
- `GET /me` → `{ userId, email?, company? }`
- `POST /companies` → creates company for current user (409 if user already has one)

### M1 frontend routes
- `/` — landing (signed-in → /dashboard)
- `/sign-in/*?`, `/sign-up/*?` — Clerk pages
- `/onboarding/company` — company creation form (signed-in + no company)
- `/dashboard` — role-based placeholder cards (signed-in + has company)

### Notes for next module
- Use `useGetMe` + `getGetMeQueryKey` pattern for invalidation after writes.
- `CreateCompanyBody` is exported from `@workspace/api-zod` as a zod runtime schema only (TypeScript type collision was removed — use `z.infer<typeof CreateCompanyBody>` if a server-side type is needed). Frontend gets the type from `@workspace/api-client-react` (Orval-generated `api.schemas.ts`).
- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`.
