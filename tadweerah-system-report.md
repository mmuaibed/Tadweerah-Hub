# Tadweerah — Factual System Report
**Prepared for:** External Operational Design Partner  
**Date:** April 28, 2026  
**Scope:** Current system as-built. No speculation about future state.  
**Method:** Full source code audit + live database inspection.

---

## 1. Executive Summary

Tadweerah is a bilingual (Arabic default/English) B2B waste marketplace operating in Saudi Arabia. The platform connects companies that produce waste ("producers") with companies that buy recyclable material ("buyers"). A third role — carrier — is defined in the database but has **no implemented behavior** anywhere in the current system.

The platform is an MVP in active development. A Clerk-authenticated company completes onboarding, then either lists waste for others to bid on, or browses and bids on other companies' listings. When a producer accepts a bid, a "deal" is created and both parties manually advance the deal through a 4-step lifecycle. There is no payment processing integration — all payment is tracked by reference number only.

**Key facts:**
- 17 database tables, 12 PostgreSQL enums
- 40 API routes across 10 route files
- 16 frontend pages
- Authentication: Clerk (development keys — `pk_test_` — still in use)
- No admin interface exists in the frontend
- No carrier-role functionality is implemented
- No automated notifications via SMS, email, or push — only in-app notifications stored in the database
- No payment processing — payment confirmation is a manual acknowledgement by the producer

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Wouter (routing), TanStack Query, Shadcn/UI components, Tajawal font |
| API Server | Node.js + Express, TypeScript |
| Database | PostgreSQL (managed, accessed via `DATABASE_URL` env var) |
| ORM | Drizzle ORM |
| Authentication | Clerk (dev keys `pk_test_` — **production swap not yet done**) |
| Monorepo | pnpm workspaces |
| Language | Bilingual AR (RTL default) / EN, runtime toggle |

---

## 3. Database Schema — Complete

The live database contains 17 tables. All definitions below are taken directly from PostgreSQL (`\d` output), not from source code assumptions.

### 3.1 Enums (12 total)

| Enum Name | Allowed Values |
|---|---|
| `company_type` | `producer`, `buyer`, `carrier` |
| `deal_settlement_type` | `fixed`, `by_weight`, `revenue_share` |
| `deal_status` | `active`, `payment_confirmed`, `dispatched`, `completed` |
| `license_status` | `pending`, `approved`, `rejected`, `expired` |
| `listing_visibility` | `public`, `private` |
| `offer_status` | `pending`, `accepted`, `rejected`, `withdrawn` |
| `pricing_model` | `fixed`, `by_weight`, `revenue_share` |
| `sale_type` | `auction`, `direct` |
| `targeting_type` | `open`, `category`, `specific_company` |
| `waste_listing_status` | `open`, `closed` |
| `waste_material` | `paper`, `plastic`, `metal`, `glass`, `electronics`, `organic`, `other` |
| `waste_unit` | `kg`, `ton` |

**Risk note:** `company_type` enum (`producer`, `buyer`, `carrier`) exists and the `companies.type` column references it, but this column is **nullable**, has no enforcement logic anywhere in routes or frontend, and is not set during company creation. The system does not use company type to gate any operations. All eligibility logic is based on capabilities and license status only.

---

### 3.2 Table: `companies`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `owner_user_id` | text | NOT NULL | — | Clerk user ID. UNIQUE constraint. |
| `name` | text | NOT NULL | — | 2–120 chars enforced in API |
| `type` | company_type | NULL | — | **UNUSED.** Nullable, never set, no enforcement. |
| `city` | text | NOT NULL | — | 2–80 chars enforced in API |
| `commercial_registration` | text | NULL | — | Optional. No format validation. |
| `contact_phone` | text | NOT NULL | — | 6–20 chars enforced in API |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `company_category_id` | uuid | NULL | — | FK → `company_categories.id` ON DELETE SET NULL |
| `license_number` | text | NULL | — | Optional. No format validation. |
| `license_document_url` | text | NULL | — | **UNUSED.** Column exists in DB, not read or written by any route or frontend page. |
| `license_status` | license_status | NULL | — | Set to `pending` when license_number is provided; otherwise null. Admin-only to advance. |
| `accepted_terms_at` | timestamptz | NULL | — | Set on company creation if user accepted T&C. |

**Indexes:** PK on `id`, UNIQUE on `owner_user_id`.

**Risk — `license_document_url`:** Column exists in the database schema but is never read or written by any route or frontend. It appears to have been added in a migration but never wired up.

**Risk — `type` column:** The `company_type` enum (`producer`, `buyer`, `carrier`) is defined and the column exists, but it is nullable, defaults to null, is never set during company creation, and no route checks it. It serves no functional purpose in the current system.

---

### 3.3 Table: `waste_listings`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `company_id` | uuid | NOT NULL | — | FK → `companies.id` ON DELETE CASCADE |
| `material` | waste_material | NOT NULL | — | One of 7 legacy values |
| `quantity` | numeric(12,3) | NOT NULL | — | |
| `unit` | waste_unit | NOT NULL | — | `kg` or `ton` only |
| `city` | text | NOT NULL | — | Free text. No validation against cities list. |
| `description` | text | NULL | — | Optional |
| `price_hint` | numeric(12,2) | NULL | — | Optional suggested price. Not enforced in offer pricing. |
| `status` | waste_listing_status | NOT NULL | `open` | |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `closed_at` | timestamptz | NULL | — | Set when offer is accepted |
| `pricing_model` | pricing_model | NOT NULL | `fixed` | |
| `visibility` | listing_visibility | NOT NULL | `public` | `private` visibility exists in DB but is never used — no route or UI sets it to `private`. All listings are `public`. |
| `image_url` | text | NULL | — | Set via file upload endpoint. Path stored as relative URL. |
| `sale_type` | sale_type | NOT NULL | `auction` | |
| `unit_option_id` | uuid | NULL | — | FK → `unit_options.id` ON DELETE SET NULL. Optional extended unit. |
| `material_category_id` | uuid | NULL | — | FK → `material_categories.id` ON DELETE SET NULL |
| `material_subcategory_id` | uuid | NULL | — | FK → `material_categories.id` ON DELETE SET NULL. Uses same table as parent. |
| `revenue_share_pct` | numeric(5,2) | NULL | — | Only non-null when pricing_model = `revenue_share` |
| `targeting_type` | targeting_type | NOT NULL | `open` | |
| `target_company_id` | uuid | NULL | — | FK → `companies.id` ON DELETE SET NULL. Only used when targeting_type = `specific_company`. |
| `unit_notes` | text | NULL | — | Required when unit_option has key = `other`. Free text description. |

