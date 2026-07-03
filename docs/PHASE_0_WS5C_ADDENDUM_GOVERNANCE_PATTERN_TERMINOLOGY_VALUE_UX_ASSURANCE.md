# WS5-C Addendum — Governance Pattern, Terminology-Value Consistency, and UI/UX Usability Assurance

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Method:** Read-only source-code inspection (`lib/db/src/schema/*.ts`, `artifacts/tadweerah/src/i18n/index.tsx`) plus synthesis of WS4-A, WS4-B, WS5-A, WS5-B, WS5-C. **No new live UI actions.** No code/config/DB/admin/commit/deploy actions, no mockups, no fee-document designs, no document deletion, no transport/shipment/receipt/completion action.

**Purpose:** WS5-C found that Tadweerah already has a proven, governance-safe bilingual configuration pattern. The question this addendum answers is no longer *"should Tadweerah invent a configurable terminology model?"* — it is *"how should Tadweerah reuse and extend its existing proven pattern safely, while ensuring every term, label, value, and user-facing message is consistent, understandable, visually suitable, and linked to one clear source of truth across Arabic, English, roles, pages, and journeys?"*

---

## 1. Executive Summary

**Do we already have a proven governance-safe configuration pattern? Yes.** `sustainability_report_field_config` implements bilingual admin-editable labels with an `is_system_field` flag enforced by the API — not just a UI convention. Five further tables (`material_categories`, `unit_options`, `capabilities`, `company_categories`, `company_actions`) follow the same bilingual, admin-managed shape.

**What does it solve?** It proves Tadweerah can let non-engineers safely edit labels and simple master data without a deploy, while protecting the handful of fields that must never silently change. **What does it not solve?** It doesn't yet cover financial/reference labels, city/location, or the deeper problem this addendum surfaces: **several business concepts are called by more than one name across different parts of the platform**, and a couple of backend values quietly overlap across two different subsystems.

**Can Tadweerah currently claim all Arabic/English terms are consistent across all pages, roles, and workflows? No — not fully.** This review found new, concrete evidence of terminology drift beyond what WS5-A/B/C had already documented: the same role is called by three different names depending on which surface you're looking at (marketing copy vs. onboarding vs. legacy data), and the single Arabic word **موثّق/موثّقة** is used both as a generic marketing adjective ("documented," used dozens of times across the homepage) and as the specific company "Verified" badge label — meaning the actual verification signal is diluted by the exact same word appearing everywhere else as decoration.

**Can Tadweerah currently claim every label maps to the same underlying source-of-truth value everywhere? Mostly yes, with two confirmed exceptions:** the transport-responsibility bug (TDW-TRANS-001, already tracked) and a newly-noticed terminology overlap where the English word **"dispatched"** is used as a status value in two different, unrelated status enums (`deal_status` and `shipment_status`) — not necessarily a bug, but not yet confirmed to represent the same real-world event either.

**Biggest confirmed risks:** (1) the "Verified" word-collision, (2) one role/company having three different public-facing names, (3) the deal-vs-contract relationship never being explained to users, (4) the payment-proof and transport-responsibility defects already tracked. **What's safe today:** the admin-managed master-data pattern itself, the VAT/subtotal/total math, and the confirmation-modal UX pattern. **What needs improvement:** role/company naming unification, the "Verified" word collision, and pre-emptively naming the platform-fee/commission/seller-entitlement concepts consistently *before* they're built. **What requires human/regulatory validation:** all Saudi-market and MWAN-specific wording, unchanged from WS5-A/B/C.

## 2. Proven Governance Pattern Summary

**The pattern, exactly as it exists today:**
- Bilingual labels/names as paired, both-required columns (`name_ar`/`name_en` or `label_ar`/`label_en`) — never a single free-text column.
- `is_active` boolean — lets an item be retired without deleting history.
- `sort_order` integer — lets display order change without a code change.
- `is_system_field` (currently only on `sustainability_report_field_config`) — a hard protection flag.
- **Protection enforced by the API**, not merely by a UI that "hides" the edit button — meaning even a direct API call cannot violate the protection.
- Admin editability without a deployment for everything except the protected/system set.

