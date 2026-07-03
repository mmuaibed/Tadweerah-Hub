# WS5-C — Terminology, Labels & Configurable Master Data Governance Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Method:** Read-only source-code inspection of `lib/db/src/schema/*.ts` (all 36 schema files), `artifacts/tadweerah/src/i18n/index.tsx`, and prior WS4-A/WS4-B/WS5-A/WS5-B findings. **No new live UI actions.** No code/config changes, no DB access, no admin action, no commits, no deploys, no designs/mockups, no fee-document designs, no document deletion.

---

## 1. Executive Summary

**The most important finding in this review is that Tadweerah already has a working, well-designed governance pattern for exactly what the Sponsor is asking about — it just isn't used everywhere yet.** A `sustainability_report_field_config` table already implements bilingual admin-editable labels with a protected "system field" flag that the API itself enforces (not just a seed-time convention). Five further tables (`material_categories`, `unit_options`, `capabilities`, `company_categories`, `company_actions`) already follow a consistent admin-managed, bilingual (`name_ar`/`name_en`), active/sort-order pattern. **The Sponsor's question 4 ("should some labels be admin-configurable?") is not hypothetical — it's already partially built.** The real work is: (a) extending the same proven pattern to the places that still lack it (most visibly, city/location, which has no master-data table at all), and (b) applying the *protected system field* concept from the sustainability config to every other place a label touches money, compliance, or a reference number.

## 2. Terminology Source Map

| Concept | AR/EN source | Type | Notes |
|---|---|---|---|
| Listing | i18n + `waste_listings` table | Hardcoded UI label + DB record | No ambiguity |
| Offer | i18n + `listing_offers` table | Hardcoded UI label + DB record | — |
| Bid | *(not used)* | N/A | Platform consistently uses "offer," never "bid" — worth confirming this stays intentional |
| Deal | i18n + `deals` table | Hardcoded UI label + DB record | — |
| Auction | `sale_type` enum value `"auction"` (backend only) | **Backend enum, never shown to users** | UI always says "receive offers" instead (WS5-A) |
| "Receive offers" | i18n | Hardcoded UI label | Maps to the internal `"auction"` enum value |
| Contract (Contract Lite) | i18n + `contracts` table, separate subsystem | Hardcoded UI label + DB record | Distinct from marketplace "deal" |
| Deal Details | i18n (tab label) | Hardcoded UI label | — |
| Payment proof | i18n | Hardcoded UI label | — |
| Payment reference | i18n + `deals.payment_reference` (free text) | Hardcoded UI label + DB field | No format validation (WS5-A) |
| Payment request | *(not used — future term per CR-001 A6)* | N/A | To be introduced deliberately, not yet in the codebase |
| Invoice / tax invoice | *(not used anywhere found)* | N/A | Correctly absent today — must stay absent per CR-001 A6 until ZATCA status confirmed |
| Platform fee / Tadweerah commission | *(not used anywhere found)* | N/A | Not yet implemented in code — a future addition per CR-001 |
| Transport responsibility | i18n + `waste_listings.transport_responsibility` | Hardcoded UI label + DB field (listing-level only, see WS5-A) | Subject to the TDW-TRANS-001 propagation bug downstream |
| Shipment | i18n + `contract_shipments` table (`shipment_status` enum) | Hardcoded UI label + DB enum | Contract Lite subsystem only |
| Dispatch | i18n + `confirm-dispatch` actions/enum values | Hardcoded UI label + backend action name | — |
| Receipt | i18n + `confirm-receipt` action / `receipt_pending` deal status | Hardcoded UI label + backend enum value | — |
| Completion | i18n + `completed` status value (multiple enums) | Hardcoded UI label + backend enum value | Shared term across deal, shipment, transport-request lifecycles |
| Generator | i18n + `mwan_role` enum value `"generator"` | Hardcoded UI label + DB enum | — |
| Receiver | i18n + `mwan_role` enum value `"receiver"` | Hardcoded UI label + DB enum | — |
| Transporter | i18n + `mwan_role` enum value `"transporter"` | Hardcoded UI label + DB enum | — |
| Processor / Recycler | Observed as **company category** values (e.g. "شركة تدوير" / recycling company), not a role | Master data (`company_categories` table, admin-managed) | Distinct from MWAN role — a classification, not a permission |
| Factory | Observed as a **company category** value ("مصنع") | Master data (`company_categories`) | Same as above |
| Activities | i18n + `company_actions` table (admin-managed, bilingual) | **Admin-managed master data**, explicitly "user intent, not eligibility" | See WS5-B |
| Roles | i18n + `company_roles` / `mwan_role` enum | Hardcoded enum (backend code change required to add a role) | Not admin-configurable today |
| Capabilities | i18n + `capabilities` table (admin-managed, bilingual) | **Admin-managed master data** | Comment confirms labels "may be updated freely" |
| MWAN roles | Same as "Roles" above | Backend enum | — |
| License status | i18n + `license_status` enum (`companies.ts`) | Hardcoded enum (backend code change required) | Admin sets the *value* via an action; the *enum options themselves* are not configurable |
| Verified / Approved | Computed client-of-formula (`!!(commercialRegistration && license_status === "approved")`), not a stored field | Backend-computed, i18n-labeled | See WS5-A/B |
| City / location | Free text, `companies.city` / `waste_listings.city` | **No master data — plain text columns** | The one clear governance gap relative to the 5 existing admin-managed tables |
| Material | `material_categories` table (admin-managed, bilingual, hierarchical) + legacy `waste_material` enum | **Admin-managed master data** (new) / hardcoded enum (legacy, still supported per `waste-listings.ts` comments) | Two systems coexist during migration |
| Sustainability report | i18n + `sustainability_reports` / `sustainability_report_field_config` | Hardcoded UI + **admin-configurable field labels** (see §1) | The most governed area in the whole codebase |
| Impact report | *(not independently identified as a distinct concept from "sustainability report" in this pass)* | — | Needs clarification of whether these are meant to be the same or different deliverables |
| Certificate | *(not found)* | N/A | No certificate-generation feature identified in this codebase pass |

