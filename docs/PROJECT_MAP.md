# Tadweerah Hub — PROJECT MAP
> Last updated: 2026-06-25 | Gate SIR-2B Closed
> Status: Phase SIR-2B Completed and SIR-2AB Bug Fixes Closed — Sustainability UI consistency, exact Arabic terminology, read-time eligibility leniency for completed deals, and read-time quantity derivations successfully implemented and verified in Staging UAT. Next candidate phase: SIR-2C (Finalization + Revision Governance). No production DB actions, migrations, or deployments were performed.


> **Legend used throughout this document:**
> - 🟢 **Current behavior** — what the code does today
> - 🎯 **Target behavior** — what the pilot/launch requires
> - ⚠️ **Gap** — current ≠ target; action needed
> - 🔍 **Needs manual verification** — cannot be confirmed from code alone
> - 🚫 **Requires backend deploy** — any change to the listed files needs Cloud Run build + deploy

---

## 1. Monorepo Structure

```
Tadweerah-Hub/
├── artifacts/
│   ├── api-server/          # Express backend (Cloud Run)
│   └── tadweerah/           # React/Vite frontend (Firebase Hosting)
├── lib/
│   └── db/                  # Shared Drizzle ORM schema + client (@workspace/db)
├── docs/                    # This directory — documentation only
│   ├── archive/             # Deprecated/historical workflow diagrams (NOT active references)
│   ├── exports/             # Exported PDFs and PNGs for review (e.g. operational-truth-v5)
│   ├── WORKFLOW_ARCHITECTURE.md # Architecture Intent / Target Vision (NOT operational truth)
│   └── Tadweerah_Operational_Truth_Workflows_v5.drawio # Native Operational flowchart (Single Source of Truth)
├── tadweerah-user-guide-source.md # Untracked local reference (not part of committed source of truth yet)
├── pnpm-workspace.yaml      # Workspace root (use pnpm.cmd on Windows)
└── turbo.json               # Turborepo build pipeline
```

### Packages
| Package | Path | Role |
|---------|------|------|
| `api-server` | `artifacts/api-server/` | Express REST API, runs on Node/Cloud Run |
| `tadweerah` | `artifacts/tadweerah/` | React 18 + Vite SPA |
| `@workspace/db` | `lib/db/` | Drizzle schema, client, and type exports |

---

## 2. Backend Architecture (`api-server`)

> 🚫 **Deployment note:** Any change to files under `artifacts/api-server/` or `lib/db/`
> requires a backend build and new Cloud Run revision. This includes routes, jobs,
> email/notification libraries, and schema. There is no hot-reload in production.

### Entry Point & Middleware
- `src/index.ts` — registers all routers, starts server
- `src/middlewares/requireAuth.ts` — Clerk JWT verification
- `src/middlewares/requireCompany.ts` — injects `req.company` from DB
- `src/middlewares/errorHandler.ts` — `HttpError` class + global error handler

### Route Files
| File | Mount | Description | Deploy required to change? |
|------|-------|-------------|--------------------------|
| `routes/deals.ts` | `/deals` | Full deal lifecycle state machine | 🚫 Yes |
| `routes/contracts.ts` | `/contracts` | Contract Lite (b2b direct contracts) | 🚫 Yes |
| `routes/admin.ts` | `/admin/*` | Admin-key-protected operations | 🚫 Yes |
| `routes/lookup.ts` | `/lookup/*` + `/admin/lookup/*` | Master data CRUD | 🚫 Yes |
| `routes/listings.ts` | `/listings` | Waste listing CRUD + offer management | 🚫 Yes |
| `routes/reports.ts` | `/reports` | Per-company deal reports + CSV export | 🚫 Yes |
| `routes/sustainability.ts` | `/sustainability` | Sustainability pathways and allocation drafts (SIR-2A/B) | 🚫 Yes |
| `routes/transport-requests.ts` | `/transport-requests` | Transport request lifecycle | 🚫 Yes |
| `routes/stats.ts` | `/stats` | Per-company dashboard statistics | 🚫 Yes |
| `routes/notifications.ts` | `/notifications` | In-app notification reads/acks | 🚫 Yes |


