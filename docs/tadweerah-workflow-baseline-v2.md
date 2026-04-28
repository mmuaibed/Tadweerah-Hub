# Tadweerah — Final 18-Workflow Baseline v2
**Version:** 2.1 (post-audit corrections)  
**Date:** April 28, 2026  
**Status:** Authoritative Pre-Implementation Baseline — Ready for Formal Approval  
**Scope:** Marketplace Track (MVP) + Contract Track (Architecture Confirmed, Implementation Deferred)

---

## Document Purpose

This is the single authoritative workflow specification for Tadweerah before developer implementation planning.  
It supersedes all prior workflow descriptions and incorporates:

- Phase 0 foundation fixes (FIX-01 through FIX-08), referenced explicitly in every affected workflow
- Updated deal expiry thresholds: active **31d** / payment_confirmed **8d** / dispatched **72h**
- Updated listing close behavior with pending-offer two-step confirmation flow (FIX-06)
- Company logo upload as optional company profile field (for future branded reporting)
- All confirmed contract-track architectural decisions, including full end-to-end flow
- Latest settlement schema corrections (variance, weighbridge, regulatory waste codes)
- Explicit governance (permissions, immutability, audit, SLA) in every workflow

---

## Platform Architecture Summary

### Two Execution Tracks (Confirmed — Isolated)

| Track | Purpose | Status |
|---|---|---|
| **Marketplace Track** | Listing → Offer → Deal → Completion | ✅ MVP Built |
| **Contract Track** | Standing contract → Load request → Dispatch → Settlement | 📋 Architecture confirmed, implementation deferred |

**Isolation rule (immutable):** Deal objects contain no contract references. Contract objects contain no deal, listing, or offer references. Users and companies are shared across both tracks. Reporting is strictly track-scoped.

### User Roles (MVP)

| Role | Description |
|---|---|
| **Producer** | Creates listings, reviews and accepts offers, manages deal lifecycle |
| **Buyer / Recycler** | Browses marketplace, submits and manages offers |
| **Carrier / Transporter** | 📋 Future phase — transport coordination and contract-track dispatch |
| **Admin** | Tadweerah internal team — oversight via ADMIN_API_KEY-protected routes |
| **Regulator** | 📋 Future phase — read-only compliance view |

### Phase Readiness Labels

- **✅ MVP / Built** — Implemented and confirmed in current codebase
- **🔧 Pilot Enhancement** — Confirmed scope for implementation before pilot launch
- **📋 Future Phase** — Agreed architecture, deferred implementation
- **❓ Needs Decision** — Open item requiring product decision before build

---

## Foundation Layer (Phase 0) — Status

| Fix ID | Item | Status |
|---|---|---|
| FIX-01 | Clerk production keys (pk_live_ / sk_live_) | ⚠️ **BLOCKING** — awaiting user to set in Replit Secrets |
| FIX-02 | Audit log severity levels (info / warn / error) | ✅ Done |
| FIX-03 | GET /me resolved via company_members join (not owner_user_id direct lookup) | ✅ Done |
| FIX-04 | File storage migration: multer.diskStorage → Replit Object Storage (GCS) | ⚠️ **BLOCKING** — 5 existing files on ephemeral disk |
| FIX-05 | company.type column: 2 NULL-type test records identified; column cleanup pending | ⚠️ Pending user confirmation — non-blocking for production logic |
| FIX-06 | DELETE /listings/:id — close + two-step pending-offer confirmation flow | ✅ Done |
| FIX-07 | Expire-deals job thresholds: 31d / 8d / 72h | ✅ Done |
| FIX-08 | Admin router: companies, issue-reports, audit-log behind ADMIN_API_KEY | ✅ Done |

---

## State Machine Reference

### Offer Status (`listing_offers.status`)

```
pending ──→ accepted  (producer accepts)
        ──→ rejected  (producer rejects, with reason)
        ──→ withdrawn (buyer withdraws before decision)
```

Immutability rule: once `accepted`, an offer cannot be changed. Once a deal exists, no offer on that listing can be withdrawn or modified.

### Deal Status (`deals.status`)

```
active ──────────────→ payment_confirmed ──→ dispatched ──→ completed (terminal)
  │                           │                  │
  └──→ expired (31d)          └──→ expired (8d)   └──→ expired (72h)
```

All `expired` transitions are terminal and irreversible. `completed` is terminal and irreversible.  
Expiry job runs **hourly** (FIX-07).

### Listing Status (`waste_listings.status`)

```
open ──→ closed (manual producer action, or force-close with pending offers — FIX-06)
```

Listing status is **not** automatically changed by deal creation or deal expiry. A listing with status `open` may have an active deal running in parallel.

### Contract Status (`contracts.status`) — Future Build

```
draft ──→ active ──→ suspended ──→ active (re-enabled by admin)
                ──→ completed (terminal)
                ──→ terminated (terminal)
```

### Load Status (`contract_loads.status`) — Future Build

```
requested ──→ dispatched ──→ received ──→ settled (terminal)
                                     ──→ disputed ──→ resolved by admin ──→ settled
```

---

## WF-01 — User Registration & Onboarding

**Actor:** New user (any role)  
**Phase:** ✅ MVP / Built  
**Entry point:** Landing page → "ابدأ الآن" or "تسجيل الدخول"  
**Phase 0 refs:** FIX-01 (Clerk keys), FIX-03 (GET /me), FIX-04 (Object Storage for documents), FIX-05 (company.type)

### Permissions

| Action | Who |
|---|---|
| Register | Any unauthenticated user |
| Complete onboarding | Authenticated user with no linked company |
| View onboarding | System (enforced via App.tsx route guard) |

### Happy Path

1. User visits tadweerah.com, clicks "ابدأ الآن" or "تسجيل الدخول"
2. Clerk handles identity (email / Google / Apple / social) — requires `pk_live_` keys in production (FIX-01)
3. On first sign-in: App.tsx route guard checks `GET /api/me` (resolved via `company_members` join — FIX-03); if `me.company` is null → redirect to `/onboarding`
4. User completes onboarding form:
   - Company name (required)
   - Company type: `producer` or `buyer` (required; stored as `companies.type` — FIX-05)
   - City (required)
   - Contact phone (required)
   - Commercial registration number (optional)
   - License number + license document upload (optional; stored in Object Storage post FIX-04)
   - Company logo (optional; stored in Object Storage post FIX-04; used in future branded reporting)
   - Accept Terms & Conditions checkbox (required; `accepted_terms_at` timestamp recorded on acceptance)
