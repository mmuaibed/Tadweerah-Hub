# Overview

Tadweerah (تدويرة) is a Saudi B2B MVP platform designed to connect waste producers, recycling buyers, and transport carriers. The project aims to streamline the recycling process by providing a centralized marketplace for waste listings, offers, and deal management. It emphasizes a robust, scalable, and user-friendly solution for the Saudi Arabian market.

The platform's core capabilities include user authentication and company onboarding, creation and management of waste listings, a buyer marketplace, an offer/bidding system, and a deal lifecycle management. Future ambitions include advanced transport bidding, comprehensive trip lifecycle management, and notification systems.

# User Preferences

I prefer concise and clear communication. When implementing features, prioritize a modular approach. For any major architectural changes or significant feature additions, please ask for confirmation before proceeding. Ensure all user-facing strings are externalized for i18n.

## Cost-Aware Development & Testing

- **During development:** lightweight checks only — typecheck, build, targeted API curl, quick smoke checks. No broad automated browser testing unless explicitly approved.
- **Before heavy testing:** declare what will be tested, why it matters, and the cost level (lightweight / medium / heavy), and offer cheaper manual alternatives where applicable.
- **Phased approach:** build → focused validation → full end-to-end only when a batch is complete.
- **Avoid:** long-running agent loops, repeated full-scenario passes, testing flows that do not add meaningful confidence.
- **Quality still mandatory:** flag risky or critical paths, recommend the right level of testing, but protect the project budget.
- **Act as a cost-aware CTO:** build fast, build well, protect budget.

## Risk-Based Testing Classification

Classify every change before deciding on validation depth:

| Risk | Examples | Validation |
|------|----------|------------|
| **Low** | UI tweaks, label changes, simple fields | build + light checks only |
| **Medium** | New endpoints, business logic changes | targeted validation only (no full flows) |
| **High** | Auth, payments, deal lifecycle, eligibility logic | propose test approach before running anything heavy |

# System Architecture

The project is built as a pnpm workspace monorepo using TypeScript.

**Technology Stack:**
- **Monorepo:** pnpm workspaces
- **Node.js:** 24
- **TypeScript:** 5.9
- **API Framework:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild (CJS bundle)
- **Frontend:** Vite, React, wouter, shadcn/ui, Tailwind v4, TanStack Query
- **Authentication:** Clerk (`@clerk/react` + shadcn theme)

**Design Principles & UI/UX:**
- **Branding:** Primary blue (`hsl(223, 67%, 50%)`), secondary green (`hsl(125, 47%, 45%)`).
- **Typography:** System font is Tajawal (300/400/500/700/900) for both Arabic and English.
- **Layout:** All authenticated pages use a consistent `<AppLayout>` for header (logo, language toggle, sign-out) and content framing.
- **Empty States:** Utilizes a dedicated `<EmptyState>` component for all data-empty scenarios.
- **Error Handling:** Bilingual, user-facing error messages are managed via `i18n/index.tsx`; raw API errors are never exposed.
- **Bilingual Support:** Arabic is the default language with an English toggle, supporting RTL/LTR via `<html dir>`. A custom i18n hook is used for internationalization.