## 3. Bilingual Terminology Register

*(Confidence tags per your instruction: High internal confidence / Medium internal confidence / Low – requires human validation / Requires regulatory-legal validation. No item is marked "externally validated" — that can only be assigned by human/market review.)*

| Concept | Current AR | Current EN | Appears in | Inconsistency risk | Recommended AR | Recommended EN | Confidence | Human validation? |
|---|---|---|---|---|---|---|---|---|
| Generator role | مولّد نفايات (Generator) | Waste Generator | Onboarding, company profile | Low — consistent | (keep) | (keep) | High internal confidence | Yes — Saudi industry fit |
| Receiver role | مستلم نفايات (Receiver) | Waste Receiver | Onboarding, company profile | Low | (keep) | (keep) | High internal confidence | Yes |
| Transporter role | ناقل مرخّص (Transporter) | Licensed Transporter | Onboarding, company profile | Low | (keep) | (keep) | High internal confidence | Yes — confirm "licensed" framing matches MWAN licensing terms |
| Auction/receive-offers | استقبال عروض | receive offers | Listing wizard, marketplace | **Medium** — internal enum says "auction," never shown; a future engineer/analyst could be misled | (keep UI copy) | (keep UI copy); add code comment/glossary entry only | High internal confidence that translation itself is fine | No — this is an internal documentation gap, not a market-fit question |
| License (optional label) | رقم الترخيص (اختياري) | License Number (Optional) | Onboarding | **High** — label says optional, behavior is not (WS5-A/B) | إضافة رقم الترخيص إن توفر — قد تحتاج شركتك لاعتماد لاحقاً لنشر الإعلانات | Add your license number if available — your company may need approval before publishing listings | High internal confidence this is a real UX defect, not a translation issue | No — this is a copy/logic fix, not a market-fit question |
| Transport responsibility | مسؤولية النقل / المورّد (البائع) / المشتري | Transport Responsibility / Seller (Producer) / Buyer | Listing creation, Deal Details | **High** — correct translation, but underlying value can be wrong post-payment (TDW-TRANS-001) | (keep, pending bug fix) | (keep, pending bug fix) | High internal confidence in translation; bug is data, not language | No |
| MWAN (مَوَن) | مَوَن | MWAN | Multiple screens, schema comments | Unknown — spelling/rendering convention not independently confirmed against official usage | — | — | Low — requires human validation | **Yes — regulatory/official terminology** |
| Electronic manifest reference | البيان الإلكتروني | *(not independently observed in English)* | Deal page | Unknown | — | Ensure an English equivalent exists and matches official MWAN e-Manifest terminology | Low — requires human validation | **Yes — regulatory/official terminology** |
| Material category names (plastic, metals, paper, etc.) | بلاستيك، معادن، ورق وكرتون، إلخ | Plastic, Metals, Paper & Cardboard, etc. (inferred) | `material_categories` table | Unknown — not independently confirmed these match Saudi industrial-sector conventions | — | — | Medium internal confidence (structurally sound, bilingual, admin-managed) | **Yes — industrial-sector terminology** |
| Company categories (factory, recycling company, scrap dealer, etc.) | مصنع، شركة تدوير، تاجر خردة، إلخ | (inferred, not independently confirmed) | `company_categories` table | Unknown | — | — | Medium internal confidence | **Yes — Saudi market terminology** |
| Payment request *(future term)* | *(to be introduced)* | *(to be introduced)* | Not yet implemented | N/A — proactive guidance only | طلب دفع / طلب رسوم المنصة | Payment Request / Platform Fee Request | High internal confidence this satisfies CR-001 A6's caution | **Yes, if it will ever touch compliance-sensitive contexts — requires legal/ZATCA validation before wide use** |
| Invoice / tax invoice | *(absent — correctly)* | *(absent — correctly)* | N/A | **Must remain absent** per CR-001 A6 | — | — | High internal confidence that current absence is correct | **Requires regulatory/legal validation before ever introducing this wording** |