5. System creates `companies` row and `company_members` row (role: `owner`)
6. Redirect to `/dashboard`

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `companies` | INSERT | name, type, city, contact_phone, commercial_registration, license_number, license_document_url, logo_url, accepted_terms_at, license_status = 'pending' |
| `company_members` | INSERT | user_id, company_id, role = 'owner' |
| `audit_log` | INSERT | action = 'company.created', severity = 'info' |

### Governance / Audit

- `accepted_terms_at` is immutable once set — records the exact moment T&C was accepted
- T&C text must state: producer is not obligated to accept the highest offer; platform bears no liability for selection decisions; payment disputes are between parties only
- `license_status` begins as `pending` — only admin can advance it (see WF-15)
- Duplicate company name: permitted (no uniqueness constraint on name in MVP)
- Company type cannot be changed after onboarding (enforced in both API and UI)

### Storage Notes (FIX-04)

- License document and company logo: stored in Replit Object Storage (GCS); paths stored as `license_document_url` and `logo_url` in `companies`
- Until FIX-04 is live: document upload fields disabled in UI

### Admin Notes (FIX-08)

- `GET /admin/companies` lists all companies with license status and type
- `PATCH /admin/companies/:id/license-status` advances license from pending → approved / rejected / suspended
- 2 companies with `type IS NULL` identified in DB — test records; resolve before production (FIX-05, non-blocking)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| User returns after completing onboarding | Route guard passes, redirected to /dashboard |
| User exits onboarding mid-way | Nothing saved; re-shown full onboarding on next login |
| Clerk key is pk_test_ in production | Auth works but triggers dev-key rate limits; **launch blocker** (FIX-01) |
| GET /me fails to resolve company | Route guard re-shows onboarding; FIX-03 ensures correct join |

---

## WF-02 — Company Profile & Permissions

**Actor:** Company owner or member  
**Phase:** ✅ MVP / Built  
**Entry point:** /company/profile  
**Phase 0 refs:** FIX-04 (logo upload), FIX-05 (type field display), FIX-08 (admin license management)

### Permissions

| Action | Who |
|---|---|
| View profile | Any company member |
| Edit company details | Owner only |
| Change company type | **Nobody** — locked post-onboarding |
| Upload logo | Owner only |
| Invite / remove members | Owner only |
| Change license status | Admin only (via WF-15) |

### Happy Path

1. User navigates to Company Profile
2. Reads: company name, type, city, contact phone, commercial registration, license status, logo
3. Owner edits fields (except type); saves; `companies` row updated; audit log entry created
4. Company logo: optional upload (PNG/JPG/WebP, max 5MB); displayed in profile and deal summary report header (WF-13)
5. Members tab: owner invites users by email, assigns role (owner / member), or removes
6. Capabilities tab: company declares waste types handled, transport capacity (used in future targeting)

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `companies` | UPDATE | name, city, contact_phone, logo_url, license fields |
| `company_members` | INSERT / DELETE | user_id, company_id, role |
| `audit_log` | INSERT | action = 'company.updated' or 'member.added' / 'member.removed', severity = 'info' |

### Governance / Audit

- Every edit by a member is logged with `userId`, `companyId`, `action`, `timestamp`
- Company type change: blocked at API (403) regardless of caller
- License status changes must originate from admin — no self-service pathway
- Last-write wins for concurrent edits; no conflict resolution in MVP

### Storage Notes (FIX-04)

- Logo upload: follows same Object Storage pattern as listing image upload
- Until FIX-04 live: logo field hidden in UI; note shown to user

### Admin Notes

- License status visible in admin companies list (WF-15)
- Admin can suspend a company, which blocks that company from submitting offers (eligibility check — WF-06)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Member (non-owner) attempts edit | 403 — permission denied |
| Logo upload before FIX-04 is live | UI hides upload; text note shown |
| Admin suspends company while member is browsing | Next API call requiring active company returns 403 |

---

## WF-03 — Create Listing

**Actor:** Producer (company owner or member)  
**Phase:** ✅ MVP / Built  
**Entry point:** /listings/new  
**Phase 0 refs:** FIX-04 (listing image storage), FIX-06 (close behavior)

### Permissions

| Action | Who |
|---|---|
| Create listing | Any member of a producer company |
| Edit listing (pre-offer) | Listing owner's company only |
| Close listing | Any member of the listing's company only |
| View listing (marketplace) | All authenticated buyers (open) or targeted companies (private) |

> **Immutable eligibility rule:** `POST /listings` has **zero eligibility checks**. Any producer can create a listing regardless of license status. Eligibility is enforced exclusively at `POST /offers` on the buyer side. This rule cannot be changed without explicit product decision.

### Happy Path

1. Producer navigates to "إنشاء إعلان"
2. Fills form:
   - Material category (required; from `material_categories` lookup)
   - Waste description (required)
   - Quantity (required; > 0)
   - Unit (required; from `unit_options` lookup)
   - Sale type: `open` or `private` (required)
   - Pickup city / district / notes (city required; district + notes optional)
   - Listing image (optional; stored in Object Storage post FIX-04)
   - If `private`: select target companies
3. System creates listing, `status = 'open'`
4. Redirect to listing detail

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `waste_listings` | INSERT | status = 'open', material_category_id, unit_option_id, sale_type, quantity, city, district, pickup_notes |
| `audit_log` | INSERT | action = 'listing.created', severity = 'info' |

### Notifications Triggered

- Open listing: none on creation (discovery via marketplace)
- Private listing: notification to each targeted company (🔧 Pilot Enhancement — not yet built)

### Governance / Audit

- Listing reference `TDW-YYYY-XXXXXX` derived from first 6 chars of listing UUID — no separate sequence
- Images stored in Object Storage; paths in `waste_listings.image_url`
- Audit events: `listing.created`, `listing.closed`, `listing.force_closed`

### Admin Notes

- Admin can view all listings via platform stats
- Material categories and unit options updatable without code via admin API (WF-15)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Quantity = 0 | Validation error (422) |
| No material category selected | Validation error (422) |
| Producer's license not approved | Listing created — no eligibility check on producer side |
| Private listing with no targets selected | API allows creation; warning shown in UI; listing invisible to all buyers |
| Duplicate listing (same material/quantity) | Allowed — no deduplication in MVP |