### Background Jobs
| File | Schedule | Description | Deploy required to change? |
|------|----------|-------------|--------------------------|
| `jobs/expire-deals.ts` | Hourly (Cloud Scheduler) | Pre-expiry warn, deal expiry, buyer blocking, receipt_pending auto-complete | 🚫 Yes |

### Library Files
| File | Description | Deploy required to change? |
|------|-------------|--------------------------|
| `lib/email.ts` | Resend-powered transactional email (bilingual AR+EN) | 🚫 Yes |
| `lib/notify.ts` | In-app DB notifications + email trigger wrapper | 🚫 Yes |
| `lib/audit.ts` | Structured audit log writes to `audit_log` table | 🚫 Yes |
| `lib/logger.ts` | Pino structured logger | 🚫 Yes |
| `lib/contract-ref.ts` | Sequential contract reference generator (`CTR-XXXXXX`) | 🚫 Yes |

### Auth
- **Clerk** for user identity (JWT)
- `ADMIN_API_KEY` env var for admin operations (`X-Admin-Key` header)
- Email allowlist via `VITE_TADWEERAH_ADMIN_EMAILS` (frontend admin page guard)

---

## 3. Database Schema (`lib/db/src/schema/`)

### Core Tables
| Table | Key fields | Notes |
|-------|-----------|-------|
| `companies` | `id`, `name`, `license_status`, `offer_submission_blocked`, `receipt_failures_count` | Producer or buyer entity |
| `company_members` | `company_id`, `user_id`, `role` | Role: `owner` or `member` |
| `waste_listings` | `id`, `status`, `material`, `city`, `material_category_id`, `is_processed_output` | open/closed/filled/cancelled. Contains `is_processed_output` flag for sustainability eligibility |
| `listing_offers` | `listing_id`, `buyer_company_id`, `amount`, `status` | Offer state machine |
| `deals` | (see §4 below) | Core transactional entity |
| `contracts` | `id`, `reference`, `status`, `seller_company_id`, `buyer_company_id`, `weight_policy` | Contract Lite |
| `contract_materials` | `contract_id`, `material_label`, `price_per_unit`, `is_processed_output` | Material lines on contracts |
| `contract_shipments` | `contract_id`, `material_line_id`, `status`, `source_weight`, `destination_weight`, `final_weight`, `final_value` | Shipment sub-records per material line |
| `transport_requests` | `deal_id`, `manifest_ref`, `transport_mode`, `status` | Transport ops |
| `transport_quotes` | `transport_request_id`, `transporter_company_id`, `status` | Transporter bids |
| `notifications` | `company_id`, `type`, `read_at` | In-app notifications |
| `audit_log` | `action`, `entity_type`, `entity_id`, `actor_role`, `severity` | Immutable audit trail |
| `issue_reports` | `status`, `admin_note` | User-submitted issues |
| `admin_findings` | `type`, `area`, `status`, `priority` | Internal admin wishlist and operational findings (Zero relations) |
| `material_categories` | `key`, `name_ar`, `name_en`, `parent_id`, `is_sensitive`, `regulatory_code`, `hazard_level`, `physical_state` | Admin-managed taxonomy |
| `unit_options` | `key`, `name_ar`, `name_en`, `symbol` | Admin-managed units |
| `company_categories` | `key`, `name_ar`, `name_en` | Admin-managed company types |
| `capabilities` | `key`, `name_ar`, `name_en` | Admin-managed certifications |
| `manifest_records` | `deal_id` | MWAN waste manifest references |
| `sustainability_pathways` | `id`, `key`, `name_ar`, `name_en`, `category`, `is_circular_diversion`, `is_active` | GRI 306 pathways taxonomy lookup (seeded) |
| `sustainability_received_lines` | `id`, `parent_entity_type`, `parent_entity_id`, `final_received_qty`, `is_eligible` | Canonical multi-line-ready grain for sustainability reporting |
| `sustainability_allocations` | `id`, `received_line_id`, `status`, `version`, `data_quality_level` | Lifecycle of pathway allocations for a received line |
| `sustainability_allocation_lines` | `id`, `allocation_id`, `pathway_id`, `quantity`, `percentage` | Breakdown of pathways per allocation |
| `sustainability_report_field_config` | `id`, `field_key`, `is_visible`, `is_system_field` | Thin report field registry (13 protected fields) |
| `sustainability_reports` | `id`, `report_number`, `parent_entity_type`, `parent_entity_id`, `report_data_snapshot` | Parent transaction level reports and snapshots |