**Risk — `visibility` column:** The column and enum value `private` exist in the database, but no API route or frontend ever sets visibility to `private`. All listings written to the database receive `public` as the default. The private listing concept is architecturally incomplete.

---

### 3.4 Table: `listing_offers`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `waste_listing_id` | uuid | NOT NULL | — | FK → `waste_listings.id` ON DELETE CASCADE |
| `buyer_company_id` | uuid | NOT NULL | — | FK → `companies.id` ON DELETE CASCADE |
| `price_per_unit` | numeric(12,3) | NOT NULL | — | |
| `message` | text | NULL | — | Optional buyer message |
| `status` | offer_status | NOT NULL | `pending` | |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `updated_at` | timestamptz | NOT NULL | `now()` | Updated on every mutation |
| `resolved_at` | timestamptz | NULL | — | Set when accepted or rejected |
| `rejection_reason` | text | NULL | — | Set on rejection. Free text combining reason code + optional detail. |
| `acceptance_reason` | text | NULL | — | Column exists. **Currently never written** — no route sets this field. |

**Indexes:** PK on `id`, UNIQUE on `(waste_listing_id, buyer_company_id)`.

**Risk — `acceptance_reason`:** Column exists and is exposed in API serialization, but no route ever writes it. It will always be null.

---

### 3.5 Table: `deals`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key |
| `offer_id` | uuid | NOT NULL | — | FK → `listing_offers.id` ON DELETE RESTRICT. UNIQUE (one deal per offer). |
| `listing_id` | uuid | NOT NULL | — | FK → `waste_listings.id` ON DELETE RESTRICT |
| `producer_company_id` | uuid | NOT NULL | — | FK → `companies.id` ON DELETE RESTRICT |
| `buyer_company_id` | uuid | NOT NULL | — | FK → `companies.id` ON DELETE RESTRICT |
| `settlement_type` | deal_settlement_type | NOT NULL | — | Copied from listing's pricing_model at deal creation |
| `price_per_unit` | numeric(12,3) | NOT NULL | — | Copied from accepted offer |
| `estimated_amount` | numeric(14,3) | NOT NULL | — | `price_per_unit × listing.quantity` at deal creation |
| `actual_quantity` | numeric(12,3) | NULL | — | Only for `by_weight` deals — supplied when producer confirms payment |
| `final_amount` | numeric(14,3) | NULL | — | For `fixed`: set at creation = estimated_amount. For `by_weight`: computed when producer confirms payment. |
| `status` | deal_status | NOT NULL | `active` | |
| `payment_confirmed_at` | timestamptz | NULL | — | |
| `payment_confirmed_by` | uuid | NULL | — | FK → `companies.id` ON DELETE RESTRICT |
| `dispatched_at` | timestamptz | NULL | — | |
| `dispatched_by` | uuid | NULL | — | FK → `companies.id` ON DELETE RESTRICT |
| `received_at` | timestamptz | NULL | — | |
| `received_by` | uuid | NULL | — | FK → `companies.id` ON DELETE RESTRICT |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `updated_at` | timestamptz | NOT NULL | `now()` | |
| `payment_reference` | text | NULL | — | Bank transfer ID / transaction number. **Required** when producer calls confirm-payment. |
| `payment_proof_url` | text | NULL | — | Optional URL. Accepted as string — no URL format validation. |

**Indexes:** PK on `id`, UNIQUE on `offer_id`, B-tree indexes on `buyer_company_id`, `listing_id`, `producer_company_id`.

---

### 3.6 Table: `company_categories`

Lookup table. Managed via admin API. **9 rows** currently seeded in production database.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `key` | text | NOT NULL | Unique slug |
| `name_ar` | text | NOT NULL | Arabic label |
| `name_en` | text | NOT NULL | English label |
| `is_active` | boolean | NOT NULL | Default `true` |
| `sort_order` | integer | NOT NULL | Default `0` |

---

### 3.7 Table: `material_categories`

Hierarchical lookup (parent/child via `parent_id` self-reference). **26 rows** currently seeded. Supports two levels: category and subcategory. `is_sensitive` flag gates offers behind license check.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `key` | text | NOT NULL | Unique slug |
| `name_ar` | text | NOT NULL | |
| `name_en` | text | NOT NULL | |
| `parent_id` | uuid | NULL | Self-reference FK (not enforced via FK constraint in DB — the FK is absent in the actual schema; it is a logical relationship only) |
| `is_active` | boolean | NOT NULL | Default `true` |
| `sort_order` | integer | NOT NULL | Default `0` |
| `is_sensitive` | boolean | NOT NULL | Default `false`. When `true`, buyers without `license_status = approved` are blocked from submitting offers on listings that use this category. |

---

### 3.8 Table: `unit_options`

Extended unit lookup. **9 rows** seeded. Used alongside the legacy `waste_unit` enum on waste_listings.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `key` | text | NOT NULL | Unique slug. If key = `other`, listing must include `unit_notes`. |
| `name_ar` | text | NOT NULL | |
| `name_en` | text | NOT NULL | |
| `symbol` | text | NOT NULL | Display unit symbol |
| `is_active` | boolean | NOT NULL | |
| `sort_order` | integer | NOT NULL | |

---

### 3.9 Table: `capabilities`

Service capabilities that companies can declare and listings can require. **10 rows** seeded.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `key` | text | NOT NULL | Unique slug |
| `name_ar` | text | NOT NULL | |
| `name_en` | text | NOT NULL | |
| `description_ar` | text | NULL | |
| `description_en` | text | NULL | |
| `is_active` | boolean | NOT NULL | |
| `sort_order` | integer | NOT NULL | |
| `requires_license` | boolean | NOT NULL | Default `false`. When `true`, the buyer must have `license_status = approved` to submit an offer on a listing that requires this capability. |

---