---

## WF-04 — Company Targeting & Listing Visibility

**Actor:** Producer  
**Phase:** 🔧 Pilot Enhancement (sale_type field in DB; targeting UI and enforcement deferred)  
**Entry point:** Listing creation form → targeting section

### Visibility Rules

| `sale_type` | Who Can See |
|---|---|
| `open` | All authenticated buyers with a linked company |
| `private` | Only companies explicitly added to the target list |

### Happy Path — Open Listing

- Producer leaves `sale_type = 'open'`
- Listing appears in marketplace for all eligible buyers

### Happy Path — Private Listing

1. Producer selects `sale_type = 'private'`
2. Searches registered companies by name; adds targets
3. Targeting relationships recorded (`listing_targets` or equivalent join table)
4. Targeted companies notified: "إعلان خاص متاح لك"
5. Only targeted companies see listing in marketplace

### Governance / Audit

- Targeting decisions logged: `listing.targeted`, includes list of company IDs added
- Targeting list is immutable once listing is published — no add/remove post-creation in MVP
- A company cannot target itself (producer cannot be a buyer for its own listing — WF-06 eligibility blocks this)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Targeted company deregisters or is suspended | Listing remains visible entry in their marketplace; eligibility check at offer submission blocks them |
| No targets selected on private listing | Listing invisible to all buyers; UI shows warning |

---

## WF-05 — Marketplace Browsing

**Actor:** Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** /marketplace

### Permissions

| Action | Who |
|---|---|
| Browse marketplace | Any authenticated user with a linked company |
| View listing detail | Same |
| See other buyers' offer prices | **Nobody** — only offer count is visible |

### Happy Path

1. Buyer navigates to /marketplace
2. System returns listings where: `status = 'open'` AND (`sale_type = 'open'` OR buyer is in target list)
3. Listing cards show: material category, quantity, unit, city, offer count (not prices), listing reference, creation date
4. Buyer clicks listing → full detail: description, producer company name, pickup city/district/notes, own offer (if any)

### Governance / Audit

- Withdrawn offers excluded from `offer_count` display
- Buyer sees only their own offer price — competitor pricing never exposed

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Listing closes while buyer is viewing detail | On next API call: 409 or listing shows `status = 'closed'` |
| Buyer's company type is NULL | Can browse but blocked at offer submission (WF-06) |
| Private listing buyer not in target list | Listing not returned in API response — invisible |

---

## WF-06 — Submit Offer

**Actor:** Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** Listing detail → "تقديم عرض سعر"  
**Phase 0 refs:** FIX-03 (company resolution for eligibility check)

### Permissions

| Action | Who |
|---|---|
| Submit offer | Buyer company member, subject to all eligibility checks |
| Improve own offer | Same buyer who submitted the original offer |
| Withdraw offer | Same buyer (before offer is decided) |

### Eligibility Checks at `POST /offers` (Enforced — All Must Pass)

1. Buyer's `companies.type` must not be `'producer'` — no producer submitting as buyer on any listing
2. Buyer's `companies.type` must not be `NULL` — blocked until company type resolved (FIX-05)
3. Buyer's `accepted_terms_at` must not be null — T&C acceptance required
4. `waste_listings.status` must be `'open'`
5. Buyer must not already have a non-withdrawn offer on the same listing (one active offer per buyer per listing)
6. License check (configurable): buyer's `license_status` must be `'approved'` if license enforcement is enabled

### Happy Path

1. Buyer views listing detail; sees "تقديم عرض سعر" button
2. Enters price per unit (SAR, required; > 0)
3. System computes total: `price_per_unit × listing.quantity` — shown for review
4. Buyer confirms submission
5. `listing_offers` row created: `status = 'pending'`
6. Producer receives in-app notification: "عرض جديد على إعلانك — TDW-XXXX"

### Self-Bidding Warning (🔧 Pilot Enhancement — not yet built)

When buyer attempts to improve an existing offer:
- API checks if buyer is currently the highest bidder
- If yes: returns `{ isAlreadyTopBidder: true, warning: "أنت مقدّم أعلى عرض حالياً" }`
- Frontend shows warning before allowing price update
- Buyer can still proceed after acknowledging warning

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `listing_offers` | INSERT | buyer_company_id, waste_listing_id, price_per_unit, status = 'pending' |
| `notifications` | INSERT | producer notified of new offer |
| `audit_log` | INSERT | action = 'offer.submitted', severity = 'info' |

### Governance / Audit

- All offers permanently stored — no delete, only status changes
- Rejection reasons required on every rejection (see WF-08)
- `accepted_below_highest` flag set on deal when accepted offer < max(all offer prices) — producer transparency (see WF-08)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Buyer already has active offer | 409; buyer directed to improve or withdraw |
| Listing closes during submission | 409; offer not created |
| Buyer's company is NULL type | 403; blocked (FIX-05 dependency) |
| Price = 0 | Validation error (422) |

---

## WF-07 — Bidding & Offer Competition

**Actor:** Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** /participations → listing detail

### Permissions

| Action | Who |
|---|---|
| View own offer status | Submitting buyer only |
| View deal stage | Buyer whose offer was accepted |
| Improve offer | Submitting buyer (while offer is `pending`) |
| Withdraw offer | Submitting buyer (while offer is `pending`) |

### Happy Path

1. Buyer views "مشاركاتي" — list of all listings where they have submitted offers
2. Each card shows: listing reference, material, quantity, own offer price, own offer status, deal stage (if accepted)
3. Deal stage display (if offer `accepted`): active / payment_confirmed / dispatched / completed — shown clearly without requiring entry to deal detail (UAT fix)
4. Buyer can improve offer: `PUT /offers/mine` → triggers self-bidding check (🔧 Pilot Enhancement)
5. Buyer can withdraw: `PUT /offers/mine` (status → `withdrawn`)

### Offer Status Definitions

| Status | Meaning | Buyer Action Available |
|---|---|---|
| `pending` | Submitted, producer not yet decided | Improve or withdraw |
| `accepted` | Producer accepted — deal active | View deal panel only |
| `rejected` | Producer rejected with reason | None (read-only) |
| `withdrawn` | Buyer withdrew | None (read-only) |

### Notifications