### Deal Table — Full Field Reference
```
id                    uuid PK
offer_id              → listing_offers.id (UNIQUE)
listing_id            → waste_listings.id
producer_company_id   → companies.id
buyer_company_id      → companies.id
settlement_type       enum: fixed | by_weight | revenue_share
price_per_unit        numeric(12,3)
estimated_amount      numeric(14,3)
actual_quantity       numeric(12,3) nullable  ← required at dispatch for by_weight deals
final_amount          numeric(14,3) nullable
status                enum: active | payment_submitted | payment_confirmed |
                            dispatched | receipt_pending | completed | expired | cancelled
payment_confirmed_at  timestamp nullable
payment_confirmed_by  → companies.id nullable
payment_reference     text nullable
payment_proof_url     text nullable
payment_submitted_at  timestamp nullable
payment_submitted_by  → companies.id nullable
dispatched_at         timestamp nullable
dispatched_by         → companies.id nullable
received_at           timestamp nullable      ← set when buyer calls confirm-receipt
received_by           → companies.id nullable
receipt_pending_since timestamp nullable      ← set when buyer confirms receipt (starts 48h window)
cancelled_at          timestamp nullable
extended_until        timestamp nullable      ← overrides base deadline (max 1 extension)
extension_count       int default 0
pre_expiry_notified   bool default false      ← prevents duplicate 3-day warning; resets on extension
transport_decision    text nullable           ← 'not_required' | null
vat_rate              numeric(5,4) nullable
vat_amount            numeric(14,3) nullable
total_amount          numeric(14,3) nullable
created_at / updated_at
```

### Contract Shipment Table — Full Field Reference
```
id                    uuid PK
reference             text UNIQUE             ← format: TDW-CTR-YYYY-NNNN-SMMM (immutable)
contract_id           → contracts.id
material_line_id      → contract_materials.id
status                enum: planned | dispatched | received | closed | cancelled
source_weight         numeric(12,3) nullable  ← seller-side weight
destination_weight    numeric(12,3) nullable  ← buyer-side weight
final_weight          numeric(12,3) nullable  ← computed at close per weight_policy; immutable after close
final_value           numeric(14,3) nullable  ← final_weight × price_per_unit; immutable after close
notes                 text nullable
planned_at            timestamp (not null, defaultNow)
dispatched_at         timestamp nullable
received_at           timestamp nullable
closed_at             timestamp nullable
cancelled_at          timestamp nullable
created_at / updated_at
```

---

## 4. Deal Lifecycle — Current vs Target Behavior

> ⚠️ **The current receipt confirmation flow does NOT match the target pilot behavior.**
> See `READINESS_FINDINGS_AND_RISKS.md` §H1 for full risk classification.

### 🟢 Current Deal Status Transitions

```
active
  → payment_submitted   (buyer submits payment reference)
  → payment_confirmed   (producer confirms payment)
  → dispatched          (producer confirms dispatch: vehicle_plate + transporter_name required)
  → completed           (buyer confirms receipt — completes immediately)

cancelled              (producer only: from active/payment_submitted/payment_confirmed)
expired                (hourly job: deadline elapsed — see §8 for thresholds)
```

### 🎯 Target Deal Behavior (Pilot / Al Qaryan)

```
active → payment_submitted → payment_confirmed → dispatched
  → If buyer confirms receipt:
       → completed IMMEDIATELY  (no 48h wait)
       → Both parties notified
  → If buyer does NOT confirm receipt within 48h:
       → escalated to admin view / flagged as "needs verification"
       → Admin reviews and force-completes after verifying shipment
       → System should NOT auto-complete blindly during pilot
```

### 🟢 Current Deal Behavior (Updated Phase 2-A)
| Step | 🟢 Current behavior | 🎯 Target behavior |
|------|---------------------|-------------------|
| Buyer confirms receipt | dispatched → completed immediately | dispatched → completed immediately |
| No buyer receipt after 48h | Escalate to admin for verification (auto-complete disabled) | Escalate to admin for verification |
| `producer-confirm-receipt` endpoint | ❌ Does not exist in `deals.ts` | May not be needed if buyer receipt = complete |
| 🚫 Fix requires | — (Fixed in Phase 2-A) | — |

