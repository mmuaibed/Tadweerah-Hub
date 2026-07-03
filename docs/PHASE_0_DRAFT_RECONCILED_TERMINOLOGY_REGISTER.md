# Draft Reconciled Terminology Register

**Status: DRAFT — updated 2026-07-03 with Founder Terminology Direction.** This document consolidates terminology proposals from WS5-C, the WS5-C Addendum, WS5-D/WS10, the Antigravity Specialist Terminology & UX Wording Review, and the Codex Technical Trace Review, reconciled by Claude Code. Rows marked **"Founder product terminology direction — approved in principle"** reflect the Founder's 2026-07-03 direction (`PHASE_0_EXTERNAL_AI_REVIEW_RECONCILIATION_LOG.md`, "Founder Terminology Direction — Ratification Record") — **this is a product decision, not regulatory, legal, MWAN, ZATCA, or accounting validation**, and human/domain/legal validation remains required where flagged. Rows still marked "Founder ratification required" or "Proposed" remain open. Items marked "Already ratified" reflect decisions the Founder accepted in a prior closure (cited per row).

---

| Business Concept | Current AR | Current EN | Proposed AR | Proposed EN | Status | Notes |
|---|---|---|---|---|---|---|
| Listing | إعلان | Listing | (no change) | (no change) | Settled — no proposal | — |
| Offer | عرض | Offer | (no change) | (no change) | Settled — no proposal | — |
| Bid | (absent) | (absent) | (keep absent) | (keep absent) | Settled — locked glossary rule | Do not introduce "bid" as a synonym for "offer." |
| Deal | صفقة | Deal | (no change) | (no change) | Settled, pending explainer | Needs a plain-language Deal-vs-Contract explainer (copy-only). |
| Auction (internal) | (never shown) | (never shown) | (keep internal) | (keep internal) | Settled — documented mapping | Internal `sale_type="auction"` maps to UI "receive offers." |
| Receive offers (listing status) | استقبال عروض | receive offers | مفتوح لاستقبال العروض | Open for offers | **Founder product terminology direction — approved in principle** | Safe decision, no validation flag. Split by surface — see next row for the action/module wording. |
| Receive offers (action/module) | استقبال عروض | receive offers | استقبال العروض | Receive offers | **Founder product terminology direction — approved in principle** | Distinct from the listing-status wording above; both approved together, 2026-07-03. |
| Contract / Contract Lite | عقد | Contract | (no change) | (no change) | Settled, pending explainer | Same explainer need as "Deal." |
| Deal Details | تفاصيل الصفقة | Deal Details | (no change) | (no change) | Settled — no proposal | — |
| Payment proof | إثبات (اختياري) | Payment Proof (Optional) | إثبات السداد (مطلوب) | Payment Proof (Required) | **Founder product terminology direction — approved in principle (UX clarity only)** | Founder explicitly rejected "Transfer Proof" as the universal term — "Payment Proof" is broader (payment may later include transfer, reference, receipt, or other proof forms). Wording change should still ship with the Critical label/behavior fix. **Payment/legal/accounting validation required before official invoices, tax language, or real-money rollout.** |
| Payment reference | مرجع الدفع / رقم الحوالة | Payment reference | (no change) | (no change) | Settled, add format hint | Copy-only addition. |
| Payment request | (not built) | (not built) | طلب دفع | Payment Request | **Deferred** | Not yet built; introduce with governance from day one. |
| Invoice / Tax invoice | (absent) | (absent) | (keep absent) | (keep absent) | **Locked — standing rule (CR-001 A6)** | Requires legal/ZATCA validation before ever introducing. |
| Platform fee / Tadweerah commission | (not built) | (not built) | **رسوم منصة تدويرة** | **Tadweerah Platform Fee** | **Already ratified** (WS5-D/WS10 §0, accepted by Founder) | "Tadweerah Commission" retired as a synonym. |
| VAT | ضريبة القيمة المضافة (١٥٪) | VAT (15%) | (no change) | (no change) | Settled — recommend protected-label status | Governance addition, not a wording change. |
| Subtotal | المجموع الفرعي | Subtotal | (no change) | (no change) | Settled — recommend protected-label status | Same as VAT. |
| Total | الإجمالي | Total | الإجمالي (المستحق على المشتري) | Total (Payable by Buyer) | **Proposed — pre-launch requirement** | Must disambiguate from seller's net before any fee launches. |
| Amount Due to Seller | (not built) | (not built) | **صافي مستحقات البائع** | **Amount Due to Seller** | **Already ratified** (WS5-D/WS10 §0, accepted by Founder) | — |
| Transport responsibility | مسؤولية النقل | Transport Responsibility | (no change) | (no change) | Settled — wording correct, data bug open | TDW-TRANS-001 is a data/code fix, not a wording issue. |
| Shipment | (unverified live) | Shipment | شحنة | Shipment | Needs human/live validation | Not yet independently confirmed in live English UI. |
| Dispatch | (unverified live) | Dispatch | إرسال | Dispatch | Needs Claude/Codex reconciliation | Same English word used in two unrelated status enums — clarify if same event. |
| Receipt | (unverified live) | Receipt pending / Received | استلام | Received | Needs Claude/Codex reconciliation | Terminal-state wording diverges between deal and shipment subsystems. |
| Completion | (unverified live) | Completed / Closed | مكتمل | Completed | Needs Claude/Codex reconciliation | Same divergence as above. |
| Generator / Producer / Seller | مولّد نفايات (onboarding) / منتج (marketing) / Seller (marketplace/audit shorthand) | Generator / Producer / Seller | **Contextual: مولّد النفايات (regulatory/onboarding) / البائع (marketplace/transactional)** | **Contextual: Generator (regulatory/onboarding) / Seller (marketplace/transactional)** | **Founder product terminology direction — approved in principle** | Founder explicitly rejected single-term standardization. "Producer" retired as a primary role term (ambiguous with product/material producer). Saudi B2B/domain validation still recommended before large external rollout. |
| Receiver / Processor / Buyer | مستلم نفايات (onboarding) / معالج (marketing) / Buyer (marketplace) | Receiver / Processor / Buyer | **Contextual: مستقبل النفايات (regulatory/onboarding) / المشتري (marketplace/transactional)** | **Contextual: Receiver (regulatory/onboarding) / Buyer (marketplace/transactional)** | **Founder product terminology direction — approved in principle** | Founder explicitly rejected single-term standardization. Processor/Recycler/Factory remain capability/category terms, not role replacements. Note: Arabic "مستقبل النفايات" differs from the "مستلم نفايات" form currently used in onboarding copy — reconciling this is a Path 1 implementation detail. Saudi B2B/domain validation still recommended before large external rollout. |
| Transporter | ناقل مرخّص | Licensed Transporter | (no change) | (no change) | Settled — already consistent | "Licensed" framing itself needs an MWAN check (human validation). |
| Recycler / Processor / Factory | مصنع، شركة تدوير | Factory, Recycling Co. | (admin master data — no wording change) | (admin master data — no wording change) | Settled — governance note only | A 4th classification axis (company category), distinct from role; needs onboarding hierarchy, not a rename. |
| Activities | (admin data) | (admin data) | (no change) | (no change) | Settled — governance note only | Explicitly non-enforcing; needs onboarding hierarchy copy vs. Roles. |
| Roles / MWAN roles | (enum values) | (enum values) | (no change) | (no change) | **Locked — must not be admin-configurable** | Backend-governed by design; needs a plain-language UI explainer. |
| Capabilities | (admin data) | (admin data) | (no change) | (no change) | Settled — governance note only | `requires_license` flag should be protected from casual editing. |
| License status | (enum values) | (enum values) | (no change) | (no change) | Settled — wording fine, behavior needs fix | The word "optional" in onboarding UI is the issue, not the enum. |
| Approved | معتمد | Approved | (no change) | (no change) | Settled — visibility improvement only | Consider a visible approval-status indicator on the company profile. |
| Verified | موثّقة | Verified | تم التحقق من الشركة | **Verified Company** | **Founder product terminology direction — approved in principle** | Resolves the "موثّق" word-collision with generic marketing copy. Usage rule: badge/status use only — never as generic marketing language elsewhere. Still not legal/regulatory certification. |
| City / Location | (free text) | (free text) | (structured master-data list) | (structured master-data list) | **Proposed — Critical priority, data model change** | Not a wording change — requires a new `cities` master-data table. |
| Material | (admin data) | (admin data) | (no change) | (no change) | Settled — already governed | `material_categories`, already admin-managed and bilingual. |
| Quantity | الكمية | Quantity | (no change) | (no change) | Settled — no proposal | — |
| Unit | كجم/طن | kg/ton | (no change) | (no change) | Settled — governance fine, rendering bug open | `PH0-OPEN-UNIT-LABEL-001` — root cause of the Latin-character leak is still unverified. |
| Sustainability report | (governed) | (governed) | (no change) | (no change) | Settled — reference model | Best-governed area in the codebase; extend its pattern elsewhere. |
| Impact report | (unclear) | (unclear) | (unclear) | (unclear) | **Needs human/product validation** | Unclear whether distinct from "Sustainability report." |
| Certificate | (absent) | (absent) | (absent) | (absent) | Settled — not yet implemented | Name appropriately if introduced later. |

---

**How to use this register:** items marked "Settled" require no further decision. Items marked "Proposed" are candidates still awaiting Founder direction. Items marked **"Founder product terminology direction — approved in principle"** reflect the Founder's 2026-07-03 direction and may be treated as current product direction for Path 1 implementation planning — but this is explicitly **not** regulatory/legal/MWAN/ZATCA/accounting validation, and human/domain/legal validation remains required wherever flagged in the Notes column. Items marked "Already ratified" reflect financial-terminology decisions the Founder accepted in the WS5-D/WS10 closure. Phase 0 makes no implementation itself regardless of status.

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001, reconciling `docs/PHASE_0_EXTERNAL_REVIEW_ANTIGRAVITY_SPECIALIST_TERMINOLOGY_UX_REPORT.md` against WS5-C, WS5-C Addendum, and WS5-D/WS10; updated 2026-07-03 with the Founder's Terminology Direction. This is a reconciled Phase 0 artifact reflecting Founder product direction, not regulatory/legal/MWAN/ZATCA/accounting validation. No code/config/DB/admin/commit/deploy actions occurred in its preparation.*