| Event | Recipient | Content |
|---|---|---|
| Offer rejected (all others on acceptance) | Each losing buyer | "لم يتم اختيار عرضك على TDW-XXXX — السبب: [reason]" |
| Offer individually rejected | That buyer | "تم رفض عرضك — السبب: [reason]" |
| Offer accepted | Winning buyer | "تم قبول عرضك — الصفقة الآن نشطة" |

### Governance / Audit

- Full price history logged: all `PUT /offers/mine` calls create an audit entry with old and new price
- Buyers cannot see any other buyer's price or identity — only offer count on listing
- Withdrawn offers cannot be resubmitted — buyer must create a new offer (if listing still open)

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Multiple buyers submit simultaneously | All stored; producer sees all sorted by price desc |
| Buyer tries to improve after offer accepted | 409 — offer locked |
| Deal expires — buyer's view | Deal stage shows 'expired'; issue report option available |

---

## WF-08 — Accept / Reject Offer

**Actor:** Producer  
**Phase:** ✅ MVP / Built  
**Entry point:** Listing detail → Offers panel

### Permissions

| Action | Who |
|---|---|
| View all offers on own listing | Any member of the listing's company |
| Accept an offer | Any member of the listing's company |
| Reject an offer individually | Any member of the listing's company |
| Accept below highest offer | Same — requires reason input |

### One-Deal-Per-Listing Rule

A listing may have **only one accepted offer / active deal at a time**. On acceptance: all other non-withdrawn offers are automatically rejected with `rejection_reason = 'offer_not_selected'`. The listing itself remains `status = 'open'` — it is not closed by deal creation. This allows the producer to reopen to new offers if the deal later expires.

### Happy Path — Accept

1. Producer views offer list sorted by price (highest first)
2. Selects any offer (may be below highest)
3. If selected offer price < current maximum non-withdrawn offer price:
   - System detects `accepted_below_highest` condition
   - UI prompts: "السعر المختار أقل من الأعلى — يرجى ذكر السبب" (governance requirement)
   - Reason recorded on deal
4. On confirmation:
   - Selected offer → `status = 'accepted'`
   - All other non-withdrawn offers → `status = 'rejected'`, `rejection_reason = 'offer_not_selected'`
   - `deals` row created: `status = 'active'`
   - Winning buyer notified
   - Each rejected buyer notified with reason

### Happy Path — Reject Individual Offer

1. Producer selects a specific offer → "رفض"
2. Rejection reason required (dropdown + optional free text)
3. Offer → `status = 'rejected'`
4. Buyer notified with reason

### Accepting Below Highest — Governance Protocol

- Explicitly permitted by T&C: producer has full commercial discretion
- `accepted_below_highest = true` stored on `deals` row
- Reason stored on `deals` row
- Audit log: `offer.accepted_below_highest` with {acceptedPrice, highestPrice, reason, userId}
- Visible to admin in audit trail; visible to producer in own deal summary

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `listing_offers` | UPDATE (accepted) | status = 'accepted' |
| `listing_offers` | UPDATE (rejected batch) | status = 'rejected', rejection_reason = 'offer_not_selected' |
| `deals` | INSERT | status = 'active', accepted_below_highest, reason |
| `notifications` | INSERT | winning buyer + each rejected buyer |
| `audit_log` | INSERT | action = 'offer.accepted' (+ optional 'offer.accepted_below_highest'), severity = 'info' |

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Producer tries to accept a withdrawn offer | 409 |
| All offers withdrawn before decision | Listing stays open; producer can close manually (WF-17 EX-02) |
| Producer accepts; deal expires; producer tries to accept another offer | Must close or re-list; existing offer round is resolved |

---

## WF-09 — Deal Lifecycle

**Actor:** Producer + Buyer  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal panel (on listing detail or /participations)  
**Phase 0 refs:** FIX-07 (expiry thresholds), FIX-04 (payment proof storage)

### Permissions Per State Transition

| Transition | Who Can Trigger |
|---|---|
| `active` → `payment_confirmed` | Producer (listing company member) only |
| `payment_confirmed` → `dispatched` | Producer only |
| `dispatched` → `completed` | Producer only |
| Any → `expired` | System (expiry job, hourly) — no user action |

### Deal State Machine

| Status | Triggered By | Expires After | Next State |
|---|---|---|---|
| `active` | Offer accepted | **31 days** (FIX-07) | `expired` |
| `payment_confirmed` | Producer confirms payment | **8 days** (FIX-07) | `expired` |
| `dispatched` | Producer marks dispatch | **72 hours** (FIX-07) | `expired` |
| `completed` | Producer confirms receipt | Never | Terminal |
| `expired` | Expiry job | N/A | Terminal |

> **Change from v1:** active was 30d → **31d**; payment_confirmed was 7d → **8d**; dispatched was 48h → **72h**.

### Happy Path

1. Deal created (`active`) when producer accepts an offer
2. Buyer sends payment outside platform; enters `payment_reference` + optional proof document
3. Producer reviews payment reference + proof; confirms → `payment_confirmed`
4. Producer arranges transport; marks dispatch → `dispatched`
5. Material received; producer marks completion → `completed` (terminal)
6. Deal summary report available to both parties

### Contact Visibility After Deal Is Active

- Producer sees: buyer company name, contact phone
- Buyer sees: producer company name, contact phone, pickup city/district/notes
- Visibility begins at `status = 'active'` and persists through all states including `expired` and `completed`

### Deal Reference

- Format: `TDW-YYYY-XXXXXX` (year + first 6 chars of deal UUID)
- Used in all notifications, deal panel header, and deal summary report

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `deals` | UPDATE | status, updated_at (at each transition) |
| `deals` | UPDATE | payment_reference, payment_proof_url (on payment step) |
| `audit_log` | INSERT | action = 'deal.payment_confirmed' / 'deal.dispatched' / 'deal.completed' / 'deal.expired', severity = 'info' |

### Notifications

| Transition | Recipients | Trigger |
|---|---|---|
| Deal created | Both parties | Offer acceptance |
| Payment confirmed | Buyer | Producer action |
| Dispatched | Buyer | Producer action (72h countdown begins) |
| Completed | Both parties | Producer action |
| Expired | Both parties | Expiry job |

### Governance / Audit

- Every state transition logged: userId, companyId, action, timestamp, severity
- Expiry job: runs hourly; marks all deals past threshold as `expired`; fires notifications; logs `deal.expired`
- Expired deals cannot be reactivated — new listing/offer cycle required
- Listing status is **not** changed by deal creation or deal expiry

