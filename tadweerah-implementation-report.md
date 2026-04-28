# Tadweerah — Developer Impact Assessment
## Dual-Model Architecture: Deal-Based Marketplace + Contract-Based Execution

**Document Version:** 1.0  
**Prepared:** April 2026  
**Audience:** Engineering team + External operational reviewer  
**Status:** Assessment only — no implementation has begun  

---

## Executive Summary

Tadweerah currently operates a single-track **Deal-Based Marketplace**: producers publish waste listings, buyers compete with price offers, the producer accepts, and a deal lifecycle follows (payment → dispatch → receipt → completion).

The proposed change adds a separate, parallel track: **Contract-Based Execution**. In this track, a pre-agreed contract between producer and buyer governs a series of individual load movements. There are no listings, no offers, and no auction mechanics. Instead, loads are created against a contract, dispatched, weighed at source and destination, variance is calculated, and settlement is applied per load.

**The two tracks share users and companies but are otherwise fully isolated. No cross-references between deal objects and contract objects.**

---

## Section 1 — Current Platform Inventory

### 1.1 Pages and Routes

| # | Page Name | Route | Auth Required | Company Required |
|---|-----------|-------|:---:|:---:|
| 1 | Home / Landing | `/` | No | No |
| 2 | Sign In | `/sign-in` | No | No |
| 3 | Sign Up | `/sign-up` | No | No |
| 4 | Terms & Conditions | `/terms` | No | No |
| 5 | Company Onboarding | `/onboarding/company` | Yes | No |
| 6 | Dashboard | `/dashboard` | Yes | Yes |
| 7 | Create Listing | `/listings/new` | Yes | Yes |
| 8 | My Listings | `/listings/mine` | Yes | Yes |
| 9 | Listing Detail | `/listings/:waste_listing_id` | Yes | Yes |
| 10 | Marketplace | `/marketplace` | Yes | Yes |
| 11 | My Participations (Deals) | `/participations` | Yes | Yes |
| 12 | Reports | `/reports` | Yes | Yes |
| 13 | Company Capabilities | `/company/capabilities` | Yes | Yes |
| 14 | Company Members | `/company/members` | Yes | Yes |
| 15 | Company Profile | `/company/profile` | Yes | Yes |
| 16 | Not Found | `*` | No | No |

**Total: 16 pages / route handlers**

---

### 1.2 Major Shared Components

| Component | Purpose |
|-----------|---------|
| `AppLayout` | Wraps all authenticated pages; provides sidebar navigation, topbar, language toggle |
| `Topbar` | Header with notifications bell, company name, language toggle |
| `ListingCard` | Reusable card shown in marketplace feed and my-listings |
| `DealPanel` | Full deal lifecycle widget used in listing-detail and participations pages |
| `RouteGuard` | Enforces auth + onboarding redirect logic |
| `ConfirmDialog` | Generic modal for destructive confirmations |
| `EmptyState` | Consistent "nothing here yet" display |
| `ReportIssueModal` | Feedback / issue submission form |
| `LanguageToggle` | AR ↔ EN switcher; triggers RTL/LTR re-render |

---

### 1.3 Current User Journeys

**Journey A — Producer (Waste Owner)**
1. Sign up → onboarding → create company
2. Create listing (material, quantity, city, pricing model, targeting)
3. Review incoming offers on listing detail page
4. Accept or reject individual offers
5. Track deal: confirm payment received → confirm dispatch
6. View completed deals in reports

**Journey B — Buyer (Recycler / Processor)**
1. Sign up → onboarding → create company
2. Browse marketplace → filter by material, city
3. View listing detail → submit offer (price per unit)
4. Improve offer if outbid
5. Receive acceptance notification → deal active
6. Transfer payment (offline) → receive goods
7. Confirm receipt → deal complete

**Journey C — Both parties**
- Receive in-app notifications at each stage
- View deal panel with counterparty contact details
- Submit issue reports if needed

---

### 1.4 Existing Workflow Logic

| Workflow | Logic location | Key rules |
|----------|---------------|-----------|
| Company creation | `POST /companies` | One company per user. Terms acceptance required. License status starts as `null` or `pending`. |
| Listing creation | `POST /listings` | **Zero eligibility checks on producer** (charter rule). Immutable: pricing_model, sale_type, targeting_type once published. |
| Offer submission | `POST /listings/:id/offers` | 4 sequential eligibility gates: Targeting → Required Services → Sensitive Material → Price. |
| Offer improvement | `PUT /listings/:id/offers/mine` | `already_top` detection. Requires `explicit_self_improve=true` if buyer was already rank #1. |
| Offer acceptance | `POST /offers/:id/accept` | Auto-rejects all other pending offers. Closes listing. Auto-creates deal record. |
| Deal: confirm payment | `POST /deals/:id/confirm-payment` | `payment_reference` required. `actual_quantity` required if `settlement_type = by_weight`. |
| Deal: confirm dispatch | `POST /deals/:id/confirm-dispatch` | State must be `payment_confirmed`. |
| Deal: confirm receipt | `POST /deals/:id/confirm-receipt` | State must be `dispatched`. Final state: `completed`. |
| Audit log | Everywhere | Append-only, system-written. Never deleted. |
| Notifications | On key state transitions | Scoped to company (all members see). |

---

### 1.5 Current Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `companies` | Core company record | `id`, `owner_user_id`, `name`, `type` (producer/buyer/carrier), `city`, `commercial_registration`, `contact_phone`, `company_category_id`, `license_number`, `license_status` (null/pending/approved/rejected/expired), `accepted_terms_at` |
| `company_categories` | Lookup: business categories | `id`, `key`, `name_ar`, `name_en`, `is_active` |
| `company_actions` | Lookup: action declarations | `id`, `key`, `name_ar`, `name_en`, `requires_license` |
| `company_action_selections` | Join: companies ↔ actions | `company_id`, `action_id` |
| `capabilities` | Lookup: company capabilities for eligibility | `id`, `key`, `name_ar`, `name_en`, `requires_license`, `is_active` |
| `company_capabilities` | Join: companies ↔ capabilities | `company_id`, `capability_id` |
| `company_members` | Multi-user membership | `company_id`, `user_id`, `role` (owner/member) |
| `material_categories` | Hierarchical material taxonomy | `id`, `key`, `name_ar`, `name_en`, `parent_id`, `is_sensitive` |
| `unit_options` | Lookup: measurement units | `id`, `key`, `name_ar`, `name_en`, `symbol` |
| `waste_listings` | Producer-published listings | `id`, `company_id`, `material`, `quantity`, `unit`, `city`, `price_hint`, `status` (open/closed), `pricing_model`, `sale_type`, `targeting_type`, `target_company_id`, `material_category_id`, `visibility` |
| `listing_required_services` | Required capabilities per listing | `listing_id`, `capability_id` |
| `listing_target_categories` | Targeting categories per listing | `listing_id`, `company_category_id` |
| `listing_offers` | Buyer bids on listings | `id`, `waste_listing_id`, `buyer_company_id`, `price_per_unit`, `status` (pending/accepted/rejected/withdrawn), `rejection_reason`, `acceptance_reason` |
| `deals` | Active deals from accepted offers | `id`, `offer_id`, `listing_id`, `producer_company_id`, `buyer_company_id`, `settlement_type`, `price_per_unit`, `estimated_amount`, `actual_quantity`, `final_amount`, `status` (active/payment_confirmed/dispatched/completed), `payment_reference`, `payment_proof_url` |
| `audit_log` | Immutable event log | `id`, `user_id`, `company_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at` |
| `notifications` | In-app notifications | `id`, `company_id`, `type`, `title_ar`, `title_en`, `body_ar`, `body_en`, `is_read`, `related_entity_id` |
| `issue_reports` | User feedback / issues | `id`, `user_id`, `company_id`, `message`, `status` (open/resolved) |