### 3.10 Table: `company_capabilities`

Junction table. Links companies to their declared capabilities (many-to-many).

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid | FK → `companies.id` ON DELETE CASCADE |
| `capability_id` | uuid | FK → `capabilities.id` ON DELETE CASCADE |

UNIQUE on `(company_id, capability_id)`. No PK column — the unique constraint is the compound identity.

---

### 3.11 Table: `company_actions`

Intent declarations shown during onboarding. **8 rows** seeded. Describes what the company intends to do on the platform (e.g., "buy recyclables", "transport waste").

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `key` | text | NOT NULL | Unique slug |
| `name_ar` | text | NOT NULL | |
| `name_en` | text | NOT NULL | |
| `description_ar` | text | NULL | |
| `description_en` | text | NULL | |
| `requires_license` | boolean | NOT NULL | Present on the table but **not enforced** anywhere in route logic. |
| `is_active` | boolean | NOT NULL | |
| `sort_order` | integer | NOT NULL | |

**Risk:** `company_actions.requires_license` column exists but is not used in any gating logic. It is informational only.

---

### 3.12 Table: `company_action_selections`

Junction table. Records which company_actions a company selected during onboarding.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid | FK → `companies.id` ON DELETE CASCADE |
| `action_id` | uuid | FK → `company_actions.id` ON DELETE CASCADE |

Composite PK on `(company_id, action_id)`.

**Risk:** Selected actions are stored but are **never read back by any route** after onboarding. No query uses this table except the insert during company creation. The selections have no operational effect.

---

### 3.13 Table: `company_members`

Controls multi-user access to a company account.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `company_id` | uuid | NOT NULL | FK → `companies.id` ON DELETE CASCADE |
| `user_id` | text | NOT NULL | Clerk user ID. UNIQUE — one company per user, enforced. |
| `role` | text | NOT NULL | `owner` or `member`. Plain text, not an enum. |
| `created_at` | timestamptz | NOT NULL | |

**Risk — role as plain text:** The `role` column is `text`, not a PostgreSQL enum. The values `owner` and `member` are enforced by application logic only. A direct database insert could write any value.

---

### 3.14 Table: `listing_required_services`

Junction table. Links listings to capabilities they require bidders to have.

| Column | Type | Notes |
|---|---|---|
| `listing_id` | uuid | FK → `waste_listings.id` ON DELETE CASCADE |
| `capability_id` | uuid | FK → `capabilities.id` ON DELETE CASCADE |

UNIQUE on `(listing_id, capability_id)`.

---

### 3.15 Table: `listing_target_categories`

Junction table. When a listing's `targeting_type = category`, this table stores which company categories are allowed to bid.

| Column | Type | Notes |
|---|---|---|
| `listing_id` | uuid | FK → `waste_listings.id` ON DELETE CASCADE |
| `company_category_id` | uuid | FK → `company_categories.id` ON DELETE CASCADE |

UNIQUE on `(listing_id, company_category_id)`.

---

### 3.16 Table: `notifications`

In-app notifications only. No external delivery (no SMS, no email, no push).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `company_id` | uuid | NOT NULL | FK → `companies.id` ON DELETE CASCADE |
| `type` | text | NOT NULL | Event type string (e.g., `offer_received`, `offer_accepted`, `deal_dispatched`) |
| `title_ar` | text | NOT NULL | |
| `title_en` | text | NOT NULL | |
| `body_ar` | text | NULL | |
| `body_en` | text | NULL | |
| `is_read` | boolean | NOT NULL | Default `false` |
| `related_entity_type` | text | NULL | e.g., `listing`, `offer`, `deal` |
| `related_entity_id` | uuid | NULL | ID of the related record |
| `created_at` | timestamptz | NOT NULL | |
| `read_at` | timestamptz | NULL | |

**Risk:** `related_entity_id` is `uuid` type. If notifications are ever created for entities whose IDs are not UUIDs, this will fail silently or throw. All current entity IDs are UUIDs, so this is not currently a problem.

---

### 3.17 Table: `audit_log`

Append-only event log. All write operations by authenticated users are logged.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `user_id` | text | NULL | Clerk user ID |
| `company_id` | uuid | NULL | FK → `companies.id` ON DELETE SET NULL |
| `action` | text | NOT NULL | Event name (e.g., `offer.submitted`, `deal.payment_confirmed`) |
| `entity_type` | text | NULL | |
| `entity_id` | uuid | NULL | |
| `details` | jsonb | NULL | Structured event data |
| `created_at` | timestamptz | NOT NULL | |

**Risk:** Audit logging is fire-and-forget (`void logAudit(...)`). If the insert fails, the failure is silently swallowed and does not affect the user-facing operation. There is no retry mechanism.

---

### 3.18 Table: `issue_reports`

Stores user-submitted bug/issue reports.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `user_id` | text | NOT NULL | Clerk user ID |
| `company_id` | uuid | NULL | FK → `companies.id` ON DELETE SET NULL. Resolved best-effort. |
| `message` | text | NOT NULL | 5–2000 chars enforced |
| `status` | text | NOT NULL | Default `open`. Only value ever written. No route changes this. |
| `created_at` | timestamptz | NOT NULL | |

**Risk:** `status` column exists and defaults to `open`, but there is no route that reads or updates issue report status. Reports go in and are never acted upon through the system — they would need to be managed directly in the database.

---

## 4. API Routes — Complete Inventory

**Base path:** All routes served under `/api/` prefix by the reverse proxy.  
**Authentication:** All routes except health, `/lookup/company-categories`, and `/lookup/company-actions` require a valid Clerk JWT in the `Authorization: Bearer <token>` header.  
**Company requirement:** Most routes require the authenticated user to already belong to a company (enforced by `requireCompany` middleware, which checks `company_members` table).

### 4.1 Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/healthz` | None | Returns `{ ok: true }` |

---

### 4.2 Me

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | Clerk JWT | Returns `{ userId, email, company }`. Fetches company by `owner_user_id`. **Note:** uses `owner_user_id` match, not `company_members`. Members (non-owners) get `company: null` from this endpoint. |