**Why this is strong:** it gives non-engineers real day-to-day flexibility (renaming a material, adding a unit, adjusting a capability's description) while making the *dangerous* edits (hiding a methodology-critical sustainability field) structurally impossible rather than just discouraged. **Why it's safer than "let admins edit everything":** a free-for-all admin panel would let someone accidentally rename or hide something a report, contract, or compliance calculation depends on; this pattern already draws that line in one place and proves the line can be drawn without sacrificing flexibility everywhere else.

**Where to reuse it:** city/location (highest priority gap), future platform-fee/commission configuration, and any new lookup list added going forward. **Where not to use it without stronger controls:** anything that, once displayed to a counterparty on a specific deal, must never retroactively change what that historical record shows (see §6, "locked terms" and "protected historical snapshot" recommendations) — the current pattern protects the *definition* of a field well, but has no answer yet for protecting *already-issued* records from a later definition change.

## 3. Applicability Matrix

| Area / concept | Current pattern | Existing table/config | Reuse pattern? | Admin-configurable? | Protected/locked? | Approval workflow? | Bilingual? | Affects reports/contracts/compliance? | Affects journey clarity? | Recommended governance action | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sustainability report fields | Governed (reference implementation) | `sustainability_report_field_config` | — (already there) | Yes | Yes (`is_system_field`) | No (gap) | Yes | Yes | Medium | Add approval/versioning as a light enhancement | Low |
| Material categories | Governed | `material_categories` | — | Yes | Partial (`is_sensitive` protects license logic, not the label itself) | No | Yes | Yes | High | Add label-change audit trail | Medium |
| Units | Governed | `unit_options` | — | Yes | No | No | Yes | Low | Low | Fine as-is | Low |
| Capabilities | Governed | `capabilities` | — | Yes | No (comment says "may be updated freely") | No | Yes | Yes (`requires_license`) | Medium | Protect `requires_license` flag itself even if label stays free | Medium |
| Company categories | Governed | `company_categories` | — | Yes | No | No | Yes | Low | Medium | Fine as-is | Low |
| Company actions ("Activities") | Governed | `company_actions` | — | Yes | No | No | Yes | No (explicitly non-enforcing) | High (confusion vs. roles) | Add UI hierarchy, not schema change | High (UX, not governance) |
| Cities/locations | **Ungoverned** | None — free text | **Yes, urgently** | Not yet — should be | N/A yet | N/A yet | Must be | Yes | High (typos visible everywhere) | Build a `cities` master-data table, same shape as materials | **Critical** |
| Company roles (MWAN) | Hardcoded enum | `mwan_role` | No — keep as code-governed | No (by design) | Yes | Yes (code review = the approval) | Yes (i18n) | Yes (authorization) | High (naming triple-overlap, §4) | Do not make configurable; fix naming consistency instead | High (naming, not schema) |
| Activities (see above) | (duplicate row intentionally cross-referenced) | `company_actions` | — | — | — | — | — | — | — | — | — |
| MWAN roles (see above) | (duplicate row intentionally cross-referenced) | `mwan_role` | — | — | — | — | — | — | — | — | — |
| License statuses | Hardcoded enum | `license_status` on `companies` | No — keep as code-governed | No | Yes | Yes (code review) | Yes (i18n) | Yes (authorization) | Medium | Keep locked; improve UI wording only | Medium |
| Listing statuses | Hardcoded enum | `waste_listing_status` | No | No | Yes | Yes | Yes | Low | Low | Keep locked | Low |
| Offer statuses | Hardcoded enum | `offer_status` | No | No | Yes | Yes | Yes | Low | Low | Keep locked | Low |
| Deal statuses | Hardcoded enum | `deal_status` | No | No | Yes | Yes | Yes | Yes | Medium | Keep locked; document as one state-machine reference | Medium |
| Payment statuses | Embedded in `deal_status` | `deal_status` | No | No | Yes | Yes | Yes | Yes | Medium | Same as above | Medium |
| Transport/shipment statuses | Hardcoded enums | `transport_request_status`, `shipment_status` | No | No | Yes | Yes | Not independently confirmed live | Yes | Not yet verified | Reconcile overlapping terminal-state wording (§4) | High |
| Receipt/completion statuses | Hardcoded enum values | `deal_status`("receipt_pending"/"completed"), `shipment_status`("received"/"closed") | No | No | Yes | Yes | Not independently confirmed live | Yes | Medium-High (wording overlap, §4) | Reconcile wording across the two subsystems | High |
| VAT | i18n label | (computed) | Extend protection concept | No (correct as-is) | **Should be, isn't yet** | N/A | Yes | **Yes — directly financial** | Low (already clear) | Add to protected-label list | Medium |
| Subtotal | i18n label | (computed) | Same as VAT | No | **Should be, isn't yet** | N/A | Yes | Yes | Low | Same as VAT | Medium |
| Total | i18n label | (computed) | Same as VAT | No | **Should be, isn't yet** | N/A | Yes | Yes | **Will rise once platform fee exists (§4)** | Same as VAT, plus disambiguate buyer-total vs seller-net before fee launch | **Critical (pre-launch)** |
| Platform fee | Not yet implemented | None | **Yes, build it this way from day one** | Yes, recommended | Yes (rate value) | Yes, recommended | Yes | Yes — directly financial | High if introduced without a clear name | Define once, name once (§4 item 15) | **Critical (before build)** |
| Tadweerah commission | Not yet implemented — **possible duplicate of "platform fee"** | None | Resolve naming first | — | — | — | — | Yes | High (two names risk) | Decide: one canonical term, not two | **Critical (before build)** |
| Payment request | Not yet implemented | None | Yes, build with governance | Yes | Yes | Yes | Yes | Yes | Medium | Introduce with the protected-label pattern | High (before build) |
| Payment reference | Free text | `deals.payment_reference` | No — just a hint improvement | N/A | No | No | N/A | Low | Low | Add a format hint in copy | Low |
| Deal reference | Client-derived from UUID | (computed, not a DB sequence) | Consider upgrading to the `contract_sequences` pattern | N/A | Should be, isn't (no collision/audit guarantee) | N/A | N/A | Medium | Low (users don't notice today) | Consider a governed sequence, matching Contract Lite's approach | Medium |
| Contract reference | DB-backed atomic sequence | `contract_sequences` | Already governed — good model to copy for deal reference | N/A | Yes (structurally) | N/A | N/A | Yes | Low | None — already the stronger pattern | Low |
| Deal Details labels | i18n | — | N/A | No | No | No | Yes | Low | Low | Fine as-is | Low |
| Contract Lite labels | i18n | — | N/A | No | No | No | Not independently confirmed live | Medium | High (relationship to "Deal" unexplained) | Add explainer copy | High |
| Report labels | Governed | `sustainability_report_field_config` | — | Yes | Yes | No (gap) | Yes | Yes | Low | Add approval workflow | Low |
| Financial labels (general) | i18n | — | Extend protection concept | No | **Should be, isn't yet** | N/A | Yes | Yes | Low today, rising with fee launch | Add to protected-label list before fee launch | **Critical (before build)** |
| Regulatory/compliance labels | i18n | — | N/A | No | Should be | Yes, recommended | Yes | Yes | Medium | Route through WS8 compliance register | High |