### User-Triggered Transitions (confirmed from `routes/deals.ts`)
| Endpoint | Who | From → To | Key requirements |
|----------|-----|-----------|-----------------|
| `POST /deals/:id/submit-payment` | Buyer | active → payment_submitted | `payment_reference` required |
| `POST /deals/:id/confirm-payment` | Producer | payment_submitted → payment_confirmed | — |
| `POST /deals/:id/confirm-dispatch` | Producer | payment_confirmed → dispatched | `vehicle_plate` + `transporter_name` required; `actual_quantity` required for by_weight |
| `POST /deals/:id/confirm-receipt` | Buyer | dispatched → receipt_pending | Sets `received_at` + `receipt_pending_since` |
| `POST /deals/:id/cancel` | Producer only | active/payment_submitted/payment_confirmed → cancelled | Not allowed post-dispatch |
| `POST /deals/:id/extend` | Producer | any pre-dispatch → same status (deadline extended) | Max 1 extension; resets `pre_expiry_notified` |

> **Confirmed:** There is no `producer-confirm-receipt` endpoint in `deals.ts`. The 48h auto-complete in `expire-deals.ts` is the **only** current path from `receipt_pending → completed`.

### Admin Overrides (`routes/admin.ts`)
| Endpoint | Allowed from | Notes |
|----------|-------------|-------|
| `POST /admin/deals/:id/cancel` | Any non-terminal status | Cancel deal directly |
| `POST /admin/deals/:id/force-complete` | Any non-terminal status | Sets `received_at` if unset; audit log severity=warn |
| `POST /admin/deals/:id/reopen` | completed, cancelled | Restores to previous non-terminal status; resets `pre_expiry_notified` |
| `PATCH /admin/deals/:id/request-payment-resubmission` | active, payment_submitted | Resets to active; clears all payment fields |
| `PATCH /admin/companies/:id/unblock-offers` | — | Clears `offer_submission_blocked`; resets `receipt_failures_count` |
| `GET /admin/shipments`<br>`POST /admin/shipments/:id/cancel`<br>`POST /admin/shipments/:id/restore` | — | Returns all contract shipments with metadata for admin panel |
| `GET /admin/overdue-operations` | — | Returns lists of overdue deals, shipments, and contracts for review |
| `GET, POST, PATCH /admin/findings` | Any Admin | Isolated CRUD for Admin Wishlist & Findings |

---

## 5. Contract Lite — Current State & Audit Gap

> ⚠️ **Contract Lite is NOT yet fully audited for Al Qaryan demo readiness.**
> A dedicated Phase-CLT is required before using Contract Lite in the Al Qaryan demo.
> See `READINESS_FINDINGS_AND_RISKS.md` §Section 4 for full scope.

### Contract Status State Machine
```
draft → pending_confirmation → active → completed
                             ↓
                          cancelled (any pre-terminal, either party)
```

| Transition | Who | Conditions | Notification |
|------------|-----|-----------|-------------|
| draft → pending_confirmation | Creator (seller or buyer) | ≥1 material line required | ❌ None |
| pending_confirmation → active | Counterparty only | — | ❌ None |
| active → completed | Creator only | All shipments in terminal state | ❌ None |
| Any → cancelled (user) | Either party | No open shipments | ❌ None |
| Any → cancelled (admin) | Admin key | Ignores open shipments check | ❌ None |

### Weight Policies (fixed at contract creation, cannot change)
| Policy | `final_weight` logic |
|--------|---------------------|
| `source_weight_only` | = `source_weight` |
| `destination_weight_only` | = `destination_weight` |
| `dual_source_final` | both recorded; final = `source_weight` |
| `dual_destination_final` | both recorded; final = `destination_weight` |
| `dual_higher_final` | both recorded; final = `max(source_weight, destination_weight)` |

> Variance between source and destination is documented only. No reconciliation, tolerance, or dispute logic exists.

### Contract Shipment States
```
planned → dispatched → received → closed   (terminal — final_weight and final_value immutable)
                     ↓
                  cancelled   (terminal — only from planned or dispatched)
```

