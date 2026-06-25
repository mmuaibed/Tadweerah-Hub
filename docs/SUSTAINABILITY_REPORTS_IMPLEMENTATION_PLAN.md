# Sustainability Reports — Implementation Plan (Phase SR-1)

> Created: 2026-06-24 | **Updated: 2026-06-25 (v1.2 — Gate 1 / SR-1A.1 Schema Foundation Completed)**
> Phase: SR-1B — Backend Services + APIs + Lifecycle
> Status: ✅ Gate 1 / SR-1A.1 Completed (feat(db): add sustainability reporting schema foundation)
> Source: `docs/SUSTAINABILITY_REPORTS_ENGINEERING_DISCOVERY.md` v2.3
> Canonical repo: `C:\Users\user\Documents\Tadweerah-Hub\Tadweerah-Hub`

> **Scope:** This document is an implementation plan only. No code, migrations, commits, builds, or deployments are included or approved unless separately authorized after review.

---

## Table of Contents

0. [v1.1 Required Changes Addendum](#0-v11-required-changes-addendum)
1. [MVP Scope Confirmation](#1-mvp-scope-confirmation)
2. [Phase Overview](#2-phase-overview)
3. [Phase SR-0: PDF Arabic Rendering Spike](#3-phase-sr-0-pdf-arabic-rendering-spike)
4. [Phase SR-1A: Database Schema + Seeds + Foundation](#4-phase-sr-1a-database-schema--seeds--foundation)
5. [Phase SR-1B: Backend Services + APIs + Lifecycle](#5-phase-sr-1b-backend-services--apis--lifecycle)
6. [Phase SR-1C: Buyer/Processor Allocation UI](#6-phase-sr-1c-buyerprocessor-allocation-ui)
7. [Phase SR-1D: Report View + PDF Export](#7-phase-sr-1d-report-view--pdf-export)
8. [Phase SR-1E: Notifications + Reports Tab + UAT Polish](#8-phase-sr-1e-notifications--reports-tab--uat-polish)
9. [Phase SR-1F: Documentation Update + Closure](#9-phase-sr-1f-documentation-update--closure)
10. [Schema Plan (Planning-Level)](#10-schema-plan-planning-level)
11. [PDF Spike Plan](#11-pdf-spike-plan)
12. [Cross-Transaction Double-Counting Plan](#12-cross-transaction-double-counting-plan)
13. [Open Questions — Blocking vs Non-Blocking](#13-open-questions--blocking-vs-non-blocking)
14. [Risk Register](#14-risk-register)

---

## 0. v1.1 Required Changes Addendum

> [!IMPORTANT]
> The following changes were required by the methodology/product consultant review before implementation can begin. All changes below are binding and supersede the v1.0 plan where they conflict.

### Change Record

| # | Change | Category | Impact |
|---|--------|----------|--------|
| C1 | **Reverse B2:** Cross-transaction double-counting must be structurally enforced, not disclaimer-only | 🔴 Architecture | SR-1A schema, SR-1B eligibility, listings table |
| C2 | **Processed-output flag must not silently default to permissive.** Processor/recycler listings must force explicit declaration | 🔴 Data integrity | Listing creation UI/API |
| C3 | **Update B2 recommended answer** to Option A (structural enforcement) + disclaimer as supporting text | 🟡 Blocking question | §12, §13, §14 |
| C4 | **Tolerance never means silent balancing.** Explicit representation required for any gap | 🟡 Validation | SR-1B, UAT, edge cases |
| C5 | **Protected system fields enforcement.** 13 fields seeded as `is_system_field = true` with enforcement test | 🟡 Data integrity | SR-1A seeds, SR-1E UAT |
| C6 | **Rename "Confidence Level" → "Data Quality"** to reduce greenwashing risk | 🟡 Terminology | Schema, UI, PDF, i18n |
| C7 | **CO₂e placeholder wording:** "Not estimated — pending methodology governance" | 🟢 Label | Report, PDF, i18n |
| C8 | **PDF Arabic spike gate must use real Arabic content** with ligatures and shaping test | 🟡 Quality | SR-0 exit criteria |
| C9 | **Finalized received line definition** and re-weigh/correction behavior: supersede, don't silently overwrite | 🟡 Data integrity | SR-1B, versioning |
| C10 | **Updated gate conditions** with structural enforcement verification per phase | 🟡 Process | Gates 1–5 |

### C1 Detail: Structural Cross-Transaction Enforcement

**Rejected approach:** Option B (disclaimer-only) in MVP.

**Approved approach:** Option A — add `is_processed_output` listing-level flag in MVP.

**Rationale:** The first diversion event of the original generator's waste can receive the Sustainability Impact Report. Downstream resale of processed/recovered output must not generate a duplicate diversion claim for the same physical mass. A disclaimer alone is insufficient — the system must structurally refuse duplicate diversion reporting.

**Implementation:**
- Add `is_processed_output BOOLEAN NOT NULL` to `waste_listings` table (no permissive default — see C2)
- Eligibility query: `WHERE listing.is_processed_output = false`
- Report scope disclaimer remains as supporting text

### C2 Detail: Explicit Declaration for Processor/Recycler Listings

> [!CAUTION]
> Do NOT use `BOOLEAN DEFAULT false` which would silently mark all existing/new listings as "original waste" without user confirmation.

**Approved approach:**
- For listings created by processor/recycler/factory accounts, the creation UI/API must require explicit declaration
- Two-option forced choice:
  - **Original waste/material from generator** — "نفايات/مواد أصلية من المولّد"
  - **Recovered/processed output from previous processing** — "ناتج معالجة/استرداد سابق"
- Arabic prompt: "هل هذه المادة ناتج معالجة/استرداد سابق؟"
- English prompt: "Is this recovered/processed output from previous processing?"
- Existing listings: backfill as `NULL` (unknown); sustainability eligibility requires `is_processed_output = false` (explicitly declared)

### C6 Detail: Confidence Level → Data Quality Rename

**Old terminology:** Confidence Level / مستوى الثقة
**New terminology:** Data Quality / جودة البيانات

**Rationale:** The score reflects evidence completeness and data quality, not independent verification of processor-declared pathways.

**Always shown alongside:**
> "Pathway allocation declared by the receiving party — not independently verified."
> «توزيع المسارات مُصرَّح به من الطرف المستلِم — وغير مُتحقَّق منه بشكل مستقل.»

### C9 Detail: Finalized Received Line Definition

**Definition:** A finalized received line is the post-acceptance confirmed received quantity and unit for a specific material/item line.

**Re-weigh / correction behavior:**
- If quantity is corrected or re-weighed AFTER a report/allocation was generated:
  1. Do NOT silently overwrite the active report
  2. Mark allocation/report as `needs_review` or `superseded`
  3. Require admin review before new allocation becomes active
  4. Preserve the old snapshot/version for traceability
  5. Audit log records the quantity change with before/after values

---

## 1. MVP Scope Confirmation

> [!IMPORTANT]
> The following scope is confirmed per v2.3 approved decisions (§1A D1–D17).

### In Scope (MVP)

| # | Item | Discovery Ref |
|---|------|---------------|
| 1 | `sustainability_received_lines` table — canonical allocation subject | §1A D1, §9.1 |
| 2 | Auto-derive one received line per completed single-material deal/shipment | §1A D2, §5.10 |
| 3 | `sustainability_pathways` taxonomy (10 pathways, seeded) | §7.5, §9.1 |
| 4 | `sustainability_allocations` linked to `received_line_id` FK | §9.1 |
| 5 | `sustainability_allocation_lines` (pathway breakdown per allocation) | §9.1 |
| 6 | Draft → submit → finalize lifecycle | §7.1 |
| 7 | Post-finalization changes: reason + audit + admin approval | §7.7 |
| 8 | 100% line reconciliation (within tolerance) | §7.2, §7.3 |
| 9 | No silent balancing — gaps must be residue/loss/other with explanation | §7.2 |
| 10 | **Data Quality** tiers (high/medium/low scoring) — renamed from "Confidence Level" per C6 | §15 |
| 11 | Value recovered where confirmed (optional field) | §7.6 |
| 12 | CO₂e placeholder only — no calculation or display | §1A D8, §17 |
| 13 | Thin field registry (`sustainability_report_field_config`) | §1A D10, §10A |
| 14 | One fixed generator-facing Sustainability Impact Report layout | §12.1 |
| 15 | Professional branded PDF with Arabic rendering (spike required) | §1A D9 |
| 16 | Provenance legend on ALL rates (diversion, energy, disposal, residue) | §1A D6 |
| 17 | Disclaimer (standard + cross-transaction scope) | §16, §1A D5 |
| 18 | Report number/version (`TDW-SIR-YYYY-NNNN`) | §13 |
| 19 | Tadweerah branding + buyer/processor logo where available | §16.4 |
| 20 | Notifications (in-app) | §11.3 |
| 21 | Reports tab split: **Operational | Sustainability** | §12.2 |
| 22 | Cross-transaction double-counting — **structural enforcement via `is_processed_output` flag** (C1) | §1A D5, §6.5 |
| 23 | Non-configurable system fields enforced — **13 protected fields per C5** | §1A D7 |
| 24 | MVP snapshotting (qty, allocations, versions, disclaimer) | §1A D8 |
| 25 | Listing-level `is_processed_output` flag with forced explicit declaration (C1, C2) | v1.1 C1/C2 |
| 26 | Finalized received line definition with re-weigh supersede behavior (C9) | v1.1 C9 |

### Out of Scope (Confirmed Deferred)

| Item | Deferred To |
|------|------------|
| Admin config UI (show/hide/reorder/relabel) | Phase 2 |
| Report profiles / saved views | Phase 2 |
| Excel export with methodology sheet | Phase 2 |
| Per-role column visibility | Phase 2 |
| Multi-material entry + multi-line allocation UI | Phase 2 |
| CO₂e estimation and factor governance | Phase 2 |
| Customer-facing methodology page | Phase 2 |
| Customer period summaries | Phase 2 |
| Advanced snapshotting (presentation labels) | Phase 2 |
| QR verification | Phase 3 |
| Third-party verifier workflow | Phase 3 |
| Scope 3 emission feed | Phase 3 |
| GRI 306 structured export | Phase 3 |
| Advanced ESG dashboards | Phase 3 |

---

## 2. Phase Overview

```
Phase SR-0 ──→ SR-1A ──→ SR-1B ──→ SR-1C ──→ SR-1D ──→ SR-1E ──→ SR-1F
  (~2 days)    (~3 days)   (~5 days)   (~5 days)   (~5 days)   (~3 days)   (~1 day)
  PDF Spike    Schema      Backend     Buyer UI    Report+PDF  Polish      Docs
```

| Phase | Name | Duration | Dependencies | Approval Gate |
|-------|------|----------|-------------|---------------|
| SR-0 | PDF Arabic Rendering Spike | ~2 days | None | ✅ Gate 0: PDF approach decision |
| SR-1A | Database Schema + Seeds + Foundation | ~3 days | SR-0 decision (can start in parallel) | ✅ Gate 1: Schema review (Completed - Commit: `feat(db): add sustainability reporting schema foundation`) |
| SR-1B | Backend Services + APIs + Lifecycle | ~5 days | SR-1A complete | ✅ Gate 2: API review |
| SR-1C | Buyer/Processor Allocation UI | ~5 days | SR-1B complete | ✅ Gate 3: UI review |
| SR-1D | Report View + PDF Export | ~5 days | SR-1C + SR-0 complete | ✅ Gate 4: Report+PDF review |
| SR-1E | Notifications + Reports Tab + UAT Polish | ~3 days | SR-1D complete | ✅ Gate 5: UAT sign-off |
| SR-1F | Documentation Update + Closure | ~1 day | SR-1E complete | ✅ Final sign-off |

**Total estimated duration:** ~4–5 weeks (with SR-0 running in parallel with SR-1A)

---

## 3. Phase SR-0: PDF Arabic Rendering Spike

### Objective
Determine the best PDF generation approach for professional bilingual Arabic/English sustainability reports before committing to an implementation strategy.

### Exact Scope
- Create a standalone test page simulating a sustainability report
- Test both browser `window.print()` + `@media print` CSS AND server-side HTML→PDF (Puppeteer/headless Chromium)
- Evaluate Arabic RTL rendering, table layout, page breaks, and branding quality
- Produce a recommendation with evidence

### Out of Scope
- Real data integration
- API endpoints
- Database changes
- Production deployment

### Files Likely Affected

| File | Location | Purpose |
|------|----------|---------|
| `pdf-spike.html` | `artifacts/tadweerah/src/pages/dev/` (or scratch) | Static test page |
| `pdf-spike-print.css` | same location | Print stylesheet |
| `pdf-spike-server.ts` | `artifacts/api-server/src/` (or scratch) | Puppeteer test script (if testing server-side) |

### Test Content Requirements

The spike PDF must contain ALL of the following:

```
┌─────────────────────────────────────────────────┐
│ [Tadweerah Logo]                                │
│                                                 │
│ تقرير أثر الاستدامة                             │
│ Sustainability Impact Report                     │
│                                                 │
│ Report No: TDW-SIR-2026-0001                    │
│ Report Date: 2026-07-15                         │
│ ─────────────────────────────────────            │
│ Transaction Details (bilingual table)            │
│ ─────────────────────────────────────            │
│ | Reference   | مرجع المعاملة    |              │
│ | Buyer       | شركة إعادة التدوير الحديثة |     │
│ | Seller      | مصنع الأفق الصناعي        |     │
│ | Material    | بلاستيك مختلط مستعمل      |     │
│ | Quantity    | ٥٠٠ طن                    |     │
│ ─────────────────────────────────────            │
│ Pathway Allocation (bilingual table)             │
│ ─────────────────────────────────────            │
│ | Pathway | المسار | Qty | % |                  │
│ | Recycling | إعادة التدوير | 350 | 70% |        │
│ | Energy Recovery | استرداد الطاقة | 100 | 20% | │
│ | Residue | فاقد | 50 | 10% |                    │
│ ─────────────────────────────────────            │
│ Metrics Summary                                  │
│ ─────────────────────────────────────            │
│ Circular Diversion Rate: 70%                     │
│ نسبة التحويل الدائري: ٧٠٪                       │
│ ─────────────────────────────────────            │
│ [PAGE BREAK]                                     │
│ ─────────────────────────────────────            │
│ Disclaimer (bilingual, long text)                │
│ ─────────────────────────────────────            │
│ Cross-Transaction Scope Statement (bilingual)    │
│ ─────────────────────────────────────            │
│ Methodology Footer                               │
│ ─────────────────────────────────────            │
│ تدويرة | كل قيمة تستحق أن تعود                  │
│ Tadweerah | Every value deserves to return       │
│ Generated via tadweerah.com                      │
└─────────────────────────────────────────────────┘
```

### Evaluation Criteria (v1.1 — Arabic-Specific Gate per C8)

> [!WARNING]
> The spike must test with **real Arabic content** including ligatures, shaping, and long labels. Placeholder Latin text is not acceptable for evaluation.

| Criterion | Pass/Fail | Arabic-Specific |
|-----------|----------|----------------|
| Arabic text renders correctly (not boxes/garbled) | Required | Must use real Arabic company names with ligatures |
| RTL shaping and ligatures render correctly (e.g., لا، لل، بسم) | Required | Test connected vs isolated letter forms |
| RTL layout is correct (right-aligned paragraphs) | Required | |
| Bilingual tables align properly | Required | Mixed Arabic/English cells in same row |
| Page breaks between sections work | Required | |
| Logo renders at correct size and position | Required | Both Tadweerah + buyer placeholder |
| Long Arabic labels don't overflow table cells | Required | Test: "مسار المعالجة أو الاستفادة" in table header |
| Full disclaimer renders complete and readable | Required | Real cross-transaction + standard disclaimer text |
| Cross-transaction scope statement renders correctly | Required | Full bilingual text per §16.5 |
| Data Quality badge renders correctly | Required | Score + Arabic label "جودة البيانات" |
| CO₂e placeholder shows correct wording | Required | "غير مُقدَر — بانتظار اعتماد المنهجية" |
| Footer appears on every page | Nice-to-have | |
| Professional appearance (spacing, fonts, colors) | Required | |

**Mandatory Arabic test content (must be in spike):**
- Real company name: "شركة إعادة التدوير الحديثة"
- Real material name: "بلاستيك مختلط مستعمل"
- Real pathway labels: "إعادة التدوير"، "استرداد الطاقة / وقود بديل"، "فاقد ومخلفات ومرفوضات"
- Full disclaimer text from §16.1 and §16.5
- Methodology footer from §16.3
- Numbers in Arabic-Indic: ٥٠٠ طن، ٧٠٪

### Decision Gate (v1.1 — updated per C8)

| Outcome | Recommendation |
|---------|---------------|
| Browser print passes ALL required criteria **including Arabic ligatures/shaping** | ✅ Use browser `window.print()` for MVP |
| Browser print fails any Arabic-specific criterion | ⚠️ Use Puppeteer/headless Chromium server-side |
| Both approaches fail Arabic rendering | 🔴 Escalate — evaluate React-PDF or alternative |

> [!WARNING]
> **Bias toward server-side** (headless Chromium) if browser print output is inconsistent across browsers or shows any Arabic rendering artifacts.

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Arabic font not available in print context | 🟡 Medium | Embed Arabic web font (e.g., Noto Sans Arabic) via `@font-face` |
| Page break inconsistencies | 🟡 Medium | Test with `break-before: page` and `break-inside: avoid` |
| Puppeteer adds Node.js dependency to API server | 🟢 Low | Already Node.js environment; Puppeteer is well-supported |
| Server-side PDF takes too long | 🟢 Low | Reports are low-frequency; 5–10 second generation is acceptable |

### Manual UAT Steps
1. Open spike test page in Chrome, Firefox, Safari
2. Print to PDF using browser print dialog
3. If testing server-side: call test endpoint and download generated PDF
4. Verify all evaluation criteria
5. Compare quality side-by-side
6. Document results with screenshots

### Approval Checkpoint (v1.1 — updated per C8, C10)
**Gate 0:** Share PDF spike results with CTO. Must pass ALL Arabic-specific criteria. Approve one approach before SR-1D begins.

**Gate 0 exit conditions:**
- [ ] Real Arabic company/material names render with correct ligatures
- [ ] Cross-transaction disclaimer renders complete in Arabic
- [ ] Data Quality badge shows "جودة البيانات" (not "مستوى الثقة")
- [ ] CO₂e placeholder shows "غير مُقدَر — بانتظار اعتماد المنهجية"
- [ ] Page breaks work between content and disclaimer
- [ ] Side-by-side comparison documented with screenshots

---

## 4. Phase SR-1A: Database Schema + Seeds + Foundation

### Objective
Create the database foundation: 5 new tables, seed pathway data, create thin field registry entries, and implement auto-derivation logic for received lines.

### Exact Scope
- Define 5 Drizzle schema files (sustainability tables)
- Add `is_processed_output` column to existing `waste_listings` table (C1, C2)
- Generate Drizzle migration (sustainability tables + listings column)
- Seed `sustainability_pathways` with 10 GRI-aligned pathways
- Seed `sustainability_report_field_config` with MVP thin field registry (**13 protected system fields per C5**)
- Implement auto-derivation of `sustainability_received_lines` on deal completion / shipment close
- Export all new tables from `lib/db/src/schema/index.ts`
- Rename all "Confidence Level" references to "Data Quality" (C6)
- Set CO₂e placeholder wording to approved text (C7)

### Out of Scope
- API endpoints (SR-1B)
- Frontend components (SR-1C)
- Report generation (SR-1D)
- Notifications (SR-1E)

### Database Changes

#### New Schema Files

| File | Table | Columns | Notes |
|------|-------|---------|-------|
| `sustainability-pathways.ts` | `sustainability_pathways` | 11 columns | Admin-managed lookup |
| `sustainability-received-lines.ts` | `sustainability_received_lines` | 19 columns | Canonical allocation subject ⭐ |
| `sustainability-allocations.ts` | `sustainability_allocations` | 28 columns | One active version per received line |
| `sustainability-allocation-lines.ts` | `sustainability_allocation_lines` | 9 columns | Pathway breakdown per allocation |
| `sustainability-report-field-config.ts` | `sustainability_report_field_config` | 15 columns | Thin field registry (MVP subset) |

See [§10 Schema Plan](#10-schema-plan-planning-level) for full column specifications.

#### Migration
- One Drizzle migration file auto-generated via `npx drizzle-kit generate`
- Creates all 5 tables, indexes, and constraints in a single migration

#### Seed Data

**Pathways (10 records):**

| Key | English | Arabic | Category | GRI | Hierarchy |
|-----|---------|--------|----------|-----|-----------|
| `reuse` | Reuse | إعادة الاستخدام | circular | 306-4 | 2 |
| `repair_refurbishment` | Repair / Refurbishment | إصلاح وتجديد | circular | 306-4 | 2 |
| `remanufacturing` | Remanufacturing | إعادة التصنيع | circular | 306-4 | 3 |
| `recycling` | Recycling | إعادة التدوير | circular | 306-4 | 3 |
| `material_recovery` | Material Recovery | استرداد المواد | circular | 306-4 | 4 |
| `energy_recovery` | Energy Recovery / Alt. Fuel | استرداد الطاقة / وقود بديل | energy_recovery | 306-5 | 4 |
| `safe_treatment` | Safe Treatment | معالجة آمنة | disposal | 306-5 | 5 |
| `certified_disposal` | Certified Disposal | تخلص معتمد | disposal | 306-5 | 5 |
| `residue_loss` | Residue / Loss / Rejected | فاقد ومخلفات ومرفوضات | residue | 306-5 | 5 |
| `other` | Other (with explanation) | أخرى (مع توضيح) | configurable | — | — |

**Thin Field Registry (MVP — ~7 records):**

| field_key | label_en | label_ar | provenance_layer | methodology_governed | show_in_pdf |
|-----------|----------|----------|-----------------|---------------------|-------------|
| `pathway` | Processing/Recovery Pathway | مسار المعالجة أو الاستفادة | declared_by_processor | true | true |
| `quantity` | Quantity | الكمية | declared_by_processor | true | true |
| `percentage` | Percentage | النسبة | system_calculated | true | true |
| `evidence_url` | Evidence | الإثبات | declared_by_processor | false | false |
| `notes` | Notes | ملاحظات | declared_by_processor | false | false |
| `circular_diversion_rate` | Circular Diversion Rate | نسبة التحويل الدائري | system_calculated | true | true |
| `energy_recovery_rate` | Energy Recovery Rate | نسبة استرداد الطاقة | system_calculated | true | true |
| `disposal_rate` | Disposal / Treatment Rate | نسبة المعالجة والتخلص | system_calculated | true | true |
| `residue_rate` | Residue / Loss Rate | نسبة الفاقد والمخلفات | system_calculated | true | true |
| `value_recovered` | Value Recovered | القيمة المستردة | declared_by_processor | false | true |
| `confidence_level` | Confidence Level | مستوى الثقة | system_calculated | true | true |

renamed to:

| `data_quality` | Data Quality | جودة البيانات | system_calculated | true | true |

| `disclaimer` | Disclaimer | إخلاء المسؤولية | system | true | true |
| `cross_transaction_scope` | Scope Statement | نطاق التقرير | system | true | true |
| `methodology_footer` | Methodology Reference | مرجع المنهجية | system | true | true |
| `provenance_legend` | Data Provenance | مصادر البيانات | system | true | true |
| `co2e_placeholder` | CO₂e Status | حالة CO₂e | system | true | true |
| `declared_by_processor_label` | Declared by Processor | مُصرَّح من المعالج | system | true | true |
| `not_verified_label` | Not Independently Verified | غير مُتحقَّق منه بشكل مستقل | system | true | true |
| `estimated_label` | Estimated / Not Estimated | تقديري / غير مُقدَّر | system | true | true |

**Protected System Fields (C5 — seeded with `is_system_field = true`, cannot be hidden/removed):**

| # | field_key | Description |
|---|-----------|-------------|
| 1 | `disclaimer` | Standard report disclaimer |
| 2 | `cross_transaction_scope` | Cross-transaction scope statement |
| 3 | `provenance_legend` | Data provenance legend |
| 4 | `declared_by_processor_label` | "Declared by processor" label |
| 5 | `not_verified_label` | "Not independently verified" label |
| 6 | `data_quality` | Data Quality badge (was Confidence Level) |
| 7 | `energy_recovery_rate` | Energy recovery line (when present) |
| 8 | `disposal_rate` | Disposal/residue rate line |
| 9 | `residue_rate` | Residue/loss rate line |
| 10 | `estimated_label` | "Estimated"/"Not estimated" labels |
| 11 | `circular_diversion_rate` | Circular diversion calculation definition |
| 12 | `methodology_footer` | Methodology reference footer |
| 13 | `co2e_placeholder` | CO₂e placeholder label ("Not estimated — pending methodology governance") |

### Backend Changes

**Auto-derivation service (new file):**

| Function | Trigger | Logic |
|----------|---------|-------|
| `deriveReceivedLineForDeal(dealId)` | Deal status → `completed` | Create one received line from `deals.actual_quantity` / `estimated_amount` |
| `deriveReceivedLineForShipment(shipmentId)` | Shipment status → `closed` | Create one received line from `contract_shipments.final_weight` |
| `batchDeriveForHistorical(filters)` | Admin batch trigger | Query all completed deals/closed shipments without received lines |

**Integration point:** Hook into existing deal completion and shipment close flows (event-based or post-update hook).

### Files Likely Affected

| File | Location | Change Type |
|------|----------|-------------|
| `sustainability-pathways.ts` | `lib/db/src/schema/` | NEW |
| `sustainability-received-lines.ts` | `lib/db/src/schema/` | NEW |
| `sustainability-allocations.ts` | `lib/db/src/schema/` | NEW |
| `sustainability-allocation-lines.ts` | `lib/db/src/schema/` | NEW |
| `sustainability-report-field-config.ts` | `lib/db/src/schema/` | NEW |
| `waste-listings.ts` | `lib/db/src/schema/` | MODIFY — add `is_processed_output` column (C1) |
| `index.ts` | `lib/db/src/schema/` | MODIFY — export new tables |
| Migration file | `lib/db/drizzle/` | NEW — auto-generated |
| `seed-sustainability.ts` | `lib/db/src/` or `scripts/` | NEW — seed pathways + field config |
| `sustainability-received-lines-service.ts` | `artifacts/api-server/src/services/` | NEW — derivation logic |
| Deal completion handler | `artifacts/api-server/src/routes/` | MODIFY — add derivation hook |
| Shipment close handler | `artifacts/api-server/src/routes/` | MODIFY — add derivation hook |

### i18n Labels (SR-1A)
None in this phase — i18n is added in SR-1C when UI is built.

### Tests / Typecheck / Build

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript compilation | `npx tsc --noEmit` across affected packages | No errors |
| Schema generation | (Local only - do not commit output) | N/A |
| Migration apply | Run manual incremental SQL review script | Tables created in DB |
| Seed script | `npm run seed:sustainability` (Run only after schema applied) | 10 pathways + 15 field configs inserted |
| Auto-derivation test | Manual: complete a test deal → verify received line created | Line exists in DB |

### Manual UAT Steps
1. Apply the manual incremental SQL script (`sustainability_schema_incremental_review.sql`) to local/staging DB
2. Verify all 5 sustainability tables exist with correct columns
3. Verify `waste_listings.is_processed_output` column exists (nullable for existing records)
4. Verify 10 pathways seeded with correct data
5. Verify field config seeded — **verify `data_quality` (not `confidence_level`)**
6. Verify 13 protected system fields have `is_system_field = true`
7. Complete a test deal → verify `sustainability_received_lines` record auto-created
8. Close a test shipment → verify received line auto-created
9. Verify indexes exist
10. Verify CO₂e placeholder field has label "Not estimated — pending methodology governance" / "غير مُقدَّر — بانتظار اعتماد المنهجية"

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Deal/shipment completion hooks don't exist cleanly | 🟡 Medium | Wrap in try-catch; derivation failure should not block parent operation |
| Historical deals/shipments have inconsistent data | 🟡 Medium | Batch derivation skips records with `qty = 0` or `NULL`; mark as `not_eligible` |
| Drizzle migration conflicts with pending migrations | 🟢 Low | Coordinate — no other schema work should be in flight |
| Adding column to `waste_listings` (C1) | 🟡 Medium | Nullable column; backfill existing as NULL; sustainability eligibility requires explicit `false` |

### Approval Checkpoint (v1.2 — Gate 1 Closed)
**Gate 1:** CTO reviews schema file structure and seed data before proceeding to SR-1B. (Completed)

**Gate 1 exit conditions:**
- [x] Processed-output structural flag/gate exists on `waste_listings` table
- [x] Existing listings backfilled as `NULL` (unknown), not `false`
- [x] 13 protected system field seeds defined with `is_system_field = true`
- [x] "Data Quality" label replaces "Confidence Level" everywhere
- [x] CO₂e placeholder wording: "Not estimated — pending methodology governance"
- [ ] Auto-derivation tested for deal completion and shipment close (Deferred to SIR-1A.2)

**Gate 1 Closure Record (2026-06-25):**
- **Status:** Completed & Approved.
- **Commit Reference:** `feat(db): add sustainability reporting schema foundation`
- **Scope:** SR-1A.1 implemented the schema foundation only. Auto-derivation hooks and functionality are deferred to a separate later phase: SIR-1A.2.
- **Tables Added:**
  - `sustainability_pathways`
  - `sustainability_received_lines` (multi-line-ready)
  - `sustainability_allocations`
  - `sustainability_allocation_lines`
  - `sustainability_report_field_config`
  - `sustainability_reports` (parent-level sustainability reports, requiring `parent_entity_type` + `parent_entity_id`)
- **Schema Updates:** Added `is_processed_output` to `waste_listings` (without default value, backfilling existing rows as `NULL`).
- **Seeds Added:** GRI-aligned pathways, thin report field config registry including 13 protected system fields.
- **Auto-derivation:** The schemas are fully prepared to support auto-derivation sourced from `deals.actual_quantity` (completed deals) and `contract_shipments.final_weight` (closed contract shipments), but the actual implementation of auto-derivation hooks and logic is deferred to SIR-1A.2.
- **Exclusion & Hook Confirmation:** Verified and confirmed that **no operational/financial reports, routes, or hooks were touched or modified** in this phase.
- **Migration & Deploy Policy:**
  - **No DB push or migration was applied to staging/production.**
  - Drizzle baseline migration generation locally (`drizzle-kit generate`) produced a full initialization snapshot (since the repository previously relied on `drizzle-kit push`), which was intentionally deleted/not committed to keep the git history clean.
  - The database application/migration strategy is held for a separate approved phase before staging/production. No direct DB push has been run.

**SIR-1A.2a Patch Record (2026-06-25):**
- **Status:** Completed & Approved.
- **Commit Reference:** `feat(db): add contract material sustainability eligibility flag`
- **Schema Updates:** Added `is_processed_output` to `contract_materials` (without default value, nullable) to structurally mirror the `waste_listings` flag, because contracts are independent of listings.
- **Auto-derivation Update:** Contract shipment auto-derivation must NOT assume eligibility; it must check `contract_materials.is_processed_output === false`. Auto-derivation hooks remain un-implemented.
- **DB Apply Update:** DB apply is still NOT executed. A manual incremental SQL script (`docs/db-apply/sustainability_schema_incremental_review.sql`) has been authored for review-only until separately approved. No direct `drizzle-kit push` has been run.

**SIR-1A.2a Staging DB Apply Record (2026-06-25):**
- **Status:** Staging Apply Completed & Verified.
- **Execution:** The DB owner manually applied the reviewed incremental SQL script and executed the `seed:sustainability` script against the Staging Database.
- **Verification:** Preflight checks passed (including `gen_random_uuid()`). All 6 new sustainability tables exist. Both `waste_listings` and `contract_materials` have the `is_processed_output` boolean column.
- **Seed Verification:** 10 pathways seeded successfully (`other` and `energy_recovery` are correctly marked non-circular). 13 protected system fields seeded successfully (including `co2e_placeholder`).
- **Safety Validations:** A Cloud SQL staging backup was taken before apply. No `drizzle-kit push` was run. The production DB was untouched. No operational data was altered.
- **Next Phase Eligibility:** SIR-1A.2b (Auto-Derivation Hooks) is now unblocked and eligible to start as a separate approved phase.

---

## 5. Phase SR-1B: Backend Services + APIs + Lifecycle

### Objective
Build all sustainability API endpoints, allocation lifecycle management (draft/finalize/revise), gap reconciliation validation, confidence scoring, and audit log integration.

### Exact Scope
- Create `routes/sustainability.ts` Express router
- Implement buyer/processor endpoints (9 routes)
- Implement seller endpoints (1 route)
- Implement admin endpoints (8 routes)
- Implement lookup/config endpoints (7 routes)
- Implement allocation lifecycle state machine
- Implement gap reconciliation validation
- Implement confidence scoring
- Implement audit log entries
- Implement cross-transaction eligibility check

### Out of Scope
- Frontend pages (SR-1C)
- PDF generation (SR-1D)
- Notifications (SR-1E)
- Admin batch UI (SR-1E)

### API Endpoints

#### Buyer/Processor Routes (`/sustainability/*`)

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | `GET` | `/sustainability/eligible` | List eligible entities with allocation status |
| 2 | `GET` | `/sustainability/allocations` | Company's allocations (all statuses) |
| 3 | `GET` | `/sustainability/allocations/:id` | Single allocation with lines + version history |
| 4 | `POST` | `/sustainability/allocations` | Create new allocation (status = `draft`) |
| 5 | `PUT` | `/sustainability/allocations/:id` | Update draft allocation (only `status = 'draft'`) |
| 6 | `POST` | `/sustainability/allocations/:id/finalize` | Finalize (validates 100% reconciliation) |
| 7 | `POST` | `/sustainability/allocations/:id/request-revision` | Post-finalization edit (new version, requires `revision_reason`) |
| 8 | `GET` | `/sustainability/report` | Generate report (finalized/approved only) |
| 9 | `GET` | `/sustainability/report/export` | Export CSV |

#### Seller Route

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 10 | `GET` | `/sustainability/seller-reports` | Reports where company is seller |

#### Admin Routes (`/admin/sustainability/*`)

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 11 | `GET` | `/admin/sustainability/allocations` | Platform-wide allocations |
| 12 | `GET` | `/admin/sustainability/eligible` | Platform-wide eligible entities |
| 13 | `POST` | `/admin/sustainability/batch-create` | Batch-create pending allocations |
| 14 | `POST` | `/admin/sustainability/allocations/:id/review` | Admin review (approve/reject) |
| 15 | `POST` | `/admin/sustainability/allocations/:id/approve-revision` | Approve/reject revision |
| 16 | `POST` | `/admin/sustainability/allocations/:id/override` | Admin override (new version with audit) |
| 17 | `GET` | `/admin/sustainability/report` | Platform-wide report |
| 18 | `GET` | `/admin/sustainability/report/export` | Platform-wide CSV |

#### Lookup & Config Routes

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 19 | `GET` | `/sustainability/pathways` | Active pathways |
| 20 | `GET` | `/sustainability/field-config` | Active field config |
| 21 | `GET` | `/admin/sustainability/pathways` | All pathways (including inactive) |
| 22 | `POST` | `/admin/sustainability/pathways` | Create pathway |
| 23 | `PATCH` | `/admin/sustainability/pathways/:id` | Update pathway |
| 24 | `GET` | `/admin/sustainability/field-config` | All field configs |
| 25 | `PATCH` | `/admin/sustainability/field-config/:id` | Update field config |

### Core Business Logic

#### Eligibility Query (with structural cross-transaction exclusion — v1.1 C1)

> [!CAUTION]
> The eligibility query must **structurally exclude** listings where `is_processed_output = true` or `is_processed_output IS NULL` (unknown). Only listings explicitly declared as original waste (`is_processed_output = false`) are eligible.

```
SELECT deals WHERE:
  status = 'completed'
  AND (actual_quantity > 0 OR estimated_amount > 0)
  AND listing.is_processed_output = false   -- structural gate (C1)
  LEFT JOIN sustainability_received_lines (to show allocation status)
  LEFT JOIN sustainability_allocations (to show lifecycle state)

UNION

SELECT contract_shipments WHERE:
  status = 'closed'
  AND final_weight > 0
  AND contract.listing.is_processed_output = false  -- structural gate (C1)
  LEFT JOIN sustainability_received_lines
  LEFT JOIN sustainability_allocations
```

**Excluded records show:**
- `is_processed_output = true`: "Not eligible — processed output" / "غير مؤهل — ناتج معالجة"
- `is_processed_output IS NULL`: "Pending classification" / "بانتظار التصنيف"

#### Allocation Lifecycle State Machine

```
pending_allocation → draft (buyer creates first draft)
draft → draft (buyer updates)
draft → finalized (buyer submits, validation passes)
finalized → approved (admin reviews, if enabled)
finalized → pending_revision_approval (buyer requests edit)
approved → pending_revision_approval (buyer requests edit)
pending_revision_approval → approved (admin approves revision)
pending_revision_approval → rejected (admin rejects revision)
rejected → draft (buyer revises)
```

**State transition validation:**
- Each transition must verify current status before allowing change
- Invalid transitions return `400 Bad Request` with descriptive error
- Every transition writes an audit log entry

#### Gap Reconciliation Validation (on `/finalize`) — v1.1 C4: No Silent Balancing

> [!CAUTION]
> **Tolerance NEVER means silent balancing.** Any difference between allocated quantity and final received quantity must be explicitly represented. The system must NEVER auto-fill, hide, or silently balance a gap.

```
total_allocated = SUM(all pathway_lines.quantity)
final_received = received_line.final_received_qty
gap = final_received - total_allocated
tolerance = final_received × (allocation_tolerance_pct / 100)  // default 2%

IF abs(gap) > tolerance:
    → 400 Bad Request:
      EN: "Allocated total X differs from received quantity Y by Z.
           Please allocate the remaining W to a pathway (e.g., residue/loss/other).
           The system does not automatically balance gaps."
      AR: "إجمالي الموزع X يختلف عن الكمية المستلمة Y بمقدار Z.
           يرجى توزيع المتبقي W على مسار مناسب (مثلاً: فاقد/مخلفات/أخرى).
           النظام لا يوازن الفجوات تلقائياً."

IF abs(gap) <= tolerance AND gap != 0:
    → 200: Accept. Record allocation_variance_pct.
      Response includes: "Minor variance of V% accepted within tolerance.
      This variance is recorded and visible on the report.
      No quantities were silently added or removed."

IF gap == 0:
    → 200: Exact match.
```

**Explicit validation rules (C4):**
- The API must never auto-create a residue/loss line to balance a gap
- The API must never round quantities to force an exact match
- The API must never hide a variance from the report
- Any accepted variance (within tolerance) must be recorded in `allocation_variance_pct` and displayed in the report
- The error message must explicitly state that the system does not auto-balance

#### Data Quality Scoring (v1.1 C6 — renamed from "Confidence Scoring")

> [!NOTE]
> Renamed from "Confidence Level" to "Data Quality" per C6. The score reflects evidence completeness and data quality, not independent verification of processor-declared pathways.
> Always displayed alongside: "Pathway allocation declared by the receiving party — not independently verified."

| Factor | Points | Condition |
|--------|--------|-----------|
| Confirmed quantity | +30 | `quantity_source = 'confirmed'` |
| Estimated quantity | +10 | `quantity_source = 'estimated'` |
| Weighbridge ticket | +20 | `has_weighbridge_ticket = true` |
| Payment proof | +10 | `has_payment_proof = true` |
| Dispatch evidence | +10 | `has_dispatch_evidence = true` |
| Receipt confirmed | +10 | `received_at` set |
| Variance ≤ 1% | +10 | `allocation_variance_pct <= 1.0` |
| Variance ≤ 2% | +5 | `allocation_variance_pct <= 2.0` |
| Multiple pathways | +5 | ≥ 2 pathway lines |
| Buyer capability match | +5 | Company capabilities check |

**Thresholds:** 80–100 = high (🟢), 50–79 = medium (🟡), 0–49 = low (🔴)

**Column names:** `data_quality_level` (not `confidence_level`), `data_quality_reason` (not `confidence_reason`)

#### Audit Log Entries

| Action | Entity Type | Details |
|--------|-------------|---------|
| `sustainability.allocation_draft_saved` | `sustainability_allocation` | pathway_count, total_qty, status |
| `sustainability.allocation_finalized` | `sustainability_allocation` | version, variance_pct |
| `sustainability.allocation_updated` | `sustainability_allocation` | changed_fields, previous_values |
| `sustainability.allocation_reviewed` | `sustainability_allocation` | decision, notes |
| `sustainability.revision_requested` | `sustainability_allocation` | version, revision_reason |
| `sustainability.revision_approved` | `sustainability_allocation` | version, approver |
| `sustainability.revision_rejected` | `sustainability_allocation` | version, rejection_reason |
| `sustainability.allocation_superseded` | `sustainability_allocation` | old_version, new_version |
| `sustainability.batch_pending_created` | `sustainability_allocation` | count, company_id |
| `sustainability.report_generated` | `sustainability_report` | scope, coverage_pct |

### Files Likely Affected

| File | Location | Change Type |
|------|----------|-------------|
| `sustainability.ts` | `artifacts/api-server/src/routes/` | NEW — main router |
| `sustainability-admin.ts` | `artifacts/api-server/src/routes/` | NEW — admin routes |
| `sustainability-service.ts` | `artifacts/api-server/src/services/` | NEW — business logic |
| `sustainability-validation.ts` | `artifacts/api-server/src/services/` | NEW — gap reconciliation (C4: no silent balancing) + state machine |
| `sustainability-data-quality.ts` | `artifacts/api-server/src/services/` | NEW — Data Quality scoring (was confidence scoring, C6) |
| `sustainability-report-service.ts` | `artifacts/api-server/src/services/` | NEW — report generation logic |
| `index.ts` | `artifacts/api-server/src/` | MODIFY — mount sustainability routes |

### i18n Labels (SR-1B)
API error messages and validation messages — ~20 keys for backend validation responses.

### Tests / Typecheck / Build

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit` | No errors |
| API smoke test | Manual HTTP requests to each endpoint | Correct responses |
| Lifecycle test | Create → draft → update → finalize → request-revision → approve | All transitions work |
| Gap reconciliation test (C4) | Submit allocation with gap > tolerance | Rejected with clear error — no auto-balancing |
| No silent balancing test (C4) | Submit with gap within tolerance | Accepted; variance recorded; error says "no quantities silently added" |
| Auto-balance rejection test (C4) | Verify system never auto-creates residue line | No auto-created lines |
| Data Quality scoring test (C6) | Submit with various evidence combinations | Correct tier assigned — uses `data_quality_level` |
| Cross-transaction test (C1) | Query eligible with `is_processed_output = true` listing | Excluded from results |
| NULL is_processed_output test (C1) | Query eligible with `is_processed_output IS NULL` listing | Excluded from results |
| Re-weigh test (C9) | Change received qty after finalization | Allocation marked `needs_review`; old snapshot preserved |

### Manual UAT Steps (v1.1 — updated per C1, C4, C6, C9)
1. Create a draft allocation for a completed deal → verify saved
2. Update draft → verify changes persisted
3. Finalize with complete allocation (100%) → verify accepted
4. Attempt finalize with gap > 2% → verify rejected with clear error **that explicitly says the system does not auto-balance** (C4)
5. Finalize with gap within 2% → verify accepted; verify `allocation_variance_pct` recorded; verify variance displayed in API response (C4)
6. Verify system **never** auto-creates a residue/loss/other line to fill a gap (C4)
7. Request revision on finalized allocation → verify requires reason
8. Admin approve revision → verify new version active, old superseded
9. Check audit log entries for all actions
10. Verify seller can only view reports, not create allocations
11. Verify admin can override allocation
12. Verify eligibility query excludes `is_processed_output = true` listings (C1)
13. Verify eligibility query excludes `is_processed_output IS NULL` listings (C1)
14. Verify eligible listing with `is_processed_output = false` appears in results (C1)
15. Change received quantity after finalization → verify allocation marked `needs_review` (C9)
16. Verify old snapshot preserved after re-weigh (C9)
17. Verify Data Quality badge shows "جودة البيانات" not "مستوى الثقة" (C6)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Complex state machine bugs | 🟡 Medium | Unit test every state transition |
| Performance on eligibility query (large datasets) | 🟡 Medium | Indexes on `status`, `buyer_company_id`; pagination |
| Concurrent revision requests | 🟢 Low | Check `status != 'pending_revision_approval'` before allowing |
| Silent balancing creep (C4) | 🟡 Medium | Unit test: assert no auto-created allocation lines; code review |
| Listings without `is_processed_output` set (C1) | 🟡 Medium | NULL = excluded; admin batch can request classification |

### Approval Checkpoint (v1.1 — updated per C1, C4, C6, C10)
**Gate 2:** CTO reviews API contract (routes, request/response shapes, validation rules) before frontend work begins.

**Gate 2 exit conditions:**
- [ ] Eligibility query structurally excludes `is_processed_output = true` AND `IS NULL`
- [ ] Finalize endpoint enforces 100% reconciliation with no silent balancing
- [ ] Gap error message explicitly states system does not auto-balance
- [ ] Cross-transaction exclusion tested (both true and NULL cases)
- [ ] Data Quality scoring uses `data_quality_level` / `data_quality_reason`
- [ ] Re-weigh/correction triggers `needs_review` status on existing allocations

---

## 6. Phase SR-1C: Buyer/Processor Allocation UI

### Objective
Build the buyer/processor-facing allocation UI: sustainability dashboard, line-level allocation form, draft/finalize workflow, and allocation status display.

### Exact Scope
- Sustainability dashboard page (`sustainability-dashboard.tsx`)
- Line-level allocation form page (`sustainability-allocate.tsx`)
- Received line summary card component
- Pathway allocation form component (driven by thin field registry)
- Draft save / finalize submit flow
- Post-finalization revision request flow
- Action buttons on completed deals and closed shipments
- Allocation status badge component

### Out of Scope
- Report view page (SR-1D)
- PDF export (SR-1D)
- Seller-facing views (SR-1D)
- Notifications (SR-1E)
- Admin sustainability panel (SR-1E)

### Frontend Changes

#### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| `sustainability-dashboard.tsx` | `/sustainability` | Pending allocations list, coverage stats, recent activity |
| `sustainability-allocate.tsx` | `/sustainability/allocate/:parentEntityType/:parentEntityId` | Line-level pathway allocation form |

#### New Components

| Component | Purpose |
|-----------|---------|
| `ReceivedLineSummaryCard` | Shows material, qty, unit, allocation progress for one line |
| `ParentOperationHeader` | Parent deal/shipment/contract reference + line count + progress |
| `PathwayAllocationForm` | Field-config-driven pathway input form |
| `AllocationStatusBadge` | Visual badge: pending/draft/finalized/approved/revision |
| `GapReconciliationBar` | Visual indicator: allocated vs received with tolerance zone |
| `LineAllocationProgress` | "X of Y material lines fully allocated" progress |

#### Modified Pages

| Page | Modification |
|------|-------------|
| `participations.tsx` | Add "Sustainability" action button on completed deals (buyers) |
| `contract-detail.tsx` | Add "Sustainability" action for closed shipments |

### UI Flow

```
Dashboard → shows pending/completed allocations
    │
    ├→ Click "Allocate" → opens allocate page
    │     │
    │     ├→ ParentOperationHeader (deal/shipment info)
    │     ├→ ReceivedLineSummaryCard (material, qty, unit — read-only)
    │     ├→ PathwayAllocationForm (per line)
    │     │     ├→ Pathway selector (dropdown from taxonomy)
    │     │     ├→ Quantity input (numeric)
    │     │     ├→ Percentage (auto-calculated)
    │     │     ├→ Evidence URL (optional)
    │     │     ├→ Notes (optional)
    │     │     └→ Add/remove pathway rows
    │     ├→ GapReconciliationBar (visual: X of Y allocated)
    │     ├→ Value recovered (optional input)
    │     └→ Actions: [Save Draft] [Finalize]
    │
    ├→ Click completed allocation → view details
    │     ├→ Allocation summary
    │     ├→ Pathway breakdown
    │     ├→ Status + confidence badge
    │     └→ Actions: [View Report] [Request Revision]
    │
    └→ Post-finalization revision
          ├→ Change reason (required text)
          ├→ Edit pathway lines
          └→ [Submit Revision for Approval]
```

### i18n Labels (~60 keys)

| Category | Example Keys | Count |
|----------|-------------|-------|
| Dashboard | `sustainability.dashboard.title`, `sustainability.dashboard.pending`, `sustainability.dashboard.completed` | ~10 |
| Allocation form | `sustainability.allocate.title`, `sustainability.allocate.pathway`, `sustainability.allocate.quantity` | ~15 |
| Status badges | `sustainability.status.pending`, `sustainability.status.draft`, `sustainability.status.finalized` | ~7 |
| Validation messages | `sustainability.validation.gap_too_large`, `sustainability.validation.reason_required` | ~10 |
| Actions | `sustainability.action.save_draft`, `sustainability.action.finalize`, `sustainability.action.request_revision` | ~8 |
| Data Quality (C6) | `sustainability.data_quality.high`, `sustainability.data_quality.medium`, `sustainability.data_quality.low` | ~5 |
| Misc | `sustainability.pending_allocation_ar`, pathway names, unit labels | ~5 |

### Files Likely Affected

| File | Location | Change Type |
|------|----------|-------------|
| `sustainability-dashboard.tsx` | `artifacts/tadweerah/src/pages/` | NEW |
| `sustainability-allocate.tsx` | `artifacts/tadweerah/src/pages/` | NEW |
| `ReceivedLineSummaryCard.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `ParentOperationHeader.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `PathwayAllocationForm.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `AllocationStatusBadge.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `GapReconciliationBar.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `participations.tsx` | `artifacts/tadweerah/src/pages/` | MODIFY |
| `contract-detail.tsx` | `artifacts/tadweerah/src/pages/` | MODIFY |
| `ar.json` / `en.json` | `artifacts/tadweerah/src/i18n/` (or locale files) | MODIFY |
| Router config | `artifacts/tadweerah/src/` | MODIFY — add sustainability routes |

### Tests / Typecheck / Build

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit` | No errors |
| Vite build | `npm run build` (in tadweerah) | Successful build |
| Visual test | Open dashboard, verify layout | All components render |
| RTL test | Switch to Arabic locale, verify alignment | Proper RTL layout |
| Draft save | Fill partial allocation, save draft | Saved, can resume |
| Finalize | Complete 100% allocation, finalize | Accepted |
| Rejection | Submit with gap > tolerance | Error message displayed |

### Manual UAT Steps
1. Navigate to sustainability dashboard → verify pending allocations listed
2. Click "Allocate" on a pending item → verify form pre-filled with material/qty
3. Add 2 pathway rows (e.g., recycling 70%, residue 30%) → verify auto-calc
4. Save as draft → verify status changes to "Draft" in dashboard
5. Return to draft → verify data persisted
6. Finalize → verify accepted and status = "Finalized"
7. Try finalizing with 80% allocation → verify rejected with gap error
8. Verify action buttons appear only on completed deals (not in-progress)
9. Verify Arabic labels render correctly
10. Verify RTL layout in Arabic mode

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Form state management complexity (add/remove rows) | 🟡 Medium | Use React form library pattern already in codebase |
| Field registry driving form (MVP has few fields) | 🟢 Low | Simple mapping; complex scenarios deferred to Phase 2 |
| Modification of existing pages could break things | 🟡 Medium | Changes are additive — action button with feature flag |

### Approval Checkpoint
**Gate 3:** CTO reviews allocation UI (screenshots/demo) before proceeding to report view.

---

## 7. Phase SR-1D: Report View + PDF Export

### Objective
Build the sustainability impact report view page, seller-facing report access, professional branded PDF export, and report snapshotting.

### Exact Scope
- Report view page (`sustainability-report.tsx`)
- Seller-facing report list
- Sustainability metrics calculation and display
- Provenance badges on ALL rates
- **Data Quality indicator** (renamed from "Confidence level" per C6)
- Disclaimer section (standard + conditional + cross-transaction — **non-removable per C5**)
- Methodology footer
- Report number generation (`TDW-SIR-YYYY-NNNN`)
- Professional branded PDF (approach from SR-0 spike)
- MVP snapshotting (qty, allocations, versions)
- Buyer/processor logo rendering where available

### Out of Scope
- Excel export (Phase 2)
- Admin config UI (Phase 2)
- Report profiles / saved views (Phase 2)
- QR verification (Phase 3)
- CO₂e display (Phase 2)

### Report Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ HEADER                                              │
│ [Tadweerah Logo]          [Buyer/Processor Logo]    │
│ تقرير أثر الاستدامة                                │
│ Sustainability Impact Report                        │
│ Report No: TDW-SIR-2026-NNNN | Version: 1          │
│ Generated: 2026-MM-DD                               │
├─────────────────────────────────────────────────────┤
│ TRANSACTION DETAILS (bilingual table)               │
│ Deal/Shipment reference, parties, material,         │
│ final received quantity, completion date             │
├─────────────────────────────────────────────────────┤
│ PATHWAY ALLOCATION TABLE                            │
│ Pathway | المسار | Qty | % | Evidence              │
│ [provenance badge: "Declared by processor"]         │
├─────────────────────────────────────────────────────┤
│ SUSTAINABILITY METRICS                              │
│ ┌─────────────────┐ ┌────────────────────┐         │
│ │ Circular         │ │ Energy Recovery    │         │
│ │ Diversion: 70%   │ │ Rate: 20%          │         │
│ │ [🟢 provenance]  │ │ [🟢 provenance]    │         │
│ └─────────────────┘ └────────────────────┘         │
│ ┌─────────────────┐ ┌────────────────────┐         │
│ │ Disposal: 5%     │ │ Residue: 5%        │         │
│ │ [🟢 provenance]  │ │ [🟢 provenance]    │         │
│ └─────────────────┘ └────────────────────┘         │
├─────────────────────────────────────────────────────┤
│ VALUE RECOVERED (if provided)                       │
│ SAR XXX                                             │
├─────────────────────────────────────────────────────┤
│ DATA QUALITY (v1.1 C6 — was CONFIDENCE LEVEL)      │
│ 🟢 High (85/100) — explanation of scoring factors   │
│ جودة البيانات: عالي                                 │
│ "Pathway allocation declared by the receiving       │
│  party — not independently verified."               │
│ «توزيع المسارات مُصرَّح به من الطرف المستلِم —       │
│  وغير مُتحقَّق منه بشكل مستقل.»                   │
├─────────────────────────────────────────────────────┤
│ CO₂e SECTION (placeholder — v1.1 C7)                │
│ "CO₂e estimation: Not estimated — pending           │
│  methodology governance"                            │
│ "تقدير CO₂e: غير مُقدَر — بانتظار اعتماد المنهجية"  │
│ [NEVER render as blank or zero]                     │
├─────────────────────────────────────────────────────┤
│ PROVENANCE LEGEND                                   │
│ 🔵 Platform-confirmed | 🟠 Processor-declared |    │
│ 🔲 System-calculated  | ⬜ Not estimated           │
├─────────────────────────────────────────────────────┤
│ [PAGE BREAK]                                        │
├─────────────────────────────────────────────────────┤
│ DISCLAIMER                                          │
│ Standard disclaimer (EN + AR)                       │
│ Conditional disclaimers (if applicable)             │
│ Cross-transaction scope statement (EN + AR)         │
├─────────────────────────────────────────────────────┤
│ METHODOLOGY FOOTER                                  │
│ GRI 306 (2020) reference                            │
├─────────────────────────────────────────────────────┤
│ BRANDING FOOTER                                     │
│ تدويرة | كل قيمة تستحق أن تعود                    │
│ Tadweerah | Every value deserves to return          │
│ Generated via tadweerah.com                         │
└─────────────────────────────────────────────────────┘
```

### Snapshotting (MVP)

When a report is generated/exported to PDF, the system captures:

| Element | Storage | Immutable? |
|---------|---------|-----------|
| Final received quantity + unit | Copied from received line at render time | Yes (received line is immutable) |
| Pathway allocation values | From active allocation + lines | Yes (version-locked) |
| Report version | Stored on allocation (`version` field) | Yes |
| Disclaimer version | Stored as `disclaimer_version` metadata | Yes |
| Methodology version | Stored as `methodology_version` on allocation | Yes |
| Generated timestamp | Report generation timestamp | Yes |
| Report number | Auto-generated `TDW-SIR-YYYY-NNNN` | Yes |

### Files Likely Affected

| File | Location | Change Type |
|------|----------|-------------|
| `sustainability-report.tsx` | `artifacts/tadweerah/src/pages/` | NEW |
| `SustainabilityMetricsCards.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `ConfidenceLevelIndicator.tsx` renamed to:
| `DataQualityIndicator.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW (C6) |
| `ProvenanceBadge.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `DataLayerLabel.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `MethodologyFooter.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `DisclaimerSection.tsx` | `artifacts/tadweerah/src/components/sustainability/` | NEW |
| `sustainability-print.css` | `artifacts/tadweerah/src/styles/` | NEW |
| `sustainability-report-service.ts` | `artifacts/api-server/src/services/` | MODIFY — add report number generation |
| PDF generation (if server-side) | `artifacts/api-server/src/services/` | NEW — Puppeteer renderer |

### i18n Labels (~30 keys)

| Category | Count |
|----------|-------|
| Report headers/titles | ~8 |
| Metrics labels | ~8 |
| Provenance labels | ~4 |
| Disclaimer text | ~4 |
| CO₂e placeholder | ~2 |
| Footer text | ~4 |

### Tests / Typecheck / Build

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit` | No errors |
| Build | `npm run build` | Successful |
| Report view | Open report for finalized allocation | All sections render |
| PDF export | Export to PDF | Clean layout with Arabic |
| Seller view | Login as seller, view report | Read-only access works |
| Provenance badges | Verify on each metric card | Correct badge per rate |

### Manual UAT Steps (v1.1 — updated per C5, C6, C7)
1. Navigate to finalized allocation → click "View Report"
2. Verify all report sections render correctly
3. Verify bilingual labels (Arabic + English)
4. Verify metrics cards show correct rates with provenance badges
5. Verify **Data Quality** indicator shows "جودة البيانات" (NOT "مستوى الثقة") with correct scoring (C6)
6. Verify "Pathway allocation declared by the receiving party — not independently verified" label adjacent to Data Quality badge (C6)
7. Verify disclaimer section (standard + cross-transaction) — verify **non-removable** (C5)
8. Export to PDF → verify Arabic RTL renders correctly
9. Verify page break between main content and disclaimer
10. Verify Tadweerah logo and branding
11. Login as seller → verify read-only report access
12. Verify report number format: `TDW-SIR-YYYY-NNNN`
13. Verify CO₂e placeholder shows **"Not estimated — pending methodology governance"** and **"غير مُقدَر — بانتظار اعتماد المنهجية"** (C7) — NEVER blank or zero
14. Verify report shows provenance badge on ALL rate claims (C10)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| PDF Arabic rendering issues (from spike) | Follows SR-0 | SR-0 already resolved approach |
| Report number collision | 🟢 Low | Sequence counter with year prefix |
| Large aggregate reports (contract with many shipments) | 🟡 Medium | Pagination; limit query to 5000 |

### Approval Checkpoint (v1.1 — updated per C5, C6, C7, C10)
**Gate 4:** CTO reviews complete report layout and PDF output before polish phase.

**Gate 4 exit conditions:**
- [ ] Report/PDF shows provenance badge and Data Quality badge on all rate claims
- [ ] Report/PDF includes non-removable disclaimer and cross-transaction statement
- [ ] CO₂e shows "Not estimated — pending methodology governance" (never blank/zero)
- [ ] Data Quality badge shows "جودة البيانات" not "مستوى الثقة"
- [ ] "Pathway allocation declared by the receiving party" label present
- [ ] Arabic PDF quality passes SR-0 evaluation criteria

---

## 8. Phase SR-1E: Notifications + Reports Tab + UAT Polish

### Objective
Add in-app notifications, implement the Reports tab split (Operational | Sustainability), build admin sustainability panel, batch historical derivation, and polish for UAT readiness.

### Exact Scope
- In-app notifications for sustainability events
- Reports tab split: Operational | Sustainability
- Admin sustainability panel (list, review, batch-create)
- Batch auto-derive received lines for historical records
- Non-configurable field enforcement validation
- Cross-transaction double-counting edge case testing
- Polish: loading states, error handling, empty states, RTL
- Integration testing

### Out of Scope
- Email notifications (Phase 2 scope except admin batch)
- Advanced admin config UI (Phase 2)
- Excel export (Phase 2)

### Notification Events (In-App)

| Event | Recipients | Trigger |
|-------|-----------|---------|
| `sustainability_allocation_submitted` | Seller + Admin | Buyer finalizes allocation |
| `sustainability_allocation_requested` | Buyer | Admin requests allocation |
| `sustainability_allocation_reviewed` | Buyer | Admin approves/rejects |
| `sustainability_batch_pending` | Buyer | Admin batch-creates pending allocations |

### Reports Tab Split

```
Reports Page
├── Tab: Operational Reports (existing functionality, unchanged)
│     ├── Transaction reports
│     ├── Payment reports
│     └── Shipment reports
└── Tab: Sustainability Reports (NEW)
      ├── List of generated sustainability reports
      ├── Filter by date range, entity type, status
      └── Click → opens sustainability-report.tsx
```

### Admin Panel

```
Admin → Sustainability Tab
├── Allocations list (all companies)
│     ├── Filter by status, company, date
│     ├── Click → view allocation detail
│     └── Actions: approve, reject, override
├── Eligible entities (platform-wide)
│     ├── Filter by allocated/pending/not-eligible
│     └── Batch actions: create pending, derive received lines
└── Statistics
      ├── Total eligible, allocated, pending
      ├── Coverage %
      └── Average diversion rate
```

### Files Likely Affected

| File | Location | Change Type |
|------|----------|-------------|
| `reports.tsx` | `artifacts/tadweerah/src/pages/` | MODIFY — add tab split |
| `sustainability-reports-list.tsx` | `artifacts/tadweerah/src/pages/` | NEW |
| `admin.tsx` | `artifacts/tadweerah/src/pages/` | MODIFY — add sustainability tab |
| `admin-sustainability.tsx` | `artifacts/tadweerah/src/pages/` (or component) | NEW |
| Notification handling | existing notification system | MODIFY — add sustainability events |
| `dashboard.tsx` | `artifacts/tadweerah/src/pages/` | MODIFY — add sustainability summary card |

### i18n Labels (~15 keys)

| Category | Count |
|----------|-------|
| Tab labels | ~3 |
| Admin panel | ~5 |
| Notification messages | ~4 |
| Empty states | ~3 |

### Manual UAT Steps (Full Integration — v1.1 updated per C1, C4, C5, C8)
1. **Complete lifecycle test:** Complete deal → auto-derive received line → allocate → finalize → view report → export PDF
2. **Shipment lifecycle:** Close shipment → auto-derive → allocate → finalize → view report
3. **Contract aggregate:** Close multiple shipments under contract → view contract-level report
4. **Date range report:** Generate report for selected date range → verify aggregation
5. **Historical batch:** Admin batch-derives received lines for historical deals → verify count
6. **Seller view:** Login as seller → verify can view report but cannot allocate
7. **Admin review:** Admin approves allocation → verify status change
8. **Post-finalization revision:** Request edit → admin approves → verify new version
9. **Cross-transaction (C1):** Verify `is_processed_output = true` listings excluded from eligibility
10. **Cross-transaction NULL (C1):** Verify `is_processed_output IS NULL` listings excluded from eligibility
11. **Cross-transaction explicit (C1):** Verify `is_processed_output = false` listings ARE eligible
12. **Gap reconciliation (C4):** Verify rejection with clear message — system never auto-balances
13. **No silent balancing (C4):** Verify within-tolerance acceptance shows recorded variance, no auto-added lines
14. **Notifications:** Verify in-app notifications appear for all defined events
15. **Reports tab:** Verify tab split renders correctly
16. **Arabic mode:** Verify all pages in Arabic RTL
17. **Edge cases:** Test E1–E16 from §18.3
18. **Protected field enforcement (C5):** Attempt to hide or disable a protected system field → must fail or be blocked
19. **Protected field API test (C5):** PATCH a field with `is_system_field = true` to `is_active = false` → must be rejected
20. **PDF quality (C8):** Final PDF review with real Arabic content, ligatures, shaping
21. **Arabic PDF checklist (C8):** Verify ligatures (لا, لل, بسم), company names, disclaimer, and cross-transaction statement

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Notification system integration complexity | 🟡 Medium | Follow existing notification patterns |
| Historical batch derivation for large datasets | 🟡 Medium | Batch in chunks of 100; progress tracking |
| Reports tab modification breaks existing reports | 🟡 Medium | Keep existing tab as default; add sustainability as second |

### Approval Checkpoint (v1.1 — updated per C1, C5, C8, C10)
**Gate 5:** Full UAT sign-off by CTO before documentation and closure.

**Gate 5 exit conditions:**
- [ ] UAT includes processed-output exclusion test (both `true` and `NULL`)
- [ ] UAT includes protected-field enforcement test (attempt hide → blocked)
- [ ] UAT includes Arabic PDF quality review with real content
- [ ] UAT includes no-silent-balancing test
- [ ] All 21 UAT steps pass

---

## 9. Phase SR-1F: Documentation Update + Closure

### Objective
Update all project documentation, create UAT checklist, and close the implementation phase.

### Exact Scope
- Update `docs/PROJECT_MAP.md` with sustainability module description
- Update `docs/OPERATIONAL_RULES_AND_NOTIFICATIONS_AUDIT.md` with sustainability audit events
- Create `docs/SUSTAINABILITY_MODULE_GUIDE.md` (user/admin guide)
- Update API documentation
- Close `SUSTAINABILITY_REPORTS_ENGINEERING_DISCOVERY.md` status to "IMPLEMENTED"
- Create release notes

### Files Likely Affected

| File | Change |
|------|--------|
| `docs/PROJECT_MAP.md` | Add sustainability module section |
| `docs/OPERATIONAL_RULES_AND_NOTIFICATIONS_AUDIT.md` | Add sustainability audit events |
| `docs/SUSTAINABILITY_MODULE_GUIDE.md` | NEW — user/admin guide |
| `docs/SUSTAINABILITY_REPORTS_ENGINEERING_DISCOVERY.md` | Update status |

### Approval Checkpoint
**Final Gate:** CTO signs off on completed implementation and documentation.

---

## 10. Schema Plan (Planning-Level)

> [!IMPORTANT]
> These are planning-level column specifications. Do NOT create migration files from this section. Actual Drizzle schema files will be created during SR-1A execution.

### Table 1: `sustainability_pathways`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `key` | TEXT | NOT NULL, UNIQUE | e.g., `recycling`, `reuse` |
| `name_ar` | TEXT | NOT NULL | Arabic name |
| `name_en` | TEXT | NOT NULL | English name |
| `description_ar` | TEXT | | Arabic description |
| `description_en` | TEXT | | English description |
| `category` | TEXT | NOT NULL | `circular` \| `energy_recovery` \| `disposal` \| `residue` |
| `gri_mapping` | TEXT | | e.g., `GRI 306-4: Recycling` |
| `waste_hierarchy_tier` | INTEGER | | 2=reuse, 3=recycling, 4=recovery, 5=disposal |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

### Table 2: `sustainability_received_lines` ⭐

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `parent_entity_type` | TEXT | NOT NULL | `deal` \| `contract_shipment` |
| `parent_entity_id` | UUID | NOT NULL | FK conceptual (polymorphic) |
| `line_seq` | INTEGER | NOT NULL, DEFAULT 1 | 1 in MVP; 1..N future |
| `seller_company_id` | UUID | NOT NULL, FK → companies(id) | Denormalized for queries |
| `buyer_company_id` | UUID | NOT NULL, FK → companies(id) | Denormalized for queries |
| `material_category_id` | UUID | FK → material_categories(id) | |
| `material_label` | TEXT | NOT NULL | Human-readable snapshot |
| `final_received_qty` | NUMERIC(14,3) | NOT NULL | Physical quantity |
| `final_received_unit` | TEXT | NOT NULL | Physical unit |
| `quantity_source` | TEXT | NOT NULL, DEFAULT 'confirmed' | `confirmed` \| `estimated` |
| `has_weighbridge_ticket` | BOOLEAN | NOT NULL, DEFAULT false | |
| `has_payment_proof` | BOOLEAN | NOT NULL, DEFAULT false | |
| `has_dispatch_evidence` | BOOLEAN | NOT NULL, DEFAULT false | |
| `has_receipt_evidence` | BOOLEAN | NOT NULL, DEFAULT false | |
| `derived_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `derived_by` | TEXT | DEFAULT 'system' | `system` \| `admin_batch` \| `admin_manual` |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints:** UNIQUE (`parent_entity_type`, `parent_entity_id`, `line_seq`)
**Indexes:** `(parent_entity_type, parent_entity_id)`, `(buyer_company_id)`, `(seller_company_id)`

### Table 3: `sustainability_allocations`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `received_line_id` | UUID | NOT NULL, FK → sustainability_received_lines(id) ON DELETE RESTRICT | |
| `status` | TEXT | NOT NULL, DEFAULT 'pending_allocation' | Full lifecycle |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `superseded_by_id` | UUID | FK → sustainability_allocations(id) | |
| `superseded_at` | TIMESTAMPTZ | | |
| `revision_reason` | TEXT | | Required when version > 1 |
| `allocation_tolerance_pct` | NUMERIC(5,2) | NOT NULL, DEFAULT 2.00 | |
| `allocation_variance_pct` | NUMERIC(5,2) | | Recorded on finalization |
| `data_quality_level` | TEXT | | `high` \| `medium` \| `low` (v1.1 C6: was `confidence_level`) |
| `data_quality_reason` | TEXT | | Scoring breakdown (v1.1 C6: was `confidence_reason`) |
| `has_weighbridge_ticket` | BOOLEAN | NOT NULL, DEFAULT false | |
| `has_payment_proof` | BOOLEAN | NOT NULL, DEFAULT false | |
| `has_dispatch_evidence` | BOOLEAN | NOT NULL, DEFAULT false | |
| `has_receipt_evidence` | BOOLEAN | NOT NULL, DEFAULT false | |
| `evidence_notes` | TEXT | | |
| `value_recovered` | NUMERIC(14,3) | | Optional financial context |
| `value_recovered_currency` | TEXT | DEFAULT 'SAR' | |
| `methodology_version` | TEXT | DEFAULT '1.0' | |
| `allocated_by_user_id` | TEXT | | |
| `allocated_by_company_id` | UUID | FK → companies(id) | |
| `allocated_at` | TIMESTAMPTZ | | Draft creation time |
| `finalized_at` | TIMESTAMPTZ | | Finalization time |
| `reviewed_by_user_id` | TEXT | | |
| `reviewed_at` | TIMESTAMPTZ | | Admin review time |
| `review_decision` | TEXT | | `approved` \| `rejected` |
| `review_notes` | TEXT | | |
| `notes` | TEXT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints:** Partial UNIQUE index `(received_line_id) WHERE is_active = true`
**Indexes:** `(received_line_id)`, `(status)`

### Table 4: `sustainability_allocation_lines`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `allocation_id` | UUID | NOT NULL, FK → sustainability_allocations(id) ON DELETE CASCADE | |
| `pathway_id` | UUID | NOT NULL, FK → sustainability_pathways(id) | |
| `quantity` | NUMERIC(14,3) | NOT NULL | |
| `percentage` | NUMERIC(5,2) | NOT NULL | |
| `explanation` | TEXT | | Required for `other` pathway |
| `evidence_url` | TEXT | | |
| `evidence_type` | TEXT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints:** UNIQUE (`allocation_id`, `pathway_id`)
**Indexes:** `(allocation_id)`

### Table 5: `sustainability_report_field_config` (Thin Field Registry — MVP)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `field_key` | TEXT | NOT NULL, UNIQUE | Immutable identifier |
| `label_ar` | TEXT | NOT NULL | Arabic label |
| `label_en` | TEXT | NOT NULL | English label |
| `helper_ar` | TEXT | | Arabic help text |
| `helper_en` | TEXT | | English help text |
| `provenance_layer` | TEXT | | `platform_confirmed` \| `declared_by_processor` \| `system_calculated` \| `system` |
| `methodology_governed` | BOOLEAN | NOT NULL, DEFAULT false | Cannot change calculation meaning |
| `is_system_field` | BOOLEAN | NOT NULL, DEFAULT false | Cannot be hidden (§1A D7) |
| `show_in_pdf` | BOOLEAN | NOT NULL, DEFAULT true | Basic PDF visibility |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

> [!NOTE]
> This is the **thin MVP version** per Decision D10. The full configurable field architecture from §10.2 (21 properties including `show_in_allocation_form`, `show_in_buyer_report`, `show_in_seller_report`, etc.) is designed but deferred to Phase 2.

### Table 6: `sustainability_reports`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `report_number` | TEXT | NOT NULL, UNIQUE | `TDW-SIR-YYYY-NNNN` |
| `allocation_id` | UUID | NOT NULL, FK → sustainability_allocations(id) | |
| `scope_type` | TEXT | NOT NULL | `deal` \| `shipment` \| `contract` \| `date_range` |
| `generated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `generated_by_user_id` | TEXT | | |
| `methodology_version` | TEXT | NOT NULL | Snapshot |
| `disclaimer_version` | TEXT | NOT NULL | Snapshot |
| `report_data_snapshot` | JSONB | NOT NULL | Full data snapshot for PDF immutability |

---

## 11. PDF Spike Plan

> [!WARNING]
> This spike MUST be completed before or at the start of SR-1D. The spike result determines the PDF implementation approach.

### Spike Deliverables

| # | Deliverable | Format |
|---|------------|--------|
| 1 | Static HTML test page with full Arabic + English content | `.html` file |
| 2 | Print CSS stylesheet | `.css` file |
| 3 | Browser print test results (screenshots) | Images |
| 4 | Server-side Puppeteer test results (if tested) | Images |
| 5 | Recommendation document | Short markdown |

### Test Matrix

| Approach | Arabic RTL | Table Layout | Page Break | Logo | Disclaimer | Font | Overall |
|----------|-----------|-------------|------------|------|-----------|------|---------|
| Chrome `window.print()` | ? | ? | ? | ? | ? | ? | ? |
| Firefox `window.print()` | ? | ? | ? | ? | ? | ? | ? |
| Puppeteer (headless Chromium) | ? | ? | ? | ? | ? | ? | ? |

### Font Strategy

Embed Arabic-supporting web font via `@font-face`:
- **Recommended:** Noto Sans Arabic (Google Fonts, open-source, excellent Arabic glyph coverage)
- **Fallback:** IBM Plex Arabic, Amiri, or system Arabic fonts

```css
@font-face {
  font-family: 'Noto Sans Arabic';
  src: url('/fonts/NotoSansArabic-Regular.woff2') format('woff2');
  font-display: swap;
}
```

### Spike Duration
~2 working days:
- Day 1: Build static HTML, test browser print across Chrome/Firefox
- Day 2: If browser print fails criteria → test Puppeteer; write recommendation

---

## 12. Cross-Transaction Double-Counting Plan

### Approved Policy (§1A D5)

> Sustainability diversion reporting applies to the **first diversion event** of the original generator's waste. Downstream resale of processed/recovered output does NOT generate a second diversion claim.

### MVP Implementation Approach

#### Option A: Listing-Level Flag (✅ APPROVED for MVP per v1.1 C1)

Add an attribute to distinguish original waste from processed output:

```
waste_listings.is_processed_output = BOOLEAN NOT NULL
-- NOTE: NOT DEFAULT false — see C2 for explicit declaration requirement
```

> [!CAUTION]
> Do NOT use `DEFAULT false`. For processor/recycler/factory accounts, the listing creation UI/API must force an explicit choice. Existing listings backfilled as `NULL` (unknown).

**Where flagged:**
- When a processor/recycler creates a listing for recovered material (not original waste), they **must** declare it as processed output.
- Forced two-option choice:
  - "نفايات/مواد أصلية من المولّد" / "Original waste/material from generator"
  - "ناتج معالجة/استرداد سابق" / "Recovered/processed output from previous processing"
- Arabic prompt: "هل هذه المادة ناتج معالجة/استرداد سابق؟"

**How enforced in sustainability queries:**
```sql
SELECT deals WHERE
  status = 'completed'
  AND (actual_quantity > 0 OR estimated_amount > 0)
  AND listing.is_processed_output = false  -- structural gate: excludes processed output AND unknown (NULL)
```

**Existing listings handling:**
- Backfill as `NULL` (unknown)
- `NULL` → excluded from sustainability eligibility
- Admin can trigger batch classification request for unclassified listings

#### Option B: Soft Flag via Report Disclaimer Only (❌ REJECTED per v1.1 C1)

~~Do NOT add any schema changes. Instead:~~
~~Include the cross-transaction scope disclaimer in every report~~

> [!CAUTION]
> **REJECTED.** Disclaimer alone is insufficient for double-counting prevention. The system must structurally refuse duplicate diversion reporting. Option A is required.

#### ✅ Decision: Option A is APPROVED for MVP. Option B disclaimer is retained as **supporting text**, not as sole enforcement.

### Future: Material Lineage / Mass-Balance (Phase 3+)

Full cross-transaction tracking would require:
- Material lineage graph (waste → processing → recovered output → next transaction)
- Mass-balance accounting (input mass = output mass + process loss)
- Lineage-aware reporting that can trace the "origin waste" of any downstream transaction

This is explicitly out of scope for MVP and Phase 2.

### Report Scope Disclaimer (Always Included)

**English:**
> "This report covers the diversion/management outcome of the received waste/material in this transaction based on processor-declared pathways. It does not create a carbon credit, offset, or duplicate diversion claim for downstream resale of the same mass."

**Arabic:**
> "يغطي هذا التقرير نتائج تحويل/إدارة النفايات أو المواد المستلمة في هذه المعاملة بناءً على المسارات المُعلنة من قبل المعالج. لا يُنشئ هذا التقرير رصيد كربون أو تعويض أو ادعاء تحويل مكرر لإعادة بيع نفس الكتلة لاحقاً."

---

## 13. Open Questions — Blocking vs Non-Blocking

### Blocking Questions (Must Resolve Before Implementation)

| # | Question | Recommended Answer | Impact | Blocks |
|---|---------|-------------------|--------|--------|
| B1 (Q13) | **Target timeline for Phase SR-0 (PDF spike)?** | Immediate — start before or in parallel with SR-1A | Resource allocation | SR-1D |
| B2 (Q23) | **How to flag processed-output resale in MVP?** | Option B (disclaimer only) in MVP; Option A (schema flag) when listings enhancement is approved | Cross-transaction enforcement | SR-1B eligibility query |
| B3 (Q6) | **Default allocation tolerance %?** | 2% — the discovery document default. Admin-configurable in Phase 2 | Validation strictness | SR-1B finalization endpoint |

### Non-Blocking Questions (Can Resolve During Implementation)

| # | Question | Recommended Answer | Impact | Can Decide By |
|---|---------|-------------------|--------|--------------|
| N1 (Q2) | Pathway allocation mandatory for future completions? | **No (optional in MVP)** — shown as available action, not enforced | Workflow | SR-1C |
| N2 (Q3) | Admin review required before report is final? | **No (buyer-sufficient in MVP)** — admin review as optional workflow | Simplicity | SR-1B |
| N3 (Q4) | Sellers receive notification on allocation? | **Yes (in-app only)** — low cost, good transparency | Notification | SR-1E |
| N4 (Q5) | Reports visible to both parties? | **Both** — seller sees the sustainability outcome of their waste | Access | SR-1D |
| N5 (Q7) | "Other" pathway counts as circular? | **No by default** — admin can reclassify per case in Phase 2 | Rate calc | SR-1A seed data |
| N6 (Q8) | Pathway list complete? | **Yes for MVP** — 10 pathways cover all GRI 306 categories. Saudi-specific additions in Phase 2 | Seed data | SR-1A |
| N7 (Q10) | Report name confirmed? | **Yes: "تقرير أثر الاستدامة"** | Labels | SR-1D |
| N8 (Q11) | Tadweerah tagline in footer? | **Yes** — "كل قيمة تستحق أن تعود" | Branding | SR-1D |
| N9 (Q12) | Disclaimer wording confirmed? | **Yes** — as written in §16 + §16.5. Final review during SR-1D | Legal | SR-1D |
| N10 (Q14) | Historical backfill approach? | **Admin batch** — admin triggers batch derivation for historical records | SR-1E | SR-1E |
| N11 (Q16) | Multi-material auto-derive? | **Auto-derive** — when multi-material feature ships, auto-create multiple received lines | Phase 2 | N/A |
| N12 (Q17) | Line-level UI in MVP? | **Yes** — one line per entity, but line-level layout. Future-ready | Frontend | SR-1C |
| N13 (Q19) | Data dictionary visible to users? | **Admin-only in MVP** — customer-facing methodology page in Phase 2 | UI | Phase 2 |
| N14 (Q24) | Cross-transaction disclaimer mandatory? | **Yes (always)** — non-removable per §1A D7 | Legal | SR-1D |
| N15 (Q25) | Auto-invalidate allocation on qty correction? | **Both: auto-flag + admin review** — mark allocation as "needs review" but don't auto-delete | Supersede | SR-1B |

### New Implementation Question

| # | Question | Recommended Answer | Impact |
|---|---------|-------------------|--------|
| Q26 | **Should we add a 6th table (`sustainability_reports`) for report metadata/snapshots, or store on allocation?** | **Add 6th table** — cleaner separation of concerns; one allocation can have multiple report generations; stores report number + snapshot JSONB | Schema (SR-1A or SR-1D) |

---

## 14. Risk Register

| # | Risk | Severity | Phase | Mitigation |
|---|------|----------|-------|-----------|
| R1 | **Greenwashing liability** | 🔴 High | All | Disclaimers, provenance badges, "not a certificate", CO₂e deferred, Data Quality (not "Confidence") |
| R2 | **Arabic PDF rendering failure** | 🟡 Medium | SR-0 | Technical spike with real Arabic content (C8) before committing to approach |
| R3 | **Deal/shipment completion hooks fragile** | 🟡 Medium | SR-1A | Auto-derivation in try-catch; failure doesn't block parent |
| R4 | **State machine bugs** | 🟡 Medium | SR-1B | Unit test every transition; integration test full lifecycle |
| R5 | **Performance on large date-range queries** | 🟡 Medium | SR-1B | Indexes; pagination; 5000-record limit |
| R6 | **Pathway fraud (100% recycling claims)** | 🟡 Medium | SR-1B | Data Quality scoring (C6); admin review capability |
| R7 | **Existing page modifications break things** | 🟡 Medium | SR-1C | Additive changes only; feature flag for sustainability buttons |
| R8 | **Historical data gaps** | 🟡 Medium | SR-1E | Batch skips qty=0/NULL; marks as not_eligible |
| R9 | **Cross-transaction double-counting** | 🔴 **High** (v1.1 C1) | SR-1A/1B | **Structural enforcement via `is_processed_output` flag (C1).** Disclaimer as supporting text. Remains 🔴 High until flag is deployed and tested. After deployment, re-assess to 🟡 Medium |
| R10 | **Scope creep** | 🟡 Medium | All | Approval gates between phases; defer list explicit |
| R11 | **Regulatory exposure** | 🟢 Low | All | Report is voluntary; no regulatory claims; clear labeling |
| R12 | **Buyer adoption** | 🟡 Medium | Post-MVP | Dashboard visibility; admin batch-trigger; future gamification |
| R13 | **Silent balancing / tolerance abuse** (v1.1 C4) | 🟡 Medium | SR-1B | Explicit validation rules; unit tests assert no auto-created lines |
| R14 | **Protected system field bypass** (v1.1 C5) | 🟡 Medium | SR-1A/1E | `is_system_field = true` enforcement; API rejects hide/disable; UAT test |
| R15 | **Re-weigh overwrites active report** (v1.1 C9) | 🟡 Medium | SR-1B | `needs_review` status; admin approval; snapshot preserved |

---

## Appendix: Recommended Model for Implementation

| Phase | Recommended Model | Reason |
|-------|------------------|--------|
| SR-0 (PDF spike) | Sonnet / Flash | Small, focused technical test — speed over depth |
| SR-1A (Schema) | Opus | Schema design requires careful constraint definition |
| SR-1B (Backend) | Opus | Complex business logic, state machine, validation rules |
| SR-1C (Frontend UI) | Opus | Component architecture, form state, i18n integration |
| SR-1D (Report + PDF) | Opus | Bilingual layout, branding, snapshotting logic |
| SR-1E (Polish) | Sonnet / Flash | Integration testing, notifications, minor modifications |
| SR-1F (Docs) | Sonnet / Flash | Documentation updates |