### Admin Notes

- Admin can view all deals and current statuses via platform stats
- Admin can view expired deals for manual follow-up if needed
- Admin cannot directly advance a deal's status

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Deal expires during active phase | Status → 'expired'; both notified; listing remains at its current status (unchanged) |
| Producer marks dispatched but buyer disputes | Out of scope MVP — route to issue report (WF-16) |
| Payment proof upload before FIX-04 live | Text reference accepted; document upload field hidden until Object Storage ready |

---

## WF-10 — Payment Confirmation

**Actor:** Buyer (provides reference) + Producer (confirms receipt)  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal panel (active status)  
**Phase 0 refs:** FIX-04 (payment proof document storage)

### Permissions

| Action | Who |
|---|---|
| Enter payment reference | Buyer (company member) |
| Upload payment proof | Buyer (company member) |
| Confirm payment received | Producer (company member) only |

### Happy Path

1. Buyer completes bank transfer / SADAD / other off-platform payment
2. Buyer enters `payment_reference` in deal panel (text field, required before producer can confirm)
3. Buyer optionally uploads payment proof document (stored in Object Storage post FIX-04)
4. Producer reviews reference + document; confirms receipt
5. Deal → `payment_confirmed`; expiry clock resets to 8-day window (FIX-07)

### Data Required at Confirmation

- `payment_reference`: text, **required** — enforced server-side (422 if missing)
- `payment_proof_url`: optional Object Storage path

### Governance / Audit

- `payment_reference` stored immutably once deal moves to `payment_confirmed`
- Platform does not process, hold, or verify funds — coordination layer only
- T&C must state: platform not liable for payment disputes
- Audit log: `deal.payment_confirmed` with userId, companyId

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Producer confirms without payment reference having been entered | 422 validation error |
| Buyer uploads wrong proof document | Can re-upload until producer confirms |
| Deal expires before payment confirmed | Status → 'expired'; payment_reference stored but deal closed; no recovery |
| Buyer claims payment not received by producer | Issue report (WF-16); out of scope for MVP |

---

## WF-11 — Transport & Dispatch

**Actor:** Producer  
**Phase:** ✅ MVP / Built (self-arranged) | 📋 Future Phase (carrier coordination via Contract Track)  
**Entry point:** Deal panel (payment_confirmed status)

### Permissions

| Action | Who |
|---|---|
| Mark dispatch | Producer (company member) only |
| View pickup location details | Both producer and buyer once deal is `active` |

### MVP — Self-Arranged Transport

1. Producer arranges own transport or coordinates directly with buyer by phone/contact details (visible in deal panel)
2. Producer marks deal: "تم الشحن / Dispatched" → deal → `dispatched`
3. Dispatch timestamp recorded
4. Buyer receives notification: "تم شحن بضاعتك — يرجى التأكيد خلال 72 ساعة"
5. 72-hour completion window begins (FIX-07)

### Future Phase — Carrier Integration

- Carrier onboarding: capabilities, vehicle types, coverage areas
- Load assignment: routing to registered carriers based on route and material type
- Carrier confirmation and dispatch tracking
- Fully integrated into Contract Track (WF-18) — not Marketplace Track

### Governance / Audit

- Dispatch marked unilaterally by producer — buyer must independently confirm receipt (WF-12)
- If buyer cannot confirm within 72 hours: deal → `expired`; admin intervention available via issue report
- Audit log: `deal.dispatched` with dispatch timestamp

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Buyer unreachable within 72h | Deal → 'expired'; both notified; issue report recommended |
| Transport fails mid-route | Out of scope MVP — issue report (WF-16); admin intervention |
| Producer marks dispatch accidentally | No reversal in MVP — issue report to admin |

---

## WF-12 — Completion & Receipt Confirmation

**Actor:** Producer  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal panel (dispatched status)

### Permissions

| Action | Who |
|---|---|
| Mark deal complete | Producer (company member) only — in MVP |
| View deal summary | Both parties to the deal |

> Note: In MVP, completion is producer-triggered. A future enhancement could allow buyer to trigger completion, or require mutual confirmation.

### Happy Path

1. Material arrives at buyer's site
2. Producer marks deal: "تأكيد الاستلام / Complete" → deal → `completed` (terminal, irreversible)
3. `completed_at` timestamp recorded
4. Both parties notified: "الصفقة مكتملة"
5. Deal summary report becomes available (WF-13)

### State Created / Updated

| Table | Action | Key Fields |
|---|---|---|
| `deals` | UPDATE | status = 'completed', completed_at = now() |
| `audit_log` | INSERT | action = 'deal.completed', severity = 'info' |

### Governance / Audit

- Completion is **irreversible** once set — no status rollback
- Full deal audit trail is frozen at completion (no further mutations)
- Deal summary report is a read-only snapshot generated from deal data

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Producer marks completed before actual delivery | Accepted — platform does not verify physical receipt in MVP |
| Buyer disputes that material was not received | Issue report (WF-16); out of scope for platform logic |

---

## WF-13 — Reporting & Transaction Record

**Actor:** Producer + Buyer (deal parties)  
**Phase:** ✅ MVP / Built  
**Entry point:** Deal detail → "طباعة / تصدير" | /dashboard

### Permissions

| Action | Who |
|---|---|
| View deal summary report | Any company member of either deal party |
| Download/print deal report | Same |
| View dashboard metrics | Any authenticated company member |
| Access other companies' reports | Nobody — strictly party-scoped |

### Deal Summary Report Contents

| Field | Source |
|---|---|
| Deal reference | `TDW-YYYY-XXXXXX` derived from deal ID |
| Producer company name + contact phone | `companies` |
| Buyer company name + contact phone | `companies` |
| Material category | `material_categories.name` |
| Waste description | `waste_listings.description` |
| Quantity + unit | `waste_listings.quantity + unit_options.label` |
| Accepted price per unit (SAR) | `listing_offers.price_per_unit` |
| Total value (SAR) | `price_per_unit × quantity` |
| Payment reference | `deals.payment_reference` |
| Timeline | created → payment_confirmed → dispatched → completed (with timestamps) |
| Duration | Days from `created_at` to `completed_at` |
| Company logo (if uploaded) | `companies.logo_url` — appears in report header |

### Dashboard Metrics (Producer View)

- Open listings count
- Active deals count
- Completed deals count
- "My turn" count (deals in a state requiring producer action)

