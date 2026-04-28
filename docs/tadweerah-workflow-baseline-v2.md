# Tadweerah — Final 18-Workflow Baseline v2
**Version:** 2.0  
**Date:** April 28, 2026  
**Status:** Authoritative Pre-Implementation Baseline  
**Scope:** Marketplace Track (MVP) + Contract Track (Architecture Confirmed, Implementation Deferred)

---

## Document Purpose

This is the single authoritative workflow specification for Tadweerah before developer implementation planning.  
It supersedes all prior workflow descriptions and incorporates:

- Phase 0 foundation fixes (all items FIX-01 through FIX-08)
- Updated deal expiry thresholds (active 31d / payment_confirmed 8d / dispatched 72h)
- Updated listing close behavior with pending-offer confirmation flow
- Company logo upload as optional company profile field
- All confirmed contract-track architectural decisions
- Latest settlement schema corrections (weighbridge, variance, regulatory waste codes)
- Governance, audit, storage, and admin notes within each workflow

---

## Platform Architecture Summary

### Two Execution Tracks (Confirmed — Isolated)

| Track | Purpose | Status |
|---|---|---|
| **Marketplace Track** | Listing → Offer → Deal → Completion | MVP Built |
| **Contract Track** | Standing contract → Load request → Dispatch → Settlement | Architecture confirmed, implementation deferred |

**Architectural rule:** Deal objects do not reference Contract objects. Contract objects do not reference Listing or Deal objects. Users and companies are shared across tracks. Reporting is track-scoped.

### User Roles (MVP)

| Role | Description |
|---|---|
| **Producer** | Creates listings, reviews offers, accepts deals |
| **Buyer / Recycler** | Browses marketplace, submits offers |
| **Carrier / Transporter** | Future phase — transport coordination |
| **Admin** | Internal Tadweerah team — oversight via API key-protected routes |
| **Regulator** | Future phase — read-only compliance reporting |

### Phase Readiness Labels

- **✅ MVP / Built** — Implemented and confirmed in current codebase  
- **🔧 Pilot Enhancement** — Confirmed for implementation before pilot launch  
- **📋 Future Phase** — Agreed architecture, deferred implementation  
- **❓ Needs Decision** — Open item requiring product decision before build

---

## Foundation Layer (Phase 0) — Status

The following foundation fixes were applied before v2 baseline is considered stable:

| Fix ID | Item | Status |
|---|---|---|
| FIX-01 | Clerk production keys (pk_live_) | ⚠️ Pending — awaiting user to set pk_live_ / sk_live_ in Replit Secrets |
| FIX-02 | Audit log severity levels (info/warn/error) | ✅ Done |
| FIX-03 | GET /me resolved via company_members join | ✅ Done |
| FIX-04 | Object Storage migration (multer.diskStorage → GCS) | ⚠️ Pending implementation |
| FIX-05 | company.type column cleanup & NULL companies | ⚠️ Pending — awaiting user confirmation on 2 NULL-type test records |
| FIX-06 | DELETE /listings/:id — close + pending-offer confirmation | ✅ Done |
| FIX-07 | Expire-deals job — 31d / 8d / 72h thresholds | ✅ Done |
| FIX-08 | Admin router — companies, issue-reports, audit-log behind ADMIN_API_KEY | ✅ Done |

---

## WF-01 — User Registration & Onboarding

**Actor:** New user (any role)  
**Phase:** ✅ MVP / Built  
**Entry point:** Landing page → Sign Up

### Happy Path

1. User lands on tadweerah.com, clicks "ابدأ الآن" or "تسجيل الدخول"
2. Clerk handles identity verification (email / Google / Apple / social)
3. On first sign-in, `/onboarding` is rendered (enforced by App.tsx route guard checking `me.company`)
4. User enters:
   - Company name
   - Company type (producer / buyer) — **Note: column renamed to `type` in DB; see FIX-05**
   - City
   - Contact phone
   - Commercial registration number (optional)
   - License number + license document upload (optional — stored in Object Storage post FIX-04)
   - Company logo upload (optional — for future branded reporting)
   - Accepted terms at (timestamp recorded on acceptance of T&C)
5. System creates company record, creates company_members record linking user to company
6. User redirected to `/dashboard`

### State Created / Updated