**Risk — `/api/me` for non-owner members:** The `GET /api/me` route finds a company by `WHERE owner_user_id = :userId`. If a user is added to a company as a member (not owner), this endpoint returns `company: null` for them. The frontend `RouteGuard` and `requireCompany` middleware use the `company_members` table (correctly), but the `/me` endpoint response does not reflect member status. This creates a potential inconsistency where a member user would see themselves as having no company in certain UI states.

---

### 4.3 Companies

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| POST | `/api/companies` | Clerk JWT | No | Creates a company. Validates: name (2–120), city (2–80), contactPhone (6–20). Checks user does not already belong to a company via `company_members`. Sets `license_status = pending` if `license_number` provided. Saves action_ids to `company_action_selections`. |
| GET | `/api/companies/mine` | Clerk JWT | Yes | Returns company profile including category join. |
| PUT | `/api/companies/mine` | Clerk JWT | Yes | Partial update of: name, city, contactPhone, commercialRegistration, license_number, company_category_id. **Never changes `license_status`** — admin only. |
| GET | `/api/companies/mine/capabilities` | Clerk JWT | Yes | Returns company's declared capabilities. |
| PUT | `/api/companies/mine/capabilities` | Clerk JWT | Yes | Atomically replaces company's capabilities. Accepts `capability_ids: string[]`. Performs DELETE + INSERT in a transaction. |
| GET | `/api/companies/search?q=` | Clerk JWT | Yes | Case-insensitive name search, excludes caller's own company. Min 2 chars. Returns up to 10 results: `{ id, name, city }`. |

**Validation enforced in POST /companies:**
- `name`: required, string, 2–120 chars
- `city`: required, string, 2–80 chars
- `contactPhone`: required, string, 6–20 chars
- All other fields (commercialRegistration, license_number, company_category_id, action_ids, accepted_terms) are optional
- No format validation on commercialRegistration or license_number

**Not validated / not enforced in POST /companies:**
- company_category_id is not verified to exist in the database before insert (a non-existent UUID will cause a FK constraint violation and return a 500 error)
- accepted_terms acceptance is stored as a timestamp but the form requires it on the client side; the API accepts `accepted_terms: false` without error

---

### 4.4 Members

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/companies/members` | Clerk JWT | Yes | Lists all members of caller's company: `{ user_id, role, created_at }`. Does not return Clerk display names or emails. |
| POST | `/api/companies/members` | Clerk JWT | Yes (owner) | Adds a member by Clerk user_id. Owner-only. Checks invitee not already in any company. |
| DELETE | `/api/companies/members/:user_id` | Clerk JWT | Yes (owner) | Removes a member. Owner cannot remove themselves. |

**Risk — member display names:** `GET /companies/members` returns only Clerk user IDs, not names or emails. The frontend Members page shows user IDs only — there is no name lookup from Clerk for listed members.

---

### 4.5 Listings

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/listings` | Clerk JWT | Yes | Marketplace feed. Shows open+public listings not owned by the caller, filtered by targeting rules. Max 200 results, ordered by `created_at DESC`. Optionally filtered by `?material=` and/or `?city=` (ILIKE). |
| GET | `/api/listings/mine` | Clerk JWT | Yes | Caller's own listings. Ordered: open first, then by offer_count DESC, then created_at DESC. Optional `?status=open\|closed` filter. |
| POST | `/api/listings` | Clerk JWT | Yes | Creates a new listing. Parses body via Zod schema. **No eligibility checks** — any authenticated company can create any listing type. |
| GET | `/api/listings/:id` | Clerk JWT | Yes | Single listing detail with required services and target categories. |
| PUT | `/api/listings/:id` | Clerk JWT | Yes | Updates a listing. Owner-only. Not allowed if listing is closed or has accepted offers. Allowed fields: material, quantity, unit, city, description, price_hint, pricing_model, visibility, image_url. |
| DELETE | `/api/listings/:id` | Clerk JWT | Yes | Soft-closes a listing (sets status = closed). Owner-only. **RISK: this does not reject pending offers** — they remain in `pending` status after the listing is manually closed. |
| POST | `/api/listings/:id/upload-image` | Clerk JWT | Yes | Multer-based file upload. Saves to `public/uploads/` on the API server's local filesystem. Returns `{ image_url }`. Max 5 MB. Images only (MIME type check). |

**Validation enforced in POST /listings (via Zod `CreateWasteListingBody`):**
- `material`: required, must be one of the 7 legacy waste_material enum values
- `quantity`: required, positive number
- `unit`: required, `kg` or `ton`
- `city`: required, string
- Additional checks in route handler:
  - If `unit_option_id` points to a unit with `key = other`, `unit_notes` is required
  - `revenue_share` pricing only allowed with `sale_type = direct`
  - `revenue_share_pct`: required 1–100 when pricing_model = revenue_share
  - `targeting_type = specific_company` requires `target_company_id`
  - `targeting_type = category` requires at least one `target_category_id`

**Not validated in POST /listings:**
- `material_category_id` existence in DB (FK violation returns 500 if invalid)
- `target_company_id` existence in DB (FK violation returns 500 if invalid)
- `target_category_ids` existence in DB (FK violation returns 500 if invalid)
- No check that `target_company_id` is not the creator's own company

**Risk — DELETE /listings does not reject pending offers:** When a producer manually closes a listing, pending offers from buyers are left in `pending` status. Buyers will see their offer as "pending" on a closed listing. There is no automated cleanup.

**Risk — image storage:** Images are stored on the local filesystem (`public/uploads/`) of the API server container. This means images are lost if the container is restarted or the service is redeployed unless persistent storage is configured. This is a development-only approach.

---