**Total: 17 tables**

---

### 1.6 Current API Endpoints

#### Authentication
All endpoints except `/healthz` require Clerk JWT in `Authorization: Bearer <token>` header.

#### Companies
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/companies` | Create company (onboarding) |
| GET | `/api/companies` | List companies (lookup / admin) |
| GET | `/api/companies/me` | Get own company |
| PUT | `/api/companies/me` | Update own company |
| GET | `/api/companies/:id` | Get company by ID |
| PUT | `/api/companies/:id` | Admin: update any company |

#### Listings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/listings` | Marketplace feed (filtered by eligibility) |
| GET | `/api/listings/mine` | Own listings |
| POST | `/api/listings` | Create listing |
| GET | `/api/listings/:id` | Listing detail |
| POST | `/api/listings/:id/image` | Upload listing image |
| POST | `/api/listings/:id/close` | Close listing |

#### Offers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/listings/:id/offers` | Get all offers on listing (producer) |
| GET | `/api/listings/:id/offers/mine` | Get own offer on listing (buyer) |
| GET | `/api/offers` | Get all own offers (buyer) |
| POST | `/api/listings/:id/offers` | Submit offer |
| PUT | `/api/listings/:id/offers/mine` | Improve own offer |
| DELETE | `/api/listings/:id/offers/mine` | Withdraw own offer |
| POST | `/api/offers/:id/accept` | Accept offer (producer) |
| POST | `/api/offers/:id/reject` | Reject offer (producer) |

#### Deals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deals/:id` | Get deal (parties only) |
| POST | `/api/deals/:id/confirm-payment` | Confirm payment received |
| POST | `/api/deals/:id/confirm-dispatch` | Confirm goods dispatched |
| POST | `/api/deals/:id/confirm-receipt` | Confirm receipt (buyer) |

#### Members
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/companies/me/members` | List company members |
| POST | `/api/companies/me/members` | Invite member |
| DELETE | `/api/companies/me/members/:user_id` | Remove member |

#### Lookup (Admin-managed reference data)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lookup/company-categories` | List company categories |
| GET | `/api/lookup/company-actions` | List company actions |
| GET | `/api/lookup/unit-options` | List measurement units |
| GET | `/api/lookup/material-categories` | List material categories |
| GET | `/api/lookup/capabilities` | List capabilities |
| POST/PUT/DELETE | `/api/lookup/company-categories/:id` | Admin CRUD |
| POST/PUT/DELETE | `/api/lookup/company-actions/:id` | Admin CRUD |
| POST/PUT/DELETE | `/api/lookup/unit-options/:id` | Admin CRUD |

#### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Current user + company info |
| GET | `/api/stats` | Company stats (dashboard numbers) |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification read |
| POST | `/api/notifications/read-all` | Mark all read |
| POST | `/api/issue-reports` | Submit issue report |
| GET | `/api/healthz` | Health check (no auth) |

**Total: ~40 endpoints**

---

### 1.7 Current Role and Permission Logic

| Rule | Detail |
|------|--------|
| **Auth gate** | Every protected route requires a valid Clerk JWT. No JWT = 401. |
| **Company gate** | Most routes require `requireCompany` middleware: user must be a member of a company (via `company_members`). No company = redirect to `/onboarding/company`. |
| **Member roles** | `owner` and `member` have equal operational access (Phase 1). Only owners can invite/remove members. |
| **Listing ownership** | Only the company that created a listing can close it, view its offer list, or accept/reject offers. Enforced by `company_id` comparison. |
| **Offer eligibility** | 4 gates checked at offer submission: targeting, required capabilities, sensitive material license, price floor. |
| **Deal access** | Only `producer_company_id` or `buyer_company_id` can view or act on a deal. Other companies get 403. |
| **Deal state machine** | State transitions are strictly ordered: `active → payment_confirmed → dispatched → completed`. Out-of-order attempts return 400. |
| **License gating** | `license_status = approved` required for: (a) capabilities marked `requires_license`, (b) material categories marked `is_sensitive`. |
| **Audit log** | Written by the system at every significant state change. Append-only. Never exposed to users via API. |
| **Self-bid block** | A company cannot submit an offer on its own listing (403 Forbidden). |

---

## Section 2 — Page-by-Page Analysis

> **Key to changes column:** "No change" = safe to leave as-is. "Additive" = new content added but nothing removed or altered. "Modified" = existing content or logic changes.

---

### Page 1 — Home / Landing (`/`)

| Field | Detail |
|-------|--------|
| **Purpose** | Public marketing page; entry point for new and returning users |
| **Actors** | Unauthenticated visitors, signed-in users (redirected to dashboard) |
| **Data shown** | Static marketing content, platform value proposition |
| **Current actions** | "Get Started" → sign-up; "Sign In" → sign-in |
| **Required changes** | None. The home page is locked/final (per project charter). |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 2 & 3 — Sign In / Sign Up (`/sign-in`, `/sign-up`)

| Field | Detail |
|-------|--------|
| **Purpose** | Clerk-hosted authentication UI |
| **Actors** | Unauthenticated visitors |
| **Data shown** | Clerk components (email/password, OAuth) |
| **Current actions** | Account creation, sign-in |
| **Required changes** | None. Authentication is shared across both tracks — no changes needed. |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 4 — Company Onboarding (`/onboarding/company`)