- `companies` row (name, type, city, contact_phone, commercial_registration, license_number, license_document_url, logo_url, accepted_terms_at)
- `company_members` row (user_id, company_id, role: 'owner')

### Governance / Audit Notes

- `accepted_terms_at` timestamp is immutable once set — records T&C acceptance moment
- T&C text must explicitly state: producer is not obligated to accept highest offer; platform bears no liability for selection decisions (see WF-08)
- License status begins as `pending` until admin approval (see WF-15)

### Storage Notes

- License document: stored in Replit Object Storage (post FIX-04); path stored in `companies.license_document_url`
- Company logo: stored in Object Storage; path stored in `companies.logo_url`; used in future branded PDF reporting

### Admin Notes

- Admin can view all companies via `GET /admin/companies` (ADMIN_API_KEY required)
- Admin can update license status via `PATCH /admin/companies/:id/license-status`
- Companies with `type IS NULL` (two test records identified) must be resolved before production data cleanup

### Edge Cases

| Scenario | Behaviour |
|---|---|
| User signs in a second time, company already exists | Route guard passes, redirected to /dashboard |
| User exits onboarding mid-way | Data not saved; re-shown onboarding on next login |
| Duplicate company name | Allowed — no uniqueness constraint at company name |
| Clerk key is pk_test_ in production | Authentication works but triggers dev-key warnings in logs; blocks launch (FIX-01) |

---

## WF-02 — Company Profile & Permissions

**Actor:** Company owner / member  
**Phase:** ✅ MVP / Built  
**Entry point:** /company/profile

### Happy Path

1. User navigates to Company Profile
2. Can view: company name, type, city, contact phone, commercial registration, license info, logo
3. Can edit: all fields except company type (locked post-onboarding for MVP)
4. Company logo: optional upload; displayed in profile and future branded reports
5. Members tab: owner can invite members, set role (owner / member), remove members
6. Capabilities tab: company declares operational capabilities (waste types handled, vehicle types, etc.)

### State Created / Updated

- `companies` row updated (name, city, contact_phone, logo_url, license fields)
- `company_members` rows for member management
- `company_capabilities` rows (if capability module implemented)

### Governance / Audit Notes

- Company type change blocked — prevents misrepresentation post-onboarding
- License status changes must originate from admin (not self-service)
- All member changes logged in audit trail with userId and companyId

### Storage Notes

- Logo upload: POST /api/listings/:id/image pattern to be replicated for company logo once Object Storage is active (FIX-04)
- Maximum logo size: 5MB; accepted formats: JPG, PNG, WebP

### Admin Notes

- License status visible and patchable from admin panel (WF-15)
- Company capabilities visible to admin for onboarding review

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Member tries to change company type | Blocked in UI and API (403) |
| Logo upload before Object Storage is live | Blocked; UI shows "coming soon" or upload removed until FIX-04 complete |
| Two members attempt to edit profile simultaneously | Last-write wins; no conflict resolution for MVP |

---

## WF-03 — Create Listing

**Actor:** Producer  
**Phase:** ✅ MVP / Built  
**Entry point:** /listings/new

### Eligibility Check (Applied at POST /offers, NOT at POST /listings)

> **Immutable rule:** POST /listings has zero eligibility checks. Eligibility is enforced only at POST /offers (buyer side). Producers can always create listings regardless of license status.

### Happy Path

1. Producer navigates to "إنشاء إعلان"
2. Fills form:
   - Material category (from lookup table)
   - Waste description
   - Quantity + unit (from unit_options lookup)
   - Sale type (open market / private targeting)
   - Pickup city / district / notes (simple text — no map)
   - Optional listing image (stored in Object Storage post FIX-04)
   - Optional: target specific companies (if sale_type = private)
3. System creates listing with status = 'open'
4. If private targeting: only targeted companies see listing in marketplace
5. Producer redirected to listing detail or my-listings page

### State Created / Updated

- `waste_listings` row (status: 'open', all fields including material_category_id, unit_option_id, sale_type)
- Audit log: `listing.created`

### Notifications Triggered

- None on creation (public listing)
- If private targeting: notification to each targeted company (future enhancement)

### Governance / Audit Notes

- Listing reference (e.g., TDW-2026-A3F2) derived from listing ID — no separate sequence needed
- Listing images and documents stored in Object Storage (FIX-04)
- Audit trail: creation, close, force-close all logged