### 4.6 Offers

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/listings/:id/offers/summary` | Clerk JWT | Yes | Anonymous summary: `{ count, highest_price }`. Withdrawn offers excluded. |
| GET | `/api/listings/:id/offers` | Clerk JWT | Yes | Listing owner sees all offers with buyer names. Non-owner sees only their own offer with rank and total_offers. Carrier/third party gets an empty array (not a 403). |
| POST | `/api/listings/:id/offers` | Clerk JWT | Yes | Submit a new offer. Enforces all eligibility gates (see below). |
| PUT | `/api/listings/:id/offers/mine` | Clerk JWT | Yes | Improve own existing pending offer. Must be higher than current highest. Returns `already_top: true` flag if the caller is already the top bidder. |
| DELETE | `/api/listings/:id/offers/mine` | Clerk JWT | Yes | Withdraw own offer (sets status = `withdrawn`). |
| GET | `/api/offers/mine` | Clerk JWT | Yes | All offers submitted by the caller. Ordered: pending first, then by updated_at DESC. Default excludes withdrawn. Optional `?status=` filter. |
| POST | `/api/offers/:id/accept` | Clerk JWT | Yes | Producer accepts an offer. Atomically: marks offer accepted, rejects all other pending offers (reason: `offer_accepted`), closes the listing, creates a deal record. |
| POST | `/api/offers/:id/reject` | Clerk JWT | Yes | Producer rejects a single pending offer. `rejection_reason` is required. |

**Eligibility gates enforced in POST /listings/:id/offers (in order):**
1. Listing must exist → 404 if not
2. Listing must be `open` → 409 if closed
3. Caller must not be the listing owner → 403 `Forbidden`
4. Targeting gate:
   - `specific_company`: caller must be `target_company_id` → 403 `TargetingRestricted`
   - `category`: caller's `company_category_id` must be in `listing_target_categories` → 403 `TargetingRestricted`
5. Required services gate: buyer must have all capabilities in `listing_required_services` declared in their `company_capabilities` → 403 `MissingCapability`
6. License gate on capabilities: if any required capability has `requires_license = true`, buyer must have `license_status = approved` → 403 `LicenseRequired`
7. Sensitive material gate: if listing's `material_category.is_sensitive = true`, buyer must have `license_status = approved` → 403 `LicenseRequired`
8. Duplicate offer check: if existing non-withdrawn offer exists → 409 `OfferExists`; if previously rejected → 409 `OfferRejected` (cannot re-bid after rejection)
9. Price must exceed current highest non-withdrawn offer → 400 `PriceTooLow`

**Risk — N+1 query in GET /offers/mine:** For each offer returned, the route executes 2–3 additional database queries (rank count, total count, sometimes accepted price lookup). On a buyer with many offers, this is a significant performance problem. For example, 20 offers = potentially 60+ database round-trips.

---

### 4.7 Deals

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/deals/:id` | Clerk JWT | Yes | Fetch deal. Both producer and buyer can view. Returns counterparty name and phone. |
| POST | `/api/deals/:id/confirm-payment` | Clerk JWT | Yes (producer) | Producer confirms payment received. Requires `payment_reference` (free text). For `by_weight` deals: requires `actual_quantity`, computes `final_amount`. For `fixed` deals: `actual_quantity` must NOT be sent. Sets status = `payment_confirmed`. |
| POST | `/api/deals/:id/confirm-dispatch` | Clerk JWT | Yes (producer) | Producer confirms goods dispatched. Requires status = `payment_confirmed`. Sets status = `dispatched`. |
| POST | `/api/deals/:id/confirm-receipt` | Clerk JWT | Yes (buyer) | Buyer confirms receipt. Requires status = `dispatched`. Sets status = `completed`. |

**Deal lifecycle (strictly enforced by status checks):**
```
active → payment_confirmed → dispatched → completed
```
Each transition is only possible from the immediately preceding state. Skipping steps returns 409 `InvalidState`.

**Not implemented in deals:**
- No dispute/cancellation mechanism — once a deal is created, there is no way to cancel it through the system
- No timeout — deals stay in `active` state indefinitely until the producer acts
- No admin override for stuck deals
- `revenue_share` settlement type exists in the enum and `deal_settlement_type` allows it, but no route handles it differently from `fixed` — the logic is identical. The enum value is present but the behavior is not differentiated.

---

### 4.8 Lookup (Read)

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/lookup/company-categories` | None | No | All active company categories. Used during onboarding (unauthenticated call). |
| GET | `/api/lookup/company-actions` | None | No | All active company actions. Used during onboarding (unauthenticated call). |
| GET | `/api/lookup/unit-options` | Clerk JWT | Yes | All active unit options |
| GET | `/api/lookup/material-categories` | Clerk JWT | Yes | All active material categories (flat list, includes both parents and children) |
| GET | `/api/lookup/capabilities` | Clerk JWT | Yes | All active capabilities |

---

### 4.9 Lookup (Admin Write)

All admin routes are protected by `X-Admin-Key` header matching the `ADMIN_API_KEY` environment variable.

**If `ADMIN_API_KEY` is not set:** All admin routes return `503 AdminNotConfigured`. There is no fallback.

**Current status of `ADMIN_API_KEY`:** NOT CONFIRMED AS CONFIGURED. If this environment variable is absent, all admin routes are permanently unavailable.

| Method | Path | Description |
|---|---|---|
| POST | `/api/admin/lookup/company-categories` | Create. Required: `key`, `name_ar`, `name_en`. |
| PUT | `/api/admin/lookup/company-categories/:id` | Partial update any field. |
| DELETE | `/api/admin/lookup/company-categories/:id` | Soft delete (sets `is_active = false`). |
| POST | `/api/admin/lookup/unit-options` | Create. Required: `key`, `name_ar`, `name_en`, `symbol`. |
| PUT | `/api/admin/lookup/unit-options/:id` | Partial update. |
| DELETE | `/api/admin/lookup/unit-options/:id` | Soft delete. |
| POST | `/api/admin/lookup/material-categories` | Create. Required: `key`, `name_ar`, `name_en`. Optional: `parent_id`. |
| PUT | `/api/admin/lookup/material-categories/:id` | Partial update. |
| DELETE | `/api/admin/lookup/material-categories/:id` | Soft delete. |

**No admin routes exist for:**
- capabilities (no create/update/delete via API)
- company_actions (no create/update/delete via API)
- license status changes (no route to approve/reject/expire a license)
- issue reports (no route to list or update status)
- viewing or querying any company's data
- viewing or managing deals
- viewing audit logs

---

### 4.10 Notifications

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/notifications` | Clerk JWT | Yes | Company's notifications, newest first, max 100. Optional `?unread=true`. |
| PATCH | `/api/notifications/:id/read` | Clerk JWT | Yes | Mark one notification as read. |
| POST | `/api/notifications/read-all` | Clerk JWT | Yes | Mark all unread as read. |

---