| Field | Detail |
|-------|--------|
| **Purpose** | First-time company setup; captures company identity and capabilities |
| **Actors** | Newly signed-in users with no company record |
| **Data shown** | Form: name, city, phone, CR#, category, business actions, license number (opt), T&C checkbox |
| **Current actions** | Submit → creates company + capability declarations |
| **Required changes** | **Additive:** Add "Transporter" as a selectable business type to accommodate carriers who primarily work on the contract track. No structural changes. |
| **UX impact** | Minor (one extra option in business type selection) |
| **Risk level** | **Low** |

---

### Page 5 — Terms & Conditions (`/terms`)

| Field | Detail |
|-------|--------|
| **Purpose** | Legal: platform terms accepted during onboarding |
| **Actors** | Any user (linked from onboarding) |
| **Data shown** | Terms text |
| **Required changes** | Potentially update terms text to reference contract track obligations. No code change required. |
| **UX impact** | None |
| **Risk level** | **Low** (content only) |

---

### Page 6 — Dashboard (`/dashboard`)

| Field | Detail |
|-------|--------|
| **Purpose** | Central hub; shows stats, primary actions, and contextual guidance |
| **Actors** | All authenticated company users |
| **Data shown** | Stats strip (listings, offers, deals, completed deals + value). Primary action cards: "New Listing" and "Marketplace". Secondary tool cards: My Listings, Participations, Company Profile, Reports, Members, Capabilities |
| **Current actions** | Navigation to all major sections |
| **Required changes** | **Modified:** Stats strip currently shows only marketplace track numbers. Needs: (a) A new "Contract Track" stats section or tab, (b) New primary action card "My Contracts", (c) New secondary card "Contract Loads". Stats must be fetched from new contract API routes (separate from `/api/stats`). |
| **UX impact** | Significant layout change. Two tracks must be clearly differentiated to avoid confusion. Recommend a track-switcher or tabbed stats section. |
| **Risk level** | **Medium** — existing stats must remain unchanged; new stats are additive |

---

### Page 7 — Create Listing (`/listings/new`)

| Field | Detail |
|-------|--------|
| **Purpose** | Producer creates a marketplace listing |
| **Actors** | Producers (deal track) |
| **Data shown** | Form: material, quantity, unit, city, pricing model, sale type, targeting, capabilities |
| **Current actions** | Submit → creates listing |
| **Required changes** | **No change.** The deal track listing creation is fully independent of the contract track. |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 8 — My Listings (`/listings/mine`)

| Field | Detail |
|-------|--------|
| **Purpose** | Producer views and manages their active and closed listings |
| **Actors** | Producers |
| **Data shown** | List of own listings with status, offer count, highest offer |
| **Current actions** | Navigate to listing detail, create new listing |
| **Required changes** | **No change.** This is marketplace-only. Contract track has its own equivalent page. |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 9 — Listing Detail (`/listings/:waste_listing_id`)

| Field | Detail |
|-------|--------|
| **Purpose** | Full listing view: description, offers (producer view), submit offer (buyer view), deal panel (post-acceptance) |
| **Actors** | Producers (manage offers), buyers (submit/view offers) |
| **Data shown** | Listing specs, offer list (producer), own offer + rank (buyer), deal panel (active deal), required capabilities |
| **Current actions** | Submit offer, improve offer, withdraw offer, accept/reject offer, confirm payment/dispatch/receipt |
| **Required changes** | **No change.** This page is deal-track-specific. The contract track has its own load detail page. Note: this page is 1,423 lines and flagged for a separate UX audit pass. |
| **UX impact** | None (from dual-model change) |
| **Risk level** | **None** (from dual-model change) |

---

### Page 10 — Marketplace (`/marketplace`)

| Field | Detail |
|-------|--------|
| **Purpose** | Buyers browse and discover open waste listings |
| **Actors** | Buyers |
| **Data shown** | Filtered listing cards: material, quantity, city, offer count, current max offer, time posted |
| **Current actions** | Filter, click listing → detail |
| **Required changes** | **No change.** The marketplace is purely a deal-track feature. Contract track buyers access contracts directly from their contract list, not through a marketplace discovery interface. |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 11 — My Participations (`/participations`)

| Field | Detail |
|-------|--------|
| **Purpose** | Shows a user's active deals (as both producer and buyer), across all deal statuses |
| **Actors** | All company users with deals |
| **Data shown** | List of deals with status, counterparty, estimated amount |
| **Current actions** | Navigate to listing detail (where deal panel lives) |
| **Required changes** | **Additive:** This page should gain a tab or section for "Contract Loads" — showing the user's active loads from the contract track. A clean approach: rename to "My Activity" and add a tab bar (Deals / Loads). The deals tab remains completely unchanged. |
| **UX impact** | Moderate. Tab addition is low-risk but requires careful labelling (bilingual). |
| **Risk level** | **Low** |

---

### Page 12 — Reports (`/reports`)

| Field | Detail |
|-------|--------|
| **Purpose** | Transaction history and aggregate stats for own company |
| **Actors** | All authenticated company users |
| **Data shown** | Completed deals, total deal value, deal list with status |
| **Current actions** | View report data |
| **Required changes** | **Modified:** Reporting must be track-scoped. Add a track switcher (Marketplace / Contract). The marketplace track section remains unchanged. The contract track section shows: contracts, total loads dispatched, total weight, total settlement value. These fetch from separate contract API routes. Important: aggregate "Total Platform Value" across both tracks is fine, but deal-track and contract-track numbers must always be clearly labelled separately. |
| **UX impact** | Moderate. Tab or section addition required. |
| **Risk level** | **Medium** — existing reporting must not be broken |

---

### Page 13 — Company Capabilities (`/company/capabilities`)

| Field | Detail |
|-------|--------|
| **Purpose** | Company declares its operational capabilities |
| **Actors** | Company owner |
| **Data shown** | Available capabilities list, company's selected capabilities |
| **Current actions** | Toggle capabilities on/off |
| **Required changes** | **No change.** Capabilities are shared across both tracks (same eligibility gating concept applies). Potentially add contract-specific capabilities in the future, but no change needed at launch. |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 14 — Company Members (`/company/members`)

| Field | Detail |
|-------|--------|
| **Purpose** | Owner manages team members |
| **Actors** | Company owner |
| **Data shown** | Member list (name, role) |
| **Current actions** | Invite member, remove member |
| **Required changes** | **No change.** Membership is company-wide and applies to both tracks. |
| **UX impact** | None |
| **Risk level** | **None** |

---

### Page 15 — Company Profile (`/company/profile`)

| Field | Detail |
|-------|--------|
| **Purpose** | Edit company details and view license status |
| **Actors** | Company owner |
| **Data shown** | Name, city, phone, CR#, category, license number, license status |
| **Current actions** | Edit and save profile |
| **Required changes** | **No change.** Profile is shared across both tracks. |
| **UX impact** | None |
| **Risk level** | **None** |