### Admin Notes

- Admin can view all listings via platform stats endpoint
- Material categories and unit options manageable without code via admin API (WF-15)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Producer submits without category | Validation error — category required |
| Producer creates listing with 0 quantity | Validation error |
| Producer's license not approved | Listing is created anyway (eligibility check is on buyer side only) |
| Duplicate listing (same material/quantity) | Allowed — no deduplication |

---

## WF-04 — Company Targeting & Listing Visibility

**Actor:** Producer  
**Phase:** 🔧 Pilot Enhancement (partial — sale_type field in DB, full targeting UI deferred)  
**Entry point:** Listing creation form (targeting section)

### Confirmed Design

| sale_type | Visibility |
|---|---|
| `open` | All authenticated buyers see listing in marketplace |
| `private` | Only explicitly targeted companies see listing |

### Happy Path (Open Market)

- Producer leaves sale_type = 'open'
- Listing appears in marketplace for all buyers

### Happy Path (Private Targeting)

1. Producer selects sale_type = 'private'
2. Searches for and selects target companies from registered company list
3. System records targeting relationships
4. Targeted companies receive notification and see listing in "private offers" section
5. Non-targeted companies cannot see the listing

### Governance / Audit Notes

- Targeting decisions logged: who was targeted, when
- Future: targeting audit for compliance reporting

### Edge Cases

| Scenario | Behaviour |
|---|---|
| No companies targeted on private listing | Listing invisible to all buyers — producer warned |
| Targeted company deregisters | Listing remains visible to remaining targets |

---

## WF-05 — Marketplace Browsing

**Actor:** Buyer / Recycler  
**Phase:** ✅ MVP / Built  
**Entry point:** /marketplace

### Happy Path

1. Buyer navigates to marketplace
2. Sees all open listings (status = 'open', sale_type = 'open', or private with buyer targeted)
3. Can filter by material category, city, quantity range
4. Listing cards show: material, quantity, unit, city, offer count, listing reference
5. Buyer clicks listing to view full detail
6. Detail shows: full description, producer company name, pickup location notes, current offer count (not individual offer prices)

### Data Shown

- Listing detail: material_category, quantity, unit, city, district, pickup_notes, producer name, created_at
- Buyer's own existing offer (if any) — price, status

### Governance / Audit Notes

- Buyers cannot see other buyers' offer prices — only count shown
- Withdrawn offers not counted in offer_count

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Buyer has no eligible company (type NULL) | Blocked from submitting offers (see WF-06) |
| Listing closed while browsing | On navigation: shows "الإعلان مغلق" state |

---

## WF-06 — Submit Offer

**Actor:** Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** Listing detail → "تقديم عرض سعر"

### Eligibility Checks (Enforced at POST /offers)

1. Buyer's company type must not be 'producer' (no self-bidding as producer)
2. Buyer's company must have accepted T&C (`accepted_terms_at IS NOT NULL`)
3. Listing must be status = 'open'
4. Buyer must not already have a non-withdrawn offer on the same listing (one active offer per buyer per listing)
5. License check (if configured): buyer's license_status must be 'approved' (configurable)

### Happy Path

1. Buyer views listing detail, clicks "تقديم عرض سعر"
2. Enters price per unit (SAR)
3. System calculates total = price_per_unit × listing.quantity
4. Buyer reviews and submits
5. Offer created with status = 'pending'
6. Producer receives in-app notification: "عرض جديد على إعلانك"

### Self-Bidding Warning (PUT /offers/mine — Pilot Enhancement)

- If buyer is already top bidder and tries to improve offer: API returns `{ isAlreadyTopBidder: true, warning: "..." }`
- Frontend shows warning: "أنت مقدّم أعلى عرض حالياً" before allowing update

### State Created / Updated

- `listing_offers` row (buyer_company_id, waste_listing_id, price_per_unit, status: 'pending')
- Notification created for producer

### Governance / Audit Notes

- All offers (submitted, rejected, withdrawn) permanently stored — never deleted
- Rejection reasons stored per offer
- When accepted offer is below highest offer: `accepted_below_highest` flag set on deal (producer transparency)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Buyer already has offer on listing | Buyer can only improve (PUT /offers/mine) or withdraw |
| Listing closes during offer submission | 409 returned, offer not created |
| Buyer's company type is NULL | 403 — blocked until company type resolved |

