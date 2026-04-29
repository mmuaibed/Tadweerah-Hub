# Overview

Tadweerah (تدويرة) is a Saudi B2B MVP platform designed to connect waste producers, recycling buyers, and transport carriers. Its core purpose is to streamline the recycling process by providing a centralized marketplace for waste listings, offers, and deal management within the Saudi Arabian market. Key capabilities include user authentication, company onboarding, waste listing management, a buyer marketplace, an offer/bidding system, and a deal lifecycle management. The project aims to be robust, scalable, and user-friendly, with future ambitions including advanced transport bidding and comprehensive trip lifecycle management.

# User Preferences

I prefer concise and clear communication. When implementing features, prioritize a modular approach. For any major architectural changes or significant feature additions, please ask for confirmation before proceeding. Ensure all user-facing strings are externalized for i18n.

# System Architecture

The project is built as a pnpm workspace monorepo using TypeScript (v5.9) and Node.js (v24).

**Technology Stack:**
- **Backend:** Express 5, PostgreSQL with Drizzle ORM, Zod for validation.
- **Frontend:** Vite, React, wouter, shadcn/ui, Tailwind v4, TanStack Query.
- **Authentication:** Clerk.
- **API Codegen:** Orval (from OpenAPI spec).
- **Build Tool:** esbuild.

**Design Principles & UI/UX (LOCKED — applies to ALL pages):**
- **Branding:** Primary blue (`hsl(223, 67%, 50%)`), secondary green (`hsl(125, 47%, 45%)`).
- **Typography:** Tajawal font for both Arabic and English.
- **Layout:** Consistent `<AppLayout>` for authenticated pages.
- **Error Handling:** Bilingual, user-facing messages via `i18n/index.tsx`; raw API errors are never exposed.
- **Bilingual Support:** Arabic default with English toggle, supporting RTL/LTR.

**Global UI Theme (FINAL — LOCKED):**
- **Visual Style:** Clean, minimal, no clutter. Generous whitespace. No heavy shadows or gradients. Cards with soft borders only (`border border-border`).
- **Typography Hierarchy:** Page headline — bold, max 2 lines. Section titles — medium-bold (`font-semibold`). Body text — clean, readable. Supporting text — `text-muted-foreground`.
- **Colors:** Primary blue for buttons (main actions only). Green (`text-secondary`) for identity/highlights. Text: dark gray (`text-foreground`). Secondary text: `text-muted-foreground`. Borders: `border-border` (light gray).
- **Layout Rules:** Fit above the fold when possible. Avoid unnecessary scroll. Max 2 main columns per section. Clear section spacing.
- **Cards:** `rounded-xl border border-border bg-card` everywhere. Consistent `p-4` or `px-4 py-3` padding. No shadows unless hover state (`hover:shadow-sm`). No variant card styles.
- **Buttons:** Primary = filled blue, one per view. Secondary = outline (`variant="outline"`), never compete with primary. Add `border-gray-400 hover:border-primary/60 hover:bg-muted/50` to secondary buttons for contrast.
- **Spacing:** Consistent vertical rhythm. Clear separation: header → content → actions. No crowded sections.
- **UX Principle:** Every page answers "What can I do here?" and "What is the next action?" within 3 seconds. One clear primary action per page.

**Technical Implementations & Features:**
- **Naming Conventions:** `snake_case` for DB columns/JSON API keys; `camelCase`/`PascalCase` for TypeScript.
- **API Endpoints:** Resource-oriented (companies, listings, offers, deals) with role-based access control.
- **Access Control:** `requireAuth` and `requireCompany` middleware chains. Access decisions are based on ownership (`company_id` match) and capabilities, not deprecated company roles. Multi-user permissions (`owner`, `member`) are enforced via `memberRole`.
- **Offer System:** Auto-rejection on listing closure, mandatory rejection reasons, conditional acceptance reasons, rank calculation, and `already_top` flag for buyers.
- **Deal Lifecycle:** Supports `confirm-payment`, `confirm-dispatch`, `confirm-receipt` states. Deal panel includes payment reference and proof URL.
- **Admin Functionality:** CRUD routes for lookup tables protected by `X-Admin-Key`.
- **Capabilities Management:** Companies manage capabilities via API and frontend.
- **Listing Form:** Dynamic material categories, subcategories, unit options, "Revenue Share" pricing model, and "Required Services" selection.
- **Notifications:** Integrated system with unread count, read/unread status, and navigation to related listings.
- **License Gates:** Listing creation is always permitted. Offer submission requires `license_status=approved` for sensitive materials or services requiring a license.
- **Onboarding:** Capability-based company creation; no `type` field.
- **Value Layer Enhancements:** Enhanced `DealPanel` with `DealValueSummary`, `GovernanceTimeline`, `printDealReport` (full HTML), contextual messages, and compliance badges. Dashboard and Reports page show live stats (`GET /dashboard/stats`).
- **Listing Details:** Displays material category name from joined lookup tables.
- **Deal Reference:** `TDW-{YEAR}-{XXXXXX}` format for deal IDs.
- **"Other" Unit:** `waste_listings` includes `unit_notes` for custom unit descriptions.
- **Multi-user Companies:** `company_members` table manages `owner` and `member` roles for companies. API endpoints for managing members.
- **Targeting System:** Direct Sale listings can target `open`, `specific_company`, or `category`. Auction listings are always `open`.
- **Sensitive Material Gate:** `is_sensitive=true` on material category requires `license_status=approved` for buyers to make an offer.
- **Revenue-Share Validation:** "Revenue Share" pricing is only allowed for `direct` sale types.
- **Contract Track (Backend P1–P3 complete):** Fully isolated from Marketplace. Schema: `contracts`, `contract_materials`, `contract_sequences`, `contract_shipments`. Contract lifecycle: `draft → pending_confirmation → active → completed | cancelled`. Shipment lifecycle: `planned → dispatched → received → closed | cancelled`. Weight policies: 5 deterministic enum values; `final_weight` computed at close. Immutable reference numbers: `TDW-CTR-YYYY-NNNN` (contracts) / `TDW-CTR-YYYY-NNNN-SMMM` (shipments). Material lines locked on contract activation. Passive revenue share storage only (seller_pct / buyer_pct). Admin routes: `GET /admin/contracts`, `POST /admin/contracts/:id/cancel`. All endpoints protected by `requireAuth + requireCompany`.

# External Dependencies

- **PostgreSQL:** Main database.
- **Clerk:** User authentication and management.
- **Orval:** API client and validator generation.
- **shadcn/ui:** UI component library.
- **Tailwind CSS:** Styling framework.
- **TanStack Query:** Data fetching and caching.
- **Vite:** Frontend build tool.
- **Express:** Backend web framework.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **Zod:** Schema validation.