---

## Section 3 — Dual-Model Architecture Impact

### 3.1 Isolation Confirmation

| Rule | Status | Detail |
|------|--------|--------|
| Deal objects do NOT reference contract objects | ✅ Confirmed | `deals` table has no contract FK. No changes needed. |
| Contract objects will NOT reference deal/listing objects | ✅ Design intent | New `contracts`, `contract_loads`, etc. will have no FKs to `deals`, `waste_listings`, or `listing_offers`. |
| Shared users/companies allowed | ✅ Confirmed | Both tracks share the `companies` and `company_members` tables. One company can participate in both tracks simultaneously. |
| Execution logic remains separated | ✅ Design intent | Contract route handlers will be in a new `/api/contracts` router. No shared logic with listings/offers/deals handlers. |
| Reporting is track-scoped | ✅ Design intent | Contract stats come from new `/api/contracts/stats` endpoint. Existing `/api/stats` remains unchanged (deal track only). |

### 3.2 Shared Infrastructure (No Changes Required)

- Auth middleware (`requireAuth`) — shared
- Company middleware (`requireCompany`) — shared
- Audit log (`audit_log` table + `logAudit()` function) — shared, extend with new action keys
- Notifications (`notifications` table + `notifyXxx()` functions) — shared, extend with new notification types
- Lookup tables (`material_categories`, `unit_options`, `capabilities`) — shared
- Companies table — shared (read-only from contract routes for counterparty info)

---

## Section 4 — Contract Track Implementation Plan

### 4.1 What the Contract Track Does (Plain Language)

A **contract** is a standing agreement between a waste producer and a recycling buyer. Instead of discovering each other through a marketplace, they have a pre-agreed relationship: what materials, at what price, over what period.

Under a contract, individual **loads** are created — each representing a single truck movement of material. Each load is dispatched by the producer (with a source weight measured at departure), received by the buyer (with a destination weight measured on arrival), and settled financially based on agreed rules.

The system tracks:
1. What was agreed (the contract)
2. What was planned for each load
3. What was actually dispatched (source weight)
4. What was actually received (destination weight)
5. The variance between the two
6. The settlement amount based on the variance rule
7. Any exceptions (wrong material, weight outside tolerance)

### 4.2 Feature Areas and Technical Approach

#### Feature Area 1 — Contract Setup

**What it does:**  
Two parties (producer and buyer) establish a contract defining materials, price, period, and terms.

**Data captured:**
- Producer company, buyer company
- Contract reference number (auto-generated: `CTR-YYYY-NNNN`)
- Start date, end date
- Status: `draft → active → suspended → closed`
- Notes / special terms (free text)
- Created by (which party initiated)

**Business rules:**
- Both parties must be registered companies on the platform
- The producer and buyer cannot be the same company
- A contract must have at least one material before it can be activated
- Activating a contract requires confirmation from both parties (or admin override for pilot)
- Only parties to the contract may view it

**New API route:** `POST /api/contracts`

---

#### Feature Area 2 — Contract Material Categories and Prices

**What it does:**  
Each contract specifies which materials are covered, at what price per unit.

**Data captured (per material line):**
- Material category (FK to `material_categories`)
- Price per unit (numeric, 3 decimal places)
- Unit (FK to `unit_options`)
- Min quantity per load (optional)
- Max quantity per load (optional)
- Is active (allows deactivating a material line without closing the contract)

**Business rules:**
- A contract can have multiple material lines (e.g. paper at X SAR/ton, plastic at Y SAR/ton)
- Price changes require closing the existing material line and creating a new one (audit trail)
- Cannot delete a material line that has existing loads referencing it

**New API routes:**
- `POST /api/contracts/:id/materials`
- `PUT /api/contracts/:id/materials/:material_id`
- `GET /api/contracts/:id/materials`

---

#### Feature Area 3 — Load Request Creation

**What it does:**  
A load is a single planned movement of material under a contract.

**Data captured:**
- Parent contract ID
- Sequential load ID: auto-generated per contract (e.g. `CTR-2025-0042-L001`, `L002`, etc.)
- Material line reference (which contract material applies)
- Planned quantity (estimated, in contract unit)
- Planned dispatch date
- Notes (driver name, truck plate, reference — optional)
- Created by company ID
- Status: `planned → dispatched → delivered → settled → exception → cancelled`

**Business rules:**
- Loads can only be created on active contracts
- Load quantity must be within the material line's min/max range (if set)
- Sequential load ID must be unique per contract (DB constraint)
- Either party to the contract may create a load request (configurable)

**New API routes:**
- `POST /api/contracts/:id/loads`
- `GET /api/contracts/:id/loads`
- `GET /api/contracts/:id/loads/:load_id`
- `PATCH /api/contracts/:id/loads/:load_id/cancel`

---

#### Feature Area 4 — Sequential Load IDs per Contract

**What it does:**  
Each load within a contract gets a sequential human-readable ID that makes it easy to reference in physical documents, invoices, and communications.

**Format:** `L-{NNN}` where NNN is zero-padded and increments per contract.

**Implementation approach:**
- Add a `load_sequence_number` integer column to the `contract_loads` table
- On load creation, use a DB-level advisory lock or serialised insert to assign the next number in sequence for that contract
- The full reference is composed client-side: `{contract.reference}-L{String(load_sequence_number).padStart(3, '0')}`

**Immutability rule:** The sequence number is assigned on creation and never changes, even if the load is cancelled.

---

#### Feature Area 5 — Dispatch Confirmation (Source Weight Record)

**What it does:**  
When the producer dispatches goods, they record the weight measured at the source (outgoing scale at their facility or a certified weighbridge).

**Data captured:**
- Load reference
- Dispatch timestamp
- Source weight (kg, 3 decimal places)
- Source weight document URL (weighbridge certificate photo — required for audit)
- Truck plate number (optional)
- Driver name (optional)
- Notes

**Business rules:**
- Can only be recorded once per load (immutable after submission)
- Load status transitions to `dispatched`
- Buyer is notified: "Load {ref} has been dispatched — {weight} kg"
- Source weight document upload is required (platform-enforced)

**New API route:** `POST /api/contracts/:id/loads/:load_id/dispatch`

---

#### Feature Area 6 — Destination Weight Record (Receipt)

**What it does:**  
When the buyer receives goods, they record the weight measured at the destination (their facility scale or a certified weighbridge).

**Data captured:**
- Load reference
- Receipt timestamp
- Destination weight (kg, 3 decimal places)
- Destination weight document URL (weighbridge certificate photo — required)
- Notes