---

## WF-07 — Bidding & Offer Competition

**Actor:** Buyer (competitive)  
**Phase:** ✅ MVP / Built  
**Entry point:** My Participations → listing detail

### Happy Path

1. Buyer sees their submitted offer in "مشاركاتي"
2. Can view current offer status (pending / accepted / rejected / withdrawn)
3. Can see deal stage if accepted (active / payment_confirmed / dispatched / completed)
4. Can improve offer price via "تحسين العرض" (PUT /offers/mine) — triggers self-bidding check
5. Can withdraw offer via "سحب العرض" (sets status = 'withdrawn')

### Offer States

| Status | Description |
|---|---|
| `pending` | Submitted, awaiting producer decision |
| `accepted` | Producer accepted — deal created |
| `rejected` | Producer rejected (with reason) |
| `withdrawn` | Buyer withdrew before decision |

### Notifications

- On rejection: buyer receives "تم رفض عرضك على إعلان TDW-XXXX" with rejection reason
- On acceptance: buyer receives "تم قبول عرضك — الصفقة الآن نشطة"

### Governance / Audit Notes

- Offer history fully auditable: all price changes, withdrawals, and decisions logged
- Buyers cannot see competitor offer amounts — only their own

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Multiple buyers submit simultaneously | All offers stored; producer sees all |
| Buyer improves offer after being top bidder | Warning shown (WF-06 self-bidding check) |
| Offer withdrawn after deal created | Not possible — offer locked once accepted |

---

## WF-08 — Accept / Reject Offer

**Actor:** Producer  
**Phase:** ✅ MVP / Built  
**Entry point:** Listing detail → Offers panel

### Happy Path — Accept

1. Producer views offer list on their listing detail
2. Sees all offers sorted by price (highest first)
3. Can accept any offer regardless of rank — including below-highest
4. If accepting below highest: system prompts for reason (governance requirement)
5. On acceptance:
   - Selected offer → status = 'accepted'
   - All other non-withdrawn offers → status = 'rejected' (with reason: 'offer_not_selected')
   - Listing status remains 'open' (listing stays visible — deal runs in parallel)
   - Deal created: status = 'active'
   - Accepted buyer notified
   - Rejected buyers notified with reason

### Accepting Below Highest Offer — Governance Rule

- Permitted — T&C explicitly grants producer full discretion
- `accepted_below_highest = true` flag recorded on deal for audit
- Reason captured and stored
- Audit log entry: `offer.accepted_below_highest` with details

### Happy Path — Reject Individual Offer

1. Producer selects a specific offer and rejects it
2. Rejection reason required (dropdown or text)
3. Offer → status = 'rejected'
4. Buyer notified with reason

### Notifications

| Event | Recipient | Message |
|---|---|---|
| Offer accepted | Winning buyer | "تم قبول عرضك — الصفقة نشطة" |
| Offer rejected (all others) | Each losing buyer | "لم يتم اختيار عرضك على إعلان TDW-XXXX — السبب: [reason]" |
| Offer individually rejected | That buyer | "تم رفض عرضك — السبب: [reason]" |

### Governance / Audit Notes

- All rejection reasons stored permanently
- Accepted offer clearly recorded with timestamp and userId
- If accepted offer < max(pending offers): `accepted_below_highest` flag + reason logged
- Full offer audit trail available to admin

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Producer tries to accept withdrawn offer | 409 — cannot accept withdrawn offer |
| All offers withdrawn before producer decides | Listing remains open with 0 active offers |
| Producer accepts offer then changes mind | No reversal post-acceptance — deal is created |

---

## WF-09 — Deal Lifecycle

**Actor:** Producer + Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal panel on listing detail / participations

### Deal States & Expiry Thresholds

| Status | Triggered By | Expires After | Next State |
|---|---|---|---|
| `active` | Offer accepted | **31 days** | → `expired` |
| `payment_confirmed` | Producer confirms payment received | **8 days** | → `expired` |
| `dispatched` | Producer marks dispatched | **72 hours** | → `expired` |
| `completed` | Producer confirms receipt/completion | Never | Terminal |
| `expired` | Expiry job (runs hourly) | N/A | Terminal |