### Governance / Audit

- Reports are **read-only** snapshots; underlying data cannot be modified after deal completion
- All historical deals accessible indefinitely (no data deletion for audit purposes)
- Reports are scoped to deal parties only — cross-company data never exposed

---

## WF-14 — Compliance-Ready Reporting

**Actor:** Producer + Admin + 📋 Future Regulator  
**Phase:** 📋 Future Phase (placeholder `/reports` page exists)  
**Entry point:** /reports

### Confirmed Architecture (Not Yet Built)

- Material classification per deal, linked to regulatory waste codes
- Weight records: source (producer site) + destination (buyer site) from weighbridge
- Variance: source weight vs. destination weight — calculation and classification
- Settlement rule: which weight is authoritative (defined per contract in Contract Track)
- Material outcome: recycled / recovered / disposed / pending
- Aggregate reports per company: monthly / quarterly

### Confirmed Future Schema Additions (to `companies`)

```sql
weighbridge_cert_ref        TEXT    -- certificate reference number
weighbridge_cert_expiry     DATE    -- certificate validity date
transport_licence_ref       TEXT    -- transport licence number
regulatory_waste_codes      TEXT[]  -- array of applicable regulatory codes
```

### Governance / Audit

- All compliance data immutable once submitted
- Regulator access: read-only, scoped to companies the regulator is permitted to view
- Platform provides data infrastructure only — does not certify compliance
- Weighbridge cert reference required for all weight records (Contract Track — WF-18)

---

## WF-15 — Admin Oversight

**Actor:** Tadweerah internal team  
**Phase:** ✅ MVP / Built (API layer — FIX-08) | 🔧 Pilot Enhancement (admin UI wrapper)  
**Entry point:** API endpoints with `Authorization: AdminKey <ADMIN_API_KEY>`

### Permissions

| Action | Who |
|---|---|
| All admin endpoints | ADMIN_API_KEY bearer only — never exposed to frontend |
| Modify deal data | Nobody — admin is read-only on deal content |
| Modify license status | Admin only |
| Resolve issue reports | Admin only |

### Available Admin Capabilities (Built — FIX-08)

| Endpoint | Purpose |
|---|---|
| `GET /admin/companies` | List all companies: name, type, license status, member count |
| `PATCH /admin/companies/:id/license-status` | Approve / reject / suspend company license |
| `GET /admin/issue-reports` | List issue reports; filterable by status and severity |
| `PATCH /admin/issue-reports/:id` | Update report status (open → in_review → resolved) |
| `GET /admin/audit-log` | Query audit log: filter by entity, action, company, date range |
| `GET/POST /admin/material-categories` | Manage material category lookup table |
| `GET/POST /admin/unit-options` | Manage unit options lookup table |
| `GET/POST /admin/company-categories` | Manage company categories lookup table |

### Platform Stats Endpoint

Returns: total companies, total listings, total deals by status, issue reports by status, active deal count.

### SLA Targets (Operational — Not Enforced by System in MVP)

| Activity | Target |
|---|---|
| Issue report acknowledgement | Within 24 hours |
| Issue report resolution | Within 72 hours |
| License approval decision | Within 48 hours of document submission |

### Security Model

- `ADMIN_API_KEY` stored as Replit Secret — not accessible from any frontend code
- Routes return `503` if `ADMIN_API_KEY` is not configured (non-blocking for marketplace, but admin capability unavailable — see Open Items)

### Governance / Audit

- All admin actions logged with `isAdmin: true` flag in audit trail
- Admin cannot modify deal content — read + status updates (license, issue reports) only
- Every license status change creates an audit entry: `company.license_status_changed`, severity = 'warn'

---

## WF-16 — Issue Reporting

**Actor:** Any authenticated user  
**Phase:** ✅ MVP / Built  
**Entry point:** "الإبلاغ عن مشكلة" (global access from any page)

### Permissions

| Action | Who |
|---|---|
| Submit issue report | Any authenticated user with a linked company |
| Update issue status | Admin only (WF-15) |
| View own submitted reports | The submitting user |
| View all reports | Admin only |

### Happy Path

1. User encounters a problem during any workflow
2. Clicks "الإبلاغ عن مشكلة" (always accessible — global UI element)
3. Completes form: issue type, description, optional deal/listing reference, severity
4. System stores `issue_reports` row; user sees confirmation
5. Admin reviews via WF-15 admin routes

### Issue Severity (FIX-02)

| Severity | Meaning | Admin SLA |
|---|---|---|
| `info` | General feedback, suggestion | 72h |
| `warning` | Operational concern — not blocking | 48h |
| `error` | Blocking issue — user cannot proceed | 24h |

### Governance / Audit

- Issue report content immutable once submitted — reporter cannot edit
- Admin status updates (`open` → `in_review` → `resolved`) are audit-logged
- Reporter identity preserved in audit trail
- Issue reports linked to deal or listing ID when provided

---

## WF-17 — Edge Cases & Exception Handling

**Actor:** All  
**Phase:** ✅ MVP / Built (all listed below)

### EX-01 — Listing with No Offers

- Producer closes listing manually → listing → `status = 'closed'`; audit log: `listing.closed`
- No auto-expiry on listings in MVP (deals expire; listings do not)
- Producer can repost as a new listing at any time

### EX-02 — All Offers Rejected or Withdrawn Before Decision

- Listing stays `status = 'open'` with 0 active offers
- New buyers can still submit fresh offers
- Producer can close manually (EX-03)

### EX-03 — Close Listing with Pending Offers (FIX-06 — Updated v2 Behavior)

Complete 2-step flow confirmed and implemented:

**Step 1 — Initial close (simple confirm dialog):**

| Sub-step | Action |
|---|---|
| Producer clicks "إغلاق الإعلان" | Standard confirm dialog opens |
| Producer confirms | `DELETE /api/listings/:id` called (body: `{}`) |
| No pending offers → | Listing → `status = 'closed'`; audit: `listing.closed`; done |
| Pending offers present → | API returns `409 { requiresConfirmation: true, pendingOffersCount: N }` |

**Step 2 — Pending-offers dialog (2-button, opens automatically after 409):**

| Button | Label | Action |
|---|---|---|
| A | "راجع العروض" | Closes dialog; no state change; producer reviews offers |
| B | "أغلق وألغِ الكل" | Sends `DELETE /api/listings/:id` with `{ forceClose: true }` |

