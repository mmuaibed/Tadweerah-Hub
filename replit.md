# Overview

Tadweerah (تدويرة) is a Saudi B2B MVP platform designed to connect waste producers, recycling buyers, and transport carriers. The project aims to streamline the recycling process by providing a centralized marketplace for waste listings, offers, and deal management. It emphasizes a robust, scalable, and user-friendly solution for the Saudi Arabian market.

The platform's core capabilities include user authentication and company onboarding, creation and management of waste listings, a buyer marketplace, an offer/bidding system, and a deal lifecycle management. Future ambitions include advanced transport bidding, comprehensive trip lifecycle management, and notification systems.

# User Preferences

I prefer concise and clear communication. When implementing features, prioritize a modular approach. For any major architectural changes or significant feature additions, please ask for confirmation before proceeding. Ensure all user-facing strings are externalized for i18n.

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
- **Access Control:** API uses `requireAuth` and `requireCompany` middleware chains. Frontend mirrors this with `<RoleRoute>` components, redirecting unauthorized roles.
- **Offer System Enhancements:** Includes auto-rejection of offers on listing closure, mandatory rejection reasons, conditional acceptance reasons for lower bids, rank calculation for offers, and filtering/ordering of listings. PUT /offers/mine returns `already_top` flag when buyer was already the highest bidder, shown as a yellow banner in the UI.
- **Deal Lifecycle:** Supports `confirm-payment` (requires `payment_reference`), `confirm-dispatch`, and `confirm-receipt` states. Deal panel includes payment reference and optional proof URL fields.
- **Admin Functionality:** CRUD routes for lookup tables (company-categories, unit-options, material-categories) protected by an `X-Admin-Key` header.
- **Offer Re-submission:** Allows buyers to re-submit withdrawn offers.
- **Capabilities Management:** Companies can manage their capabilities via dedicated API endpoints and a frontend page.
- **Listing Form Improvements:** Dynamic material categories, subcategories, and unit options driven by lookup tables. Support for "Revenue Share" pricing model and "Required Services" selection.
- **Notifications:** Integrated notification system with a bell icon, unread count badge, and options to mark notifications as read. Notification click navigates to the related listing.
- **License Gates:** POST /listings: producers with `rejected` or `expired` license_status receive 403 LicenseInvalid. POST /offers: buyers lacking a required capability receive 403 MissingCapability; capabilities that require_license AND buyer lacks approved status receive 403 LicenseRequired.
- **Onboarding:** Company creation form includes T&C acceptance checkbox, optional license number field, and optional company category dropdown (loaded from /api/lookup/company-categories, auth-only — no company required).
- **Pages:** /terms (Terms & Conditions static page), /reports (placeholder page for analytics).
- **Database Schema:** Includes tables for `companies` (with `license_status`, `license_number`, `license_document_url`, `company_category_id`, `accepted_terms_at`), `waste_listings` (with `sale_type`, `unit_option_id`, `material_category_id`, `revenue_share_pct`), `deals` (with `payment_reference`, `payment_proof_url`), plus lookup tables `capabilities`, `company_capabilities`, `company_categories`, `unit_options`, `material_categories`.
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