> **Threshold change from v1:** active was 30d → now **31d**; payment_confirmed was 7d → now **8d**; dispatched was 48h → now **72h**.

### Happy Path

1. Deal created (status = 'active') when offer accepted
2. Payment phase: producer waits for buyer payment; buyer sends payment reference + proof
3. Producer confirms payment received → status = 'payment_confirmed'
4. Dispatch: producer arranges transport; marks dispatched → status = 'dispatched'
5. Completion: producer (or buyer) confirms material received → status = 'completed'
6. Deal summary generated; both parties can view/print

### Deal Reference

- Human-readable reference: `TDW-YYYY-XXXXXX` (derived from deal ID prefix — no separate sequence)
- Used in all communications, notifications, and reports

### Contact Visibility (Critical Operational Fix)

- After deal is 'active': both parties see each other's contact details in deal panel
- Producer sees: buyer company name, contact phone
- Buyer sees: producer company name, contact phone, pickup location

### State Created / Updated

- `deals` row (status, payment_reference, payment_proof_url, created_at, updated_at)
- Audit log for each state transition

### Notifications

| Transition | Recipient | Trigger |
|---|---|---|
| Deal created | Both | Offer acceptance |
| Payment confirmed | Buyer | Producer action |
| Dispatched | Buyer | Producer action |
| Completed | Both | Final confirmation |
| Expired | Both | Expiry job |

### Governance / Audit Notes

- Every state transition logged with userId, companyId, timestamp
- Expiry job runs hourly — finds deals older than threshold and marks 'expired'
- Expired deals cannot be reactivated — new listing/offer cycle required
- Payment reference + payment proof URL stored on deal (not on listing)

### Admin Notes

- Admin can view all deals and their current status
- Admin can see expired deals for intervention if needed

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Deal expires during active phase | Status → 'expired'; both parties notified; listing re-opens for new offers |
| Producer marks dispatched but buyer disputes | Out of scope for MVP — admin intervention via issue report |
| Payment proof upload before Object Storage live | Upload blocked; text reference only accepted for now |

---

## WF-10 — Payment Confirmation

**Actor:** Producer (confirms) + Buyer (provides reference)  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal panel

### Happy Path

1. Buyer transfers payment outside platform (bank transfer / SADAD / etc.)
2. Buyer enters payment reference number in deal panel
3. Buyer optionally uploads payment proof document
4. Producer reviews payment reference + proof
5. Producer confirms: deal → status = 'payment_confirmed'

### Data Required

- `payment_reference` (text, required on confirmation — enforced server-side)
- `payment_proof_url` (optional — Object Storage path post FIX-04)

### Governance / Audit Notes

- Payment reference stored immutably once confirmed
- Proof document stored in Object Storage (post FIX-04)
- Platform does not process payments — acts as coordination layer only
- T&C must clarify platform not liable for payment disputes

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Producer confirms without payment reference | 422 validation error — reference required |
| Buyer uploads wrong document | Can re-upload until producer confirms |
| Deal expires before payment confirmed | Status → 'expired'; payment reference stored but deal closed |

---

## WF-11 — Transport & Dispatch

**Actor:** Producer  
**Phase:** ✅ MVP / Built (basic) | 📋 Future Phase (carrier coordination)  
**Entry point:** Deal panel

### MVP (Current)

1. Producer arranges own transport or coordinates directly with buyer
2. Producer marks deal as "تم الشحن / dispatched" in deal panel
3. Dispatch timestamp recorded
4. Buyer notified with 72-hour window for completion confirmation
5. Pickup location details (city, district, notes) visible to buyer in deal panel

### Future Phase — Carrier Track

- Separate carrier onboarding and capabilities module
- Load request routing to registered carriers
- Carrier confirmation and tracking
- Integrated into Contract Track (WF-18)

### Governance / Audit Notes

- Dispatch marked by producer — buyer must independently confirm receipt
- Dispute window: 72 hours before auto-expiry if completion not confirmed

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Buyer unavailable to confirm within 72h | Deal → 'expired' | Admin can intervene via issue report |
| Transport fails mid-route | Out of scope MVP — admin handles via issue report |

---

## WF-12 — Completion & Receipt Confirmation

**Actor:** Producer  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal panel → "تأكيد الاستلام"

### Happy Path