## 4. Terminology and Value Consistency Assurance Matrix

*(Grouped thematically for readability; all 19 requested columns are present in each row. Confidence/validation labels follow the instructed vocabulary exactly: High internal confidence / Medium internal confidence / Low – requires human validation / Requires regulatory-legal validation.)*

### 4.1 Marketplace Core Concepts

| # | Concept | Underlying value | AR term(s) | EN term(s) | Appears in | Roles affected | Source | Term consistency | Value consistency | UX clarity | Confusion risk | Visual fit | Rec. AR | Rec. EN | Use everywhere? | Lock as glossary? | Evidence | Action | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Listing | `waste_listings` row | إعلان | Listing | Marketplace, dashboard, wizard | All non-admin | i18n + DB | Verified consistent | Value consistent | High | Low | Good | (keep) | (keep) | Yes | Yes | WS2/WS3 screenshots | None | Low |
| 2 | Offer | `listing_offers` row, `offer_status` | عرض | Offer | Marketplace, deal flow | All | i18n + DB | Verified consistent | Value consistent | High | Medium (offer→deal transition not explained) | Good | (keep) | (keep) | Yes | Yes | WS3 Batch A | Add one-line "accepting an offer creates a deal" tooltip | Medium |
| 3 | Bid | *(not used)* | — | — | Nowhere | N/A | N/A | Not applicable — term absent | Not applicable | N/A | Low (absence is good) | N/A | *(keep absent)* | *(keep absent)* | No — should stay absent | Yes — lock as "never introduce" | Repo-wide search | Add a one-line glossary note: do not use "bid," use "offer" | Low |
| 4 | Deal | `deals` row, `deal_status` | صفقة | Deal | Dashboard, deal page | All | i18n + DB | Verified consistent | **Source-of-truth risk** (transport sub-value, TDW-TRANS-001) | Medium | Medium (deal vs. contract unclear) | Good | (keep) | (keep) | Yes | Yes | WS3 Batch A, WS5-A | Add deal-vs-contract explainer | High |
| 5 | Auction | `sale_type` enum value `"auction"` | *(never shown)* | *(never shown)* | DB only | N/A (backend) | Backend enum | Confirmed inconsistent **by design** (internal name never surfaces) | Value consistent (feeds "receive offers" UI) | N/A | Low for users; Medium for future engineers without docs | N/A | *(keep internal)* | *(keep internal)* | N/A | Yes — document the mapping | WS5-A code trace | Add code comment/glossary entry documenting the mapping | Medium |
| 6 | Receive offers | UI label for `sale_type = "auction"` | استقبال عروض | receive offers | Listing wizard, marketplace | Seller chooses, buyer sees | i18n | Verified consistent | Value consistent | Medium | Medium (vs. "fixed price," the other option, not clearly contrasted) | Good | استقبال عروض تنافسية | Open for offers | Needs product decision | No — open to UX improvement | WS3 listing wizard | Consider clearer contrasting wording for the two sale-type options | Medium |
| 7 | Contract / Contract Lite | `contracts` row, `contract_sequences` | عقد *(not independently confirmed for "Lite" qualifier)* | Contract / Contract Lite | Separate subsystem from deals | Not fully confirmed which roles initiate | i18n + DB (governed sequence) | Not yet verified across full UI copy | Value consistent (governed, stronger than deal reference) | Low | **High** — relationship to "Deal" never explained | Not assessed (print output unreviewed) | — | — | Needs product decision | Yes for the reference format | WS1, WS3-A, WS5-A | Add explicit "Deals vs. Contracts" explainer in-product | **High** |
| 8 | Deal Details | Tab label only | تفاصيل الصفقة | Deal Details | Deal page tab | All | i18n | Verified consistent | Not applicable (label only) | High | Low | Good | (keep) | (keep) | Yes | No (low risk) | WS3-A | None | Low |

### 4.2 Payment & Financial Concepts