### 4.11 Stats

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| GET | `/api/dashboard/stats` | Clerk JWT | Yes | Returns: `listings_count`, `offers_received_count`, `offers_made_count`, `completed_deals_count`, `total_deal_value` (sum of estimated_amount for completed deals). |

---

### 4.12 Issue Reports

| Method | Path | Auth | Company Required | Description |
|---|---|---|---|---|
| POST | `/api/issue-reports` | Clerk JWT | No | Submit a bug report. Message: 5–2000 chars. Company resolved best-effort. Returns `{ id, status }`. No GET route — submitted reports cannot be retrieved via API. |

---

## 5. Frontend Pages — Exact Current Behavior

The frontend is a single-page React app served at the root path. Routing is client-side via Wouter. All pages are bilingual (AR/EN).

### 5.1 Home (`/`)

**Behavior:** If signed in → redirect to `/dashboard`. If signed out → shows marketing landing page. Home page is finalized and locked from further changes per project policy.

---

### 5.2 Sign In (`/sign-in/*`)

Clerk-hosted sign-in component embedded in the Tadweerah layout. Styled with Tajawal font, matching brand colors. Custom Arabic and English localization strings. On success: Clerk redirects to `/dashboard`.

---

### 5.3 Sign Up (`/sign-up/*`)

Clerk-hosted sign-up component. Same styling as sign-in. On success: redirects to `/onboarding/company`.

---

### 5.4 Onboarding (`/onboarding/company`)

Accessible only to signed-in users. If user already has a company, they are redirected to `/dashboard` by the RouteGuard.

**Form fields:**
- Company name (required, 2–120 chars)
- City (required, 2–80 chars)
- Contact phone (required, 6–20 chars; client-side regex: stripped digits must be 7–15)
- Commercial registration number (optional)
- Company category (optional dropdown; values fetched from `/api/lookup/company-categories` without auth)
- Company actions (required, multi-select; values from `/api/lookup/company-actions` without auth; at least one required)
- "Other" action description field (appears if "Other" action is selected; required if shown; max 200 chars)
- License number (optional, max 60 chars)
- Terms & Conditions checkbox (required to enable submit button)

**Submit behavior:** POSTs to `/api/companies`. On success: invalidates the React Query "me" cache and navigates to `/dashboard`.

**Risk — "Other" description not persisted:** The `otherActionDesc` field is shown when the "Other" action is selected and validated on the client, but the value is never included in the API POST body. The text is discarded. Only the action ID is sent.

**Risk — company_category_id not required:** The category dropdown is optional. Companies can exist without a category. This affects `targeting_type = category` listings, which will never be visible to companies with no category set.

---

### 5.5 Dashboard (`/dashboard`)

Requires: signed in + company registered.

**Content:**
- Top stat pills: total listings, offers received, offers made, completed deals, total deal value (SAR)
- Context-aware "next step" banner based on stats (e.g., "create your first listing", "you have offers to review")
- Quick action links to: Create Listing, Marketplace, My Listings, My Offers, Reports
- Notification bell with unread count; clicking opens notification list
- Stats fetched from `/api/dashboard/stats` with 60-second stale time

---

### 5.6 Listing New (`/listings/new`)

Requires: signed in + company registered.

**3-step wizard:**
- Step 1 — Material & Quantity: legacy material type, quantity, unit (from unit_options lookup or legacy), material category, subcategory
- Step 2 — Pricing & Sale: sale type (auction/direct), pricing model (fixed/by_weight/revenue_share), price hint, required services, targeting (open/category/specific_company), revenue share percentage
- Step 3 — Photo & Location: city, description, image upload (optional)

**Submit behavior:** POSTs to `/api/listings`. On success: invalidates "my listings" cache, navigates to `/listings/mine`.

**Image upload behavior:** Image is uploaded as a multipart POST to `/api/listings/:id/upload-image` after listing creation. If image upload fails after listing creation succeeds, the listing still exists but has no image — no error is shown to the user.

---

### 5.7 My Listings (`/listings/mine`)

Requires: signed in + company registered.

Shows the company's own listings with tabs: All / Open / Closed. Each card shows: material, quantity, city, offer count, highest offer amount, deal status if applicable. Cards link to listing detail page.

---

### 5.8 Marketplace (`/marketplace`)

Requires: signed in + company registered.

Shows available open listings from other companies. Filters: material (dropdown), city (text). Max 200 results from API. Cards show: company name, material, quantity, city, offer count, highest price. If caller has already bid: shows own bid price and rank. Does not show listings owned by the caller.

**Friction point:** There is no pagination. If more than 200 listings exist, the oldest ones are silently dropped from the view.

---

### 5.9 Listing Detail (`/listings/:id`)

Requires: signed in + company registered.

**For the listing owner (producer view):**
- Full listing details
- List of all offers with buyer names and prices
- Accept/Reject buttons per offer
- Edit and close/delete controls
- If a deal exists: deal panel with lifecycle actions

**For a non-owner buyer:**
- Listing details
- Their own offer status and rank
- Offer submission form (if no existing pending offer) or "improve offer" form

**For a buyer whose offer was rejected:**
- Shows rejection reason
- No option to re-bid (blocked at API level)

**For a buyer with an accepted offer:**
- Deal panel showing current stage: active → payment → dispatch → receipt

**Known issue:** The listing detail page is 1,423 lines. Complex conditional rendering based on multiple states. No formal state machine — conditions are nested if/else. This is flagged for a UX pass.

---

### 5.10 Participations (`/participations`)

Requires: signed in + company registered.

Shows all offers the caller has submitted (as buyer). Tabs: All / Pending / Accepted / Rejected. Each card shows: listing reference, material, quantity, city, producer company name, offer price, rank (for pending), rejection reason (for rejected), deal stage (for accepted). Withdraw button on pending offers (with confirmation dialog).

---

### 5.11 Terms (`/terms`)

No authentication required.

Static page with 5 sections of terms text (sourced from i18n strings). Linked from onboarding T&C checkbox. Contains a `mailto:info@tadweerah.com` support link.

**Risk:** Terms content is in i18n translation strings (not a legal document with version control). Any change to terms text requires a code deployment.

---

### 5.12 Reports (`/reports`)