### Rules (confirmed from schema)
- No auto-expiry. `end_date` is advisory only, not enforced.
- No notifications or emails on any contract or shipment transition (intentional — ops-internal).
- `final_weight` and `final_value` are computed at `closed` and then immutable.

### ⚠️ Contract Lite Audit Gaps — Requires Phase-CLT
| Gap | Why it matters for Al Qaryan |
|-----|------------------------------|
| `contract-detail.tsx` UI flow (57,112 bytes — not yet read) | Al Qaryan operator uses this page; UX gaps unknown |
| Shipment route logic (write endpoints) | State transitions not verified against business rules |
| Which weight policy to recommend for Al Qaryan | `source_weight_only` vs `dual_higher_final` — founder decision needed |
| Whether contract notifications are needed for pilot | Founder/CTO decision required |
| Admin/report visibility for contract shipment weights | Can admin view individual shipment records? Unknown |
| Step-by-step Al Qaryan UAT scenario | No test script exists |
| Zero-weight shipment close edge case | Not verified |

---

## 6. Admin Master Data / Dropdown Management

### 🟢 Current State: API-ready; UI gap for most

| Entity | Backend CRUD | Admin UI | Safe to expose in UI? |
|--------|-------------|----------|----------------------|
| Material categories | 🟢 GET/POST/PATCH via `/admin/lookup/material-categories` | 🟡 Read-only via Admin UI | 🟢 Yes - protect `key` field |
| Unit options | 🟢 GET/POST/PATCH via `/admin/lookup/unit-options` | 🟡 Read-only via Admin UI | 🟢 Yes - protect `key` field |
| Company categories | 🟢 GET/POST/PATCH via `/admin/lookup/company-categories` | 🟡 Read-only via Admin UI | 🟢 Yes - governed (deactivation blocked if referenced) |
| Capabilities | 🟢 Read-only via `/admin/lookup/capabilities` (active+inactive) | 🟡 Read-only via Admin UI | N/A - backend endpoint needed first |
| License status | ✅ Via `/admin/companies/:id/license` | ✅ Companies tab in admin UI | pending/approved/rejected/expired |
| Lifecycle status enums | Not configurable (DB enum, schema-level) | N/A | 🚫 Must NOT be editable — drives backend logic |
| Payment/financial fields | Not configurable | N/A | 🚫 Must NOT be editable |

### 🎯 Target
Admin should manage material categories, subcategories, unit options, and capabilities
from a UI panel — without calling raw APIs. Operations: add / deactivate / reorder / rename.
**Hard Delete is prohibited** to maintain referential integrity. Deactivations (`is_active: false`) are blocked if the option is currently referenced by active deals, listings, or companies.

**Protection rules for any UI implementation:**
- `key` fields are immutable after creation and must be read-only in UI.
- `is_sensitive` flag on material categories must be clearly labeled (triggers buyer license check).
- Lifecycle/payment/status fields must never be exposed as editable dropdowns.

🖥️ Frontend-only change for material categories, unit options, company categories.
🚫 Capabilities require a new backend write endpoint before UI can be built.

---

## 7. Notification System

### Channels
1. **In-app DB row** — `notifications` table, polled by frontend on each page load / interval
2. **Transactional email** — via Resend (`RESEND_API_KEY`), sent to company owner's Clerk-registered email

### Email Templates in `lib/email.ts`
| Function | When triggered | Rich detail? | Status |
|----------|---------------|-------------|--------|
| `sendEmail` (generic) | Any `createNotification` call with `sendMail: true` | No | ✅ Active |
| `sendDealCompletionEmail` | Defined in `lib/email.ts:395`. **Not currently wired to any active lifecycle completion path.** Zero call sites found in codebase. Wiring requires a backend code change + Cloud Run deploy. | Yes (full deal table) | ❌ Unused |
| `sendTransportRequestNotification` | New transport request created (platform or self-managed) | Yes (logistics detail) | ✅ Active |
| `sendSupportNotification` | Issue report submitted by user | Yes (user detail) | ✅ Active |

### Email Environment Variables
| Var | Purpose | If missing |
|-----|---------|-----------|
| `RESEND_API_KEY` | Enable all Resend email delivery | All transactional email silently disabled; in-app only |
| `EMAIL_FROM` | Sender address | Defaults to `تدويرة <noreply@tadweerah.com>` |
| `PLATFORM_URL` | Base URL for email links | Defaults to `https://tadweerah.com` |
| `SUPPORT_EMAIL` | Issue report email forwarding | Issue emails not forwarded |
| `TRANSPORT_REQUEST_EMAIL` | Ops transport request notifications | Transport emails not sent to ops |