| # | Concept | Underlying value | AR term(s) | EN term(s) | Appears in | Roles affected | Source | Term consistency | Value consistency | UX clarity | Confusion risk | Visual fit | Rec. AR | Rec. EN | Use everywhere? | Lock as glossary? | Evidence | Action | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 9 | Payment proof | `deals.payment_proof_url` | *(file upload, "optional" label)* | Payment Proof (Optional) | Payment step | Buyer submits, seller confirms | i18n | Verified consistent (label wording itself) | **Source-of-truth risk** — label says optional, disabled-button behavior requires it | Low | **High (confirmed live)** | Acceptable (form is clean) | إثبات التحويل (مطلوب) | Transfer Proof (Required) | Yes, once fixed | Yes (financial-adjacent) | WS3 Batch B-1, WS4-A §7 | Fix label/behavior mismatch (already tracked) | **Critical** |
| 10 | Payment reference | `deals.payment_reference` (free text) | مرجع الدفع / رقم الحوالة | Payment reference | Payment proof form | Buyer | i18n label + DB free text | Verified consistent | No format governance | Medium | Low | Good | (keep, add hint) | (keep, add hint) | Yes | No | WS3 Batch B-1 | Add a format-hint example in copy | Low |
| 11 | Payment request | *(not yet built)* | طلب دفع / طلب رسوم المنصة *(proposed)* | Payment Request / Platform Fee Request *(proposed)* | Not yet implemented | N/A | N/A | Not applicable | Not applicable | N/A | N/A | N/A | طلب دفع | Payment Request | N/A — introduce deliberately | Yes, from day one | CR-001 A6/A8, WS5-C §9 | Introduce with governance from day one | High (pre-build) |
| 12 | Invoice | *(absent)* | — | — | Nowhere found | N/A | N/A | Not applicable — correctly absent | Not applicable | N/A | N/A | N/A | *(keep absent)* | *(keep absent)* | No | Yes — lock as "never introduce without legal sign-off" | CR-001 A6 | Standing compliance rule | **Critical (compliance)** |
| 13 | Tax invoice | *(absent)* | — | — | Nowhere found | N/A | N/A | Same as above | Same as above | N/A | N/A | N/A | *(keep absent)* | *(keep absent)* | No | Yes | CR-001 A6 | Same as above | **Critical (compliance)** |
| 14 | Platform fee | *(not yet built)* | رسوم منصة تدويرة *(proposed)* | Tadweerah Platform Fee *(proposed)* | Not yet implemented | Buyer and seller both see, differently | N/A | Not applicable yet | Not applicable yet | N/A | **High if launched without one clear name** | N/A | رسوم منصة تدويرة | Tadweerah Platform Fee | N/A — must be decided before build | Yes, from day one | CR-001 §A8 | Adopt as the **single** canonical term (see #15) | **Critical (pre-build)** |
| 15 | Tadweerah commission | *(not yet built — possible duplicate of #14)* | *(same concept, different name risk)* | *(same concept, different name risk)* | CR-001 text uses both "commission" and "fee" | Same as above | N/A | **Confirmed naming-collision risk before any code exists** | N/A | N/A | High | N/A | *(retire this term)* | *(retire this term — use "Platform Fee" only)* | No — should not coexist with #14 | Yes — resolve before build | CR-001 §A8 wording itself | **Decide now: one term, not two** | **Critical (pre-build)** |
| 16 | VAT | Computed (15%) | ضريبة القيمة المضافة (١٥٪) | VAT (15%) | Deal financial summary | All | i18n (computed value) | Verified consistent | Value consistent (math confirmed correct, WS3/WS4-A) | High | Low | Good | (keep) | (keep) | Yes | **Yes — should be added to protected list** | WS3 Batch A/B-1 | Add to protected-label list (§8 of WS5-C) | Medium (governance, not a defect) |
| 17 | Subtotal | Computed | المجموع الفرعي | Subtotal | Deal financial summary | All | i18n | Verified consistent | Value consistent | High | Low | Good | (keep) | (keep) | Yes | Yes — same as VAT | Same as above | Same as above | Medium |
| 18 | Total | Computed | الإجمالي | Total | Deal financial summary | All | i18n | Verified consistent **today** | Value consistent **today** | High **today** | **Will rise once a platform fee exists** — "Total" cannot mean the same thing to buyer and seller once a fee is deducted | Good | الإجمالي (المستحق على المشتري) | Total (Payable by Buyer) | Needs product decision **before fee launch** | Yes — critical to disambiguate pre-launch | WS3/WS4-A + this review's forward-looking analysis | **Introduce a second, distinctly-labeled figure for seller's net amount before any fee launches** | **Critical (pre-launch)** |
| 19 | Seller entitlement | *(not yet a field anywhere in the codebase)* | صافي مستحقات البائع *(proposed)* | Seller Net Amount / Amount Due to Seller *(proposed)* | Not yet implemented | Seller | N/A | Not applicable — concept doesn't exist yet | Not applicable | N/A | **High** — if not introduced clearly, sellers may assume "Total" is what they receive | N/A | صافي مستحقات البائع | Amount Due to Seller | N/A — must be introduced deliberately, at the same time as the platform fee | Yes, from day one | This review (new finding, forward-looking) | Define and name before the platform-fee feature ships, not after | **Critical (pre-build)** |

### 4.3 Transport & Logistics Concepts

| # | Concept | Underlying value | AR term(s) | EN term(s) | Appears in | Roles affected | Source | Term consistency | Value consistency | UX clarity | Confusion risk | Visual fit | Rec. AR | Rec. EN | Use everywhere? | Lock as glossary? | Evidence | Action | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 20 | Transport responsibility | `waste_listings.transport_responsibility` | مسؤولية النقل | Transport Responsibility | Listing creation, Deal Details | Seller, buyer | i18n + DB | Verified consistent (translation) | **Confirmed inconsistent** (TDW-TRANS-001) | Low at the buggy moment | **High (confirmed live)** | Good (UI itself is clean; content is wrong) | (keep, pending fix) | (keep, pending fix) | Yes, once fixed | Yes | WS3 Batch B-2A, WS3 Transport Review | Already tracked for engineering fix | **Critical** |
| 21 | Shipment | `contract_shipments`, `shipment_status` | *(not independently confirmed live)* | Shipment | Contract Lite subsystem | Not yet observed live | DB enum + i18n (assumed) | Not yet verified | Not yet verified | Not assessed | Not yet verified | Not assessed | — | — | Not yet verified | Not yet verified | Schema only (this review) | Verify live during WS6 or the transport exception | Medium |
| 22 | Dispatch | `deal_status = "dispatched"` **and** `shipment_status = "dispatched"` | *(not independently confirmed live for both)* | Dispatch / Dispatched | Deal lifecycle **and** Contract Lite shipment lifecycle | Seller (deal), unclear (shipment) | Backend enum (two separate enums, same English word) | **New finding: same word used in two unrelated status enums** | **Not yet verified whether this represents the same real-world event or two different ones** | Not assessed | Medium (for anyone reconciling a deal and its related contract) | Not assessed | — | — | Needs product/engineering clarification | Yes, once clarified | This review (schema comparison) | Confirm whether these are the same event; document the relationship either way | **High** |
| 23 | Receipt | `deal_status = "receipt_pending"` vs. `shipment_status = "received"` | *(not independently confirmed live for both)* | "Receipt pending" vs. "Received" | Deal lifecycle vs. shipment lifecycle | Buyer (both, presumably) | Backend enum (different word forms across two subsystems) | **Likely inconsistent** — different word forms for what may be the same concept | Not yet verified | Not assessed | Medium | Not assessed | — | — | Needs product decision | Yes, once resolved | This review (schema comparison) | Consider unifying terminal-state vocabulary across deal and shipment subsystems | High |
| 24 | Completion | `deal_status = "completed"` vs. `shipment_status = "closed"` | *(not independently confirmed live for both)* | "Completed" vs. "Closed" | Deal lifecycle vs. shipment lifecycle | All | Backend enum (different terminal word per subsystem) | **Likely inconsistent** | Not yet verified | Not assessed | Medium | Not assessed | — | — | Needs product decision | Yes, once resolved | This review (schema comparison) | Same as above — pick one terminal word or document why they differ | High |

### 4.4 Roles & Company Classification Concepts

| # | Concept | Underlying value | AR term(s) | EN term(s) | Appears in | Roles affected | Source | Term consistency | Value consistency | UX clarity | Confusion risk | Visual fit | Rec. AR | Rec. EN | Use everywhere? | Lock as glossary? | Evidence | Action | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 | Generator / Producer / Seller | `mwan_role = "generator"`; homepage copy says "Producer"; legacy `company.type = "producer"`; this audit's own shorthand and likely marketplace card labels say "Seller" | مولّد نفايات (onboarding) vs. منتج (homepage) | Generator (onboarding) vs. Producer (homepage) vs. Seller (marketplace cards, audit shorthand) | Onboarding, homepage, marketplace | Generator role | i18n (multiple, uncoordinated hardcoded strings) + legacy enum | **Confirmed inconsistent — the same role has three different public-facing names** | Value consistent (all point to the same underlying company) | Medium | **High** — a returning user could reasonably wonder if "Seller" and "Generator" are the same thing | Good individually, inconsistent collectively | مولّد (النفايات) | Generator | Needs product decision — recommend "Generator" as the single canonical term | Yes, once decided | This review (cross-surface comparison) — **new finding** | Audit marketing copy + marketplace card labels; standardize on one term | **High** |
| 26 | Receiver / Buyer / Processor | `mwan_role = "receiver"`; homepage copy says "Processors"; marketplace/offer context likely says "Buyer" | مستلم نفايات (onboarding) vs. معالج (homepage) | Receiver (onboarding) vs. Processor (homepage) vs. Buyer (marketplace, offers) | Onboarding, homepage, marketplace | Receiver role | Same pattern as #25 | **Confirmed inconsistent — same triple-naming pattern** | Value consistent | Medium | High, same reasoning as #25 | Good individually | مستلم (النفايات) | Receiver | Needs product decision — recommend "Receiver" as canonical, with "Buyer" acceptable only in the specific transactional context (submitting/accepting an offer) | Yes, once decided | This review — **new finding** | Same remediation as #25 | **High** |
| 27 | Transporter | `mwan_role = "transporter"`; homepage says "Transporters" | ناقل مرخّص | Licensed Transporter / Transporters | Onboarding, homepage | Transporter role | i18n | Verified consistent (less drift than #25/#26) | Value consistent | High | Low | Good | (keep) | (keep) | Yes | Yes | WS2, homepage copy | None needed | Low |
| 28 | Recycler / Processor / Factory (company categories) | `company_categories` table values | شركة تدوير، مصنع، إلخ | Recycling Company, Factory, etc. (inferred) | Company profile, onboarding | All | Admin-managed master data | Not yet independently confirmed for exact EN strings | Value consistent (structurally sound) | Medium | **High** — this is a fourth axis (category) layered on top of role/activity/capability (WS5-B) | Not assessed | — | — | Needs product decision | No — appropriate to remain admin-editable | WS5-B, this review | Reinforce the role-vs-category-vs-activity-vs-capability distinction in onboarding copy | High (restated from WS5-B, sharpened here) |
| 29 | Activities | `company_actions` (admin-managed) | (per WS5-B) | (per WS5-B) | Onboarding | All | Admin-managed master data | Verified consistent | Value consistent — explicitly non-enforcing (WS5-B) | Medium | High (vs. roles) | Good | — | — | Needs product decision | No | WS5-B | Add onboarding hierarchy copy | High (restated) |
| 30 | Roles | `mwan_role` | (per WS5-B) | (per WS5-B) | Onboarding | All | Backend enum | Verified consistent | Value consistent | Medium | High (vs. activities) | Good | — | — | Needs product decision | Yes | WS5-B | Same as above | High (restated) |
| 31 | Capabilities | `capabilities` table | (per WS5-B/C) | (per WS5-B/C) | Not user-facing at onboarding; used in eligibility logic | All | Admin-managed master data | Verified consistent | Value consistent — the real enforcement layer | Low (users likely never see this term directly) | Low | Not assessed | — | — | N/A | Protect `requires_license` flag | WS5-B/C | Consider surfacing capability-driven requirements to users in plain language | Medium |
| 32 | MWAN roles | Same as "Roles" | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| 33 | License status | `license_status` enum | (per WS5-A/B) | (per WS5-A/B) | Onboarding, profile | All | Backend enum | Verified consistent | Value consistent | Low ("optional" label mismatch, WS4-A/B) | High (confirmed live) | Good | (per WS5-A/B recommendation) | (per WS5-A/B recommendation) | Yes, once fixed | Yes | WS5-A/B, WS4-A | Already tracked | Critical (restated) |
| 34 | Approved | `license_status = "approved"` | (per WS5-B) | Approved | Company profile (implicit, not always shown) | All | Backend enum | Verified consistent where shown | Value consistent | Medium — not always visibly surfaced to the user | Medium | Not assessed | — | — | Needs product decision | Yes | WS5-B | Consider a visible "Approval status" indicator on the company profile | Medium |
| 35 | Verified | `company.verified` i18n key ("موثّقة"/"Verified") | موثّقة | Verified | Company/deal trust badge | All | i18n | **Confirmed word-collision** — same Arabic word used as generic marketing adjective ("documented") dozens of times elsewhere on the homepage/app (e.g. "مسار موثّق," "عرض موثّق," "بيانات موثّقة") | Value consistent (the badge itself maps to real verification logic) | **Low** — the specific trust signal is diluted by identical wording used as decoration everywhere else | **High — new finding, not previously documented** | Good visually, weak semantically | **موثوقة رسمياً** or **تم التحقق من الشركة** (a distinctly different word from generic "موثّق") | **"Verified" (keep in English — no collision there)** | Needs product decision — recommend changing the Arabic badge word specifically | Yes, once decided | This review (i18n dictionary scan) — **new finding** | Change the Arabic verification-badge word to something that doesn't overlap with the marketing site's constant use of "موثّق" | **High** |

### 4.5 Data, Reporting & Other Concepts

| # | Concept | Underlying value | AR term(s) | EN term(s) | Appears in | Roles affected | Source | Term consistency | Value consistency | UX clarity | Confusion risk | Visual fit | Rec. AR | Rec. EN | Use everywhere? | Lock as glossary? | Evidence | Action | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 36 | City | `companies.city` / `waste_listings.city` (free text) | *(as typed)* | *(as typed)* | Everywhere | All | Free text, no master data | Confirmed inconsistent (typos, e.g. "dammmam") | **Source-of-truth risk** | Low | Medium (visible typos) | Weak (typo-prone) | *(master data list)* | *(master data list)* | Yes, once built | N/A until built | WS2/WS3, WS5-B/C | Build `cities` master-data table | Critical (restated) |
| 37 | Location | Same as City | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Same | Critical (restated) |
| 38 | Material | `material_categories` | (admin-managed) | (admin-managed) | Marketplace, listing wizard | All | Admin-managed master data | Verified consistent (structurally) | Value consistent | High | Low | Good | (keep) | (keep) | Yes | N/A (already governed) | WS5-C | None | Low |
| 39 | Quantity | `waste_listings.quantity` (numeric) | الكمية | Quantity | Listing, deal | All | i18n + DB numeric | Verified consistent | Value consistent | High | Low | Good | (keep) | (keep) | Yes | No | Not deeply audited beyond confirmation | None identified | Low |
| 40 | Unit | `unit_options` (admin-managed) + legacy `waste_unit` enum | كجم/طن | kg/ton | Listing, deal | All | Admin-managed master data | Verified consistent (governance) | Value consistent | Medium | Low | **Weak — recurring artifact**: unit abbreviations render in Latin characters even inside fully-Arabic screens (WS4-A §5) | (keep governance, fix rendering) | (keep) | Yes | N/A (governance already fine) | WS4-A §5 | Fix the unit-label rendering leak — a case where the **value is correct but the display is confusing** | Medium |
| 41 | Sustainability report | `sustainability_reports` + `sustainability_report_field_config` | (governed) | (governed) | Dashboard tool | All | **The best-governed area in the codebase** | Verified consistent | Value consistent | Not deeply assessed visually | Low | Not assessed | — | — | Yes | Yes (already has `is_system_field`) | WS5-C | None — this is the model to copy elsewhere | Low |
| 42 | Impact report | *(not clearly distinguished from "sustainability report")* | — | — | CR-001 wording only | — | Unclear | **Not yet verified — may be the same deliverable under two names, or a genuinely separate planned feature** | Not applicable | N/A | Medium (product-level ambiguity, not user-facing yet) | N/A | — | — | Needs product decision | N/A | CR-001 text, this review | Clarify whether "impact report" and "sustainability report" are one thing or two before either is redesigned | Medium |
| 43 | Certificate | *(not found)* | — | — | Nowhere | — | N/A | Not applicable — not yet implemented | Not applicable | N/A | N/A | N/A | — | — | N/A | N/A | Repo-wide search, this review | None — flag as a future concept only if the Sponsor intends to add one | Low |

## 5. UI/UX Improvement Implications

| Area | Likely improvement type |
|---|---|
| Navigation labels | Copy-only improvement (role-naming unification, §4.4) |
| Tab labels | Copy-only improvement (minor — Deal Details vs. Contract Lite distinction) |
| Button wording | Copy-only improvement (payment-proof button/label fix) |
| Status badges | Terminology governance improvement (reconcile dispatch/receipt/completion wording across deal and shipment subsystems) |
| Listing cards | Source-of-truth improvement (city master data) + copy-only (role naming on "seller" labels) |
| Marketplace filters | Master-data improvement (once cities are structured, filters become more reliable) |
| Onboarding steps | Terminology governance + visual hierarchy improvement (roles/activities/capabilities explanation) |
| Company profile | Source-of-truth improvement (bilingual name/city — data model change) + copy-only (Verified badge wording) |
| Dashboard | Copy-only (role-naming) + source-of-truth (bilingual data, already tracked in WS5-B) |
| Deal Details | Source-of-truth improvement (transport-responsibility fix) + copy-only (deal-vs-contract explainer) |
| Payment proof flow | Copy-only + source-of-truth improvement (already tracked, WS4-A/WS5-A) |
| Transport/shipment flow | Terminology governance improvement (status-word reconciliation) — requires human/regulatory validation for MWAN-adjacent wording |
| Receipt/completion flow | Terminology governance improvement — same as above |
| Reports | Already governed — visual hierarchy improvement only (extend `sustainability_report_field_config`'s `section` grouping visually) |
| Payment requests / platform fee requests | **Data model change** (doesn't exist yet) + terminology governance (must be named once, consistently, before launch) — requires regulatory/legal validation before any invoice-adjacent wording |
| Future homepage/app redesign | Defer to Path 2 prototype for anything beyond copy fixes; the current visual layer (WS4-B) does not need a redesign to fix these terminology issues |

## 6. Creative Recommendation Space

*(Recommendations only — nothing here is implemented, designed, or final.)*

- **Listing vs. offer vs. bid vs. deal:** keep "bid" permanently retired from the vocabulary; consider a single onboarding graphic-free, text-only explainer: "List → Offer → Deal → Contract" as a linear glossary strip somewhere discoverable (dashboard help, or a persistent tooltip on first deal), no redesign required.
- **Payment proof vs. payment reference vs. receipt:** rename "Payment proof" to "Transfer Proof" to reduce overlap with the general English word "proof" doing double duty; keep "reference" and "receipt" as distinct, already-clear terms.
- **Shipment vs. receipt vs. completion:** recommend a single terminal-state vocabulary decision — either use "Completed" everywhere a lifecycle ends, or explicitly document why deals end in "completed" while shipments end in "closed" (e.g., if a shipment can be "closed" without the deal being "completed," that's a meaningful distinction worth explaining, not hiding).
- **Approved vs. verified vs. licensed:** recommend a plain-language onboarding sentence distinguishing all three: "Approved = your company can use the marketplace. Licensed = you've submitted a recycling license number. Verified = a badge shown to other companies once both are confirmed." This is copy, not a new feature.
- **Roles vs. activities vs. capabilities vs. company category:** recommend visually separating these into two tiers in onboarding: **Tier 1 — "What kind of company are you?"** (Role + Category, both meaningful/consequential) and **Tier 2 — "Tell other companies more about you"** (Activities, purely descriptive) — this is a grouping/hierarchy suggestion, not a redesign mandate.
- **Status label improvements:** consider whether "receipt_pending" should ever be user-facing as literally that phrase — recommend something like "Awaiting Goods Receipt" if it currently isn't already phrased this way (not independently confirmed live).
- **Report label hierarchy:** the `section` field already on `sustainability_report_field_config` (header/allocation/metrics/disclaimer/footer) is a ready-made hierarchy — recommend visually grouping report fields by this existing field rather than inventing a new grouping scheme.
- **Financial label protection model:** recommend a new boolean, e.g. `is_financial_critical`, following the exact shape of `is_system_field`, applied first to VAT/subtotal/total, then extended to platform-fee/seller-entitlement labels once built.
- **Glossary governance model:** recommend this addendum's §4 tables become the seed of a living "Tadweerah Glossary" document, reviewed whenever a new user-facing concept is added — a process recommendation, not a new system.
- **Admin configuration model:** recommend one additional field on every admin-managed table: `last_changed_by` + `last_changed_at`, a minimal audit trail, before extending the pattern to anything financial.
- **Locked-terms list (proposed, not final):** `mwan_role` values, `license_status` values, all financial computed labels (VAT/subtotal/total/platform fee/seller entitlement once built), deal/offer/listing/transport/shipment status *option sets* (labels can flex, the set of possible values should not).
- **Human-validation-required list:** unchanged in substance from WS5-A/B/C — Saudi market fit, MWAN/regulatory wording, industrial-sector terms, ZATCA/invoice/tax wording — with the addition that the *role triple-naming* (§4.4, #25/#26) should specifically be checked against how real Saudi B2B counterparts refer to these roles, since the "right" canonical choice may not be the one this review defaulted to.

## 7. Gap Analysis

**A. Already governed well:** the 5+1 admin-managed master-data tables; VAT/subtotal/total math (correct, just not yet formally protected); the confirmation-modal UX pattern.

**B. Governed but needs better UI explanation:** roles/activities/capabilities/company-categories (all individually well-modeled in code, collectively confusing to a first-time user); deal-vs-contract relationship.

**C. Not governed and should become master data:** city/location (the clearest, highest-priority item).

**D. Not governed and should remain locked/system-controlled:** `mwan_role`, `license_status`, and all lifecycle status *option sets* — these should stay code-governed, not admin-editable, even though their display labels can flex.

**E. Not verified across Arabic/English/roles/pages:** the genuine cross-language transactional content check (`PH0-OPEN-AR-EN-001`, still open); shipment/transport-request status wording in live English UI (never independently observed); whether "dispatched"/"received"/"closed" in the shipment subsystem represent the same events as "dispatched"/"receipt_pending"/"completed" in the deal subsystem.

**F. Requires human/regulatory/legal validation:** all Saudi-market and MWAN-specific terminology (unchanged); any future invoice/tax-adjacent wording; the recommended role-naming unification's actual chosen terms, before being treated as final.

**G. Candidate for current-platform improvement (Path 1):** role/company naming unification; the "Verified" word-collision fix; deal-vs-contract explainer copy; unit-label rendering leak fix; payment-proof label/behavior fix; transport-responsibility fix; platform-fee/seller-entitlement naming decision before build.

**H. Candidate for Path 2 prototype only:** any deeper visual/information-architecture redesign of the roles/activities/capabilities onboarding flow; a from-scratch homepage/app visual identity refresh (not required to fix the terminology issues found here, but a reasonable place to apply a cleaner information architecture if a full redesign happens anyway).

## 8. Founder-Readable Conclusion

**Are terminology problems confirmed? Yes, several — but they are narrower and more fixable than "the whole platform's language is inconsistent."** Confirmed: the role/company triple-naming (Generator/Producer/Seller and Receiver/Buyer/Processor), the "Verified" word-collision with generic marketing language, and the pre-existing findings (payment-proof label, transport-responsibility bug, license "optional" wording).

**Which are only risks, not yet confirmed problems?** The dispatch/receipt/completion wording overlap between the deal and shipment subsystems is a **real pattern worth checking**, but this review could not confirm live whether it causes actual user confusion (those screens haven't been observed live yet) — it's flagged as a risk to verify, not a confirmed defect.

**Which are unverified?** The genuine cross-language transactional check (still open from WS4-A), and the shipment/transport-request English-language labels.

**Are terms linked to the correct values consistently? Mostly yes.** The one confirmed value-level defect remains the transport-responsibility bug. Everything else checked (VAT math, offer/deal status enums, master-data tables) links correctly.

**Are there cases where the term looks correct but the value is wrong?** Yes — transport responsibility is the clearest example: the words are accurate, the underlying value can be wrong.

**Are there cases where the value is correct but the wording is confusing?** Yes — the unit-label rendering leak ("1 kg" in Latin characters inside Arabic screens) is a clean example: the data is right, the display is what needs fixing. The "Verified" word-collision is a subtler version of the same pattern: the badge logic is correct, but the specific word chosen dilutes its own meaning.

**Can we currently say Arabic/English terminology is fully unified? No — not yet, but it's closer to unified than fragmented.** The core marketplace vocabulary (listing/offer/deal) is genuinely solid. The gaps are concentrated in role naming, one badge word, and two not-yet-built financial concepts that need to be named correctly *before* they exist rather than fixed after.

**What must be fixed in the current platform?** Role naming unification, the Verified word-collision, and the payment-proof/transport-responsibility defects (already tracked).

**What can be improved later through UX redesign?** The onboarding information hierarchy (roles/activities/capabilities grouping) and any deeper visual treatment of the deal-vs-contract relationship — real improvements, but not urgent defects.

**What must be validated by humans/domain experts?** Everything Saudi-market- and MWAN-specific, unchanged from prior reviews, plus — newly — whichever canonical role names are ultimately chosen in the naming-unification fix.

## 9. Impact on Next Workstreams

- **WS5-D / WS10** (reports, payment requests, platform fees, trust outputs): **can continue**, and should treat §4.2's platform-fee/commission/seller-entitlement naming decision as a **prerequisite input**, not something to work around — building WS5-D/WS10's recommendations on an unresolved "fee vs. commission" naming question would just recreate the same ambiguity one level up.
- **WS6** (Arabic/English parity): should absorb `PH0-OPEN-AR-EN-001` plus the newly-found role-naming and shipment/transport-status verification gaps as its concrete starting checklist rather than starting from a blank slate.
- **WS8** (compliance/security-readiness): should receive the invoice/tax standing rule and the regulatory-wording human-validation list as direct inputs to its compliance register.
- **WS9** (backlog): should receive every "Recommended action" column entry from §4 as candidate backlog items, pre-classified by priority.
- **WS11** (next-phase charter): should receive the Path 1 vs. Path 2 gap classification (§7) as direct input to the two-path decision pack.
- **Path 1** (current-platform improvement): the naming-unification and word-collision fixes are copy-only, low-risk, high-value candidates for an early Path 1 milestone.
- **Path 2** (separate prototype): the deeper onboarding information-architecture redesign is a reasonable Path 2 candidate, but not a blocker for Path 1 improvements.

**Can WS5-D/WS10 continue after this addendum? Yes.** **Should any part of WS5-D/WS10 be adjusted?** Yes — it should explicitly resolve the platform-fee/Tadweerah-commission naming collision (§4.2, items 14-15) as one of its first steps, before producing any further fee-related recommendations. **Should the buyer-responsibility transport exception remain deferred?** **Yes, unchanged** — if anything, this addendum strengthens that recommendation, since the newly-identified dispatch/receipt/completion wording questions (§4.3) are exactly the kind of thing worth resolving conceptually first, so that if/when the transport exception is executed, the evidence capture can also confirm or refute those wording questions live.

---

# WS5-C Addendum Closure Decision

**Date:** 2026-07-03
**Founder decision:** WS5-C Addendum is accepted and closed.

**Status: Completed ahead of baseline.**

**Accepted conclusions:**
1. Tadweerah has a proven governance-safe bilingual configuration pattern.
2. The pattern should be reused and generalized carefully, not reinvented.
3. Terminology is closer to unified than fragmented, but not fully unified yet.
4. Confirmed terminology issues include:
   - Role naming inconsistency: Generator / Producer / Seller and related Receiver / Buyer terminology.
   - Verified / موثق word collision between marketing trust language and actual verification status.
   - Platform Fee vs. Tadweerah Commission naming collision.
   - Payment-proof label/behavior mismatch.
   - Transport responsibility display/value mismatch.
5. Confirmed value/term mismatch includes:
   - Transport responsibility: wording may appear correct while underlying value is wrong.
   - Unit display issue such as "1 kg" inside Arabic screens.
6. `PH0-OPEN-AR-EN-001` remains open.
7. Arabic/English terminology cannot yet be claimed as fully unified across all roles, pages, and workflows.
8. WS5-D / WS10 may continue, but must begin by resolving the platform-fee / Tadweerah-commission naming collision as a first-step requirement.
9. Buyer-responsibility transport exception remains deferred and plan-only.
10. No implementation occurred.

**WS5-C Addendum is now closed on this basis.** Per standing instruction, it will not be reopened unless new evidence contradicts what's documented here.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This document is read-only source-code and documentation analysis plus recommendations. No new live UI actions, no code/config/DB/admin/commit/deploy actions, no mockups, no fee-document designs, no document deletion, no transport/shipment/receipt/completion action. No Saudi-market, MWAN, ZATCA, or regulatory validation is claimed anywhere in this document — all such items are explicitly marked as requiring human/domain validation.*