## 4. Field Label Source-of-Truth Map

| Label category | Examples | Classification |
|---|---|---|
| Form field labels (onboarding, listing creation, payment) | "اسم الشركة," "رقم الحوالة / مرجع الدفع" | Controlled i18n label (hardcoded string keys, not DB-driven) |
| Tab labels (Deal Details, Payment Details, Print) | "تفاصيل الصفقة," "تفاصيل الدفع" | Controlled i18n label |
| Card labels (dashboard tool cards, marketplace cards) | "إعلاناتي," "التقارير والاستدامة" | Controlled i18n label |
| Report labels (sustainability reports) | Field-level labels in report output | **Admin-configurable master data** (`sustainability_report_field_config.label_ar/label_en`) — the one area already governed this way |
| Status labels (deal/offer/listing/transport/shipment status) | "بانتظار تأكيد الدفع," "مفتوح" | Controlled i18n label, mapped 1:1 from a **hardcoded backend enum** — changing a status value requires a code change, not an admin action |
| Button labels | "إرسال العرض," "تأكيد استلام الدفع" | Controlled i18n label |
| Financial labels | "ضريبة القيمة المضافة (15%)," "الإجمالي شامل الضريبة" | Controlled i18n label — **should be treated as protected** (§8) even though currently just i18n |
| Transport labels | "خطوة النقل," "ترتيب النقل" | Controlled i18n label |
| Onboarding labels | Step titles, field hints | Controlled i18n label |
| Material/unit/capability/category names | Displayed from `material_categories`, `unit_options`, `capabilities`, `company_categories`, `company_actions` | **Admin-managed master data** (bilingual columns, already built) |
| City/location | Free text as typed | **No label system at all — raw user input**, the clearest gap |

**No duplicated-label conflicts were found** in this pass (i.e., no case where the same concept has two different, competing hardcoded strings in different files) — the i18n file's single-dictionary structure (WS1) naturally prevents this class of problem, at the cost of the bilingual-data limitation already documented (WS5-B).

## 5. Admin Configurability Assessment

**The Sponsor's question is not "should we build this" — it's already partially built.** Assessment against the requested criteria:

| Criterion | Assessment |
|---|---|
| Flexibility | High for the 5 existing admin-managed tables; zero for i18n-hardcoded UI strings and zero for city/location |
| Reduction in programming intervention | Confirmed real for material/unit/capability/category/action edits — these do not require a deploy today |
| Consistency risk | Low for the existing pattern (bilingual columns force AR+EN to be entered together); would rise if free-text admin editing were allowed without the same bilingual-pair discipline |
| Bilingual parity | The existing pattern **enforces** parity structurally (`name_ar`/`name_en` both `NOT NULL`) — a genuinely good design choice worth replicating everywhere, including for city/location |
| Report stability | Directly addressed by `sustainability_report_field_config`'s `is_system_field` protection — proof this concern was already anticipated and solved once |
| Contract/payment document stability | Not yet addressed anywhere — no equivalent "protected field" concept exists for deal/contract/payment labels |
| Compliance risk | Low today because compliance-sensitive wording (invoice/tax) is simply absent; will need explicit governance the moment "payment request" terminology is introduced |
| Auditability | The `sustainability_report_field_config` table has `created_at`/`updated_at` but no explicit change-history/who-changed-it log found in this pass — a real gap for anything compliance-adjacent |
| Approval workflow need | Not present for any admin-managed table today — edits appear to take effect immediately with no review step |
| Versioning need | Not present — only current-state columns, no history table |
| Rollback need | Not present, follows from the above |

## 6. Master Data Governance Matrix

| Master data | Current state | Admin-configurable? | Approval workflow? | Bilingual? | Affects reports/contracts/compliance? | Risk if free-text | Recommended future owner |
|---|---|---|---|---|---|---|---|
| Materials | `material_categories` (hierarchical, admin-managed) | **Yes, already** | No | Yes | Yes (via `is_sensitive`/license logic) | N/A — already structured | Product/Compliance |
| Cities/regions | **None — free text only** | No | — | No | Yes (appears on every listing/deal/report) | **High — already causing typos (WS2/WS3)** | Product — highest-priority new master-data table |
| Company categories | `company_categories` (admin-managed) | **Yes, already** | No | Yes | Indirect (filtering) | Low — already structured | Product |
| Company roles (MWAN) | `mwan_role` enum (backend, hardcoded) | **No** | N/A (code change) | Yes (i18n) | Yes (role-gating logic, per WS5-A) | N/A — enum, not free text | Engineering (deliberately not admin-editable — see §10 rule D) |
| Activities | `company_actions` (admin-managed) | **Yes, already** | No | Yes | No (explicitly "not eligibility," WS5-B) | Low | Product |
| Capabilities | `capabilities` (admin-managed) | **Yes, already** | No | Yes | Yes (`requires_license` gates real actions) | Medium — a mislabeled capability could confuse users about a real requirement | Product + Compliance (shared) |
| License types/statuses | `license_status` enum (backend, hardcoded) | **No** | Admin sets the value via action, not the option list | Yes (i18n) | Yes — the core authorization gate (WS5-B) | N/A — enum | Engineering (should not be freely admin-editable — see §10 rule D) |
| Transport modes | `transport_mode` enum (`platform`/`self_managed`) | **No** | N/A | Yes (i18n) | Yes (drives which UI/actions show) | N/A — enum | Engineering |
| Payment methods/statuses | Free-text `payment_reference`; `deal_status` enum for lifecycle | Partially — the *value* is free text, the *lifecycle* is a hardcoded enum | N/A | Partial | Yes | Medium (free-text reference has no format governance) | Engineering (statuses) + Product (reference format guidance) |
| Report categories | `sustainability_report_field_config.section` | **Yes, already** | No | Yes (labels) | Yes — directly | Low — already the most governed area | Compliance/Product (shared) |
| Fee types | **Not yet implemented** | To be designed | Recommend yes, with approval step (see §9) | Must be, by design | Yes — directly financial | High if introduced without governance | Finance/Product (shared), with compliance sign-off |

## 7. Status/Enum Governance Review

| Subsystem | Enum | Values | AR/EN aligned? | Documented as a state machine? |
|---|---|---|---|---|
| Waste listing | `waste_listing_status` | open, closed | Yes (i18n) | Not in one central document — reconstructed here and in WS5-A/B |
| Offer | `offer_status` | pending, accepted, rejected, withdrawn | Yes | Same as above |
| Marketplace deal | `deal_status` | active, payment_submitted, payment_confirmed, dispatched, receipt_pending, completed, expired, cancelled *(per WS1/WS5-A mapping)* | Yes | Same as above |
| Contract Lite shipment | `shipment_status` | planned, dispatched, received, closed, cancelled | Not independently confirmed in English UI | Same as above |
| Transport request | `transport_request_status` | pending, accepted, manifest_ready, in_transit, delivered, closed | Not independently confirmed in English UI | Same as above |
| Transport mode | `transport_mode` | platform, self_managed | Yes (i18n strings found in WS5-A) | Same as above |
| Company license | `license_status` | (none)/pending/approved/rejected/expired | Yes | Documented well in-code (`companies.ts` comments) but not user-facing |