**forceClose = true — Atomic transaction:**

1. `waste_listings.status` → `'closed'`
2. All non-withdrawn `listing_offers.status` → `'rejected'`, `rejection_reason = 'listing_closed'`
3. `notifyOfferRejected` fired for each affected buyer (fire-and-forget)
4. Audit log: `listing.force_closed`, `details.cancelledOffersCount = N`, severity = `'warn'`

### EX-04 — Deal Expiry (FIX-07)

- Expiry job runs **hourly** on the server
- Evaluates all non-terminal deals against thresholds: `active ≥ 31d`, `payment_confirmed ≥ 8d`, `dispatched ≥ 72h`
- Expired: `deals.status` → `'expired'`; both parties notified; audit: `deal.expired`, severity = `'warn'`
- Listing status unchanged — a listing that was `open` when the deal was created remains `open`
- Expired deal cannot be reactivated; parties must start a new offer cycle

### EX-05 — Duplicate Offer Attempt

- Buyer submits a second offer on the same listing while first is still active: `409`
- UI directs buyer to improve existing offer or withdraw first

### EX-06 — User Stops Mid-Flow

| Stage | Recovery Behaviour |
|---|---|
| Mid-onboarding | Data not saved; full onboarding shown on next login |
| Mid-listing creation | Form data not saved; user restarts form |
| Mid-offer submission | Offer not created until explicit confirm |
| Deal (inactive, approaching expiry) | Expiry job handles transition; parties notified |

### EX-07 — Withdrawn Offer After Deal Created

- Impossible: once an offer is `accepted`, it is locked — no status change permitted
- Buyer must raise an issue report (WF-16) for any dispute

---

## WF-18 — Contract-Based Execution Track

**Actor:** Producer + Buyer (under standing contract)  
**Phase:** 📋 Future Phase — Architecture confirmed, full flow defined, implementation deferred  
**Entry point:** /contracts (route not yet built)

### Isolation Rules (Immutable)

1. Contract objects contain **no references** to deal IDs, listing IDs, or offer IDs
2. Deal objects contain **no references** to contract IDs
3. Users and companies are shared across tracks
4. Reporting is track-scoped — contract reports separate from deal reports
5. Dashboard can display both tracks independently

### End-to-End Contract Track Flow

#### Phase A — Contract Setup

1. Either party (producer or buyer) initiates a contract draft
2. Fills: counterparty (search by company), contract duration (start/end dates), material types, price per unit per material type, settlement basis per material
3. System creates `contracts` row: `status = 'draft'`
4. Invitation notification sent to counterparty
5. Counterparty reviews terms and formally accepts
6. Both `accepted_terms_at` timestamps recorded on `contracts` (one per party — or stored as events)
7. Contract → `status = 'active'`
8. Both parties notified: "العقد نشط — يمكنك الآن إنشاء طلبات تحميل"

#### Phase B — Load Request

1. Producer (or buyer, per contract terms) creates a load request
2. System generates sequential `load_number` (e.g., `L001`, `L002`) — application-level counter per contract
3. `contract_loads` row created: `status = 'requested'`
4. Counterparty notified: "طلب تحميل جديد — [load_number]"

#### Phase C — Dispatch

1. Carrier or producer arranges transport
2. Dispatcher records source weight: `load_weight_records` row: `record_type = 'source'`, gross/tare/net weights, `weighbridge_cert_ref` (required)
3. Load → `status = 'dispatched'`
4. Buyer notified

#### Phase D — Receipt

1. Material arrives at buyer site
2. Buyer records destination weight: `load_weight_records` row: `record_type = 'destination'`, gross/tare/net weights, `weighbridge_cert_ref` (required)
3. Load → `status = 'received'`
4. Settlement calculation triggered automatically

#### Phase E — Settlement

1. System computes:
   - `variance_kg = source_net_weight − destination_net_weight`
   - `variance_pct = (variance_kg / source_net_weight) × 100`
2. Applies `settlement_basis` from `contract_materials` (which weight is authoritative):
   - `source_weight`: `settled_amount = price_per_unit × source_net_weight`
   - `destination_weight`: `settled_amount = price_per_unit × destination_net_weight`
   - `average`: `settled_amount = price_per_unit × ((source + destination) / 2)`
3. If `variance_pct > contract.variance_threshold`:
   - `exception_flag = true`; `exception_reason` recorded
   - Load → `status = 'disputed'`; admin notified (WF-15)
   - Admin reviews and resolves → load → `status = 'settled'`
4. If within threshold: `load_settlements` row created; `material_outcome` classification set; load → `status = 'settled'` (terminal)

#### Phase F — Contract Reporting

- Contract summary: all loads, settlement amounts, material outcomes, total weight per material
- Accessible to both contract parties and admin
- Export-ready format (future: PDF with company logo)

#### Phase G — Contract Lifecycle Events

| Event | Trigger | Outcome |
|---|---|---|
| Suspend contract | Admin action | `status = 'suspended'`; new loads blocked; active loads continue |
| Re-enable contract | Admin action | `status = 'active'` |
| Complete contract | End date reached OR mutual agreement | `status = 'completed'` (terminal) |
| Terminate contract | Admin or mutual request | `status = 'terminated'` (terminal); all unsettled loads flagged |

### Confirmed Schema