**Business rules:**
- Can only be recorded after dispatch is confirmed
- Can only be recorded once per load
- Load status transitions to `delivered`
- Producer is notified: "Load {ref} received — {weight} kg at destination"

**New API route:** `POST /api/contracts/:id/loads/:load_id/receive`

---

#### Feature Area 7 — Variance Calculation

**What it does:**  
After both weights are recorded, the system calculates the variance between source and destination weights.

**Calculation:**
```
variance_kg  = source_weight_kg − destination_weight_kg
variance_pct = (variance_kg / source_weight_kg) × 100
```

**Variance classification:**
| Classification | Condition |
|---------------|-----------|
| `within_tolerance` | `|variance_pct|` ≤ contract tolerance threshold (default: 2%) |
| `short_delivery` | `destination_weight < source_weight` AND outside tolerance |
| `excess_delivery` | `destination_weight > source_weight` AND outside tolerance |
| `exception` | Variance exceeds a hard maximum (e.g. > 10%) — triggers exception flow |

**Business rules:**
- Tolerance threshold is set at contract level (default 2%, configurable per contract)
- Variance is calculated automatically on receipt of destination weight
- `within_tolerance` → proceed to settlement automatically
- `short_delivery` / `excess_delivery` → flag for review, but settlement proceeds using settlement weight rule
- `exception` → load status = `exception`, settlement blocked until admin or both parties confirm

---

#### Feature Area 8 — Settlement Rule Application

**What it does:**  
Each contract (or material line) specifies which weight governs the settlement amount.

**Available settlement rules:**
| Rule | Meaning |
|------|---------|
| `source_weight` | Pay based on what left the producer's facility |
| `destination_weight` | Pay based on what arrived at the buyer's facility |
| `average` | Pay based on the average of both weights |
| `min_weight` | Pay based on the lower of the two weights |
| `max_weight` | Pay based on the higher of the two weights |

**Settlement calculation:**
```
settlement_weight = apply_rule(source_weight, destination_weight, settlement_rule)
settlement_amount = settlement_weight × price_per_unit
```

**Business rules:**
- Settlement rule is set at contract level; cannot be changed on a per-load basis
- Settlement is calculated automatically after destination weight is recorded (unless exception)
- Settlement amount is informational on the platform — actual payment is offline
- Both parties see the settlement amount in the load detail

---

#### Feature Area 9 — Material Outcome Classification

**What it does:**  
Allows the receiving party to classify the actual material received, which may differ from what was planned (e.g. contaminated load, mixed materials).

**Data captured:**
- Planned material category (from load request)
- Actual material category (as classified on receipt)
- Is same as planned: boolean
- Contamination level: `none / minor / major`
- Notes

**Business rules:**
- If actual material ≠ planned material, flag as exception
- Exception loads require both parties to agree on how to proceed (settle as-received, return, or reject)
- Material mismatch is recorded in the audit log
- Major contamination automatically sets load status to `exception`

---

#### Feature Area 10 — Exception Handling

**What it does:**  
When a load falls outside normal parameters, it enters an exception state that requires resolution.

**Exception triggers:**
| Trigger | Auto or Manual |
|---------|---------------|
| Variance > hard maximum threshold | Automatic |
| Material mismatch detected | Automatic |
| Either party disputes the weight record | Manual |
| Source or destination document rejected | Manual |

**Exception states:**
`exception_pending → exception_under_review → exception_resolved → (settled or cancelled)`

**Resolution paths:**
- Both parties agree: use agreed weight → proceed to settlement
- Admin intervention: admin sets resolution weight and marks resolved
- Cancellation: load cancelled, no settlement (waste of trip — recorded for reporting)

---

#### Feature Area 11 — Contract Reporting

**What it does:**  
Provides a complete view of a contract's performance: loads dispatched, total weight, settlement amounts, exceptions.

**Report dimensions:**
- Per contract: total loads, total source weight, total destination weight, total variance, total settled amount, exception count
- Per material: breakdown by material category
- By date range: filter by load dispatch or receipt date
- Status breakdown: planned, dispatched, delivered, settled, exception, cancelled

**New API routes:**
- `GET /api/contracts/:id/report`
- `GET /api/contracts/stats` (aggregate across all own contracts)

---

## Section 5 — Database Impact

### 5.1 New Tables Required

#### `contracts`
```
id                  uuid PK
reference_number    text UNIQUE NOT NULL  -- CTR-YYYY-NNNN (system-generated)
producer_company_id uuid FK → companies.id NOT NULL
buyer_company_id    uuid FK → companies.id NOT NULL
status              enum (draft, active, suspended, closed) NOT NULL DEFAULT 'draft'
tolerance_pct       numeric(5,2) NOT NULL DEFAULT 2.00  -- variance tolerance
settlement_rule     enum (source_weight, destination_weight, average, min_weight, max_weight) NOT NULL
start_date          date
end_date            date
notes               text
created_by_company_id uuid FK → companies.id NOT NULL
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()

CONSTRAINT: producer_company_id ≠ buyer_company_id
INDEX: (producer_company_id), (buyer_company_id), (status)
```

#### `contract_materials`
```
id                    uuid PK
contract_id           uuid FK → contracts.id NOT NULL
material_category_id  uuid FK → material_categories.id NOT NULL
unit_option_id        uuid FK → unit_options.id NOT NULL
price_per_unit        numeric(12,3) NOT NULL
min_quantity_per_load numeric(12,3)
max_quantity_per_load numeric(12,3)
is_active             boolean NOT NULL DEFAULT true
created_at            timestamptz NOT NULL DEFAULT now()

CONSTRAINT: UNIQUE (contract_id, material_category_id) WHERE is_active = true
```

#### `contract_loads`
```
id                      uuid PK
contract_id             uuid FK → contracts.id NOT NULL
contract_material_id    uuid FK → contract_materials.id NOT NULL
load_sequence_number    integer NOT NULL          -- sequential per contract
planned_quantity        numeric(12,3)
planned_dispatch_date   date
status                  enum (planned, dispatched, delivered, settled, exception, cancelled) NOT NULL DEFAULT 'planned'
created_by_company_id   uuid FK → companies.id NOT NULL
notes                   text
created_at              timestamptz NOT NULL DEFAULT now()
updated_at              timestamptz NOT NULL DEFAULT now()

CONSTRAINT: UNIQUE (contract_id, load_sequence_number)
INDEX: (contract_id), (status), (contract_material_id)
```

#### `contract_load_dispatches`
```
id                        uuid PK
load_id                   uuid FK → contract_loads.id UNIQUE NOT NULL  -- one per load
dispatched_by_company_id  uuid FK → companies.id NOT NULL
dispatch_timestamp        timestamptz NOT NULL
source_weight_kg          numeric(12,3) NOT NULL
source_weight_doc_url     text NOT NULL  -- required for audit
truck_plate               text
driver_name               text
notes                     text
created_at                timestamptz NOT NULL DEFAULT now()

IMMUTABILITY: No UPDATE allowed after insert (enforced in route handler + DB trigger if desired)
```