### Notification Delivery Architecture
```
Event occurs (route handler or hourly job)
    │
    ├─→ notifyDealStageChange() / typed helper
    │       │
    │       ├─→ INSERT INTO notifications (in-app DB row — always)
    │       │
    │       └─→ if sendMail: true
    │               → lookupOwnerEmail(companyId)
    │                     → SELECT user_id FROM company_members WHERE role='owner'
    │                     → clerkClient.users.getUser(userId)
    │                     → emailAddresses[0].emailAddress
    │               → sendEmail() → Resend API (fire-and-forget)
    │
    └─→ Hourly job uses void — fully fire-and-forget; no retry
```

**Resilience notes:**
- No retry mechanism — one-shot delivery only
- Clerk unreachable → email skipped silently; in-app notification still created
- Resend down → in-app notification still created; email silently dropped

---

## 8. Hard-Coded Timers (all in `jobs/expire-deals.ts`)

> 🎯 **Target:** These should eventually be admin-configurable. Currently all hard-coded constants.
> 🚫 Any change to timer values requires backend code change + Cloud Run deploy.

| Timer | Current value | Constant name | Configurable? |
|-------|--------------|---------------|---------------|
| `active` / `payment_submitted` expiry | 31 calendar days from `created_at` | `MS.active` | ❌ Hard-coded |
| `payment_confirmed` expiry | 8 calendar days from `payment_confirmed_at` | `MS.payment_confirmed` | ❌ Hard-coded |
| `dispatched` expiry | 72 hours from `dispatched_at` | `MS.dispatched` | ❌ Hard-coded |
| Pre-expiry warning window | 3 days before deadline | `MS.pre_expiry_warn` | ❌ Hard-coded |
| `receipt_pending` auto-complete | 48 hours from `receipt_pending_since` | `RECEIPT_PENDING_MS` | ❌ Hard-coded |
| Extension duration | 7 days | Inline in `routes/deals.ts` L886 | ❌ Hard-coded |
| Max extensions per deal | 1 | Inline in `routes/deals.ts` L877 | ❌ Hard-coded |

> These values must be explicitly acknowledged by the CTO as acceptable before pilot launch.
> See `OPERATIONAL_RULES_AND_NOTIFICATIONS_AUDIT.md` §1 for full timer audit.

---

## 9. Frontend Pages (`artifacts/tadweerah/src/pages/`)

| Page file | Route | Description |
|-----------|-------|-------------|
| `home.tsx` | `/` | Landing / unauthenticated home |
| `marketplace.tsx` | `/marketplace` | Browse open listings |
| `listing-detail.tsx` | `/listings/:id` | Listing + offer submission + deal panel |
| `listing-new.tsx` | `/listings/new` | Create new waste listing |
| `my-listings.tsx` | `/my-listings` | Producer's own listings |
| `dashboard.tsx` | `/dashboard` | Both-party deal dashboard with status overviews and sustainability allocation draft card (SIR-2B) |
| `participations.tsx` | `/participations` | Buyer's submitted offers + deal status |
| `contracts.tsx` | `/contracts` | Contract Lite list |
| `contract-detail.tsx` | `/contracts/:id` | Contract detail + shipments (⚠️ not yet audited for Phase-CLT) |
| `contract-new.tsx` | `/contracts/new` | Create contract |
| `transport-requests.tsx` | `/transport-requests` | Transport requests + quote submission |
| `reports.tsx` | `/reports` | Per-company deal reports + CSV export |
| `admin.tsx` | `/admin` | Admin panel (Companies, Deals, Contracts, Shipments, Transport, Reports, Issues, Audit Log, Awaiting Review, Master Data tabs; gated by Clerk email allowlist + ADMIN_API_KEY) |
| `onboarding.tsx` | `/onboarding` | Company registration flow |
| `company-profile.tsx` | `/profile` | Company profile + license |
| `company-capabilities.tsx` | `/capabilities` | Waste-handling certifications |
| `members.tsx` | `/members` | Team members + invitations |
| `pending-actions.tsx` | `/pending-actions` | Pending deal actions queue |
| `sustainability-allocations.tsx` | `/sustainability/allocations` | List of eligible sustainability received lines and allocation drafts (SIR-2B) |
| `sustainability-allocation-detail.tsx` | `/sustainability/allocations/:id` | Edit and save sustainability pathway allocation drafts (SIR-2B) |