**Assessment:** backend values and UI labels are aligned everywhere checked — no mistranslation found. **The real gap is that no single document currently lists all of these state machines together** (this table is, as far as this audit found, the first time they've been assembled in one place) — worth turning into a permanent "Platform State Machines" reference document as a WS9/WS10 deliverable. Some statuses (`receipt_pending`, `manifest_ready`) would likely benefit from clearer user-facing wording, but this needs live/visual confirmation (most of these have not been observed live — transport/shipment/receipt stages remain deferred per TDW-TRANS-001).

## 8. Report/Contract/Payment-Output Protected Labels

**Recommend the following be classified as protected (not freely admin-editable), extending the `is_system_field` pattern already proven in `sustainability_report_field_config`:**

- Financial labels: VAT, subtotal, total, platform fee (once introduced), payment request (once introduced).
- Deal reference / contract reference display format.
- Party names (as recorded on the transaction, not the general company-profile name field).
- Quantities and units on any financial or compliance-facing document.
- Material names *as they appear on a finalized report or deal record* (editing the master-data label going forward is fine; retroactively changing what already-issued documents say is not).
- License/approval status wording.
- Any regulatory/compliance-facing label (MWAN, e-Manifest references).

**Governance rule recommended:** any label in this list should require the same two properties the sustainability config already has — a stable, immutable internal key, and an explicit "system/protected" flag enforced by the API, not just a UI convention.

## 9. Platform Fee and Billing Terminology Recommendations

*(Terminology and governance only — no fee-document design, per hard limits.)*

- **2.5% Tadweerah platform commission (marketplace/deal flow):** recommend introducing as a clearly-labeled, separate line — "رسوم منصة تدويرة" / "Tadweerah Platform Fee" — never merged into the seller's or buyer's own amount fields.
- **Buyer offer/bid amount disclosure:** recommend a one-line, always-visible note near the offer-amount field: "لا يشمل رسوم منصة تدويرة" / "Excludes Tadweerah platform commission" — a copy addition, not a new document design.
- **Separation from seller-buyer transaction:** the existing pattern of showing subtotal/VAT/total as distinct, clearly-labeled rows (already working well per WS4-A/B) is the right visual model to extend for the platform-fee line — same pattern, one more row.
- **Contract flow proposed fee (10 SAR/ton, not final):** recommend storing this as a **configurable rate**, not a hardcoded value, from day one — following the same admin-managed-master-data pattern already used for materials/units/capabilities, so the "not final, should be configurable later" requirement is satisfied by construction rather than needing a later migration.
- **Invoice/tax invoice wording:** confirmed absent today; recommend a standing rule (already stated in CR-001 A6) that "payment request" / "platform fee request" / "fee statement" are the only terms used until ZATCA status is confirmed, and that this rule itself lives in a compliance register (WS8) so it isn't accidentally violated by a future feature addition.

## 10. Recommended Governance Model

**A. Admin-configurable master data (extend the existing, proven pattern):**
- Materials, units, capabilities, company categories, activities — already here.
- **City/location — recommend adding, highest priority**, following the identical bilingual pattern.
- Future fee rates (e.g., the 10 SAR/ton contract fee, once introduced) — recommend building it admin-configurable from the start.

**B. Glossary/i18n-controlled (stays in code, not DB):**
- All UI chrome labels, button text, navigation, tooltips — the current i18n approach is working and shouldn't be fragmented into a database for its own sake.

**C. Governed terminology dictionary (a new, lightweight layer):**
- Recommend a single reference document (not a database table) that lists every *concept* (this review's §2/§3 tables are a first draft of it) with its current AR/EN terms, confidence tag, and validation status — reviewed periodically as new features are added, so terminology drift is caught early rather than discovered live.

**D. Locked/protected — never freely admin-editable:**
- `mwan_role`, `license_status`, `deal_status`, `offer_status`, `shipment_status`, `transport_request_status` enum *option lists* (the set of possible values) — these drive real authorization and workflow logic (WS5-A/B); changing the *option set* should always be a reviewed code change, even though the *display label* for each option can safely live in the glossary layer (B).
- Any field protected under §8 (financial/compliance/reference labels), using the `is_system_field`-style enforcement already proven for sustainability reports.

## 11. Human Validation Required List

- **Saudi market terminology:** company category names, general marketplace language register (formality level, regional phrasing).
- **MWAN/regulatory wording:** "مَوَن," e-Manifest references, any MWAN-role terminology.
- **Industrial-sector wording:** material category names and descriptions, hazard/physical-state terminology.
- **ZATCA/invoice/tax wording:** every future "payment request"/"platform fee" term, before any wording that could be construed as a tax document is introduced.

## 12. Risks if Not Addressed

- Continuing to add new free-text fields (like city) without master data will compound the typo/inconsistency problem already observed, rather than fixing it.
- Introducing platform-fee terminology without the disclosure/separation pattern recommended in §9 risks buyer confusion about what they actually owe — a direct trust and dispute risk.
- Introducing any invoice/tax-adjacent wording before ZATCA confirmation is a compliance risk, not just a terminology risk.
- Without a protected-field concept extended beyond sustainability reports, a well-intentioned future admin edit to a financial or reference label could silently affect already-issued deal records or reports.

## 13. Recommended Future Fixes/Backlog Items (Documented Only — Not Implemented)

1. Add a `cities` (or broader `locations`) admin-managed master-data table, following the exact `material_categories`/`unit_options` pattern (bilingual, active flag, sort order).
2. Extend the `is_system_field`-style protection concept to deal/contract/payment labels (§8).
3. Build the platform-fee/commission fields as configurable master data from day one, not hardcoded constants.
4. Assemble the state-machine table in §7 into a permanent, standalone reference document.
5. Add a lightweight change-history/versioning mechanism to admin-managed master-data tables (currently only `created_at`/`updated_at` exist on the newest table; older ones don't even have that).
6. Establish the "governed terminology dictionary" described in §10-C as a living document.

**No fixes have been made. This is a documentation deliverable only.**

## 14. Mapping to Workstreams

| Finding | WS4 | WS5 | WS8 | WS9 | WS10 | WS11 |
|---|---|---|---|---|---|---|
| Existing admin-managed master-data pattern (positive finding) | — | ✓ primary | — | ✓ (extend it) | ✓ (feeds governance model) | ✓ (Path 1 asset) |
| `sustainability_report_field_config` as a reference implementation | — | ✓ primary | — | ✓ | ✓ primary | ✓ |
| City/location master-data gap | ✓ (symptom) | ✓ primary | — | ✓ primary | ✓ | ✓ |
| Protected/locked field concept extension | — | ✓ | ✓ (compliance-adjacent) | ✓ | ✓ primary | — |
| Platform fee/commission terminology | — | — | — | ✓ | ✓ primary | ✓ (billing direction) |
| Invoice/tax caution | — | — | ✓ primary (compliance register) | — | ✓ | — |
| Terminology market-fit validation needs | — | — | — | — | ✓ primary | — |
| State-machine documentation gap | — | ✓ | — | ✓ | ✓ primary | — |

## 15. Recommendations

1. **Proceed next to WS5-D/WS10.** This review's governance model (§10) is the direct input WS5-D/WS10 needs; nothing here blocks it.
2. **Buyer-responsibility transport exception should continue to wait** — consistent with WS4-A/B's recommendation, and reinforced here: the transport/shipment/receipt state machines (§7) are the least-observed part of the platform, and capturing them alongside WS5-D/WS10's terminology work (rather than in a separate earlier pass) remains the more efficient sequencing.
3. **WS8 should remain after WS5-D/WS10**, unchanged — the compliance-register need identified here (§9, invoice/tax caution) is exactly the kind of input WS8 should receive fully-formed rather than starting before this terminology/governance picture is complete.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This document is read-only source-code and documentation analysis. No new live UI actions, no designs/mockups, no fee-document designs, no code/config changes, no DB access, no admin action, no commits, no deploys, no document deletion.*