**Technical Implementations & Features:**
- **Naming Conventions:** `snake_case` for DB columns and JSON API keys; `camelCase`/`PascalCase` for TypeScript symbols. Path parameters use full nouns (e.g., `/:waste_listing_id`).
- **API Endpoints:** Structured around resources like companies, listings, offers, and deals, with role-based access control.
- **Access Control:** API uses `requireAuth` and `requireCompany` middleware chains. All authenticated pages require only `requireCompany` (no role restriction). `requireCompany` accepts an optional `_allowedTypes` param for backward compatibility but no longer enforces it — role gating removed in favour of capability/ownership checks. Frontend uses `<RouteGuard requireCompany>` for all protected routes.
- **Offer System Enhancements:** Includes auto-rejection of offers on listing closure, mandatory rejection reasons, conditional acceptance reasons for lower bids, rank calculation for offers, and filtering/ordering of listings. PUT /offers/mine returns `already_top` flag when buyer was already the highest bidder, shown as a yellow banner in the UI.
- **Deal Lifecycle:** Supports `confirm-payment` (requires `payment_reference`), `confirm-dispatch`, and `confirm-receipt` states. Deal panel includes payment reference and optional proof URL fields.
- **Admin Functionality:** CRUD routes for lookup tables (company-categories, unit-options, material-categories) protected by an `X-Admin-Key` header.
- **Offer Re-submission:** Allows buyers to re-submit withdrawn offers.
- **Capabilities Management:** Companies can manage their capabilities via dedicated API endpoints and a frontend page.
- **Listing Form Improvements:** Dynamic material categories, subcategories, and unit options driven by lookup tables. Support for "Revenue Share" pricing model and "Required Services" selection.
- **Notifications:** Integrated notification system with a bell icon, unread count badge, and options to mark notifications as read. Notification click navigates to the related listing.
- **License Gates:** Listing creation is ALWAYS permitted — no license check on POST /listings. Participation gates apply only on POST /offers: (1) if any required service has `requires_license=true` and the buyer lacks `license_status=approved` → 403 LicenseRequired; (2) if the listing's material category has `is_sensitive=true` and the buyer lacks `license_status=approved` → 403 LicenseRequired. Buyers without a required capability receive 403 MissingCapability.
- **Onboarding:** Capability-based company creation form. No `type` field. Steps: basic info (name, city, phone, CR), optional category dropdown, required multi-select of company_actions (checkbox grid — 8 options), conditional license section (shown when `requires_license=true` actions are selected), T&C acceptance. Action IDs saved to `company_action_selections`. GET /api/lookup/company-actions endpoint requires auth only (no company).
- **Capability-based model:** `companies.type` is now nullable. All new companies have `type = null`. Offer ownership check uses `listing.company_id === company.id` instead of `company.type === "producer"`. POST /companies accepts `action_ids[]` instead of `type`.
- **Pages:** /terms (Terms & Conditions static page), /reports (placeholder page for analytics).
- **Multi-user Companies:** `company_members(company_id, user_id, role: owner|member, created_at)` table with UNIQUE(user_id). `requireCompany` middleware now looks up via company_members JOIN instead of `owner_user_id`. API endpoints: GET /companies/members, POST /companies/members (invite, owner-only), DELETE /companies/members/:user_id (remove, owner-only). Frontend: `/company/members` page with invite form and member list; "Team Members" card on dashboard.
- **Database Schema:** Includes tables for `companies` (with `license_status`, `license_number`, `license_document_url`, `company_category_id`, `accepted_terms_at`, nullable `type`), `company_members` (multi-user: owner + members per company), `waste_listings` (with `sale_type`, `unit_option_id`, `material_category_id`, `revenue_share_pct`, `targeting_type` enum [open/category/specific_company], `target_company_id`), `deals` (with `payment_reference`, `payment_proof_url`), plus lookup tables `capabilities`, `company_capabilities`, `company_categories`, `unit_options`, `material_categories` (with `is_sensitive` boolean), `company_actions` (8 seeds), `company_action_selections`, `listing_target_categories`.
- **Targeting System:** Direct Sale listings can target: `open` (all), `specific_company` (one named buyer by UUID, notified via `private_deal_invitation` notification), or `category` (companies whose category is in `listing_target_categories`). Auction listings always use `open`. Marketplace GET, detail GET, and POST /offers all enforce targeting access. Create listing form exposes `open` vs `specific_company` targeting picker (direct sale only).
- **Sensitive Material Gate:** If a listing's material category has `is_sensitive = true`, buyers must hold `license_status = approved` to submit an offer (403 LicenseRequired).
- **Revenue-Share Validation:** `revenue_share` pricing model is only accepted when `sale_type = direct`; passing it with auction returns 400 ValidationError.
- **Cleanup:** `role-route.tsx` (unused after capability-based migration) deleted.
- **Governance Decisions:** Strict rules on immutability for `pricing_model` and `visibility` after listing publication, clear definitions for `accepted` offer status, and disclaimers regarding platform liability.

# External Dependencies

- **PostgreSQL:** Primary database for storing all application data.
- **Clerk:** Used for user authentication, including sign-in, sign-up flows, and user management.
- **Orval:** API code generator, creating React Query hooks and Zod validators from the OpenAPI specification.
- **shadcn/ui:** UI component library used for building the frontend.
- **Tailwind CSS:** Utility-first CSS framework for styling.
- **TanStack Query:** Data fetching and caching library for React.
- **Vite:** Frontend build tool.
- **Express:** Backend web application framework.
- **Drizzle ORM:** TypeScript ORM for interacting with PostgreSQL.
- **Zod:** Schema declaration and validation library.