Requires: signed in + company registered.

**Implemented:** Real operational metrics using same data as dashboard stats: listings count, offers received, offers made, completed deals, total deal value. Fetched from `/api/dashboard/stats`.

**NOT IMPLEMENTED (explicitly marked as "coming soon"):** CO2 savings, total weight recycled, deal count by material, growth metrics. These are displayed as locked placeholder cards with a "subscription" badge. There is no subscription system — the badge is cosmetic only.

---

### 5.13 Company Capabilities (`/company/capabilities`)

Requires: signed in + company registered.

Multi-select of capabilities from the lookup table. Shows description and whether each capability requires a license. Saves via `PUT /api/companies/mine/capabilities` (full replacement, atomic).

---

### 5.14 Members (`/company/members`)

Requires: signed in + company registered.

Shows current members list (user IDs and roles). Owner can add a member by Clerk user ID. Owner can remove non-owner members. **Members are identified by raw Clerk user ID strings** — no name or email resolution is performed. Adding a member requires knowing their exact Clerk user ID, which is not exposed anywhere in the user-facing UI.

**Friction point (high):** There is no user search or invite-by-email flow. The owner must obtain the invitee's Clerk user ID manually (e.g., from the developer console or admin). This makes the multi-user feature effectively unusable in practice.

---

### 5.15 Company Profile (`/company/profile`)

Requires: signed in + company registered.

Edit form for: company name, city, contactPhone, commercialRegistration, license_number, company_category_id. Saves via `PUT /api/companies/mine`. Displays current license status as a colored badge (approved / pending / rejected / expired). Does not allow editing `license_status`.

---

### 5.16 Not Found

Default catch-all route. Shows a bilingual 404 message with a link back to home.

---

## 6. Authentication & Authorization Model

### 6.1 Clerk Authentication

- **Current status:** Development keys (`VITE_CLERK_PUBLISHABLE_KEY` begins with `pk_test_`). This must be replaced with production keys (`pk_live_`) before launch. Development keys impose Clerk rate limits and are not suitable for production traffic.
- Sessions are JWT-based. The JWT is attached to every API call as `Authorization: Bearer <token>`.
- The API server validates tokens using `@clerk/express` middleware.
- `SESSION_SECRET` environment variable is configured but is not used for Clerk JWT validation — Clerk uses its own public key. The purpose of `SESSION_SECRET` in this environment is unclear.

### 6.2 Company Membership

- **`requireCompany` middleware** checks the `company_members` table to find the caller's company. This is correct for multi-user support.
- **`GET /api/me`** finds company by `owner_user_id` match, not `company_members`. Non-owner members receive `company: null` from this endpoint even though they can access all other company-scoped routes.

### 6.3 Role System

- Two roles: `owner` and `member` (plain text, not an enum)
- `owner` can: invite members, remove members
- `member` can: everything else (create listings, submit offers, accept offers, manage deals)
- **No action in the system checks whether the caller is the listing-creating user** — any member of the company can accept offers, close listings, or advance deals on behalf of the company

### 6.4 Admin Access

- Admin operations use HTTP header `X-Admin-Key` matching the `ADMIN_API_KEY` environment variable
- There is no admin web interface — admin actions must be performed via API calls (curl, Postman, etc.)
- No admin route exists for: license approval, viewing all companies, viewing all deals, managing issue reports, or audit log access
- If `ADMIN_API_KEY` is not set, all admin routes return 503

---

## 7. User Journeys — Real Flow

### 7.1 New User Registration and Onboarding

1. User arrives at home page → clicks Sign Up → Clerk sign-up form (email + OTP or social)
2. After sign-up: redirected to `/onboarding/company`
3. User fills out company form. Required: name, city, phone, at least one action, T&C acceptance.
4. User submits → POST `/api/companies` → company created → user redirected to `/dashboard`
5. From this point, user can access all company-scoped routes

**Manual intervention required:** None for basic onboarding. However, if the user wants to bid on sensitive-material listings or capability-gated listings requiring a license, an admin must manually set `license_status = approved` directly in the database. There is no user-facing flow to upload license documents or receive approval notifications.

---

### 7.2 Producer Creates a Listing

1. Dashboard → "Create Listing" → 3-step form
2. Step 1: Select material type and quantity
3. Step 2: Choose sale type (auction/direct), pricing model, optionally add required capabilities, targeting
4. Step 3: Enter city, description, optionally upload image
5. Submit → listing created with status = `open`, visibility = `public`

**Manual intervention required:** None.

---

### 7.3 Buyer Browses and Bids

1. Dashboard → Marketplace → browse/filter listings
2. Click a listing → detail page
3. Enter price per unit → submit offer
4. If any eligibility gate fails: error message shown explaining which gate blocked the offer
5. If offer accepted: buyer receives in-app notification; deal panel appears on listing detail

**Friction points:**
- No email or SMS notification — buyer must check the platform
- Buyer cannot see other bidders' prices, only rank and total count
- Once rejected, buyer cannot re-bid on the same listing ever

---

### 7.4 Producer Reviews Offers and Accepts One

1. My Listings → click listing → offer list visible with buyer names and prices, sorted by price DESC
2. Producer clicks "Accept" on one offer → confirmation dialog
3. On confirm: offer accepted, all other pending offers rejected (reason: `offer_accepted`), listing closed, deal created automatically
4. Both parties receive in-app notifications
5. Deal is immediately in `active` status

**Manual intervention required:** None for the accept step. However, notifying the buyer about deal details beyond the in-app notification requires manual communication.

---

### 7.5 Deal Lifecycle

All steps are manual — no automation, no timeouts, no reminders.

1. **active:** Producer waits for buyer to arrange payment. No system tracking.
2. **payment_confirmed:** Producer calls confirm-payment with `payment_reference` (bank transfer number). For by_weight deals: producer also enters actual quantity, which computes final_amount.
3. **dispatched:** Producer confirms goods have been physically dispatched.
4. **completed:** Buyer confirms receipt of goods. Deal is complete.

**Friction points:**
- No way to dispute a step or report an issue within the deal flow
- No timeout — a deal can stay in `active` for unlimited time
- If a producer confirms payment incorrectly (wrong actual_quantity on a by_weight deal), there is no correction mechanism
- No route to cancel or void a deal