#### `contract_load_receipts`
```
id                        uuid PK
load_id                   uuid FK → contract_loads.id UNIQUE NOT NULL  -- one per load
received_by_company_id    uuid FK → companies.id NOT NULL
receipt_timestamp         timestamptz NOT NULL
destination_weight_kg     numeric(12,3) NOT NULL
destination_weight_doc_url text NOT NULL  -- required for audit
actual_material_category_id uuid FK → material_categories.id  -- if different from planned
contamination_level       enum (none, minor, major) NOT NULL DEFAULT 'none'
notes                     text
created_at                timestamptz NOT NULL DEFAULT now()

IMMUTABILITY: No UPDATE allowed after insert
```

#### `contract_load_settlements`
```
id                  uuid PK
load_id             uuid FK → contract_loads.id UNIQUE NOT NULL
contract_id         uuid FK → contracts.id NOT NULL
source_weight_kg    numeric(12,3) NOT NULL   -- copied from dispatch (immutable reference)
destination_weight_kg numeric(12,3) NOT NULL -- copied from receipt (immutable reference)
variance_kg         numeric(12,3) NOT NULL   -- source − destination
variance_pct        numeric(7,4) NOT NULL    -- % of source weight
variance_class      enum (within_tolerance, short_delivery, excess_delivery, exception) NOT NULL
settlement_rule     enum (same as contracts.settlement_rule) NOT NULL -- copied at time of settlement
settlement_weight_kg numeric(12,3) NOT NULL  -- computed per rule
price_per_unit      numeric(12,3) NOT NULL   -- copied from contract_materials at time of settlement
settlement_amount   numeric(14,3) NOT NULL
status              enum (pending, confirmed, disputed, resolved) NOT NULL DEFAULT 'pending'
resolved_at         timestamptz
resolved_by_company_id uuid FK → companies.id
notes               text
created_at          timestamptz NOT NULL DEFAULT now()

NOTE: All numeric values copied at settlement time. Changing contract price after settlement has no effect on historical settlements.
```

#### `contract_exceptions`
```
id                    uuid PK
load_id               uuid FK → contract_loads.id NOT NULL
exception_type        enum (weight_variance, material_mismatch, document_rejected, disputed) NOT NULL
raised_by_company_id  uuid FK → companies.id NOT NULL
description           text NOT NULL
status                enum (open, under_review, resolved, cancelled) NOT NULL DEFAULT 'open'
resolution_notes      text
resolved_by_company_id uuid FK → companies.id
resolved_at           timestamptz
created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()
```

**Total new tables: 7**

---

### 5.2 Modified Existing Tables

| Table | Change | Risk |
|-------|--------|------|
| `companies` | No changes to schema. | None |
| `audit_log` | No schema changes. New action keys to add to documentation: `contract.created`, `contract.activated`, `load.dispatched`, `load.received`, `load.settled`, `load.exception`. | None |
| `notifications` | No schema changes. New notification types to implement: `contract_activated`, `load_dispatched`, `load_received`, `load_settled`, `load_exception`. | None |

**No existing tables are structurally modified.**

---

### 5.3 New Enums Required

```sql
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'suspended', 'closed');
CREATE TYPE settlement_rule AS ENUM ('source_weight', 'destination_weight', 'average', 'min_weight', 'max_weight');
CREATE TYPE load_status AS ENUM ('planned', 'dispatched', 'delivered', 'settled', 'exception', 'cancelled');
CREATE TYPE variance_class AS ENUM ('within_tolerance', 'short_delivery', 'excess_delivery', 'exception');
CREATE TYPE contamination_level AS ENUM ('none', 'minor', 'major');
CREATE TYPE exception_type AS ENUM ('weight_variance', 'material_mismatch', 'document_rejected', 'disputed');
CREATE TYPE exception_status AS ENUM ('open', 'under_review', 'resolved', 'cancelled');
CREATE TYPE settlement_status AS ENUM ('pending', 'confirmed', 'disputed', 'resolved');
```

---

### 5.4 Required Constraints

| Constraint | Table | Purpose |
|-----------|-------|---------|
| `producer_company_id ≠ buyer_company_id` | `contracts` | Prevents self-contracting |
| `UNIQUE (contract_id, load_sequence_number)` | `contract_loads` | Prevents duplicate load IDs |
| `UNIQUE load_id` | `contract_load_dispatches` | One dispatch record per load |
| `UNIQUE load_id` | `contract_load_receipts` | One receipt record per load |
| `UNIQUE load_id` | `contract_load_settlements` | One settlement per load |
| `UNIQUE (contract_id, material_category_id) WHERE is_active` | `contract_materials` | No duplicate active material lines |
| Price must be > 0 | `contract_materials` | Business rule |
| Weights must be > 0 | dispatch + receipt tables | Physical validity |
| Tolerance 0–100 | `contracts.tolerance_pct` | Percentage validity |

---

### 5.5 Audit Trail Approach

The existing `audit_log` table is already designed for this purpose (append-only, entity-tagged, JSON details). The contract track will write to the same table with new action keys:

```
contract.created       → entity_type: 'contract', details: {reference, parties}
contract.activated     → entity_type: 'contract', details: {activated_by}
load.created           → entity_type: 'contract_load', details: {load_ref, planned_qty}
load.dispatched        → entity_type: 'contract_load', details: {source_weight, doc_url}
load.received          → entity_type: 'contract_load', details: {destination_weight, doc_url}
load.settled           → entity_type: 'contract_load', details: {settlement_weight, amount, rule}
load.exception_raised  → entity_type: 'contract_load', details: {exception_type, description}
load.exception_resolved→ entity_type: 'contract_load', details: {resolution, resolved_by}
```

---

### 5.6 Immutability Rules

| Record | Rule | Reason |
|--------|------|--------|
| `contract_load_dispatches` | Immutable after insert | Source weight is a physical measurement — changes would be fraudulent |
| `contract_load_receipts` | Immutable after insert | Destination weight is a physical measurement |
| `contract_load_settlements.settlement_amount` | Immutable after `status = confirmed` | Financial record integrity |
| `contracts.reference_number` | Immutable | External reference appears on physical documents |
| `contract_loads.load_sequence_number` | Immutable | Appears on documents, cannot be reassigned |
| `contract_materials.price_per_unit` | Immutable. To change price: deactivate + create new line | Historical settlement integrity |

---