1. Material received at buyer site
2. Producer marks deal as completed (or buyer confirms via producer action)
3. Deal → status = 'completed' (terminal, permanent)
4. Completion timestamp recorded
5. Deal summary report generated and available
6. Both parties can view/download deal summary

### State Created / Updated

- `deals` status → 'completed'
- `deals.completed_at` timestamp
- Report becomes available (WF-13)

### Governance / Audit Notes

- Completion is irreversible once set
- Full deal audit trail frozen at completion
- Audit log: `deal.completed`

---

## WF-13 — Reporting & Transaction Record

**Actor:** Producer + Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal detail → Print / Export

### Deal Summary Report Contains

- Deal reference (TDW-YYYY-XXXXXX)
- Producer company name + contact
- Buyer company name + contact
- Material category
- Quantity + unit
- Accepted price per unit + total value (SAR)
- Payment reference
- Timeline: created → payment_confirmed → dispatched → completed
- Duration (days from creation to completion)

### Company Logo in Reports (New — v2)

- If company logo uploaded (WF-02), it appears in the header of the deal summary report
- Future: company-branded PDF export

### Dashboard Metrics (Producer)

- Total open listings
- Total active deals
- Completed deals count
- "My turn" count (deals awaiting producer action)

### Governance / Audit Notes

- Reports are read-only snapshots — data cannot be modified post-completion
- All historical deals accessible indefinitely (soft data retention)

---

## WF-14 — Compliance-Ready Reporting

**Actor:** Producer + Admin + Future Regulator  
**Phase:** 📋 Future Phase  
**Entry point:** /reports (placeholder exists)

### Confirmed Architecture (Not Yet Built)

- Waste classification per material category (linked to regulatory waste codes)
- Weight records (source weight + destination weight from weighbridge)
- Variance calculation (source vs. destination weight difference)
- Settlement rule application (which party bears variance cost)
- Material outcome classification (recycled / recovered / disposed)
- Monthly/quarterly aggregate reports per company

### New Fields Confirmed for Future Schema

```
companies:
  weighbridge_cert_ref        text
  weighbridge_cert_expiry     date
  transport_licence_ref       text
  regulatory_waste_codes      text[]
```

### Governance / Audit Notes

- All compliance data immutable once submitted
- Regulator access: read-only, scoped to permitted company set
- Platform does not certify compliance — provides data infrastructure only

---

## WF-15 — Admin Oversight

**Actor:** Tadweerah internal team  
**Phase:** ✅ MVP / Built (API layer) | 🔧 Pilot Enhancement (admin UI)  
**Entry point:** API endpoints protected by ADMIN_API_KEY header

### Available Admin Capabilities (Built — FIX-08)

| Endpoint | Purpose |
|---|---|
| `GET /admin/companies` | List all companies with license + type info |
| `PATCH /admin/companies/:id/license-status` | Approve / reject / suspend company license |
| `GET /admin/issue-reports` | List all user-submitted issue reports |
| `PATCH /admin/issue-reports/:id` | Update issue report status (open/in-review/resolved) |
| `GET /admin/audit-log` | Query audit log by entity / action / company / date range |

### Lookup Table Management (API)

| Endpoint | Purpose |
|---|---|
| `GET/POST /admin/material-categories` | Manage material categories |
| `GET/POST /admin/unit-options` | Manage unit options |
| `GET/POST /admin/company-categories` | Manage company categories |

### Platform Stats

- Total companies, users, listings, deals
- Active deal count by status
- Issue reports by status

### Security Model

- All admin endpoints require `Authorization: AdminKey <ADMIN_API_KEY>` header
- ADMIN_API_KEY set as Replit Secret — not exposed to frontend
- Admin routes return 503 if ADMIN_API_KEY not configured

### Governance / Audit Notes

- All admin actions logged in audit trail with `isAdmin: true` flag
- Admin cannot modify deal data — read + status updates only
- License approval/rejection creates audit entry

---

## WF-16 — Issue Reporting

**Actor:** Any authenticated user  
**Phase:** ✅ MVP / Built  
**Entry point:** Report Issue button (global)

### Happy Path

1. User encounters a problem
2. Clicks "الإبلاغ عن مشكلة" (global button in UI)
3. Fills: issue type, description, related deal/listing reference (optional)
4. Submitted to `issue_reports` table
5. Admin reviews via WF-15 admin routes