---

## 10. Deployment / Environment Map

### Deployment Status & Helpers
* **Frontend**:
  * Firebase Hosting target: `tadweerah-staging`
  * Official helper: `scripts/deploy-frontend.ps1`
  * The script builds `@workspace/tadweerah` and deploys Firebase Hosting.
  * Frontend was deployed for commit `7422819`.
* **Backend**:
  * Service name: `tadweerah-api`
  * Latest accepted backend revision from live staging baseline: `tadweerah-api-00085-rg9`
  * Backend deploy for Phase 2-C is complete.
  * Backend deployment path: `gcloud run deploy tadweerah-api --project=tadweerah-staging --region=europe-west1 --source=.`

| Service | Platform | Config | Notes |
|---------|---------|--------|-------|
| API backend | Google Cloud Run | `tadweerah-api` service | ✅ Deployed |
| Frontend | Firebase Hosting | `tadweerah-staging` project; also serves `tadweerah.com` | ✅ Deployed via `scripts/deploy-frontend.ps1` |
| Database | PostgreSQL via `DATABASE_URL` — verify current provider/environment before deployment or DB changes | `DATABASE_URL` env var | 🔍 Confirm provider before schema changes |
| Auth | Clerk | `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` | — |
| Email | Resend | `RESEND_API_KEY` | 🔍 Verify active in Cloud Run env |
| Job scheduler | Cloud Scheduler | Triggers hourly expire-deals job | 🔍 Verify last execution succeeded |

> 🔍 **Manual verification needed:** Confirm Cloud Scheduler is active and the last
> expire-deals job execution succeeded. No alerting is currently configured for job failures.

### Key Backend Environment Variables
```
DATABASE_URL
CLERK_SECRET_KEY
ADMIN_API_KEY
RESEND_API_KEY
EMAIL_FROM              (default: تدويرة <noreply@tadweerah.com>)
PLATFORM_URL            (default: https://tadweerah.com)
SUPPORT_EMAIL
TRANSPORT_REQUEST_EMAIL
```

### Key Frontend Environment Variables
```
VITE_CLERK_PUBLISHABLE_KEY
VITE_TADWEERAH_ADMIN_EMAILS   # comma-separated; controls admin page access
VITE_API_URL                   # backend API base URL
```

---

## 11. Known Gaps & Remaining Phase Roadmap

> **Live Staging Baseline:**
> - **Backend:** `tadweerah-api-00090-b5v`
> - **Frontend:** `https://tadweerah-staging.web.app`
> - **Closure commit:** `1d4562f feat(admin): configure notification recipient`
> - **Phase 2-F:** ✅ Completed

### 1. Phase 2-D — Readiness Risk Burn-down & Remaining Roadmap Alignment
- Current docs-only phase.

### 2. Phase 2-E — Contract Lite Pilot UAT & Al Qaryan Readiness
- **Status:** Contract Detail operational UX work deployed + UAT passed. Deployed backend to `tadweerah-api-00089-jnt` and frontend to `https://tadweerah-staging.web.app`. Included commits:
  - `981830f fix(contracts): prevent zero weight shipment closure`
  - `702daf4 fix(contracts): notify shipment action handoffs`
  - `60fda0e fix(contracts): scroll to new shipment`
  - `4f8ec76 fix(contracts): focus add shipment form`
  - `c871e00 fix(contracts): add shipment list filters`
  Ready for pilot use.
- **Scope:** Must do before pilot if Al Qaryan/contract workflow is the target path. Includes Contract Lite audit, Al Qaryan UAT script, weight/final quantity policy confirmation, and contract notification decision.

### 3. Phase 2-F — Admin Email Notification Recipient Override
- **Status:** ✅ Implemented, deployed, and UAT passed.
- **Scope:** Admin-managed override for operational email routing (`مستلم تنبيهات البريد`).
- **Current Model:**
  - `مالك حساب الشركة` remains the ownership/permission source.
  - `مستلم تنبيهات البريد` controls operational email routing only.
