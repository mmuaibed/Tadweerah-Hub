# Tadweerah

Tadweerah is a Saudi B2B MVP platform connecting waste producers, recycling buyers, and licensed transporters to streamline the recycling process within Saudi Arabia.

## Run & Operate

*   **Run Dev:** `pnpm dev` (starts frontend and backend)
*   **Build:** `pnpm build`
*   **Typecheck:** `pnpm typecheck`
*   **Codegen:** `pnpm --filter @workspace/api-server run generate-api-client`
*   **DB Push:** `pnpm --filter @workspace/db run push`
*   **Required Env Vars:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `X_ADMIN_KEY`

## Stack

*   **Frontend:** React, Vite, wouter, shadcn/ui, Tailwind v4, TanStack Query
*   **Backend:** Node.js v24, Express 5, Drizzle ORM (PostgreSQL), Zod
*   **Auth:** Clerk
*   **API Codegen:** Orval
*   **Build Tool:** esbuild

## Where things live

*   `artifacts/tadweerah/` – Frontend application
*   `artifacts/api-server/` – Backend API
*   `lib/db/` – Database schema and migrations (source of truth: `lib/db/src/schema/`)
*   `i18n/index.tsx` – Internationalization strings
*   `artifacts/api-server/src/openapi.yaml` – OpenAPI Specification (API contracts)
*   `artifacts/tadweerah/src/AppLayout.tsx` – Global authenticated UI layout
*   `artifacts/tadweerah/tailwind.config.ts` – Tailwind CSS configuration and theme

## Architecture decisions

*   **Monorepo:** Uses pnpm workspaces for a unified development environment.
*   **MWAN Alignment:** Core company roles and transport request statuses are directly mapped to MWAN eManifest classifications. Legacy roles are transparently mapped on read.
*   **Centralized Eligibility:** A pure Rules Engine (`checkPureEligibility`) handles all eligibility checks for offers and listings, improving maintainability and consistency.
*   **Bilingual First:** Arabic is the default language, with English support and RTL/LTR layout handled throughout. All user-facing strings are externalized.
*   **No Direct DB Access:** Frontend interacts exclusively with the backend API; no direct database calls from the client.

## Product

*   User authentication and company onboarding (MWAN-aligned multi-role classification).
*   Waste listing creation and management.
*   Buyer marketplace and offer/bidding system.
*   Deal lifecycle management (payment, dispatch, receipt confirmation).
*   Transport request orchestration aligned with MWAN eManifest requirements.
*   Multi-user company support with owner/member roles.
*   Admin dashboard for managing transport requests and lookup tables.

## User preferences

I prefer concise and clear communication. When implementing features, prioritize a modular approach. For any major architectural changes or significant feature additions, please ask for confirmation before proceeding. Ensure all user-facing strings are externalized for i18n.

## Gotchas

*   Always run `pnpm --filter @workspace/db run push` after changing the DB schema.
*   Frontend eligibility checks mirror backend logic but operate on already-loaded data.
*   "Revenue Share" pricing is only valid for "direct" sale types.
*   Sensitive material listings require `license_status=approved` for buyers to make offers.

## Pointers

*   **React Context:** _Populate as you build_
*   **Drizzle ORM Docs:** [https://orm.drizzle.team/](https://orm.drizzle.team/)
*   **Clerk Docs:** [https://clerk.com/docs](https://clerk.com/docs)
*   **Tailwind CSS Docs:** [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
*   **TanStack Query Docs:** [https://tanstack.com/query/latest](https://tanstack.com/query/latest)