### Issue Report Severity (FIX-02)

- `info` — general feedback
- `warning` — operational concern
- `error` — blocking issue requiring urgent attention

### Governance / Audit Notes

- Issue reports are immutable once submitted (status only updated by admin)
- Reporter identity preserved in audit trail
- Issue reports linked to deal or listing for context

---

## WF-17 — Edge Cases & Exception Handling

**Actor:** All  
**Phase:** ✅ MVP / Built (most) | 🔧 Pilot Enhancement (some)

### EX-01: Listing with No Offers

- Producer closes listing manually → immediate close (status = 'closed')
- Or: listing expires if expiry logic added to listings (currently: no auto-expiry on listings, only on deals)
- Producer can repost as a new listing

### EX-02: All Offers Rejected/Withdrawn

- Listing remains 'open' with 0 active offers
- New buyers can still submit offers
- Producer can close manually

### EX-03: Close Listing with Pending Offers — Updated Flow (FIX-06)

**This is the confirmed v2 behavior:**

1. Producer clicks "إغلاق الإعلان"
2. **Step 1 — Initial confirm dialog:** "هل تريد إغلاق الإعلان نهائياً؟" (standard confirm)
3. System calls `DELETE /api/listings/:id`
4. **If no pending offers:** Listing → status = 'closed' immediately. Done.
5. **If pending offers exist → 409 returned:** `{ requiresConfirmation: true, pendingOffersCount: N }`
6. **Step 2 — Pending-offers dialog (2-button):**
   - Button A: "راجع العروض" — closes dialog, no action taken
   - Button B: "أغلق وألغِ الكل" — sends `{ forceClose: true }`
7. **forceClose=true path (atomic transaction):**
   - Listing → status = 'closed'
   - All pending offers → status = 'rejected', rejection_reason = 'listing_closed'
   - `notifyOfferRejected` fired for each affected buyer
   - Audit log: `listing.force_closed` with `cancelledOffersCount`

### EX-04: Deal Expiry

- Expiry job runs every hour
- Checks three thresholds: active → 31d, payment_confirmed → 8d, dispatched → 72h
- Expired deals: status → 'expired'; both parties notified
- Audit log: `deal.expired`
- Listing remains at current status (does not auto-reopen)

### EX-05: Duplicate Offer Attempt

- Same buyer submits twice on same listing: 409 returned
- Buyer directed to "تحسين العرض" path instead

### EX-06: User Stops Mid-Flow

| Stage | Recovery |
|---|---|
| Mid-onboarding | Re-shown onboarding on next login |
| Mid-listing-creation | Form not saved; user starts fresh |
| Mid-offer-submission | Offer not created until explicit submit |
| Mid-deal (inactive) | Deal expires per threshold |

### EX-07: Withdrawn Offer After Deal Created

- Impossible — offer status locked to 'accepted' once deal created
- Buyer must raise issue report if dispute

---

## WF-18 — Contract-Based Execution Track

**Actor:** Producer + Buyer (under standing contract)  
**Phase:** 📋 Future Phase — Architecture confirmed, implementation deferred  
**Entry point:** /contracts (not yet built)

### Architectural Decisions (Confirmed)

1. **Complete isolation from Marketplace Track** — contract objects contain no deal IDs, listing IDs, or offer references
2. **Shared entities** — same users, companies, and material categories are reused
3. **Sequential load IDs** — each contract generates sequential load numbers (CTR-001-L001, CTR-001-L002, etc.)
4. **Reporting scoped** — contract reports are separate from deal reports; dashboard shows both but independently

### Confirmed Schema (Future Build)