### 5.7 Migration Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| New enum types in PostgreSQL require migration (cannot add via `db:push` alone for some enums) | Medium | Use `ALTER TYPE ... ADD VALUE` or full schema recreation. Drizzle's `push` handles this for new enums on new tables. |
| Sequence number generation under concurrent load creation for same contract | Medium | Use `SELECT MAX(load_sequence_number) + 1 ... FOR UPDATE` within a transaction, or use a PostgreSQL sequence per contract. Recommend advisory lock approach. |
| No existing data migration required | None | All new tables start empty — no backfills needed. |
| Existing `deals` table untouched | None | Complete isolation maintained. |

---

## Section 6 — API Impact

### 6.1 New API Routes (Contract Track)

#### Contracts
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/contracts` | Create contract (draft) | Company |
| `GET` | `/api/contracts` | List own contracts | Company |
| `GET` | `/api/contracts/:id` | Get contract detail | Party only |
| `PATCH` | `/api/contracts/:id/activate` | Activate contract | Party only |
| `PATCH` | `/api/contracts/:id/suspend` | Suspend contract (admin or both parties) | Party/Admin |
| `PATCH` | `/api/contracts/:id/close` | Close contract | Party only |

#### Contract Materials
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/contracts/:id/materials` | List material lines | Party only |
| `POST` | `/api/contracts/:id/materials` | Add material line | Party only |
| `PATCH` | `/api/contracts/:id/materials/:mid/deactivate` | Deactivate material line | Party only |

#### Contract Loads
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/contracts/:id/loads` | List loads for contract | Party only |
| `POST` | `/api/contracts/:id/loads` | Create load request | Party only |
| `GET` | `/api/contracts/:id/loads/:lid` | Get load detail | Party only |
| `PATCH` | `/api/contracts/:id/loads/:lid/cancel` | Cancel planned load | Party only |
| `POST` | `/api/contracts/:id/loads/:lid/dispatch` | Record dispatch + source weight | Producer only |
| `POST` | `/api/contracts/:id/loads/:lid/receive` | Record receipt + destination weight | Buyer only |

#### Load Settlements & Exceptions
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/contracts/:id/loads/:lid/settlement` | Get settlement details | Party only |
| `PATCH` | `/api/contracts/:id/loads/:lid/settlement/confirm` | Buyer confirms settlement | Buyer only |
| `POST` | `/api/contracts/:id/loads/:lid/exceptions` | Raise exception | Party only |
| `GET` | `/api/contracts/:id/loads/:lid/exceptions` | List exceptions | Party only |
| `PATCH` | `/api/contracts/:id/loads/:lid/exceptions/:eid/resolve` | Resolve exception | Party/Admin |