```
contracts
  id                        uuid PK
  producer_company_id       uuid FK → companies
  buyer_company_id          uuid FK → companies
  status                    enum (draft / active / suspended / completed / terminated)
  start_date                date
  end_date                  date
  variance_threshold_pct    numeric  -- e.g., 2.0 for 2% tolerance
  created_by_user_id        text
  created_at                timestamptz
  producer_accepted_terms_at timestamptz
  buyer_accepted_terms_at   timestamptz

contract_materials
  id                    uuid PK
  contract_id           uuid FK → contracts
  material_category_id  uuid FK → material_categories
  price_per_unit        numeric
  unit_option_id        uuid FK → unit_options
  settlement_basis      enum (source_weight / destination_weight / average)

contract_loads
  id             uuid PK
  contract_id    uuid FK → contracts
  load_number    text (sequential per contract: L001, L002 ... format: CTR-{contract_seq}-L{load_seq})
  status         enum (requested / dispatched / received / settled / disputed)
  requested_by_user_id text
  requested_at   timestamptz
  dispatched_at  timestamptz
  received_at    timestamptz

load_weight_records
  id                   uuid PK
  load_id              uuid FK → contract_loads
  record_type          enum (source / destination)
  gross_weight_kg      numeric
  tare_weight_kg       numeric
  net_weight_kg        numeric (computed: gross − tare; enforced by application)
  weighbridge_cert_ref text NOT NULL -- required for traceability
  recorded_at          timestamptz
  recorded_by_user_id  text

load_settlements
  id                      uuid PK
  load_id                 uuid FK → contract_loads UNIQUE
  source_net_weight_kg    numeric
  destination_net_weight_kg numeric
  variance_kg             numeric -- source − destination
  variance_pct            numeric -- (variance / source) × 100
  settlement_basis        enum (source_weight / destination_weight / average)
  settled_weight_kg       numeric -- the authoritative weight used for payment
  settled_amount          numeric -- price_per_unit × settled_weight_kg
  material_outcome        enum (recycled / recovered / disposed / pending_classification)
  exception_flag          boolean DEFAULT false
  exception_reason        text
  resolved_by_admin_id    text    -- set when admin resolves a disputed load
  settled_at              timestamptz
```

### Load Number Format

Full format: `CTR-{contract_seq}-L{load_seq}` (e.g., `CTR-001-L007`).  
Both `contract_seq` and `load_seq` are application-level counters (not DB sequences in MVP).

### Notifications (Contract Track)

| Event | Recipients |
|---|---|
| Contract invitation sent | Counterparty |
| Contract activated (both accepted) | Both parties |
| Load requested | Counterparty |
| Load dispatched | Buyer |
| Load received, settlement in progress | Both parties |
| Load settled | Both parties |
| Exception flagged | Both parties + admin |
| Contract suspended / terminated | Both parties |

### Governance / Audit (Contract Track)

- All load records are immutable once `status = 'settled'`
- Weight records require `weighbridge_cert_ref` — must be present (enforced at creation)
- `material_outcome` classification mandatory before settlement can be finalized
- Exceptions (`exception_flag = true`) require admin review before load can proceed to `settled`
- Every admin override logged: `load.exception_resolved`, including `resolved_by_admin_id` and reason
- `variance_threshold_pct` stored per contract — configurable at contract setup time

### Admin Capabilities (Future Build)

- Contract monitoring dashboard (all contracts, status, load counts)
- Exception queue (loads with `exception_flag = true` awaiting review)
- Manual settlement override (with mandatory reason + audit trail)
- Weighbridge cert verification (future: integration with cert authority)
- Contract suspension / termination controls

---

## Cross-Cutting Concerns

### Authentication & Authorization

| Layer | Implementation |
|---|---|
| Identity | Clerk — **must be `pk_live_` keys before production** (FIX-01, BLOCKING) |
| Company membership | `company_members` table — user_id → company_id → role |
| API auth | Clerk middleware on all `/api` routes |
| Company resolution | `GET /me` via `company_members` join (not `owner_user_id`) — FIX-03 ✅ |
| Admin auth | `ADMIN_API_KEY` header — separate from Clerk, never in frontend |

### Notification Architecture

| Channel | Status |
|---|---|
| In-app notifications | ✅ Built |
| Email (infrastructure) | ✅ Ready — content wired to events |
| SMS | 📋 Future |
| WhatsApp | 📋 Future |

### Audit Trail (Immutable)

Every state-changing action records:

```
userId, companyId, action (e.g. 'deal.completed'), entityType, entityId,
details (JSON), severity (info|warn|error), timestamp
```

- Audit log: no delete, no update — append-only (FIX-02 ✅)
- Queryable by admin by entity, action, company, date range (FIX-08 ✅)

### File Storage (FIX-04)

| Asset | Current State | Target (post FIX-04) |
|---|---|---|
| Listing images | 5 files on ephemeral local disk — **BLOCKING** | Replit Object Storage (GCS) |
| License documents | Local disk | Object Storage |
| Company logos | Not yet implemented | Object Storage |
| Payment proof | Not yet implemented | Object Storage |
| Deal reports | Generated on-the-fly (stateless) | No file storage needed |
| Contract load weight records | N/A (future) | Object Storage (weighbridge certs) |

### Data Integrity Rules (Platform-Wide)

1. Offers are **never deleted** — status-only changes
2. Audit log entries are **never deleted or updated**
3. Completed deals are **immutable** post-completion
4. Listing closure with pending offers requires explicit `forceClose` confirmation (FIX-06)
5. Deal expiry is **irreversible** — no reactivation
6. Payment references are **immutable** once deal is `payment_confirmed`
7. Load weight records are **immutable** once load is `settled`
8. Contract accepted_terms_at timestamps are **immutable** once set

---

## Open Items — Production Launch Classification

| # | Item | Owner | Classification | Notes |
|---|---|---|---|---|
| 1 | Set Clerk `pk_live_` / `sk_live_` in Replit Secrets | User (Clerk Dashboard) | 🔴 **BLOCKING** | Auth rate limits + dev-mode warnings block all real usage |
| 2 | Migrate file storage to Replit Object Storage (FIX-04) | Engineering | 🔴 **BLOCKING** | 5 existing image files on ephemeral disk; will be lost on restart |
| 3 | Set `ADMIN_API_KEY` in Replit Secrets | User | 🟠 **BLOCKING for Operations** | Admin endpoints return 503 without it; platform runs without it but team is operationally blind |
| 4 | Resolve 2 NULL-type test companies (FIX-05, step 1) | User decision | 🟡 Non-blocking | Confirm records are test data; then Engineering runs cleanup |
| 5 | Run DB cleanup: migrate type values, drop `type` column, run db:push (FIX-05, steps 2–5) | Engineering | 🟡 Non-blocking (depends on #4) | Requires user confirmation from #4 first |
| 6 | Add company logo upload UI to onboarding + profile | Engineering | 🟡 Non-blocking | Feature ready architecturally; UI field missing |
| 7 | Self-bidding warning (PUT /offers/mine check) | Engineering | 🔵 Pilot Enhancement | Governance feature; not blocking launch |
| 8 | Private targeting UI (full company search + targeting flow) | Engineering | 🔵 Pilot Enhancement | sale_type field exists; full UI deferred |

---

*Tadweerah — Final 18-Workflow Baseline v2.1*  
*Audit completed and corrections applied: April 28, 2026*  
*Document is ready for formal approval and developer impact assessment*