- **Capabilities:** Admin can select an existing company member as custom notification recipient, or reset to the default owner.
- **Fallback behavior:** If no custom recipient is set, or if the custom recipient is invalid/no longer a member, the backend automatically falls back to routing emails to the owner.
- **Not implemented (deferred to Phase 3):** Ownership transfer, permission transfer, role changes, and all-member notification preferences.

### 4. Phase 2-G & 2-H — Billing & Admin Reports Design Notes
- **Status:** ✅ Design Approved (No Implementation Yet).
- **Scope:** Defines the billing model (Tadweerah fees) and the dynamic, period-based admin reporting system.
- **Documentation:** See `docs/PHASE_2_G_H_DESIGN_NOTES.md` for full details.

### 4. Phase 3-A1 — Admin Backup Allowlist
- **Status:** ✅ Implemented and UAT passed.
- **Scope:** Fast, secure fallback for adding backup admin team members without requiring full RBAC or Admin UI overhaul.
- **Implementation:** Admins are added to the frontend `VITE_TADWEERAH_ADMIN_EMAILS` allowlist environment variable. This safely bypasses forced company onboarding (`/onboarding/company`).
- **Deferred to future (Admin Team Invitations/Roles):** Creating a dedicated admin team member invitation flow via DB (`admin_invitations` / `admin_members`). The allowlist strategy is used as a temporary MVP.
- **Note:** `info@tadweerah.com` is reserved for support routing, not used for direct admin access. The backend `/admin` routes remain protected by `ADMIN_API_KEY` as a strong second layer of defense.

### 5. Phase 3-A — Admin Master Data MVP
- Should do before broader operations if pilot requires frequent taxonomy/unit edits.
- Can defer if pilot taxonomy is stable.

### 6. Phase 3-A2 — Admin Wishlist & Findings Register
- **Status:** ✅ Implemented and UAT passed.
- **Scope:** Internal tracking system within the Admin Panel to log operational findings, UAT issues, customer requests, and improvements.
- **Implementation:** Completely isolated feature using the `admin_findings` table. Supports creation, editing, manual reordering via arrows, deletion, and Arabic localization. Zero relations to active deals or shipments.

### 5. Phase 3-B — Post-Pilot Workflow Configurability & Polish
- Configurable timers, category-targeted notifications, i18n refactor, checklist wording polish, etc.

### 6. Phase 3-C — Multi-Branch / Multi-Site Operational Routing
- **Status:** Not implemented (deferred to Phase 3).
- **Scope:** Support for multiple operational sites/branches per company (`المواقع التشغيلية / الفروع`).
- **Target Model:** Each site can have its own notification recipient or team. Contracts, shipments, and listings may be associated with a specific site.
- **Routing Order:** Site/branch-level recipient (if linked) → company-level `مستلم تنبيهات البريد` → company owner fallback.
- **Rules:** Routing remains role/site-based, not hardcoded by company name or city. Supports cases where the same company may be buyer in one transaction and seller in another.

### Resolved / Closed Items
- **Deal receipt flow**: ✅ Resolved in Phase 2-A.
- **Receipt_pending auto-complete**: ✅ Resolved in Phase 2-A.
- **Buyer not warned before deal expires**: ✅ Resolved in Phase 2-C.
- **No notification sent after admin override**: ✅ Resolved in Phase 2-C.
- **Admin panel has no `force-complete` deal button**: ✅ Resolved in Phase 2-C.
- **Admin cannot cancel dispatched deals directly**: ✅ Resolved via admin override overhaul in Phase 2-C.

### Remaining Active Known Gaps
| Area | Issue | Priority / Phase |
|------|-------|------------------|
| Transport quote | "Select" is label-only; ops may misunderstand | Low (Polish later) |
| Contract Lite notifications | Deployed in `tadweerah-api-00085-rg9`; pending UAT | Resolved |
| `sendDealCompletionEmail` | Defined but not wired | Medium (Phase 2-F) |
| Master data UI | Need UI for capability CRUD | Medium (Phase 3-A) |
| Timer durations | Hard-coded; should be configurable | Low (Phase 3-B) |