---

## 8. Notification Events

Notifications are created by the API on specific events. All notifications are stored in the `notifications` table. No external delivery.

| Event | Recipient | Type value |
|---|---|---|
| Offer received on a listing | Producer | `offer_received` |
| Buyer is outbid | Previous top bidder | `outbid` |
| Offer accepted | Buyer | `offer_accepted` |
| Offer rejected (by producer or auto-reject on accept) | Buyer | `offer_rejected` |
| Private listing invitation created | Target company | `private_deal_invitation` |
| Deal: payment confirmed | Buyer | `deal_payment_confirmed` |
| Deal: goods dispatched | Buyer | `deal_dispatched` |
| Deal: deal completed | Producer | `deal_completed` |

---

## 9. Risk Register

### 9.1 Critical Risks

| Risk | Description |
|---|---|
| **Dev Clerk keys in production** | `VITE_CLERK_PUBLISHABLE_KEY` begins with `pk_test_`. Must be swapped to `pk_live_` before production launch. Clerk imposes rate limits on dev keys. |
| **License approval has no interface** | When a company submits a license number, `license_status` is set to `pending`. There is no API route, no admin UI, and no workflow to advance this status to `approved`. License approval requires a direct database update. |
| **No image persistence** | Uploaded images are stored on the API server's local filesystem (`public/uploads/`). Container restarts or redeployments will delete all uploaded images. This is unsuitable for production. |
| **N+1 query in GET /offers/mine** | For each offer in the result set, 2–3 additional DB queries are executed. This will degrade severely under load. |
| **No deal cancellation mechanism** | Once a deal is created, it cannot be cancelled, disputed, or voided through any API route. Stuck deals require direct database intervention. |

### 9.2 Data Integrity Risks

| Risk | Description |
|---|---|
| **DELETE /listings leaves pending offers open** | Manually closing a listing does not reject pending offers. Buyers see their offer as "pending" on a closed listing indefinitely. |
| **company_members.role is plain text** | Role values (`owner`, `member`) are enforced by application logic only. A direct DB insert can write any value. |
| **acceptance_reason never written** | Column exists in `listing_offers`, serialized in API responses, but never populated. Always null. |
| **license_document_url never used** | Column exists in `companies` but is never read or written by any route. |
| **company_action_selections never read** | Onboarding action selections are stored but never used in any business logic. |
| **company_type column unused** | `companies.type` (producer/buyer/carrier) exists but is never set or checked. |
| **company_categories FK not pre-validated** | If an invalid UUID is submitted for `company_category_id` in POST /companies, the DB returns a FK violation which the API exposes as a 500 error (not a 400 validation error). |
| **Audit log failures silently swallowed** | `logAudit` is called with `void` — failures do not surface to the caller or logs. |

### 9.3 UX Risks

| Risk | Description |
|---|---|
| **Member invite requires Clerk user ID** | There is no way to invite a user by email. The owner must know the invitee's exact Clerk user ID string — which is not shown anywhere in the UI. |
| **No email/SMS notifications** | All notifications are in-app only. Users must actively log in to discover that their offer was accepted or their deal requires action. |
| **Terms content in i18n strings** | Terms & Conditions text is embedded in translation strings in the codebase. Legal updates require a code deployment. |
| **No deal dispute path** | Buyers and sellers have no structured way to flag a problem within a deal. They can submit an issue report (general bug report), but it goes nowhere in the system. |
| **listing-detail.tsx is 1,423 lines** | Complex nested conditionals make the page fragile. Multiple states (owner/buyer/carrier, pending/accepted/rejected/withdrawn, active/payment_confirmed/dispatched/completed) are handled in a single component without a formal state machine. |
| **Category-targeted listings invisible to uncategorized companies** | If a company has no `company_category_id` set (category is optional at onboarding), they cannot see category-targeted listings. There is no UI warning about this. |
| **Marketplace capped at 200 results** | The API hard-limits `GET /listings` to 200 rows with no pagination. Listings beyond 200 are silently dropped. |

### 9.4 Security Observations

| Item | Description |
|---|---|
| **Admin API key authentication** | Admin routes use a static shared secret (`X-Admin-Key` header). There is no per-admin user authentication, no audit trail of who performed admin operations, and no key rotation mechanism. |
| **No rate limiting on API routes** | No rate limiting is implemented on any API route. |
| **Image upload has MIME type check only** | File uploads are validated by MIME type prefix (`image/`) but not by file content (magic bytes). A file could be renamed to pass the check. |

---

## 10. Contract Track — Status

The Contract-Based Execution track (a second operating model for recurring waste contracts between companies) is **NOT IMPLEMENTED**.

The current system contains zero tables, zero routes, and zero frontend pages related to contracts. The concept exists only in planning documentation (`tadweerah-implementation-report.md`).

**Impact of implementing the contract track:**
- 7 new database tables required
- 8 new PostgreSQL enums required
- ~22 new API routes under `/api/contracts`
- Multiple new frontend pages
- No changes required to existing deal-track tables, routes, or pages (fully isolated by design decision)

No implementation work on the contract track should begin until open product decisions are resolved: contract activation flow, settlement confirmation model, weight tolerance threshold, and exception SLA.

---

## 11. What Does Not Exist (Explicitly)

The following are **NOT IMPLEMENTED** in the current system:

- Admin web interface of any kind
- License approval workflow (approval requires direct DB access)
- Carrier role functionality (the role is defined but has zero behavior)
- Payment processing (no Stripe, no bank API — payment is a manual acknowledgement)
- Email notifications
- SMS notifications
- Push notifications
- In-app messaging between companies (no chat)
- Deal cancellation or dispute mechanism
- Company deletion or deactivation
- User account deletion
- Listing search beyond material-type and city filters (no full-text search)
- Subscription or billing system (subscription badge on Reports page is cosmetic)
- Reporting/analytics beyond the 5 operational counters
- Pagination (marketplace is capped at 200, notifications at 100)
- Data export
- Geolocation or mapping features
- Document management (license_document_url column exists but is unused)
- Onboarding for members (non-owner users have no dedicated onboarding flow)

---

*End of report. All information above is sourced from direct code inspection and live database queries performed on April 28, 2026.*