```
contracts
  id                    uuid PK
  producer_company_id   uuid FK → companies
  buyer_company_id      uuid FK → companies
  status                enum (draft / active / suspended / completed / terminated)
  start_date            date
  end_date              date
  created_at            timestamptz
  accepted_terms_at     timestamptz (both parties must accept)

contract_materials
  id                    uuid PK
  contract_id           uuid FK → contracts
  material_category_id  uuid FK → material_categories
  price_per_unit        numeric
  unit_option_id        uuid FK → unit_options

contract_loads
  id                    uuid PK
  contract_id           uuid FK → contracts
  load_number           text (sequential: L001, L002...)
  status                enum (requested / dispatched / received / settled / disputed)
  requested_at          timestamptz
  dispatched_at         timestamptz
  received_at           timestamptz

load_weight_records
  id                    uuid PK
  load_id               uuid FK → contract_loads
  record_type           enum (source / destination)
  gross_weight          numeric
  tare_weight           numeric
  net_weight            numeric (computed: gross - tare)
  weighbridge_cert_ref  text
  recorded_at           timestamptz
  recorded_by_user_id   text

load_settlements
  id                    uuid PK
  load_id               uuid FK → contract_loads (unique)
  source_net_weight     numeric
  destination_net_weight numeric
  variance_kg           numeric (computed: source - destination)
  variance_pct          numeric (computed: variance/source × 100)
  settlement_basis      enum (source_weight / destination_weight / average)
  settled_amount        numeric
  material_outcome      enum (recycled / recovered / disposed / pending_classification)
  exception_flag        boolean
  exception_reason      text
  settled_at            timestamptz
```

### Settlement Logic (Confirmed)

- `variance_kg = source_net_weight - destination_net_weight`
- `variance_pct = (variance_kg / source_net_weight) × 100`
- `settlement_basis` determined by contract terms (which weight is authoritative)
- `settled_amount = contract_materials.price_per_unit × settled_weight`
- Exception flag raised if `variance_pct > threshold` (configurable per contract)

### Governance / Audit Notes

- All load records immutable once status = 'settled'
- Weight records require weighbridge cert reference for traceability
- Material outcome classification mandatory before settlement finalization
- Exception handling: admin review required if exception_flag = true

### Admin Capabilities (Future)

- Contract monitoring dashboard
- Load status overview
- Exception queue for review
- Weighbridge cert verification
- Manual settlement override (with audit trail)

---

## Cross-Cutting Concerns

### Notification Architecture

| Channel | Status |
|---|---|
| In-app notifications | ✅ Built |
| Email (infrastructure) | ✅ Ready (email content wired to events) |
| SMS | 📋 Future |
| WhatsApp | 📋 Future |

### Audit Trail

- Every state-changing action logs: `userId`, `companyId`, `action`, `entityType`, `entityId`, `details`, `severity`, `timestamp`
- Audit log queryable by admin (WF-15)
- Immutable — no delete or update on audit_log table

### File Storage

| Asset | Current | Target (post FIX-04) |
|---|---|---|
| Listing images | Local disk (5 files, ephemeral) | Replit Object Storage (GCS) |
| License documents | Local disk | Object Storage |
| Company logos | Not yet implemented | Object Storage |
| Payment proof | Not yet implemented | Object Storage |
| Deal reports | Generated on-the-fly | No storage needed (stateless) |

### Authentication & Authorization

| Layer | Implementation |
|---|---|
| Identity | Clerk (currently pk_test_ → must upgrade to pk_live_ before launch — FIX-01 pending) |
| Company membership | company_members table (user_id → company_id → role) |
| API auth | Clerk middleware on all /api routes |
| Admin auth | ADMIN_API_KEY header (separate from Clerk) |

### Data Integrity Rules

1. Offers are never deleted — only status changes
2. Audit log entries are never deleted
3. Completed deals are immutable
4. Listing closure with pending offers requires explicit forceClose confirmation
5. Deal expiry is irreversible
6. Payment references are stored immutably once confirmed

---

## Open Items Before Production Launch

| # | Item | Owner | Blocking? |
|---|---|---|---|
| 1 | Set Clerk pk_live_ / sk_live_ keys in Replit Secrets | User (from Clerk Dashboard) | ✅ Yes |
| 2 | Migrate multer.diskStorage → Replit Object Storage (FIX-04) | Engineering | ✅ Yes |
| 3 | Resolve 2 NULL-type companies (test records) | User decision + Engineering | No |
| 4 | Run db:push after company.type column cleanup | Engineering | No |
| 5 | Set ADMIN_API_KEY in Replit Secrets | User | Partially (admin routes return 503 without it) |
| 6 | Add company logo upload field to onboarding + profile UI | Engineering | No |
| 7 | Pilot Enhancement batch: self-bidding warning, private targeting UI | Engineering | No |

---

*Document generated April 28, 2026 — Tadweerah Final 18-Workflow Baseline v2*  
*Next review: after pilot launch data collection*