#### Reporting
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/contracts/:id/report` | Contract performance report | Party only |
| `GET` | `/api/contracts/stats` | Aggregate contract stats | Company |

**Total new routes: ~22**

---

### 6.2 Modified Existing Routes

| Route | Change | Risk |
|-------|--------|------|
| `GET /api/stats` | Remains unchanged. Deal-track stats only. | None |
| `GET /api/me` | No change. Company membership is shared. | None |
| `GET /api/lookup/material-categories` | No change. Shared with contract track. | None |
| `GET /api/lookup/unit-options` | No change. Shared with contract track. | None |

**No existing routes need modification for the contract track launch.**

---

### 6.3 Routes That Must Remain Unchanged

All current deal-track routes must remain fully unchanged:
- All `/api/listings/*` routes
- All `/api/offers/*` routes
- All `/api/deals/*` routes
- `/api/stats`
- `/api/healthz`

---

### 6.4 Key Validation Rules for New Routes

| Route | Required fields | Key validations |
|-------|----------------|----------------|
| `POST /api/contracts` | `buyer_company_id`, `settlement_rule` | Producer ≠ buyer; buyer must exist; settlement_rule must be valid enum |
| `POST /api/contracts/:id/materials` | `material_category_id`, `unit_option_id`, `price_per_unit` | Price > 0; no duplicate active material for same category; contract must be draft or active |
| `POST /api/contracts/:id/loads` | `contract_material_id`, optionally `planned_quantity`, `planned_dispatch_date` | Contract must be active; material line must be active; quantity within min/max range if set |
| `POST /api/contracts/:id/loads/:lid/dispatch` | `source_weight_kg`, `source_weight_doc_url`, `dispatch_timestamp` | Load must be `planned`; weight > 0; doc URL required; only producer may dispatch |
| `POST /api/contracts/:id/loads/:lid/receive` | `destination_weight_kg`, `destination_weight_doc_url`, `receipt_timestamp` | Load must be `dispatched`; weight > 0; doc URL required; only buyer may receive; triggers auto-settlement |
| `PATCH /api/contracts/:id/activate` | — | Contract must have ≥ 1 active material line; must be in `draft` status |
| `PATCH /api/contracts/:id/loads/:lid/settlement/confirm` | — | Settlement must be `pending`; load must be `delivered`; only buyer confirms |

---

## Section 7 — Admin and Control Requirements

### 7.1 Minimum Admin Capabilities Before Contract-Track Launch

The following capabilities are required **before** opening the contract track to pilot users. They do not require a full admin dashboard — they can be implemented as protected API-only routes or DB-level access in Phase 1.

| Capability | Priority | Minimum Implementation |
|-----------|----------|----------------------|
| View all contracts (any status, any company) | **Must have** | Admin API: `GET /api/admin/contracts` |
| View all loads for a contract | **Must have** | Admin API: `GET /api/admin/contracts/:id/loads` |
| View all open exceptions | **Must have** | Admin API: `GET /api/admin/exceptions?status=open` |
| Resolve an exception (override) | **Must have** | Admin API: `PATCH /api/admin/exceptions/:id/resolve` |
| Suspend a contract | **Must have** | Admin API: `PATCH /api/admin/contracts/:id/suspend` |
| Approve / reject company license (already needed for deal track) | **Must have** | Admin API: `PATCH /api/admin/companies/:id/license` |
| View audit log for a contract or load | **Must have** | Query existing `audit_log` table by `entity_id` |
| View settlement record for any load | **Must have** | Admin read on `contract_load_settlements` |
| Manually trigger settlement recalculation | **Should have** | Admin API for exception resolution flow |
| View platform-wide contract stats | **Should have** | Admin API: `GET /api/admin/contracts/stats` |

### 7.2 Manual Intervention Boundaries

| Action | Who can do it | Requires |
|--------|--------------|---------|
| Override settlement weight on excepted load | Admin only | Both parties notified; audit logged |
| Reopen a closed load for re-weighing | Admin only | Exceptional cases only; full audit trail |
| Force-close a contract | Admin only | With reason; all parties notified |
| Approve settlement dispute | Admin only | Both parties + admin must agree |
| Modify contract price mid-contract | Nobody directly | Requires deactivate material line + create new (audit trail) |
| Delete a dispatch or receipt record | Nobody | Records are immutable |

---

## Section 8 — Implementation Strategy

### 8.1 Recommended Safe Implementation Sequence

**Phase A — Database and API foundation (no frontend)**
1. Add 7 new tables to DB schema (`contracts`, `contract_materials`, `contract_loads`, `contract_load_dispatches`, `contract_load_receipts`, `contract_load_settlements`, `contract_exceptions`)
2. Add new enum types
3. Run `db:push` — additive changes only, zero impact on existing data
4. Implement new contract API routes (all 22)
5. Add new audit log action keys and notification types
6. Write API-level tests for contract lifecycle

**Phase B — Admin controls (before pilot)**
7. Implement minimum admin API routes (Section 7)
8. Test exception flows end-to-end via API
9. Implement admin notification for open exceptions

**Phase C — Frontend: new contract track pages**
10. Add contract track pages (contract list, contract detail, load list, load detail, dispatch form, receipt form)
11. Update dashboard to show contract stats (additive, no existing component changes)
12. Update reports page to show contract track tab
13. Update participations/activity page to show loads tab

**Phase D — Integration testing**
14. End-to-end test: create contract → add material → activate → create load → dispatch → receive → auto-settle → confirm → report
15. Test exception flows: variance breach, material mismatch, dispute, resolution
16. Test that deal track is completely unaffected

**Phase E — Pilot launch**
17. Onboard first contract pair (manually by admin)
18. Monitor audit log and exception queue

---

### 8.2 Feature Flags

Recommend a single feature flag: `CONTRACT_TRACK_ENABLED`

- When `false` (default): contract routes return 404, contract navigation is hidden in frontend
- When `true`: full contract track available
- Flag is set per environment (can enable on staging without enabling on production)
- Implement as environment variable (`ENABLE_CONTRACT_TRACK=true`)

This ensures zero risk to existing deal-track users during development and testing.

---

### 8.3 Testing Plan

| Test area | Approach | Priority |
|-----------|----------|----------|
| Contract creation validation | API unit test: all field validations | Must |
| Load sequence number uniqueness under concurrency | Concurrent load creation test | Must |
| Dispatch + receipt weight immutability | Attempt UPDATE after insert via API | Must |
| Variance calculation correctness | Unit tests for all variance formulas | Must |
| Settlement calculation for all 5 rules | Unit tests with known inputs | Must |
| Exception flow (raise → review → resolve) | API integration test | Must |
| State machine enforcement (e.g. receive before dispatch) | Negative-path API tests | Must |
| Deal track unaffected | Run existing deal track API tests after contract tables added | Must |
| Admin override paths | API integration tests | Should |
| Frontend: form validations | End-to-end UI tests | Should |
| Bilingual (AR/EN) labels in all new pages | Manual review | Should |
| RTL layout of new contract pages | Visual review | Should |

---

### 8.4 Backward Compatibility Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| New tables cause `db:push` to fail | Low | Schema is additive. New tables, new enums. No existing tables modified. |
| New enum types conflict with existing type names | Low | All new enum names are prefixed/distinct (e.g. `load_status` does not conflict with `deal_status`). |
| Contract API routes conflict with existing route prefixes | None | All new routes use `/api/contracts` prefix. No overlap with existing routers. |
| Frontend bundle size increase | Low | New pages are additive. Tree-shaking applies. |
| Notification system overload | Low | Same notification table and system. New types are additive. |
| Shared material_categories used by both tracks | Low | Read-only shared reference. Adding new categories for contract use does not affect existing listings. |

---

### 8.5 Pre-Launch Blockers

The following must be resolved before contract track goes live:

| # | Blocker | Responsible |
|---|---------|------------|
| 1 | Concurrency-safe load sequence number generation | Engineering |
| 2 | Weighbridge document upload + storage solution (URLs currently assumed external) | Engineering + Operations |
| 3 | Admin exception review UI or API access for pilot admin | Engineering |
| 4 | Contract activation flow: who initiates, who confirms (both parties, or one?) | **Product / Operations decision needed** |
| 5 | Tolerance threshold: is 2% the right default? Is it per contract or global? | **Product / Operations decision needed** |
| 6 | Settlement confirmation: does the buyer confirm, or is settlement auto-confirmed? | **Product / Operations decision needed** |
| 7 | Exception resolution SLA: how long before admin must intervene? | **Product / Operations decision needed** |
| 8 | Legal review of contract terms stored on platform | Legal |
| 9 | Clerk dev keys (`pk_test_`) must be swapped to production before any live contracts | Engineering |

---

## Section 9 — Summary for External Reviewer

### What exists today (Deal-Based Marketplace Track)

Tadweerah's current platform is a functioning B2B marketplace for waste materials. A waste producer posts a listing, recycling buyers compete with price offers, the producer accepts the best offer, and a deal lifecycle follows: payment confirmation, dispatch, and receipt — all tracked on the platform with audit logging and notifications. The platform is bilingual (Arabic/English), mobile-responsive, and supports company-level multi-user access.

**Current system numbers:**
- 17 database tables
- ~40 API endpoints
- 16 frontend pages
- Full audit trail
- In-app notification system
- Issue reporting

### What will change (Contract-Based Execution Track)

Seven new database tables will be added (no existing tables modified). Approximately 22 new API endpoints will be created under a new `/api/contracts` prefix. New frontend pages will be built for contract management and load tracking. The dashboard and reports pages will gain additive sections for contract-track data.

**Critically: the existing deal track is completely untouched.** No existing tables, routes, or pages will be modified in ways that could break current users.

### Gaps and Risks Identified

| Gap / Risk | Category | Status |
|------------|----------|--------|
| No admin panel currently exists | Admin | Needs to be built before pilot |
| Contract activation flow (who confirms?) | Product decision | Unresolved |
| Settlement confirmation flow (auto or manual?) | Product decision | Unresolved |
| Tolerance threshold defaults | Product decision | Unresolved |
| Weighbridge document storage (URLs) | Infrastructure | Needs solution |
| Concurrency-safe load sequence numbers | Engineering | Known, solvable |
| Deal track has no timeout mechanism for inactive deals | Known gap (pre-existing) | Deferred decision |
| No dispute mechanism for deal track (buyer quality issues) | Known gap (pre-existing) | Future phase |
| Clerk production keys not yet active | Infrastructure | Must resolve before launch |
| Exception SLA (how long before admin intervenes) | Operational | Needs definition |

---

*End of Assessment*  
*This document is for review purposes only. No implementation changes have been made.*
