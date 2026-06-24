# Phase Sustainability Reports 0-A — Engineering Discovery & Design Review (v2.3)
> Created: 2026-06-23 | Updated: 2026-06-24 (v2.3) | Phase: Design Only — No Implementation
> Status: ✅ APPROVED FOR IMPLEMENTATION PLANNING — reviewed with methodology/product consultant
> Canonical repo: `C:\Users\user\Documents\Tadweerah-Hub\Tadweerah-Hub`

> **Scope:** This document is a design-only engineering note and decision record. No code, migrations, commits, or deployments are included or approved unless separately authorized. Implementation planning may begin based on the approved decisions recorded in §1A.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
1A. [Approved Decisions Record (v2.3)](#1a-approved-decisions-record-v23)
2. [Global Methodology & Benchmark References](#2-global-methodology--benchmark-references)
3. [Current-State Engineering Review](#3-current-state-engineering-review)
4. [Existing Reports — Where and How](#4-existing-reports--where-and-how)
5. [Report Scope — Deals, Shipments, Contracts](#5-report-scope--deals-shipments-contracts)
6. [Canonical Reporting Unit & Double-Counting Prevention](#6-canonical-reporting-unit--double-counting-prevention)
7. [Proposed Workflow for Pathway Allocation](#7-proposed-workflow-for-pathway-allocation)
8. [Historical & Retroactive Reporting Architecture](#8-historical--retroactive-reporting-architecture)
9. [Proposed Data Model Changes](#9-proposed-data-model-changes)
10. [Configurable Field Architecture](#10-configurable-field-architecture)
10A. [Report & Table Configuration Foundation](#10a-report--table-configuration-foundation-platform-level-design)
11. [Proposed API / Backend Changes](#11-proposed-api--backend-changes)
12. [Proposed Frontend Pages & Components](#12-proposed-frontend-pages--components)
13. [Proposed PDF / Export / Reporting Approach](#13-proposed-pdf--export--reporting-approach)
14. [Proposed Arabic / English Labels](#14-proposed-arabic--english-labels)
15. [Proposed Confidence-Level Logic](#15-proposed-confidence-level-logic)
16. [Proposed Disclaimer Wording](#16-proposed-disclaimer-wording)
17. [CO₂e — Phase 1 Analysis (Options A/B/C)](#17-co₂e--phase-1-analysis-options-abc)
18. [Risks, Edge Cases & Mitigations](#18-risks-edge-cases--mitigations)
19. [Three Implementation Options — Comparison](#19-three-implementation-options--comparison)
20. [Recommended Option & Justification](#20-recommended-option--justification)
21. [Recommended Implementation Phasing](#21-recommended-implementation-phasing)
22. [Exact Files Likely Affected](#22-exact-files-likely-affected)
23. [Documentation Updates Required](#23-documentation-updates-required)
24. [Open Questions for Founder / CTO](#24-open-questions-for-founder--cto)
25. [Appendix A: Existing Schema Fields](#appendix-a-existing-schema-fields-relevant-to-sustainability)
26. [Appendix B: Integration Points](#appendix-b-integration-points-with-existing-flows)
27. [Appendix C: Methodology Quick-Reference](#appendix-c-methodology-quick-reference-for-stakeholders)

---

## 1. Executive Summary

Tadweerah currently has a robust **operational reporting** layer covering marketplace deals and contract shipments. Reports document transaction execution: parties, material, quantity, price, payment, dispatch, receipt, and financial totals.

The proposed **Sustainability Impact Reporting** layer adds a second dimension: for each completed deal, shipment, or contract delivery, the buyer/recycler/processor allocates the final received quantity across outcome pathways (recycling, reuse, safe treatment, etc.), enabling circular diversion rate calculations.

### Key Architecture Decisions

| Decision | Status | Detail |
|----------|--------|--------|
| Report naming | ✅ Approved | "Sustainability Impact Report" / "تقرير أثر الاستدامة" — NOT a certificate |
| **Physical basis** | ✅ Approved | Allocation based on final physically received quantities, NOT commercial pricing |
| **Canonical unit** | ✅ Approved | **Final confirmed received material/item line** — methodologically correct because diversion rates and impact factors are material-specific |
| **`sustainability_received_lines`** | ✅ Approved | Introduced now (not just for migration convenience — methodologically correct grain) |
| **Multi-material ready** | ✅ Approved | MVP auto-derives 1 line per entity; future supports N lines |
| **Draft/finalize lifecycle** | ✅ Approved | Draft → finalize → post-finalization edits require reason + audit + admin approval |
| **Cross-transaction dedup** | ✅ Approved (NEW) | First diversion event only; downstream resale of recovered output is NOT a new diversion claim |
| **CO₂e** | ✅ Approved | Option C: schema placeholder only; no calculation or display in MVP |
| **Report config** | ✅ Trimmed | MVP: thin field registry only; no admin config UI, no profiles, no per-role visibility |
| **PDF** | ✅ Approved + spike | Professional branded AR/EN PDF; early technical spike required for Arabic RTL rendering |
| **Snapshotting** | ✅ Approved (MVP) | Snapshot qty, allocations, version, disclaimer, methodology; defer label snapshotting to Phase 2 |
| **Provenance/confidence** | ✅ Expanded | Applies to ALL rates (diversion, energy, disposal), not just CO₂e |
| Methodology basis | ✅ Approved | GRI 306 (2020) + EU Waste Hierarchy + circular economy principles |
| Gap reconciliation | ✅ Approved | System never silently balances — gaps must be explicitly allocated to residue/loss/other |
| Implementation option | ✅ Approved | **Option 2: MVP Pathway-Allocation Sustainability Report** |
| Principle | ✅ Approved | "Make presentation flexible, but keep methodology governed." |

### Data Layer Separation (Methodology Principle)

| Layer | Source | Label |
|-------|--------|-------|
| **Layer 1: Confirmed Operational** | Tadweerah platform (deals, shipments) | `confirmed` / `مؤكد` |
| **Layer 2: Declared by Buyer/Processor** | Buyer submits pathway allocation | `declared` / `مُصرَّح` |
| **Layer 3: Estimated by Platform** | Tadweerah calculates rates, CO₂e | `estimated` / `تقديري` |
| **Layer 4: Third-Party Verified** | External audit/verification (future) | `verified` / `مُوثَّق` |

### Golden Rule

> **Make display flexible, but keep methodology governed.**
>
> Admin customization should change presentation and terminology, not silently change the scientific/accounting meaning of the methodology.

---

## 1A. Approved Decisions Record (v2.3)

> [!IMPORTANT]
> These decisions were reviewed and approved with the methodology/product consultant on 2026-06-24. They constitute the binding scope and design constraints for implementation planning.

### D1. `sustainability_received_lines` — APPROVED NOW

Not only for migration convenience. It is **methodologically correct** because sustainability allocation, diversion rates, and future impact factors are material-specific. The received material/item line is the correct grain for sustainability reporting.

### D2. MVP Auto-Derivation

Current MVP auto-derives **one received line per current single-material deal or contract shipment**. Current UI shows one line, but the data model supports future multi-material deals/shipments.

### D3. Canonical Sustainability Unit

> **Final confirmed received material/item line.**

This is the allocation subject, the report grain, and the aggregation unit.

### D4. "Finalized Received Line" — Precise Definition

> [!IMPORTANT]
> A **finalized received line** is the post-acceptance confirmed received quantity and unit for a specific material/item line, with supersede-on-change behavior if later corrected or re-weighed.

| Property | Definition |
|----------|-----------|
| **Source** | Derived from `deals.actual_quantity` / `estimated_amount` (deals) or `contract_shipments.final_weight` (shipments) |
| **Timing** | Created after parent operation reaches completed/closed status and acceptance is confirmed |
| **Immutability** | Once derived, the received line quantity is fixed. If the parent quantity is later corrected or re-weighed, a new received line version is created; the old one is superseded |
| **Supersede behavior** | Correction creates new line with `superseded_by_id` pointing to corrected version; original is retained for audit; all linked allocations must be re-evaluated |
| **Unit** | Physical unit (tons, kg, pieces, etc.) — never financial |
| **Quantity basis** | Always physical received quantity, regardless of commercial pricing model |

### D5. Cross-Transaction Double-Counting Policy

> [!CAUTION]
> Sustainability diversion reporting applies to the **first diversion event** of the original generator's waste. If processed/recycled output is later resold through Tadweerah, the downstream resale does **NOT** generate a second diversion claim on the same physical mass.

**Example:**
```
Generator sells 100t waste to Processor A → ELIGIBLE for diversion/pathway report.
Processor A later sells 80t recovered steel → This is processed-output resale,
  NOT a new waste-diversion claim for the same mass.
```

**Report scope statement (mandatory in every report):**
> "This report covers the diversion/management outcome of the received waste/material in this transaction based on processor-declared pathways. It does not create a carbon credit, offset, or duplicate diversion claim for downstream resale of the same mass."

**Arabic:**
> "يغطي هذا التقرير نتائج تحويل/إدارة النفايات أو المواد المستلمة في هذه المعاملة بناءً على المسارات المُعلنة من قبل المعالج. لا يُنشئ هذا التقرير رصيد كربون أو تعويض أو ادعاء تحويل مكرر لإعادة بيع نفس الكتلة لاحقاً."

**Implementation approach:** Mark sustainability-eligible operations by `listing.type` or equivalent. Processed-output resale listings should be flagged as `is_processed_output = true` (or equivalent) and excluded from diversion-claim eligibility. See §6.4 for detailed prevention rules.

### D6. Provenance & Confidence on ALL Rates

Provenance tags and confidence badges must apply to:
- ✅ Circular diversion rate
- ✅ Energy recovery rate
- ✅ Disposal/treatment rate
- ✅ Residue/loss rate
- ✅ All pathway quantities
- ✅ CO₂e (when activated)

NOT just CO₂e. Every declared rate carries processor-declaration provenance.

### D7. Non-Configurable System Fields

These must **never** be hideable or relabeled in a misleading way:

| Field | Reason |
|-------|--------|
| Disclaimer | Legal protection |
| Provenance layer label | Methodology integrity |
| Confidence badge | Data quality transparency |
| "Declared by processor" label | Source attribution |
| "Not verified" label | Verification status |
| Energy recovery line (when present) | Separate from circular diversion |
| Disposal/residue line (when present) | Cannot be hidden to inflate diversion rate |
| "Estimated" / "Not estimated" labels | Transparency |
| Circular diversion calculation definition | Methodology explanation |
| Methodology footer | Report credibility |

### D8. Snapshotting — MVP Scope

MVP snapshots at report generation / PDF export:

| Element | Snapshot in MVP? |
|---------|-----------------|
| Final received quantity + unit | ✅ Yes |
| Pathway allocation values | ✅ Yes |
| Report version | ✅ Yes |
| Disclaimer version | ✅ Yes |
| Methodology version | ✅ Yes |
| Factor-set version (for future CO₂e) | ✅ Yes (placeholder) |
| Presentation labels | ⭕ Phase 2 (unless needed for PDF immutability) |
| Field visibility config | ⭕ Phase 2 |

### D9. PDF — Technical Spike Required

> [!WARNING]
> Do NOT assume browser `window.print()` is sufficient. An early technical spike is required before committing to an approach.

**Spike requirements:**
- Render a PDF with real Arabic content
- Bilingual labels (AR/EN) with proper RTL layout
- Tables with pathway data
- Page breaks between sections
- Tadweerah logo + branding
- Disclaimer section
- Test actual Arabic character rendering, table alignment, and page breaks

**Decision gate:** If browser print produces clean Arabic RTL with proper page breaks → use browser print for MVP. If not → use server-side HTML → headless Chromium (Puppeteer).

### D10. Report Config — MVP Trimmed Scope

> [!IMPORTANT]
> MVP includes only a **thin field registry**. No admin configuration UI, no report builder, no saved views.

**MVP thin field registry (per field):**

| Property | Included? |
|----------|----------|
| `field_key` | ✅ Yes |
| `label_ar` | ✅ Yes |
| `label_en` | ✅ Yes |
| `helper_ar` / `helper_en` | ✅ Yes |
| `provenance_layer` | ✅ Yes |
| `methodology_governed` | ✅ Yes (boolean) |
| `show_in_pdf` | ✅ Yes (basic) |
| Admin config UI | ❌ Phase 2 |
| Report profiles / saved views | ❌ Phase 2 |
| Per-role column visibility | ❌ Phase 2 |
| Show/hide/reorder/relabel UI | ❌ Phase 2 |

### D11–D17. Formal Scope Definition

#### MVP Scope (Phase SR-1)

- `sustainability_received_lines` table
- Auto-derived one line per current completed single-material deal/shipment
- `sustainability_pathways` taxonomy (seeded)
- `sustainability_allocations` linked to `received_line_id`
- `sustainability_allocation_lines` (pathway breakdown)
- Draft → submit → finalize lifecycle
- Post-finalization changes require reason + audit + admin approval
- Line reconciliation: 100% allocation of final received quantity (within tolerance)
- No silent balancing; gaps must be residue/loss/other with explanation
- Confidence tiers (high/medium/low)
- Value recovered where confirmed (optional)
- CO₂e placeholder only — no calculation or display
- Thin field registry (`sustainability_report_field_config`)
- One fixed generator-facing sustainability report layout
- Professional branded PDF with Arabic rendering (see spike D9)
- Provenance legend on all rates
- Disclaimer (including cross-transaction scope statement)
- Report number + version
- Tadweerah branding
- Notifications (in-app)
- Reports tab split: **Operational | Sustainability**

#### Phase 2 Scope

- Admin presentation-config UI (show/hide/reorder/relabel)
- Report profiles / saved views
- Excel export with summary + detail + methodology sheets
- Customer-facing methodology page
- Per-role column visibility
- Multi-material entry + multi-line allocation UI
- CO₂e estimation (after factor governance approval)
- Factor governance workflow
- Customer period summaries
- Advanced snapshotting (presentation labels)

#### Phase 3 Scope

- QR verification on reports
- Third-party verifier workflow
- Scope 3 emission feed
- GRI 306 structured export
- Advanced customer ESG dashboards
- Server-side PDF generation (if not needed earlier from spike results)

---

## 2. Global Methodology & Benchmark References

> [!IMPORTANT]
> The Tadweerah sustainability reporting model must be explainable to recyclers, processors, factories, and waste generators as being based on recognized global benchmarks — not arbitrary Tadweerah terminology.

### 2.1 Waste Hierarchy (Foundation)

The pathway priority order follows the internationally recognized EU Waste Framework Directive (2008/98/EC) waste hierarchy, also adopted by Saudi Arabia's National Waste Management Strategy:

```
1. Prevention        (out of scope — pre-transaction)
2. Reuse             ← pathway: reuse, repair_refurbishment
3. Recycling         ← pathways: recycling, material_recovery, remanufacturing
4. Recovery          ← pathway: energy_recovery
5. Disposal          ← pathways: safe_treatment, certified_disposal
   + Residue/Loss    ← pathway: residue_loss
```

### 2.2 GRI 306: Waste (2020)

The pathway allocation model aligns with **GRI 306-4 (Waste diverted from disposal)** and **GRI 306-5 (Waste directed to disposal)**:

| GRI Disclosure | Tadweerah Alignment |
|----------------|---------------------|
| **306-4(a):** Total weight diverted from disposal | = Circular Diversion Quantity (reuse + repair + remanufacturing + recycling + material_recovery) |
| **306-4(b):** Breakdown by recovery operation (preparation for reuse, recycling, other) | = Per-pathway quantity breakdown in allocation lines |
| **306-4(c):** Onsite vs offsite | Not tracked in MVP — could add destination facility field later |
| **306-5(a):** Total weight directed to disposal | = Disposal/Safe Treatment Quantity (safe_treatment + certified_disposal) |
| **306-5(b):** Breakdown by disposal operation (incineration with energy recovery, without, landfilling, other) | = energy_recovery + safe_treatment + certified_disposal + residue_loss |

**GRI alignment note:** Tadweerah does not claim GRI compliance, but the data structure is designed to support future GRI 306 disclosures if customers need them for their own ESG reporting.

### 2.3 GHG Protocol — Scope 3 Category 5 (Future Direction)

**Scope 3 Category 5 ("Waste generated in operations")** quantifies emissions from waste treatment/disposal. Tadweerah's pathway allocation data could feed into a customer's Scope 3 Category 5 calculation:

- **Seller (waste generator):** The sustainability report shows what happened to their waste after Tadweerah intermediation — directly relevant to their Scope 3 Category 5 disclosure.
- **Buyer (processor):** The pathway allocation documents their waste processing activity.

**Important distinction:** Tadweerah's "estimated CO₂e avoided" metric (when implemented) represents the difference between the actual processing pathway and a counterfactual baseline (e.g., landfill). This is NOT the same as reducing the customer's own carbon inventory. The report must never present avoided emissions as if they reduce the generator's Scope 1/2/3 footprint.

### 2.4 EPA WARM Model (Future CO₂e Direction)

When CO₂e estimation is implemented (Phase 2+), the **EPA Waste Reduction Model (WARM)** provides screening-level emission factors per material type and management pathway:

- WARM covers: source reduction, recycling, composting, combustion, landfilling
- Factors are lifecycle-based (cradle-to-grave or cradle-to-cradle)
- Region: US-specific; would need adaptation or supplementation with Saudi/MENA factors
- Role: Screening-level estimates only — explicitly not suitable for carbon credit/offset claims

### 2.5 Circular Economy Principles

The pathway categorization follows the Ellen MacArthur Foundation's circular economy framework:

| Category | Pathways Included | Circular Economy Tier |
|----------|-------------------|----------------------|
| **Circular Diversion** | Reuse, Repair/Refurbishment, Remanufacturing, Recycling, Material Recovery | Inner loops (highest value retention) to outer loops |
| **Energy Recovery** | Energy Recovery / Alternative Fuel | Linear-with-recovery (lower than recycling in hierarchy) |
| **Disposal** | Safe Treatment, Certified Disposal | Linear (end-of-life) |
| **Loss** | Residue / Loss / Rejected | System leakage |

### 2.6 Platform Benchmark Inspiration

The design draws product-level inspiration from platforms such as:
- **Rubicon / RUBICONSmartCity** — waste diversion dashboards with material-pathway breakdowns
- **AMCS / Greyparrot** — AI-driven waste composition and diversion analytics
- **SAP Responsible Design and Production** — circular economy tracking in ERP context

> [!NOTE]
> Tadweerah does NOT claim equivalence to any of these platforms. These serve as product design references only, not as methodological endorsements.

### 2.7 Methodology Provenance in Reports

Every generated sustainability report should include a methodology reference line:

**EN:** "Methodology: Pathway allocation based on the waste hierarchy (EU WFD 2008/98/EC) and aligned with GRI 306 (2020) waste disclosure structure. Screening-level indicators only."

**AR:** «المنهجية: توزيع المسارات بناءً على هرم النفايات (التوجيه الأوروبي EU WFD 2008/98/EC) ومتوافق مع هيكل إفصاح النفايات GRI 306 (2020). مؤشرات أولية فقط.»

---

## 3. Current-State Engineering Review

### Architecture (Confirmed from Repo)

| Component | Technology | Location |
|-----------|-----------|----------|
| Frontend | React 18 + Vite SPA | `artifacts/tadweerah/` |
| Backend | Express REST API | `artifacts/api-server/` |
| Database | PostgreSQL (Cloud SQL) via Drizzle ORM | `lib/db/` (`@workspace/db`) |
| Auth | Clerk JWT | `requireAuth` middleware |
| Email | Resend (transactional, bilingual AR+EN) | `lib/email.ts` |
| Audit | Structured immutable audit log | `lib/audit.ts` → `audit_log` table |
| Hosting | Firebase Hosting (frontend), Cloud Run (backend) | Deployed |
| i18n | Single flat dictionary file (1829 lines, AR+EN) | `artifacts/tadweerah/src/i18n/index.tsx` |

### Sustainability/ESG — Current State

> **Finding: ZERO sustainability, ESG, environmental, carbon, or circular-economy references exist anywhere in the codebase.** No schema, no endpoints, no UI components, no i18n keys. This is a greenfield addition.

### Key Existing Infrastructure Relevant to Sustainability

| Capability | Status | Relevance |
|------------|--------|-----------|
| Completed deal tracking | ✅ `status = 'completed'` with timestamps | Base for deal-level reports |
| Closed shipment tracking | ✅ `status = 'closed'` with `closed_at`, immutable `final_weight` and `final_value` | Base for shipment-level reports |
| Contract completion | ✅ `status = 'completed'` when all shipments terminal | Base for contract-level aggregation |
| Material classification | ✅ Hierarchical `material_categories` with `hazard_level`, `physical_state`, `regulatory_code` | Feeds material type into sustainability report |
| Weight reconciliation | ✅ 5 weight policies on contracts; `final_weight` immutable after close | Provides the "final received quantity" |
| Evidence URLs | ✅ `source_ticket_url`, `destination_ticket_url`, `payment_proof_url`, `license_document_url` | Evidence quality assessment |
| Audit trail | ✅ Immutable `audit_log` with entity tracking | Audit chain for allocation events |
| CSV export | ✅ UTF-8 BOM + injection protection via `lib/csv.ts` | Reusable for sustainability CSV |
| PDF generation | ❌ None — no libraries, no `@media print` | Must be added |
| Company capabilities | ✅ `capabilities` table (recycle_paper, recycle_plastic, etc.) + `company_capabilities` join | Validates buyer's declared pathways |

---

## 4. Existing Reports — Where and How

### Report Endpoints (4 total)

| # | Endpoint | Scope | Data Source | Export |
|---|----------|-------|-------------|--------|
| 1 | `GET /reports/deals` | Company-scoped | Deals + listings + companies | JSON + CSV (15 cols) |
| 2 | `GET /reports/contract-shipments` | Company-scoped | Contract shipments + contracts + materials | JSON + CSV (18 cols) |
| 3 | `GET /admin/reports/deals` | Platform-wide (admin) | Same as #1, no company filter | JSON + CSV (16 cols) |
| 4 | `GET /admin/reports/contract-shipments` | Platform-wide (admin) | Same as #2, no company filter | JSON + CSV (17 cols) |

### Report UI (`artifacts/tadweerah/src/pages/reports.tsx`, 827 lines)

- **Two tabs:** "Marketplace Deals" / "Contracts"
- **Filters:** Date range, status, city/contract ref, role (seller/buyer/all)
- **Summary cards:** Counts + financial totals (before VAT, VAT, total with VAT)
- **Table:** Full operational detail per row
- **Export:** CSV download via blob URL

### Key Observations for Sustainability Design

1. Reports are **computed on-the-fly** — no pre-aggregated tables or materialized views.
2. Financial totals for contract shipments are calculated **only for `closed` shipments**.
3. Date filters on contract shipments act on `closed_at` — aligns with sustainability report needs.
4. Reports are scoped by company role (seller/buyer) — sustainability reports will need the same scoping.
5. No PDF/print infrastructure exists. Phase 2-H designed browser print-to-PDF but did not implement it.
6. CSV builder (`lib/csv.ts`) includes Arabic/Excel compatibility (UTF-8 BOM) — reusable.

---

## 5. Report Scope — Deals, Shipments, Contracts

### What is "Eligible" for Sustainability Reporting?

| Entity | Eligible When | Final Received Quantity Source | Notes |
|--------|--------------|------------------------------|-------|
| **Marketplace Deal** | `status = 'completed'` | `actual_quantity` (if set) or `estimated_amount` | Deals use `actual_quantity` for by_weight; `estimated_amount` for fixed |
| **Contract Shipment** | `status = 'closed'` | `final_weight` (immutable after close) | Governed by contract's `weight_policy` |
| **Contract (aggregate)** | `status = 'completed'` or has ≥1 closed shipment | SUM of `final_weight` across closed shipments | Contract-level = aggregation of shipment-level allocations |

### Report Generation Scopes (Required)

| # | Scope | Description | Aggregation Rule |
|---|-------|-------------|-----------------|
| 1 | **Single Deal** | One completed marketplace deal | One allocation record |
| 2 | **Single Shipment** | One closed contract shipment | One allocation record |
| 3 | **Single Contract Delivery** | One shipment within a contract context | Same as single shipment |
| 4 | **Whole Contract** | All closed shipments under a contract | Sum of per-shipment allocations |
| 5 | **Date Range** | All eligible completed operations in period | Sum across base units in range |
| 6 | **Historical / Retroactive** | Already-completed records before feature launch | Buyer submits allocation retroactively |

### 5.5 Physical Basis Principle

> [!IMPORTANT]
> The Sustainability Impact Report must be based on the **final physically received items and quantities**, NOT on the commercial pricing logic or financial value of the deal/shipment.

**Core rule:** The sustainability allocation engine uses the final confirmed received quantity and unit for each completed operation. It must not depend on whether the transaction was:
- Fixed price
- By weight
- Total price / unit price
- Revenue share
- Auction-based or direct sale
- Contract-based or marketplace-based
- Any other commercial pricing model

**Financial value** (deal value, settlement amount, VAT) may appear as contextual information or "value recovered" where appropriate, but it is **never** the basis for sustainability allocation. The allocation is always against physical quantity.

### 5.6 Material-Line Schema Analysis (Confirmed from Repo)

**Current schema — where final received quantities and materials are stored:**

| Entity | Table | Final Qty Field | Material Source | Unit Source | Multi-Material? |
|--------|-------|----------------|----------------|-------------|-----------------|
| **Deal** | `deals` | `actual_quantity` or `estimated_amount` | Via `listing_id` → `waste_listings.material`, `material_category_id` | Via `waste_listings.unit`, `unit_option_id` | ❌ **No** — one material per listing per deal |
| **Shipment** | `contract_shipments` | `final_weight` (immutable after close) | Via `material_line_id` → `contract_materials.material_category_id`, `material_label` | Via `contract_materials.unit_label`, `unit_option_id` | ❌ **No** — one material line per shipment |
| **Contract** | `contracts` | No direct field — aggregate of shipments | Via `contract_materials` (multiple lines) | Per material line | ✅ **Yes** — multiple material lines |
| **Material Line** | `contract_materials` | No final received qty — only price fields | `material_category_id`, `material_label` | `unit_label`, `unit_option_id` | N/A |

### 5.7 Current vs Future Material Model

> [!IMPORTANT]
> The sustainability reporting design must **not** be hardcoded to the current single-material limitation.

**Current schema reality:**
- Marketplace deals are single-material: one deal → one listing → one material/quantity.
- Contract shipments are single-material: one shipment → one `material_line_id` → one material.
- Contracts are multi-material through multiple shipments, each scoped to one material line.

**Confirmed future product direction:**
- Tadweerah will evolve to support **multiple materials/items within one deal** and **multiple materials/items within one shipment**.
- Customers will be able to use one transaction or one truck trip for several material types instead of creating separate deals/shipments for each.

**Example — current MVP:**
```
Deal TDW-001 (single material):
  └─ Scrap metal, 10 tons
     → one received material line
     → buyer allocates 10 tons across pathways
```

**Example — future multi-material deal:**
```
Deal TDW-002 (three materials):
  ├─ Scrap metal, 10 tons  → received line 1 → allocate independently
  ├─ Cardboard, 3 tons     → received line 2 → allocate independently
  └─ Plastic, 2 tons       → received line 3 → allocate independently
  Final report complete only when all 3 lines fully allocated.
```

**Example — future multi-material shipment:**
```
Shipment TDW-CTR-2026-0001-S001 (one truck, three materials):
  ├─ Steel scrap, 8 tons   → received line 1 → allocate independently
  ├─ Aluminum scrap, 2 tons → received line 2 → allocate independently
  └─ Plastic, 1 ton        → received line 3 → allocate independently
  Each line has its own pathway allocation, evidence, confidence, and report contribution.
```

### 5.8 Architecture Options: Now vs Defer

> [!IMPORTANT]
> The sustainability data model must be designed so that multi-material deals/shipments can be supported **without rebuilding** the sustainability reporting engine.

#### Option A: Introduce `sustainability_received_lines` Table Now ⭐ RECOMMENDED

- Create a `sustainability_received_lines` table that sits between the parent entity (deal/shipment) and the allocation.
- In the **current MVP**, the system auto-derives exactly **one** received line per completed deal or shipment.
- In the **future**, when multi-material deals/shipments are introduced, the same table naturally holds multiple lines per parent.
- `sustainability_allocations` references `received_line_id` instead of `(entity_type, entity_id)` directly.

**Pros:**
- Zero migration pain when multi-material arrives
- Clean 1:1 mapping in MVP, clean 1:N mapping in future
- Canonical allocation unit is explicit (the received line, not the parent)
- Mirrors the existing `contract_materials` → `contract_shipments` pattern
- Line-level completeness checks are natural

**Cons:**
- One extra table and one extra JOIN in queries
- Slightly more code to auto-derive lines on completion (trivial)

#### Option B: Keep MVP Minimal, Redesign Later

- `sustainability_allocations` references `(entity_type, entity_id)` directly.
- When multi-material arrives, migrate to add a `received_lines` table and update FKs.

**Pros:**
- Fewer tables in MVP

**Cons:**
- Requires schema migration when multi-material arrives
- Migration affects existing sustainability allocation records
- Risk of breaking reports during migration
- Violates "don't force rebuild" requirement

#### ⭐ Recommendation: Option A

**Introduce `sustainability_received_lines` now.** The table is lightweight (8 fields), the auto-derivation logic is trivial, and the cost of adding it is negligible compared to the cost of migrating later. This follows the same pattern Tadweerah already uses: `contracts` → `contract_materials` → `contract_shipments`.

### 5.9 Revised Canonical Allocation Unit

> [!IMPORTANT]
> The canonical sustainability allocation unit is the **received material/item line**, NOT the parent deal or shipment.

| Concept | Definition |
|---------|------------|
| **Parent operation** | Deal / shipment / contract delivery / contract |
| **Received material line** | One material/item within a parent, with confirmed final received quantity and unit |
| **Sustainability allocation** | Applied to each received material line independently |
| **Report completeness** | Parent report is complete only when ALL its received material lines have finalized 100% pathway allocation |

**Hierarchy:**
```
Parent Operation (deal / shipment / contract)
  └─ Received Material Lines (1 in MVP, N in future)
       └─ Sustainability Allocation (1 active per line)
            └─ Allocation Pathway Lines (pathways × quantities)
```

**Aggregation rule:**
- Contract-level report = aggregate of received lines from all closed shipments under the contract
- Date-range report = aggregate of finalized received lines from all eligible completed operations in range
- Never count parent AND children — always aggregate at the received-line level

### 5.10 MVP Auto-Derivation Logic

When a deal completes or a shipment closes, the system auto-derives one `sustainability_received_line`:

| Parent Type | Derived Line Fields |
|-------------|--------------------|
| **Completed deal** | `parent_entity_type = 'deal'`, `parent_entity_id = deal.id`, `material_category_id` from listing, `material_label` from listing material name, `final_received_qty = COALESCE(actual_quantity, estimated_amount)`, `final_received_unit` from listing unit, `quantity_source = 'confirmed'` or `'estimated'`, `line_seq = 1` |
| **Closed shipment** | `parent_entity_type = 'contract_shipment'`, `parent_entity_id = shipment.id`, `material_category_id` from `contract_materials`, `material_label` from `contract_materials.material_label`, `final_received_qty = final_weight`, `final_received_unit` from `contract_materials.unit_label`, `quantity_source = 'confirmed'`, `line_seq = 1` |

**Historical backfill:**
- Admin batch trigger or lazy derivation creates one `sustainability_received_line` per historical completed deal / closed shipment.
- Future historical multi-material operations would create multiple lines if the parent data supports it.

---

## 6. Canonical Reporting Unit & Double-Counting Prevention

> [!IMPORTANT]
> The canonical allocation unit is the **received material/item line** (see §5.9). Aggregation, reporting, and double-counting prevention all operate at this level.

### 6.1 Canonical Unit Principle (Revised for Line-Level)

| Flow | Canonical Allocation Unit | Rationale |
|------|--------------------------|-----------|
| **Marketplace Deal** (MVP: 1 material) | Each `sustainability_received_line` under the deal | Currently 1:1; future multi-material → 1:N |
| **Contract Shipment** (MVP: 1 material) | Each `sustainability_received_line` under the shipment | Currently 1:1; future multi-material → 1:N |
| **Contract-level report** | Aggregation of all received lines from all closed shipments | NOT a separate allocation — SUM of lines |
| **Period report** | Union of all finalized received lines from eligible deals + shipments in range | Never parent + child |

### 6.2 Fit with Actual Data Model

- **MVP:** One received line auto-derived per completed deal or closed shipment. Allocation attaches to the received line, not the parent directly.
- **Future multi-material:** Multiple received lines per parent. Each line allocated independently. Parent report completeness = all lines complete.
- **Contract aggregation:** Contract-level report = SUM of received lines from all closed shipments under the contract. Contract itself has no received lines.
- **No overlap by construction:** Marketplace deals and contract shipments are in separate, non-overlapping flows.

### 6.3 Aggregation Rules (Line-Level)

| Report Type | Includes | Excludes | Date Field Used |
|-------------|----------|----------|----------------|
| Single deal | All finalized received lines under that deal | Draft/pending lines | `received_at` (from parent deal) |
| Single shipment | All finalized received lines under that shipment | Draft/pending lines | `closed_at` (from parent shipment) |
| Whole contract | All finalized received lines from all closed shipments under the contract | Lines from non-closed shipments | `closed_at` per shipment |
| Date range | All finalized received lines from eligible deals (by `received_at`) + eligible shipments (by `closed_at`) in range | Pending/draft/expired entities | As above |
| Company summary | All finalized received lines where company is buyer OR seller | — | Entity completion date |

### 6.4 Preventing Double-Counting (Line-Level)

| Risk | Mitigation |
|------|-----------|
| Same received line counted in two date ranges | Parent `received_at`/`closed_at` are immutable — each line inherits one date |
| Parent AND its lines counted | Aggregation always at received-line level; parent has no separate allocation |
| Multi-material deal lines counted with parent total | No parent-level quantity exists; total = SUM(received lines) |
| Shipment lines counted at shipment AND contract level | Contract report = SUM of received lines, not shipment-level totals |
| Duplicate active allocation per line | Partial unique index: one `is_active = true` per `received_line_id` |
| Superseded versions counted | Only `is_active = true` records included |
| Draft allocation in aggregates | Only `status IN ('finalized', 'approved')` included in metrics |
| Post-finalization revision | Old version `is_active = false, status = 'superseded'` |
| Future multi-material + historical single-material in same report | Both follow same aggregation — line is the unit regardless of era |

### 6.5 Cross-Transaction Double-Counting Prevention (APPROVED — see §1A D5)

> [!CAUTION]
> Sustainability diversion reporting applies to the **first diversion event** of the original generator's waste only. Downstream resale of processed/recovered output does NOT generate a second diversion claim.

| Scenario | Eligible? | Reason |
|----------|-----------|--------|
| Generator sells 100t waste to Processor A | ✅ Yes | First diversion event — original waste |
| Processor A sells 80t recovered steel via Tadweerah | ❌ No (for diversion claim) | Processed-output resale — not new waste diversion |
| Generator sells 50t waste to Recycler B | ✅ Yes | Independent first diversion event |
| Recycler B sells recovered plastic to Manufacturer C | ❌ No (for diversion claim) | Same mass — downstream resale |

**Implementation mechanism:**
- Listings originating from processed/recovered output should carry a flag (e.g., `is_processed_output = true` or a listing type classification).
- The sustainability eligibility query excludes entities linked to processed-output listings.
- The report disclaimer explicitly states the scope limitation (see §1A D5).

**Open design question:** How to reliably flag processed-output listings vs original-waste listings. This may require a listing attribute or a waste-type classification in the listing flow. See §24 Q23.

---

## 7. Proposed Workflow for Pathway Allocation

### 7.1 Core Allocation Lifecycle

```
Completed Deal / Closed Shipment
    │
    ├─→ [1] System creates eligibility record (auto or admin-triggered)
    │       status: 'pending_allocation' / 'بانتظار توزيع مسارات الاستدامة'
    │       • Material/item info pre-filled from platform data
    │       • Final received quantity pre-filled (physical, not financial)
    │
    ├─→ [2] Buyer/Processor opens allocation form
    │       • Material name, quantity, unit shown (read-only from platform)
    │       • Allocates physical quantity across pathways
    │       • Can SAVE AS DRAFT at any point
    │
    ├─→ [3a] SAVE AS DRAFT (partial allocation allowed)
    │       status: 'draft' / 'مسودة'
    │       • Pathway lines saved but not validated for completeness
    │       • Draft allocations do NOT generate final reports
    │       • Buyer can return and continue editing
    │       • Draft status clearly shown in dashboard and detail views
    │
    ├─→ [3b] SUBMIT / FINALIZE (requires 100% allocation)
    │       Validation gate:
    │       • Every pathway line quantity must be > 0
    │       • SUM(all pathway lines) must equal final_received_qty ± tolerance
    │       • If gap exists: REJECT — require explicit allocation to residue/loss/other
    │       • System NEVER silently balances gaps
    │       On success:
    │       status: 'finalized' / 'تم الاعتماد'
    │       • version = 1 (initial finalization)
    │       • Audit log entry created
    │       • Notification to seller/waste-generator (optional)
    │       • finalized_at timestamp set
    │
    ├─→ [4] Admin review (optional in MVP, configurable)
    │       status: 'approved' / 'تمت الموافقة'
    │       • Admin can approve, request changes, or reject
    │       • If rejected → status returns to 'draft' with admin notes
    │
    ├─→ [5] FINAL SUSTAINABILITY IMPACT REPORT can now be generated
    │       Only when status = 'finalized' or 'approved'
    │       • Circular Diversion Rate calculated
    │       • Energy Recovery Rate calculated
    │       • Disposal/Treatment Rate calculated
    │       • Residue/Loss Rate calculated
    │
    └─→ [6] POST-FINALIZATION EDIT (if needed)
            • Must provide change_reason (required text)
            • Creates new version (version = N+1)
            • New version status: 'pending_revision_approval' / 'بانتظار موافقة التعديل'
            • Previous version retained (superseded, not deleted)
            • Admin must approve revision before it becomes active
            • Active report reflects latest approved version
```

### 7.1.1 Status Model (Complete Lifecycle)

| Status Key | English | Arabic | Can Generate Report? | Editable? |
|------------|---------|--------|---------------------|----------|
| `pending_allocation` | Pending allocation | بانتظار التوزيع | ❌ No | N/A (no data yet) |
| `draft` | Draft | مسودة | ❌ No | ✅ Freely editable |
| `finalized` | Finalized | تم الاعتماد | ✅ Yes | ⚠️ Only via revision workflow |
| `approved` | Approved | تمت الموافقة | ✅ Yes | ⚠️ Only via revision workflow |
| `pending_revision_approval` | Revision pending approval | بانتظار موافقة التعديل | ❌ No (previous version active) | ✅ Admin can approve/reject |
| `rejected` | Rejected by admin | مرفوض | ❌ No | ✅ Returns to draft |
| `not_eligible` | Not eligible | غير مؤهل | ❌ No | N/A |

### 7.2 Gap Reconciliation Rule

> [!CAUTION]
> The system must **never silently balance a gap**. If there is a gap between the final received quantity and the total allocated quantity, it must be explicitly allocated to residue/loss/other with an explanation.

**Validation logic:**
```
total_allocated = SUM(all pathway lines)
final_received = final_received_qty from platform
gap = final_received - total_allocated
tolerance = final_received × (allocation_tolerance_pct / 100)

IF abs(gap) > tolerance:
    REJECT with message: "Allocated total differs from received quantity by X.
    Please allocate the remaining Y to the appropriate pathway (e.g., residue/loss)."

IF abs(gap) <= tolerance AND gap != 0:
    ACCEPT but record variance: allocation_variance_pct = (gap / final_received) × 100
    Display note: "Minor variance of Z% accepted within tolerance."
```

### 7.3 Allocation Tolerance

| Parameter | MVP Default | Notes |
|-----------|------------|-------|
| Tolerance % | 2% | e.g., 100 tons received → 98–102 tons allocated is valid |
| Tolerance absolute min | 0.01 (unit-dependent) | Prevents rounding errors for small quantities |
| Admin override | Yes | Admin can approve allocations outside tolerance with reason |
| Admin configurable | Yes (future) | Default stored in platform settings |

### 7.4 Who Can Allocate?

| Actor | Can Allocate? | Notes |
|-------|--------------|-------|
| Buyer/Processor company | ✅ Yes — primary actor | The party who received and processed the material |
| Seller/Waste-generator | ❌ No | Cannot self-declare sustainability outcomes |
| Admin | ✅ Yes — override | Can submit on behalf of buyer, with audit trail |
| System | ❌ No | System never auto-allocates pathways |

### 7.5 Pathway Definitions

| # | Pathway Key | English | Arabic | GRI 306 Mapping | Counts as Circular? | Energy Recovery? |
|---|-------------|---------|--------|-----------------|---------------------|------------------|
| 1 | `reuse` | Reuse | إعادة الاستخدام | 306-4: Preparation for reuse | ✅ Yes | No |
| 2 | `repair_refurbishment` | Repair / Refurbishment | إصلاح وتجديد | 306-4: Preparation for reuse | ✅ Yes | No |
| 3 | `remanufacturing` | Remanufacturing | إعادة التصنيع | 306-4: Recycling | ✅ Yes | No |
| 4 | `recycling` | Recycling | إعادة التدوير | 306-4: Recycling | ✅ Yes | No |
| 5 | `material_recovery` | Material Recovery | استرداد المواد | 306-4: Other recovery | ✅ Yes | No |
| 6 | `energy_recovery` | Energy Recovery / Alt. Fuel | استرداد الطاقة / وقود بديل | 306-5: Incineration w/ energy recovery | No (separate) | ✅ Yes |
| 7 | `safe_treatment` | Safe Treatment | معالجة آمنة | 306-5: Other disposal | No | No |
| 8 | `certified_disposal` | Certified Disposal | تخلص معتمد | 306-5: Landfilling / other | No | No |
| 9 | `residue_loss` | Residue / Loss / Rejected | فاقد ومخلفات ومرفوضات | 306-5: Other disposal | No | No |
| 10 | `other` | Other (with explanation) | أخرى (مع توضيح) | Depends on explanation | Configurable | No |

### 7.6 Calculated Metrics

| Metric | Formula | Arabic | GRI Ref |
|--------|---------|--------|---------|
| **Circular Diversion Quantity** | SUM(reuse + repair + remanufacturing + recycling + material_recovery) | كمية التحويل الدائري | 306-4 total |
| **Circular Diversion Rate** | Circular Qty / Final Received Qty × 100% | نسبة التحويل الدائري | — |
| **Energy Recovery Quantity** | SUM(energy_recovery) | كمية استرداد الطاقة | 306-5 (energy) |
| **Energy Recovery Rate** | Energy Qty / Final Received Qty × 100% | نسبة استرداد الطاقة | — |
| **Disposal / Treatment Quantity** | SUM(safe_treatment + certified_disposal) | كمية المعالجة والتخلص | 306-5 (other) |
| **Disposal / Treatment Rate** | Disposal Qty / Final Received Qty × 100% | نسبة المعالجة والتخلص | — |
| **Residue / Loss Quantity** | SUM(residue_loss) | كمية الفاقد والمخلفات | — |
| **Residue / Loss Rate** | Residue Qty / Final Received Qty × 100% | نسبة الفاقد والمخلفات | — |
| **Value Recovered** | Declared by buyer (optional) | القيمة المستردة | — |

> [!NOTE]
> All rates must sum to 100% (within tolerance). The four rate categories — Circular, Energy Recovery, Disposal, Residue — are mutually exclusive and exhaustive.

### 7.7 Post-Finalization Edit Rules

> [!CAUTION]
> Once a sustainability allocation is finalized or approved, later edits must **not** silently overwrite the active record. This protects report integrity and audit traceability.

**Post-finalization edit workflow:**

| Step | Action | System Behavior |
|------|--------|----------------|
| 1 | Buyer requests edit | System creates a new **revision** (version N+1) as a copy of current data |
| 2 | Buyer edits pathway lines | Changes are made on the new revision, not the active version |
| 3 | Buyer provides change reason | Required text field: `revision_reason` (mandatory, non-empty) |
| 4 | Buyer submits revision | Status set to `pending_revision_approval` |
| 5 | Admin reviews revision | Admin sees: old version vs new version diff, change reason |
| 6a | Admin approves | New version becomes active; old version status = `superseded`; `approved_at` set |
| 6b | Admin rejects | Revision discarded; old version remains active; rejection reason recorded |

**Data model for versioning:**

| Field | Purpose |
|-------|---------|
| `version` | Integer, starts at 1, increments on each approved revision |
| `revision_reason` | Required text when version > 1 |
| `superseded_by_id` | Points to the newer allocation that replaced this one (NULL = active) |
| `superseded_at` | Timestamp when this version was superseded |
| `is_active` | Boolean — only one active version per (entity_type, entity_id) |

**Rules:**
- Only ONE active version per `(entity_type, entity_id)` at any time
- Previous versions are NEVER deleted — they are marked `superseded`
- Reports always render from the active version
- Audit log records every version transition with full diff
- If no admin review is configured, buyer self-finalization still requires `revision_reason` for edits after first finalization

### 7.8 Report Generation Prerequisites

> [!IMPORTANT]
> A **final** Sustainability Impact Report can only be generated when ALL of the following conditions are met:

| Prerequisite | Check |
|-------------|-------|
| Operation completed/received | `deals.status = 'completed'` or `contract_shipments.status = 'closed'` |
| Final received quantity confirmed | `final_received_qty > 0` and `final_received_unit` is set |
| Every received material/item line has allocation | For the canonical unit: `sustainability_allocation` exists |
| Allocation is complete (100%) | SUM(pathway lines) = `final_received_qty` ± tolerance |
| Allocation has been finalized | `status IN ('finalized', 'approved')` |
| No pending revision | `status != 'pending_revision_approval'` |
| Admin approval satisfied (if required) | If admin review is enabled: `status = 'approved'` |

**When prerequisites are NOT met:**

| Missing Prerequisite | User Experience |
|---------------------|----------------|
| Operation not completed | Entity not shown in sustainability dashboard |
| No final quantity | Entity marked "Not eligible" / "غير مؤهل" |
| No allocation exists | Entity shown with status "Pending allocation" / "بانتظار التوزيع" |
| Allocation is draft | Show "Draft — not ready for report" / "مسودة — غير جاهز للتقرير" |
| Pending revision approval | Show previous approved version of report with note: "Revision pending" |
| Admin approval pending | Show "Awaiting admin approval" / "بانتظار موافقة المسؤول" |

**For aggregate reports (contract-level, date-range):**
- Only include entities with `status IN ('finalized', 'approved')` in metric calculations
- Show pending/draft/ineligible entities separately with counts and quantities
- Display coverage %: `(finalized_count / total_eligible_count) × 100%`

### 7.9 Completion Definition

> **Sustainability data entry is complete** only when ALL final received material/item lines for the completed deal/shipment/contract delivery have 100% pathway allocation with status `finalized` or `approved`.

| Scope | Completion Condition |
|-------|---------------------|
| **Single deal** | The deal's allocation exists AND status ∈ {finalized, approved} |
| **Single shipment** | The shipment's allocation exists AND status ∈ {finalized, approved} |
| **Contract delivery** | ALL closed shipments under the contract have allocations with status ∈ {finalized, approved} |
| **Date range** | Coverage % = 100% (all eligible entities in range have finalized allocations) — note: partial coverage reports are allowed but clearly labeled |

---

## 8. Historical & Retroactive Reporting Architecture

> [!IMPORTANT]
> The sustainability reporting engine **must not** be hardwired only to future completion events. It must support retroactive allocation for all historical completed records.

### 8.1 Identifying All Eligible Completed Records

**Eligibility query (conceptual):**

```sql
-- Eligible marketplace deals
SELECT d.id, d.producer_company_id, d.buyer_company_id,
       COALESCE(d.actual_quantity, d.estimated_amount) AS final_received_qty,
       d.received_at AS completed_at
FROM deals d
WHERE d.status = 'completed'
  AND COALESCE(d.actual_quantity, d.estimated_amount) IS NOT NULL
  AND COALESCE(d.actual_quantity, d.estimated_amount) > 0;

-- Eligible contract shipments
SELECT cs.id, c.seller_company_id, c.buyer_company_id,
       cs.final_weight AS final_received_qty,
       cs.closed_at AS completed_at
FROM contract_shipments cs
JOIN contracts c ON cs.contract_id = c.id
WHERE cs.status = 'closed'
  AND cs.final_weight IS NOT NULL
  AND cs.final_weight > 0;
```

**Eligibility rules:**

| Rule | Deals | Shipments |
|------|-------|-----------|
| Status | `completed` | `closed` |
| Has final quantity | `actual_quantity` or `estimated_amount` > 0 | `final_weight` > 0 |
| Has buyer | `buyer_company_id` NOT NULL | `buyer_company_id` (via contract) NOT NULL |
| Excluded | Cancelled, expired deals | Cancelled shipments |

### 8.2 Handling Missing Final Received Quantity

| Scenario | Deal | Shipment | Sustainability Status |
|----------|------|----------|----------------------|
| `actual_quantity` set | Use `actual_quantity` | N/A | Eligible |
| `actual_quantity` NULL, `estimated_amount` > 0 | Use `estimated_amount` with `estimated` flag | N/A | Eligible (lower confidence) |
| Both NULL or 0 | N/A | N/A | **Not eligible** — "Insufficient data / بيانات غير كافية" |
| `final_weight` set | N/A | Use `final_weight` | Eligible |
| `final_weight` NULL | N/A | N/A | **Not eligible** |

### 8.3 Status Labels for Records Without Allocation

| Status Key | English | Arabic | Meaning |
|------------|---------|--------|---------|
| `pending_allocation` | Sustainability allocation pending | بانتظار توزيع مسارات الاستدامة | Eligible, awaiting buyer input |
| `not_eligible` | Not eligible for sustainability report | غير مؤهل لتقرير الاستدامة | Missing required data |
| `allocated` | Allocation submitted | تم توزيع مسارات الاستدامة | Buyer has submitted allocation |
| `reviewed` | Reviewed by admin | تمت المراجعة | Admin has reviewed (future) |

### 8.4 Backfill Strategy: Lazy Eligibility + Admin Batch Trigger

**MVP — Lazy Eligibility (Recommended):**
- No upfront bulk-creation of records.
- When a buyer visits their sustainability dashboard, the system queries eligible completed entities and shows which lack allocation.
- Buyer can submit allocation for any eligible entity.
- Pro: Zero migration risk, no phantom records.
- Con: Buyer must actively visit the page.

**Post-MVP — Admin Batch Trigger:**
- Admin panel: "Generate sustainability tasks" action.
- Admin selects: company, date range, entity type.
- System creates `sustainability_allocation` records with `status = 'pending_allocation'`.
- Optionally sends notification to buyer.
- Pro: Proactive. Con: Creates records even if never filled.

**Production — Hybrid:**
- Future completions automatically create `pending_allocation` records.
- Historical records: admin batch-triggers.
- Dashboard shows union of lazy-eligible + explicitly-created pending records.

### 8.5 Admin Controls for Historical Records

| Admin Action | Description |
|-------------|-------------|
| View all eligible records (company filter) | List all completed deals/shipments eligible for sustainability allocation |
| View allocation status | See which records are pending, allocated, reviewed |
| Trigger allocation request | Create pending allocation records + optional buyer notification |
| Submit allocation on behalf of buyer | Admin enters allocation data with audit trail |
| Override allocation | Modify buyer's submitted allocation with reason |
| Export sustainability status report | CSV of all eligible records with their allocation status |

### 8.6 Date-Range Reports — Handling Partial Allocation

> [!IMPORTANT]
> When a date-range report is requested, some records may have allocations while others are pending.

**Approach: Show both, segregate clearly.**

```
┌─────────────────────────────────────────────────────────┐
│  Sustainability Impact Report                            │
│  Period: January 2026 – June 2026                       │
│                                                          │
│  ┌─── Allocated Operations ────────────────────────┐    │
│  │ 15 deals + 42 shipments with allocation         │    │
│  │ Circular Diversion Rate: 78.3%                  │    │
│  │ [Full metrics displayed]                        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─── Pending Allocation ──────────────────────────┐    │
│  │ 5 deals + 8 shipments awaiting allocation       │    │
│  │ Total pending quantity: 234.5 tons               │    │
│  │ Status: بانتظار توزيع مسارات الاستدامة          │    │
│  │ [NOT included in rate calculations]              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ⚠ Report Coverage: 85% of eligible operations         │
└─────────────────────────────────────────────────────────┘
```

**Rules:**
1. Rates calculated ONLY from allocated records.
2. Pending records listed separately with quantity totals.
3. Report Coverage % displayed.
4. 0% coverage → "No sustainability data available yet" / "لا تتوفر بيانات استدامة بعد".
5. 100% coverage → "Complete coverage" / "تغطية كاملة".

---

## 9. Proposed Data Model Changes

### 9.1 MVP Schema — New Tables (5 tables)

#### Table: `sustainability_pathways` (Admin-managed lookup)

```sql
CREATE TABLE sustainability_pathways (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             TEXT NOT NULL UNIQUE,
    name_ar         TEXT NOT NULL,
    name_en         TEXT NOT NULL,
    description_ar  TEXT,
    description_en  TEXT,
    category        TEXT NOT NULL,        -- 'circular', 'energy_recovery', 'disposal', 'residue'
    gri_mapping     TEXT,                 -- e.g., 'GRI 306-4: Recycling'
    waste_hierarchy_tier INTEGER,         -- 2=reuse, 3=recycling, 4=recovery, 5=disposal
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> [!NOTE]
> Using a lookup table (not an enum) allows admin to add pathways without schema migration. Follows the pattern of `material_categories`, `unit_options`, `capabilities`.

#### Table: `sustainability_received_lines` (Bridge: parent entity → material lines) ⭐ NEW

> [!IMPORTANT]
> This table is the **canonical sustainability allocation subject**. It represents one physical received material/item within a parent operation. MVP: one line per deal/shipment. Future: multiple lines per multi-material deal/shipment.

```sql
CREATE TABLE sustainability_received_lines (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Parent operation reference (polymorphic)
    parent_entity_type      TEXT NOT NULL,           -- 'deal' | 'contract_shipment'
    parent_entity_id        UUID NOT NULL,
    line_seq                INTEGER NOT NULL DEFAULT 1, -- 1 in MVP, 1..N in future
    -- Parties (denormalized for query performance)
    seller_company_id       UUID NOT NULL REFERENCES companies(id),
    buyer_company_id        UUID NOT NULL REFERENCES companies(id),
    -- Material/item identification (snapshot at derivation time)
    material_category_id    UUID REFERENCES material_categories(id),
    material_label          TEXT NOT NULL,            -- Human-readable material name
    -- Physical received quantity (NOT commercial value)
    final_received_qty      NUMERIC(14,3) NOT NULL,
    final_received_unit     TEXT NOT NULL,
    quantity_source          TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'estimated'
    -- Evidence quality (from parent entity)
    has_weighbridge_ticket   BOOLEAN NOT NULL DEFAULT false,
    has_payment_proof        BOOLEAN NOT NULL DEFAULT false,
    has_dispatch_evidence    BOOLEAN NOT NULL DEFAULT false,
    has_receipt_evidence     BOOLEAN NOT NULL DEFAULT false,
    -- Metadata
    derived_at              TIMESTAMPTZ NOT NULL DEFAULT now(), -- When this line was auto-derived
    derived_by              TEXT DEFAULT 'system',    -- 'system' | 'admin_batch' | 'admin_manual'
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Uniqueness: one line per (parent, sequence) — allows multiple material lines per parent
    UNIQUE (parent_entity_type, parent_entity_id, line_seq)
);

CREATE INDEX idx_srl_parent ON sustainability_received_lines(parent_entity_type, parent_entity_id);
CREATE INDEX idx_srl_buyer ON sustainability_received_lines(buyer_company_id);
CREATE INDEX idx_srl_seller ON sustainability_received_lines(seller_company_id);
```

**MVP behavior:** When a deal completes or shipment closes, the system creates exactly one `sustainability_received_line` with `line_seq = 1`.

**Future behavior:** When multi-material deals/shipments are implemented, the system creates one line per material, with `line_seq = 1, 2, 3...`

#### Table: `sustainability_allocations` (One active version per received line)

```sql
CREATE TABLE sustainability_allocations (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to the received material line (canonical allocation subject)
    received_line_id         UUID NOT NULL REFERENCES sustainability_received_lines(id) ON DELETE RESTRICT,
    -- Status (full lifecycle)
    status                   TEXT NOT NULL DEFAULT 'pending_allocation',
        -- 'pending_allocation' | 'draft' | 'finalized' | 'approved' |
        -- 'pending_revision_approval' | 'rejected' | 'superseded' | 'not_eligible'
    -- Versioning
    version                  INTEGER NOT NULL DEFAULT 1,
    is_active                BOOLEAN NOT NULL DEFAULT true,
    superseded_by_id         UUID REFERENCES sustainability_allocations(id),
    superseded_at            TIMESTAMPTZ,
    revision_reason          TEXT,              -- Required when version > 1
    -- Tolerance
    allocation_tolerance_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,
    allocation_variance_pct  NUMERIC(5,2),
    -- Confidence
    confidence_level         TEXT,
    confidence_reason        TEXT,
    -- Evidence quality
    has_weighbridge_ticket   BOOLEAN NOT NULL DEFAULT false,
    has_payment_proof        BOOLEAN NOT NULL DEFAULT false,
    has_dispatch_evidence    BOOLEAN NOT NULL DEFAULT false,
    has_receipt_evidence     BOOLEAN NOT NULL DEFAULT false,
    evidence_notes           TEXT,
    -- Value recovered (contextual, NOT basis for allocation)
    value_recovered          NUMERIC(14,3),
    value_recovered_currency TEXT DEFAULT 'SAR',
    -- Data provenance
    methodology_version      TEXT DEFAULT '1.0',
    -- Submission tracking
    allocated_by_user_id     TEXT,
    allocated_by_company_id  UUID REFERENCES companies(id),
    allocated_at             TIMESTAMPTZ,       -- When draft was first created
    finalized_at             TIMESTAMPTZ,       -- When allocation was finalized (100% complete)
    reviewed_by_user_id      TEXT,
    reviewed_at              TIMESTAMPTZ,       -- Admin approval timestamp
    review_decision          TEXT,              -- 'approved' | 'rejected'
    review_notes             TEXT,              -- Admin review comments
    -- Metadata
    notes                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Uniqueness: one ACTIVE allocation per received line (allows superseded versions)
    UNIQUE (received_line_id, is_active) -- partial unique via WHERE is_active = true
);

-- NOTE: The UNIQUE constraint above is conceptual. In Drizzle/Postgres, use a partial unique index:
-- CREATE UNIQUE INDEX idx_sa_active_line ON sustainability_allocations(received_line_id) WHERE is_active = true;
CREATE INDEX idx_sa_received_line ON sustainability_allocations(received_line_id);
CREATE INDEX idx_sa_status ON sustainability_allocations(status);

```

#### Table: `sustainability_allocation_lines` (Pathway breakdown)

```sql
CREATE TABLE sustainability_allocation_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id   UUID NOT NULL REFERENCES sustainability_allocations(id) ON DELETE CASCADE,
    pathway_id      UUID NOT NULL REFERENCES sustainability_pathways(id),
    quantity        NUMERIC(14,3) NOT NULL,
    percentage      NUMERIC(5,2) NOT NULL,
    explanation     TEXT,
    evidence_url    TEXT,
    evidence_type   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (allocation_id, pathway_id)
);
CREATE INDEX idx_sal_allocation ON sustainability_allocation_lines(allocation_id);
```

#### Table: `sustainability_report_field_config` (Admin-configurable display — see §10)

### 9.2 No Changes to Existing Tables

> [!TIP]
> The sustainability layer is **additive only**. No modifications to `deals`, `contracts`, `contract_shipments`, or any existing table. This minimizes migration risk and preserves operational integrity.

### 9.3 Future-Ready Extensions (Not in MVP)

| Extension | Change | When |
|-----------|--------|------|
| Multi-material deals | Deals reference multiple materials → multiple `sustainability_received_lines` auto-derived | When multi-material deal feature ships |
| Multi-material shipments | Shipments reference multiple materials → multiple received lines per shipment | When multi-material shipment feature ships |
| CO₂e estimation | Add `co2e_avoided_kg`, `emission_factor_used`, `emission_factor_source` to allocation lines | Phase 2 |
| Emission factor lookup | New `emission_factors` table: `material_category_id` × `pathway_id` | Phase 2 |
| Third-party verification | Add verification fields to `sustainability_allocations` | Phase 3+ |
| Destination facility | Add `processing_facility_name`, `processing_facility_location` to lines | Phase 2+ |
| Monthly/annual summaries | Materialized view or summary table | When performance requires |
| Report profiles | Admin-managed `report_profiles` table with JSONB column sets | Phase 2 |
| Platform-wide report config | Generalize `sustainability_report_field_config` into `report_field_config` serving all report types | Future platform upgrade |

---

## 10. Configurable Field Architecture

> [!IMPORTANT]
> The pathway allocation table and sustainability report fields should not be hardcoded as a fixed UI table. We need a flexible, admin-configurable display layer while keeping the underlying methodology stable and auditable.

### 10.1 Design Principle: Governed Methodology, Flexible Display

**System-controlled (cannot be removed or renamed by admin):**
- Pathway codes (`reuse`, `recycling`, etc.) and their `category` classification
- Whether a pathway counts toward circular diversion
- Whether a pathway counts as energy recovery
- Calculation logic (e.g., `circular_diversion_rate = circular_qty / final_received_qty × 100%`)
- Audit trail structure
- Report provenance layers (confirmed/declared/estimated/verified)
- Confidence scoring logic
- Allocation validation (tolerance, sum-to-total, gap reconciliation)
- UNIQUE constraint per entity
- Methodology reference text
- GRI mapping on pathways

**Admin-configurable (display/presentation layer):**
- Show/hide columns in allocation table and report view
- Arabic and English labels for display
- Helper text/descriptions in Arabic and English
- Column order in tables
- Whether a field appears in buyer/processor data entry form
- Whether a field appears in seller/generator report view
- Whether a field appears in exported PDF/CSV
- Whether a field is admin-only visible
- Required vs optional (where safe)
- Default visibility per context

### 10.2 Proposed Table: `sustainability_report_field_config`

```sql
CREATE TABLE sustainability_report_field_config (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key                 TEXT NOT NULL UNIQUE,
    -- Labels (admin-editable)
    label_ar                  TEXT NOT NULL,
    label_en                  TEXT NOT NULL,
    helper_ar                 TEXT,
    helper_en                 TEXT,
    -- Visibility
    show_in_allocation_form   BOOLEAN NOT NULL DEFAULT true,
    show_in_buyer_report      BOOLEAN NOT NULL DEFAULT true,
    show_in_seller_report     BOOLEAN NOT NULL DEFAULT true,
    show_in_admin_view        BOOLEAN NOT NULL DEFAULT true,
    show_in_csv_export        BOOLEAN NOT NULL DEFAULT true,
    show_in_pdf_export        BOOLEAN NOT NULL DEFAULT true,
    -- Behavior
    is_required               BOOLEAN NOT NULL DEFAULT false,
    is_system_field           BOOLEAN NOT NULL DEFAULT false,
    sort_order                INTEGER NOT NULL DEFAULT 0,
    is_active                 BOOLEAN NOT NULL DEFAULT true,
    -- Metadata
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 10.3 System Fields vs Configurable Fields

| Field Key | Is System Field? | MVP Visible? | Can Admin Hide? | Notes |
|-----------|-----------------|-------------|-----------------|-------|
| `pathway` | ✅ Yes | ✅ Yes | ❌ No | Core — always required |
| `quantity` | ✅ Yes | ✅ Yes | ❌ No | Core — sum must equal received qty |
| `percentage` | ✅ Yes | ✅ Yes | ❌ No | Auto-calculated |
| `evidence_url` | No | ✅ Yes | ✅ Yes | Optional proof |
| `notes` | No | ✅ Yes | ✅ Yes | Free-text |
| `gri_class` | No | ❌ (future) | ✅ Yes | GRI 306-4/306-5 label |
| `confidence_level` | No | ❌ (future) | ✅ Yes | Per-allocation confidence |
| `methodology_source` | No | ❌ (future) | ✅ Yes | Methodology version ref |
| `co2e_factor` | No | ❌ (future) | ✅ Yes | Emission factor |
| `co2e_avoided` | No | ❌ (future) | ✅ Yes | Estimated CO₂e |
| `processing_reference` | No | ❌ (future) | ✅ Yes | Internal batch/lot ref |
| `destination_facility` | No | ❌ (future) | ✅ Yes | Processing facility |
| `treatment_certificate` | No | ❌ (future) | ✅ Yes | Certificate number |

### 10.4 MVP Visible Columns (Buyer Allocation Form)

| Column | Arabic | English | Required? |
|--------|--------|---------|----------|
| Pathway | مسار المعالجة أو الاستفادة | Processing/Recovery Pathway | ✅ Yes |
| Quantity | الكمية | Quantity | ✅ Yes |
| Percentage | النسبة | Percentage | Auto-calculated |
| Evidence | الإثبات | Evidence | Optional |
| Notes | ملاحظات | Notes | Optional |

### 10.5 Future Optional Columns (Hidden by Default)

| Column | Arabic | English | Activate When |
|--------|--------|---------|---------------|
| GRI Class | تصنيف GRI | GRI Classification | Customer needs GRI 306 disclosures |
| Confidence Level | مستوى الثقة | Confidence Level | Admin review workflow active |
| Methodology Source | مصدر المنهجية | Methodology Source | Multiple methodology versions |
| CO₂e Factor | معامل CO₂e | CO₂e Factor | Emission factors loaded |
| Est. CO₂e Avoided | CO₂e المتجنب (تقديري) | Est. CO₂e Avoided | Emission factors loaded |
| Processing Reference | مرجع المعالجة الداخلي | Internal Processing Ref. | Processors link to internal systems |
| Destination Facility | منشأة المعالجة | Processing Facility | Tracking onsite vs offsite |
| Treatment Certificate | رقم شهادة المعالجة | Treatment Certificate No. | External certificates collected |

### 10.6 Admin Configuration Safeguards

| Risk | Mitigation |
|------|-----------|
| Admin hides required system field | `is_system_field = true` prevents toggling off |
| Admin renames to misleading label | Labels editable; `field_key` immutable; calculations use `field_key` |
| Label change breaks calculation | Calculations never use display labels |
| Old reports with new config | Reports show current config at render time; exported PDFs are static snapshots |
| Per-material/pathway config | Start global; add `scope` column later (`global`, `material:xxx`) |

### 10.7 Versioning for Historical Report Accuracy

- `methodology_version` on `sustainability_allocations` tracks which version was used
- Field config is read at render time; exported PDFs are static
- If methodology changes (e.g., pathway reclassification), version is incremented and logged in audit
- Existing allocations retain their original classification

---

## 10A. Report & Table Configuration Foundation (Platform-Level Design)

> [!IMPORTANT]
> This phase should establish a **reusable reporting and table-configuration foundation** — not a one-off hardcoded report. The same architecture should later support operational reports, deal reports, shipment reports, contract reports, customer period reports, and branch/company reports.

> [!WARNING]
> **MVP SCOPE TRIMMED (Decision D10):** MVP includes only a **thin field registry** (field_key, labels, helper text, provenance_layer, methodology_governed, basic show_in_pdf). No admin configuration UI, report profiles, per-role visibility, or saved views. The full architecture below is **designed now, built in Phase 2+**.

### 10A.1 Design Principle (APPROVED)

> **"Make presentation flexible, but keep methodology governed."**

- Admin can configure display, labels, column order, export layout, and terminology **without code changes** — **Phase 2**.
- Admin **cannot** casually change calculation meaning, methodology-critical flags, or audit logic — **always enforced**.
- Calculation logic always uses `field_key`, never display labels — **always enforced**.

### 10A.2 Configurable Field Properties

Each field in a configurable report/table should support these properties:

| Property | Type | Purpose |
|----------|------|---------|
| `field_key` | TEXT (immutable) | Programmatic identifier — never changes |
| `label_ar` | TEXT (admin-editable) | Arabic display label |
| `label_en` | TEXT (admin-editable) | English display label |
| `helper_ar` | TEXT (admin-editable) | Arabic tooltip / helper text |
| `helper_en` | TEXT (admin-editable) | English tooltip / helper text |
| `description_ar` | TEXT | Business definition in Arabic |
| `description_en` | TEXT | Business definition in English |
| `sort_order` | INTEGER | Display order in tables and reports |
| `show_in_ui` | BOOLEAN | Visible in web UI tables/detail views |
| `show_in_pdf` | BOOLEAN | Included in PDF exports |
| `show_in_excel` | BOOLEAN | Included in Excel/CSV exports |
| `visible_to_buyer` | BOOLEAN | Visible to buyer/processor role |
| `visible_to_seller` | BOOLEAN | Visible to seller/generator role |
| `visible_to_admin` | BOOLEAN | Visible to admin |
| `is_admin_only` | BOOLEAN | Only visible to admin (overrides buyer/seller) |
| `is_required` | BOOLEAN | Required for data entry (where safe) |
| `is_system_field` | BOOLEAN | System-controlled — cannot be hidden/renamed by admin |
| `report_type` | TEXT | Which report type(s) this field belongs to |
| `section_group` | TEXT | Field grouping/section within report |
| `field_version` | INTEGER | Version tracker for label/config changes |
| `is_active` | BOOLEAN | Soft-delete / deactivation |

### 10A.3 Fixed System-Controlled Fields

These fields **must remain system-controlled** and cannot be hidden, removed, or redefined by admin because reports, calculations, and audits depend on them:

| Field Key | Reason |
|-----------|--------|
| `report_id` | Unique report identifier — audit trail |
| `received_line_id` | Canonical allocation subject — links to physical material line |
| `parent_entity_type` | Report scope identification |
| `parent_entity_id` | Parent operation reference |
| `material_label` | Material identification — core report content |
| `final_received_qty` | Physical quantity — basis for all allocation and rate calculations |
| `final_received_unit` | Unit of measure — required for quantity interpretation |
| `pathway_code` | Pathway identification — calculation input |
| `allocation_qty` | Allocated quantity per pathway — calculation input |
| `allocation_pct` | Percentage per pathway — derived from quantity |
| `allocation_status` | Lifecycle status — determines report eligibility |
| `report_version` | Version tracking — audit trail |
| `methodology_version` | Methodology provenance — audit trail |
| `provenance_layer` | Data source layer (confirmed/declared/estimated/verified) |
| `counts_as_circular` | Pathway classification flag — drives diversion rate calculation |
| `counts_as_energy_recovery` | Pathway classification flag — drives energy recovery rate |
| `audit_timestamps` | created_at, finalized_at, approved_at — immutable audit metadata |
| `buyer_company_id` / `seller_company_id` | Party identification — access control and scoping |

### 10A.4 Admin-Configurable Display Fields

These fields can be safely renamed, reordered, shown, hidden, or included/excluded from PDF/Excel by admin:

| Field Key | Default Visibility | Can Hide? | Can Rename? | Notes |
|-----------|-------------------|-----------|------------|-------|
| `evidence_url` | ✅ Shown | ✅ Yes | ✅ Yes | Optional proof uploads |
| `evidence_type` | ❌ Hidden | ✅ Yes | ✅ Yes | Evidence classification |
| `notes` | ✅ Shown | ✅ Yes | ✅ Yes | Free-text notes |
| `processing_reference` | ❌ Hidden | ✅ Yes | ✅ Yes | Internal batch/lot reference |
| `destination_facility` | ❌ Hidden | ✅ Yes | ✅ Yes | Processing facility name |
| `treatment_certificate` | ❌ Hidden | ✅ Yes | ✅ Yes | Certificate number |
| `confidence_level` | ❌ Hidden | ✅ Yes | ✅ Yes | Confidence badge |
| `confidence_reason` | ❌ Hidden | ✅ Yes | ✅ Yes | Confidence explanation |
| `methodology_footer` | ✅ Shown | ✅ Yes | ✅ Yes | Methodology reference in footer |
| `disclaimer` | ✅ Shown | ❌ No (content protected) | ✅ Yes (label only) | Legal disclaimer — content governed |
| `gri_classification` | ❌ Hidden | ✅ Yes | ✅ Yes | GRI 306-4/306-5 label |
| `co2e_placeholder` | ❌ Hidden | ✅ Yes | ✅ Yes | CO₂e estimation placeholder |
| `value_recovered` | ✅ Shown | ✅ Yes | ✅ Yes | Optional financial context |
| `seller_logo` | ❌ Hidden | ✅ Yes | N/A | Seller branding in PDF |
| `buyer_logo` | ❌ Hidden | ✅ Yes | N/A | Buyer branding in PDF |
| `qr_verification` | ❌ Hidden | ✅ Yes | N/A | Future QR verification placeholder |

### 10A.5 PDF Export Requirements

> [!IMPORTANT]
> Reports should be **professional and branded**, not raw browser prints.

| Requirement | MVP? | Details |
|-------------|------|---------|
| **Tadweerah branding** | ✅ Yes | Logo, brand colors in header |
| **Buyer/processor logo** | ⭕ Phase 2 | Where `company.logo_url` available |
| **Seller/generator logo** | ⭕ Phase 2 | Where appropriate |
| **Report title (AR/EN)** | ✅ Yes | "تقرير أثر الاستدامة" / "Sustainability Impact Report" |
| **Unique report number** | ✅ Yes | Auto-generated: `TDW-SIR-YYYY-NNNN` |
| **Report version** | ✅ Yes | Version N of allocation |
| **Generated date** | ✅ Yes | Report generation timestamp |
| **Summary cards** | ✅ Yes | Circular rate, energy recovery rate, disposal rate, residue rate |
| **Material line detail table** | ✅ Yes | One section per received material line with pathway breakdown |
| **Configurable detail columns** | ✅ Yes | Driven by `sustainability_report_field_config` |
| **Methodology section** | ✅ Yes | GRI reference, waste hierarchy, provenance layers |
| **Disclaimer section** | ✅ Yes | Standard + conditional disclaimers |
| **QR verification placeholder** | ⭕ Future | Empty slot for future report verification QR |
| **RTL Arabic support** | ✅ Yes | Full RTL layout with bilingual support |
| **Print-friendly layout** | ✅ Yes | `@media print` CSS; page breaks; headers/footers |
| **Server-side PDF generation** | ⭕ Phase 3 | Puppeteer or @react-pdf/renderer for email attachments |

**MVP PDF approach:** Browser-rendered print view with `@media print` CSS + `window.print()`. Professional layout with brand header, summary cards, detail tables, methodology footer, and disclaimer.

### 10A.6 Excel Export Requirements

| Requirement | MVP? | Details |
|-------------|------|---------|
| **Summary sheet** | ✅ Yes | Report metadata + aggregate metrics |
| **Detail sheet** | ✅ Yes | Received lines × pathway allocations |
| **Methodology/notes sheet** | ⭕ Phase 2 | Methodology reference + data dictionary |
| **Configurable columns** | ✅ Yes | Driven by field config `show_in_excel` |
| **Arabic or English headers** | ✅ Yes | Based on user language preference |
| **Report metadata** | ✅ Yes | Report number, version, generated date, scope |
| **Units in headers** | ✅ Yes | e.g., "Quantity (tons)" |
| **Totals row** | ✅ Yes | Sum of quantities, weighted avg of rates |
| **Frozen header rows** | ⭕ Phase 2 | Excel-specific formatting |
| **Date range exports** | ✅ Yes | Period reports exportable |
| **Contract/customer aggregates** | ⭕ Phase 2 | Cross-entity Excel exports |
| **UTF-8 BOM** | ✅ Yes | Arabic/Excel compatibility (reuse existing `lib/csv.ts`) |

### 10A.7 Report Profiles (Saved Views)

> [!NOTE]
> Report profiles define pre-configured column sets, orders, filters, and export settings for different audiences and purposes.

**Recommendation: Design now, implement in Phase 2.** MVP uses a single default profile per report type. Phase 2 adds admin-managed profiles.

**MVP default profiles (hardcoded, not yet configurable):**

| Profile Key | Name (EN/AR) | Target Audience | Columns |
|-------------|-------------|-----------------|---------|
| `sustainability_summary` | Sustainability Summary / ملخص الاستدامة | Both parties | Rates, totals, coverage |
| `sustainability_detailed` | Sustainability Detailed / تفصيل الاستدامة | Both parties | All visible fields |

**Future profiles (Phase 2+ — admin-managed):**

| Profile Key | Name | Columns/Filters |
|-------------|------|-----------------|
| `operational_summary` | Operational Summary | Deal/shipment data, financial totals |
| `contract_monthly` | Contract Monthly Report | Monthly aggregate by contract |
| `customer_esg_export` | Customer ESG Export | GRI-aligned data + CO₂e when available |
| `admin_audit` | Admin Audit View | Full audit trail, versions, admin notes |
| `branch_report` | Branch/Location Report | Grouped by company location |

**Profile fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `profile_key` | TEXT UNIQUE | Immutable identifier |
| `name_ar` / `name_en` | TEXT | Display name |
| `selected_columns` | JSONB | Ordered list of `field_key` values to display |
| `default_filters` | JSONB | Pre-applied filters (e.g., status, date range) |
| `show_in_pdf` | BOOLEAN | Whether this profile is available for PDF export |
| `show_in_excel` | BOOLEAN | Whether this profile is available for Excel export |
| `language` | TEXT | Default language for this profile |
| `target_audience` | TEXT | 'buyer' / 'seller' / 'admin' / 'all' |
| `is_system_profile` | BOOLEAN | System-managed vs admin-created |
| `is_active` | BOOLEAN | Soft-delete |

### 10A.8 Methodology & Data Dictionary Layer

> [!IMPORTANT]
> Each important report field should have a lightweight data dictionary entry so Tadweerah can explain to recyclers/processors and waste generators that reports are based on recognized methodology and governed definitions, not arbitrary labels.

**Data dictionary structure (per field):**

| Property | Purpose |
|----------|---------|
| `field_key` | Immutable identifier (matches field config) |
| `label_ar` / `label_en` | Display labels |
| `business_definition_ar` / `business_definition_en` | What this field means in business terms |
| `data_source` | Where the value comes from (e.g., "Platform-confirmed from deal", "Declared by buyer") |
| `provenance_layer` | `confirmed` / `declared` / `estimated` / `verified` |
| `methodology_source` | Reference (e.g., "GRI 306-4", "EU WFD 2008/98/EC", "Tadweerah calculation") |
| `is_system_controlled` | Whether the field's logic is governed |
| `is_admin_configurable` | Whether display/visibility can be changed |
| `appears_in_pdf` | Default PDF visibility |
| `appears_in_excel` | Default Excel visibility |

**MVP implementation:** Store data dictionary entries in the `sustainability_report_field_config` table (extended with `business_definition_ar/en`, `data_source`, `methodology_source` fields). This keeps it lightweight without a separate table.

**Future generalization:** Extract into a platform-wide `report_field_dictionary` table that serves all report types.

### 10A.9 Report Versioning & Snapshotting

> [!CAUTION]
> If admin changes field labels, visibility, or report profile later, old generated reports should remain historically traceable.

**Recommendation: Snapshot at PDF/Excel export time.**

| Element | Snapshot Strategy |
|---------|------------------|
| **Field labels** | Embedded in generated PDF/Excel at export time; not retroactively updated |
| **Report profile version** | `profile_version` integer tracked on profile; incremented on change |
| **Methodology version** | `methodology_version` TEXT on allocation record; logged in audit |
| **Disclaimer version** | `disclaimer_version` tracked; shown in report footer |
| **Factor set version** | Future: `emission_factor_set_version` when CO₂e is activated |
| **Web report view** | Always renders with **current** config (live view); explicitly labeled "current view" |

**Rules:**
- PDF/Excel exports are **static snapshots** — they capture labels, layout, and methodology at generation time.
- Web report views are **live** — they reflect current field config. If config changes, the web view updates.
- Audit log tracks every config change with before/after values.
- Generated reports carry `methodology_version` and `field_config_version` for traceability.

### 10A.10 Scope Separation: MVP vs Phase 2 vs Future (APPROVED — see §1A D11–D17)

| Category | Items |
|----------|-------|
| **MVP (Phase SR-1)** | Thin field registry (field_key, labels, helper, provenance, methodology_governed, show_in_pdf); one fixed sustainability report layout; professional branded PDF (with Arabic spike — D9); provenance legend on ALL rates; non-configurable system fields protected (D7); CO₂e as placeholder only; cross-transaction disclaimer |
| **Phase 2** | Admin config UI (show/hide/reorder/relabel); report profiles/saved views; Excel export with methodology sheet; per-role column visibility; customer-facing methodology page; multi-material allocation UI; CO₂e estimation; advanced label snapshotting |
| **Phase 3 / Future** | QR verification; third-party verifier workflow; Scope 3 feed; GRI 306 export; platform-wide report field dictionary; generalize to operational/deal/contract/branch reports |

---

## 11. Proposed API / Backend Changes

### 11.1 New Route File: `routes/sustainability.ts`

Mounted at `/sustainability` in `src/index.ts`.

#### Buyer/Processor Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/sustainability/eligible` | requireAuth + requireCompany | List eligible entities with allocation status |
| `GET` | `/sustainability/allocations` | requireAuth + requireCompany | List company's allocations (all statuses) |
| `GET` | `/sustainability/allocations/:id` | requireAuth + requireCompany | Single allocation with lines + version history |
| `POST` | `/sustainability/allocations` | requireAuth + requireCompany | Create new allocation (status = `draft`) |
| `PUT` | `/sustainability/allocations/:id` | requireAuth + requireCompany | Update draft allocation (only if `status = 'draft'`) |
| `POST` | `/sustainability/allocations/:id/finalize` | requireAuth + requireCompany | Finalize allocation (validates 100% completeness) |
| `POST` | `/sustainability/allocations/:id/request-revision` | requireAuth + requireCompany | Request post-finalization edit (creates new version, requires `revision_reason`) |
| `GET` | `/sustainability/report` | requireAuth + requireCompany | Generate report (only for finalized/approved allocations) |
| `GET` | `/sustainability/report/export` | requireAuth + requireCompany | Export CSV |

#### Seller/Waste-Generator Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/sustainability/seller-reports` | requireAuth + requireCompany | View reports where company is seller |

#### Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/admin/sustainability/allocations` | requireAdminKey | Platform-wide allocations |
| `GET` | `/admin/sustainability/eligible` | requireAdminKey | Platform-wide eligible entities |
| `POST` | `/admin/sustainability/batch-create` | requireAdminKey | Batch-create pending allocations |
| `POST` | `/admin/sustainability/allocations/:id/review` | requireAdminKey | Review/approve initial finalization |
| `POST` | `/admin/sustainability/allocations/:id/approve-revision` | requireAdminKey | Approve or reject post-finalization revision |
| `POST` | `/admin/sustainability/allocations/:id/override` | requireAdminKey | Admin override allocation (creates new version with audit) |
| `GET` | `/admin/sustainability/report` | requireAdminKey | Platform-wide report |
| `GET` | `/admin/sustainability/report/export` | requireAdminKey | Platform-wide CSV |

#### Lookup & Config Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/sustainability/pathways` | requireAuth | Active pathways |
| `GET` | `/sustainability/field-config` | requireAuth | Active field config |
| `GET` | `/admin/sustainability/pathways` | requireAdminKey | All pathways |
| `POST` | `/admin/sustainability/pathways` | requireAdminKey | Create pathway |
| `PATCH` | `/admin/sustainability/pathways/:id` | requireAdminKey | Update pathway |
| `GET` | `/admin/sustainability/field-config` | requireAdminKey | All field configs |
| `PATCH` | `/admin/sustainability/field-config/:id` | requireAdminKey | Update field config |

### 11.2 Audit Log Integration

| Action | Entity Type | Details |
|--------|------------|---------|
| `sustainability.allocation_draft_saved` | `sustainability_allocation` | `{ entity_type, entity_id, pathway_count, total_allocated_qty, status: 'draft' }` |
| `sustainability.allocation_finalized` | `sustainability_allocation` | `{ entity_type, entity_id, pathway_count, total_qty, version, variance_pct }` |
| `sustainability.allocation_updated` | `sustainability_allocation` | `{ changed_fields, previous_values }` (only while status = 'draft') |
| `sustainability.allocation_reviewed` | `sustainability_allocation` | `{ reviewer_user_id, decision: 'approved'|'rejected', notes }` |
| `sustainability.revision_requested` | `sustainability_allocation` | `{ version, revision_reason, changed_pathways }` |
| `sustainability.revision_approved` | `sustainability_allocation` | `{ version, approver_user_id, previous_version_id }` |
| `sustainability.revision_rejected` | `sustainability_allocation` | `{ version, approver_user_id, rejection_reason }` |
| `sustainability.allocation_superseded` | `sustainability_allocation` | `{ old_version, new_version, superseded_by_id }` |
| `sustainability.batch_pending_created` | `sustainability_allocation` | `{ count, company_id, date_range }` |
| `sustainability.report_generated` | `sustainability_report` | `{ scope, coverage_pct, generated_by }` |
| `sustainability.field_config_changed` | `sustainability_report_field_config` | `{ field_key, changed_fields }` |
| `sustainability.pathway_changed` | `sustainability_pathway` | `{ pathway_key, changed_fields }` |

### 11.3 Notification Integration

| Event | Notification Type | Recipients | Email? |
|-------|-------------------|-----------|--------|
| Allocation submitted | `sustainability_allocation_submitted` | Seller + Admin | In-app only (MVP) |
| Admin requests allocation | `sustainability_allocation_requested` | Buyer | ✅ Email + in-app |
| Admin reviews allocation | `sustainability_allocation_reviewed` | Buyer | In-app only |
| Batch pending tasks created | `sustainability_batch_pending` | Buyer | ✅ Email (summary) |

---

## 12. Proposed Frontend Pages & Components

### 12.1 New Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| `sustainability-dashboard.tsx` | `/sustainability` | Both | Overview: pending/completed counts, coverage stats |
| `sustainability-allocate.tsx` | `/sustainability/allocate/:parentEntityType/:parentEntityId` | Buyer | Line-level pathway allocation form |
| `sustainability-report.tsx` | `/sustainability/report` | Both | Report view/generation |
| `admin-sustainability.tsx` | (tab in `/admin`) | Admin | Management panel |

### 12.2 Modifications to Existing Pages

| Page | Modification |
|------|-------------|
| `reports.tsx` | Add "Sustainability" tab/link |
| `dashboard.tsx` | Add sustainability summary card |
| `participations.tsx` | Add "Sustainability" action on completed deals (buyers) |
| `contract-detail.tsx` | Add "Sustainability" section for closed shipments |
| `admin.tsx` | Add "Sustainability" admin tab |

### 12.3 New Shared Components

| Component | Purpose |
|-----------|---------|
| `ReceivedLineSummaryCard` | **NEW** — Shows one material line: material, qty, unit, allocation progress |
| `PathwayAllocationForm` | Field-config-driven form — renders pathway inputs per received line |
| `ParentOperationHeader` | **NEW** — Shows parent deal/shipment/contract reference + line count + progress |
| `LineAllocationProgress` | **NEW** — "X of Y material lines fully allocated" progress indicator |
| `SustainabilityMetricsCards` | Circular/Energy/Disposal/Residue rate cards (aggregated across lines) |
| `AllocationStatusBadge` | Status badge with Arabic labels |
| `DivertedQuantityChart` | Stacked bar or donut chart |
| `ConfidenceLevelIndicator` | High/medium/low visual indicator |
| `DataLayerLabel` | Data source label (confirmed/declared/estimated) |
| `SustainabilityReportPrintView` | Print-optimized layout with line-level detail |
| `CoverageBar` | % coverage progress bar |
| `MethodologyFooter` | GRI reference + disclaimer in report footer |

### 12.4 Allocation UI Flow (Line-Level)

> [!IMPORTANT]
> The allocation form should be designed around **material lines**, not parent operations.

```
┌──────────────────────────────────────────────────────────┐
│  PARENT OPERATION HEADER                                  │
│  Deal TDW-001  |  Buyer: XYZ Co  |  Status: Completed     │
│  Material Lines: 1 of 1 allocated  [========== 100%]      │
│  (future: 2 of 3 allocated         [======     67%])      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌── MATERIAL LINE 1 ──────────────────────────────┐   │
│  │  Scrap Metal  |  10.000 tons  |  Status: Draft    │   │
│  │                                                    │   │
│  │  Pathway Allocation:                               │   │
│  │  ┌─────────────────┬──────┬───────┐               │   │
│  │  │ Pathway         │ Qty  │ %     │               │   │
│  │  ├─────────────────┼──────┼───────┤               │   │
│  │  │ Recycling       │ 7.0  │ 70.0% │               │   │
│  │  │ Reuse           │ 2.0  │ 20.0% │               │   │
│  │  │ Residue/Loss    │ 1.0  │ 10.0% │               │   │
│  │  └─────────────────┴──────┴───────┘               │   │
│  │  Total: 10.0 / 10.0 tons  |  [Save Draft] [Finalize] │   │
│  └────────────────────────────────────────────────────┘   │
│                                                          │
│  ┌── MATERIAL LINE 2 (future multi-material) ────────┐   │
│  │  Cardboard  |  3.000 tons  |  Status: Pending     │   │
│  │  [Allocate]                                       │   │
│  └────────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**MVP (single material):** Only one material line card is shown (Line 1). The UI is the same, just with one card.

**Future (multi-material):** Multiple material line cards appear. Each is independently allocated. Parent header shows progress.

---

## 13. Proposed PDF / Export / Reporting Approach

### 13.1 Current State

- **CSV:** ✅ Working via `lib/csv.ts` (UTF-8 BOM for Arabic/Excel)
- **PDF:** ❌ No infrastructure
- **Print:** ❌ No `@media print` CSS, no `window.print()` usage
- **Branded layout:** Designed in Phase 2-H but not implemented

### 13.2 Recommended Phased Approach

| Phase | Format | Implementation |
|-------|--------|---------------|
| **MVP** | CSV + Browser print-to-PDF | `@media print` CSS + `window.print()`. No server dependency |
| **Phase 2** | Branded browser print-to-PDF | Tadweerah logo, brand colors, header/footer in print CSS |
| **Phase 3** | Server-side PDF | `puppeteer` or `@react-pdf/renderer` for automated email attachments |

### 13.3 RTL / Arabic Compatibility

| Aspect | Approach |
|--------|---------|
| Text direction | Use existing `document.dir = 'rtl'`; print CSS inherits |
| Bilingual report | Arabic primary, English secondary |
| Number formatting | LTR numbers within RTL layout (existing pattern) |
| Font | Existing app font (or add Noto Naskh Arabic for print) |

---

## 14. Proposed Arabic / English Labels

### 14.1 Core Report Labels

| Key | Arabic | English |
|-----|--------|---------|
| `sustainability.report.title` | تقرير أثر الاستدامة | Sustainability Impact Report |
| `sustainability.report.subtitle` | لعمليات تدويرة المكتملة | For Completed Tadweerah Operations |
| `sustainability.allocation.title` | توزيع مسارات الاستدامة | Sustainability Pathway Allocation |
| `sustainability.allocation.pending` | بانتظار توزيع مسارات الاستدامة | Sustainability allocation pending |
| `sustainability.allocation.completed` | تم توزيع مسارات الاستدامة | Sustainability allocation completed |
| `sustainability.allocation.submit` | تقديم التوزيع | Submit Allocation |
| `sustainability.allocation.update` | تعديل التوزيع | Update Allocation |

### 14.2 Metric Labels

| Key | Arabic | English |
|-----|--------|---------|
| `sustainability.metric.circular_diversion_qty` | كمية التحويل الدائري | Circular Diversion Quantity |
| `sustainability.metric.circular_diversion_rate` | نسبة التحويل الدائري | Circular Diversion Rate |
| `sustainability.metric.energy_recovery_qty` | كمية استرداد الطاقة | Energy Recovery Quantity |
| `sustainability.metric.energy_recovery_rate` | نسبة استرداد الطاقة | Energy Recovery Rate |
| `sustainability.metric.disposal_qty` | كمية المعالجة والتخلص | Disposal / Treatment Quantity |
| `sustainability.metric.disposal_rate` | نسبة المعالجة والتخلص | Disposal / Treatment Rate |
| `sustainability.metric.residue_qty` | كمية الفاقد والمخلفات | Residue / Loss Quantity |
| `sustainability.metric.residue_rate` | نسبة الفاقد والمخلفات | Residue / Loss Rate |
| `sustainability.metric.value_recovered` | القيمة المستردة | Value Recovered |
| `sustainability.metric.final_received_qty` | الكمية النهائية المستلمة | Final Received Quantity |

### 14.3 Pathway, Status, Data Layer, Confidence, and Coverage Labels

| Key | Arabic | English |
|-----|--------|---------|
| `pathway.reuse` | إعادة الاستخدام | Reuse |
| `pathway.repair_refurbishment` | إصلاح وتجديد | Repair / Refurbishment |
| `pathway.remanufacturing` | إعادة التصنيع | Remanufacturing |
| `pathway.recycling` | إعادة التدوير | Recycling |
| `pathway.material_recovery` | استرداد المواد | Material Recovery |
| `pathway.energy_recovery` | استرداد الطاقة / وقود بديل | Energy Recovery / Alt. Fuel |
| `pathway.safe_treatment` | معالجة آمنة | Safe Treatment |
| `pathway.certified_disposal` | تخلص معتمد | Certified Disposal |
| `pathway.residue_loss` | فاقد ومخلفات ومرفوضات | Residue / Loss / Rejected |
| `pathway.other` | أخرى (مع توضيح) | Other (with explanation) |
| `sustainability.status.pending_allocation` | بانتظار التوزيع | Pending Allocation |
| `sustainability.status.draft` | مسودة | Draft |
| `sustainability.status.finalized` | تم الاعتماد | Finalized |
| `sustainability.status.approved` | تمت الموافقة | Approved |
| `sustainability.status.pending_revision` | بانتظار موافقة التعديل | Revision Pending Approval |
| `sustainability.status.rejected` | مرفوض | Rejected |
| `sustainability.status.superseded` | مُستبدَل | Superseded |
| `sustainability.status.not_eligible` | غير مؤهل | Not Eligible |
| `sustainability.layer.confirmed` | بيانات مؤكدة من المنصة | Confirmed platform data |
| `sustainability.layer.declared` | بيانات مُصرَّحة من المشتري/المعالج | Declared by buyer/processor |
| `sustainability.layer.estimated` | بيانات تقديرية محسوبة | Estimated (platform-calculated) |
| `sustainability.layer.verified` | بيانات موثقة من طرف ثالث | Third-party verified data |
| `sustainability.confidence.high` | مستوى ثقة عالي | High Confidence |
| `sustainability.confidence.medium` | مستوى ثقة متوسط | Medium Confidence |
| `sustainability.confidence.low` | مستوى ثقة منخفض | Low Confidence |
| `sustainability.coverage.full` | تغطية كاملة | Complete Coverage |
| `sustainability.coverage.partial` | تغطية جزئية | Partial Coverage |
| `sustainability.coverage.none` | لا تتوفر بيانات استدامة بعد | No sustainability data yet |
| `sustainability.report.not_certificate` | هذا التقرير ليس شهادة بيئية | Not an environmental certificate |

---

## 15. Proposed Confidence-Level Logic

### 15.1 Scoring Model

| Factor | Points | Condition |
|--------|--------|-----------|
| Final quantity: confirmed | +30 | `quantity_source = 'confirmed'` |
| Final quantity: estimated | +10 | `quantity_source = 'estimated'` |
| Weighbridge ticket exists | +20 | `has_weighbridge_ticket = true` |
| Payment proof exists | +10 | `has_payment_proof = true` |
| Dispatch evidence exists | +10 | `has_dispatch_evidence = true` |
| Receipt confirmed on platform | +10 | Entity has `received_at` set |
| Allocation variance ≤ 1% | +10 | `allocation_variance_pct <= 1.0` |
| Allocation variance ≤ 2% | +5 | `allocation_variance_pct <= 2.0` |
| Multiple pathways detailed | +5 | ≥ 2 pathway lines |
| Buyer capability match | +5 | `company_capabilities` check |

### 15.2 Level Thresholds

| Score | Level | Arabic | Visual |
|-------|-------|--------|--------|
| 80–100 | `high` | عالي | 🟢 Green |
| 50–79 | `medium` | متوسط | 🟡 Amber |
| 0–49 | `low` | منخفض | 🔴 Red |

---

## 16. Proposed Disclaimer Wording

### 16.1 Standard Report Disclaimer (Always Shown)

**English:**
> "This report presents estimated environmental indicators based on processing pathways declared by the receiving party and screening-level impact factors. Figures are indicative, are not third-party verified, and do not constitute an environmental certificate or a basis for carbon-offset claims."

**Arabic:**
> «يعرض هذا التقرير مؤشرات بيئية تقديرية تستند إلى مسارات المعالجة المُصرَّح بها من الطرف المستلِم وإلى معاملات أثر أولية. الأرقام استرشادية، وغير مُتحقَّق منها من طرف ثالث، ولا تُعد شهادة بيئية ولا أساسًا لأي ادعاءات تعويض كربوني.»

### 16.2 Conditional Disclaimers

| Condition | Additional Disclaimer (EN) | Additional Disclaimer (AR) |
|-----------|---------------------------|---------------------------|
| `quantity_source = 'estimated'` | "Final received quantities are based on estimated amounts, not confirmed weighbridge measurements." | "الكميات النهائية المستلمة مبنية على تقديرات وليس على قياسات موازين معتمدة." |
| `confidence_level = 'low'` | "Low confidence level due to limited supporting evidence. Results are indicative only." | "مستوى ثقة منخفض بسبب محدودية الأدلة الداعمة. النتائج استرشادية فقط." |
| `coverage_pct < 100` | "Covers X% of eligible operations. Pending allocations excluded from rates." | "يغطي X% من العمليات المؤهلة. العمليات بانتظار التوزيع مستثناة من حساب النسب." |
| CO₂e included (future) | "CO₂e figures are screening-level estimates. Must not be used for carbon credit/offset claims. Avoided emissions do not reduce the generator's own Scope 1/2/3 inventory." | "أرقام CO₂e تقديرات أولية. لا يجب استخدامها لمطالبات ائتمان أو تعويض كربوني. الانبعاثات المتجنبة لا تُخفّض المخزون الكربوني الخاص بالمولّد." |

### 16.3 Methodology Reference (Always Shown in Footer)

**EN:** "Methodology: Pathway allocation based on the waste hierarchy (EU WFD 2008/98/EC) and aligned with GRI 306 (2020) waste disclosure structure. Screening-level indicators only."

**AR:** «المنهجية: توزيع المسارات بناءً على هرم النفايات (EU WFD 2008/98/EC) ومتوافق مع هيكل إفصاح النفايات GRI 306 (2020). مؤشرات أولية فقط.»

### 16.4 Report Footer

**AR:** تدويرة | كل قيمة تستحق أن تعود — تم إصدار هذا التقرير عبر tadweerah.com
**EN:** Tadweerah | Every value deserves to return — Generated via tadweerah.com

### 16.5 Cross-Transaction Scope Disclaimer (APPROVED — see §1A D5, mandatory in every report)

> [!CAUTION]
> This disclaimer is **non-configurable** (§1A D7) and must appear in every sustainability report.

**EN:**
> "This report covers the diversion/management outcome of the received waste/material in this transaction based on processor-declared pathways. It does not create a carbon credit, offset, or duplicate diversion claim for downstream resale of the same mass."

**AR:**
> "يغطي هذا التقرير نتائج تحويل/إدارة النفايات أو المواد المستلمة في هذه المعاملة بناءً على المسارات المُعلنة من قبل المعالج. لا يُنشئ هذا التقرير رصيد كربون أو تعويض أو ادعاء تحويل مكرر لإعادة بيع نفس الكتلة لاحقاً."

---

## 17. CO₂e — Phase 1 Analysis (Options A/B/C)

> [!IMPORTANT]
> "Estimated CO₂e avoided" must never be presented as if it reduces the customer's own carbon inventory. These are separate concepts.

### 17.1 Three Options

#### Option A: Defer CO₂e Entirely
- Show no CO₂e figures at all in Phase 1.
- Report focuses on circular diversion rate.
- Pro: Zero greenwashing risk.
- Con: Misses opportunity to show environmental impact tangibly.

#### Option B: Include CO₂e for Selected Materials/Pathways Only
- Use conservative emission factors for common materials (paper, plastic, metal).
- Show CO₂e only where factors are defensible.
- Pro: Shows impact for most common transactions.
- Con: Inconsistent experience; factor sourcing effort.

#### Option C: Show "Not Estimated" Placeholder ⭐ RECOMMENDED
- Include CO₂e field in report structure and schema.
- Display: "CO₂e estimation: Not yet available / تقدير CO₂e: غير متوفر حاليًا"
- Activate via admin field config when emission factors are sourced.
- Pro: Future-ready schema; zero greenwashing risk; clean upgrade path; sets user expectations.
- Con: Users see empty field (mitigated by explanatory text).

### 17.2 Recommendation: Option C

1. **Schema readiness:** `co2e_avoided_kg` field exists as future extension but is not populated.
2. **Field config driven:** `sustainability_report_field_config` controls visibility. CO₂e fields start hidden.
3. **No factor sourcing needed now:** No emission factor table required for MVP.
4. **Clean upgrade path:** Admin activates field and populates factors — no migration needed.
5. **No greenwashing risk:** Empty field with "not yet available" is honest and safe.
6. **Expectation setting:** Users learn CO₂e will be available, building anticipation.

### 17.3 Future CO₂e Implementation (When Ready)

1. Source factors from EPA WARM, IPCC, or Saudi/MENA-specific databases.
2. Create `emission_factors` table: `material_category_id` × `pathway_id` → kg CO₂e per ton.
3. Calculate: `co2e_avoided = quantity × (baseline_factor - pathway_factor)` where baseline = landfill.
4. Label: "Estimated CO₂e avoided (screening-level)" / "CO₂e المتجنب (تقدير أولي)".
5. Show methodology source per factor in report.
6. Never use: "carbon credit", "carbon offset", "certified reduction", "Scope 1/2/3 reduction".

---

## 18. Risks, Edge Cases & Mitigations

### 18.1 Technical Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| R1 | **Greenwashing liability** | 🔴 High | Disclaimers, "not a certificate", CO₂e deferred (Option C), confidence levels, methodology ref |
| R2 | **Pathway fraud** — 100% recycling claims | 🟡 Medium | Confidence scoring penalizes single-pathway; admin review; future: cross-ref capabilities |
| R3 | **Historical data gaps** | 🟡 Medium | Eligibility requires qty > 0; ineligible clearly marked |
| R4 | **Allocation tolerance abuse** | 🟢 Low | Track variance; admin can flag patterns |
| R5 | **Performance** on large date-range reports | 🟡 Medium | Query limit 5000; indexes; future: materialized summaries |
| R6 | **Double counting** | 🟡 Medium | UNIQUE constraint; canonical unit; contract = SUM of shipments |
| R7 | **Over-flexibility** — admin misconfigures fields | 🟡 Medium | System fields locked; `is_system_field = true` prevents hiding |
| R8 | **Methodology drift** from label customization | 🟢 Low | Calculations use `field_key` not labels; methodology ref is system-controlled |

### 18.2 Business/Operational Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| R9 | **Buyer adoption** | 🟡 Medium | Admin batch-trigger; dashboard visibility; gamification later |
| R10 | **Seller expectation** (report = compliance proof) | 🟡 Medium | Clear labeling; data layer separation |
| R11 | **Regulatory exposure** | 🟢 Low | Report is voluntary; no regulatory claims |
| R12 | **Arabic terminology inconsistency** | 🟢 Low | Admin-configurable labels; UNEP/ISO-aligned defaults |

### 18.3 Edge Cases

| # | Edge Case | Handling |
|---|-----------|---------|
| E1 | Deal with `estimated_amount` only | Eligible with `quantity_source = 'estimated'`; lower confidence |
| E2 | Shipment closed with `final_weight = 0` | Not eligible |
| E3 | Deal reopened after allocation finalized | Active allocation status → `pending_allocation`; buyer re-notified; previous version kept as `superseded` |
| E4 | Contract with partial shipment allocations | Report shows partial coverage; only finalized/approved in metrics |
| E5 | Admin overrides buyer allocation | Creates new version; previous version marked `superseded`; audit log with diff |
| E6 | Pathway deactivated after allocation | Remains on existing allocations; new allocations cannot use it |
| E7 | `other` pathway without explanation | Rejected by validation |
| E8 | Zero eligible operations | Show "No eligible operations found" / "لا توجد عمليات مؤهلة" |
| E9 | Allocation gap — total < received qty | Reject: "Please allocate remaining to residue/loss/other" |
| E10 | Field config changed between allocation and report | Report renders with current config; exported PDFs are static |
| E11 | Buyer saves draft and abandons | Draft persists indefinitely; shown in dashboard as "Draft"; no auto-cleanup |
| E12 | Buyer attempts finalization with incomplete allocation | Rejected by validation gate; stays `draft` with error message |
| E13 | Concurrent revision request while previous revision pending | Rejected: "A revision is already pending approval" |
| E14 | Deal is by_weight vs fixed_price | No difference — sustainability allocation always based on physical `actual_quantity` or `estimated_amount`, never on pricing model |
| E15 | Contract shipment with different weight policy | No difference — sustainability allocation always based on `final_weight`, regardless of how it was derived (source_weight_only, dual_higher, etc.) |
| E16 | Aggregate report with mix of draft/finalized/pending entities | Only `finalized`/`approved` entities included in metric calculations; draft/pending shown separately with counts |

---

## 19. Three Implementation Options — Comparison

| Criterion | Option 1 (Simple) | Option 2 (MVP) ⭐ | Option 3 (Advanced ESG) |
|-----------|-------------------|-------------------|------------------------|
| Implementation time | 1–2 weeks | 4–6 weeks | 12–20 weeks |
| New DB tables | 0 (column add) | 4 | 8+ |
| New API endpoints | 2–3 | 15–18 | 25+ |
| New UI pages | 0 (dropdown only) | 4 | 6+ |
| Credibility | Low | High | Very high |
| Greenwashing protection | Medium | High | Medium (CO₂e risk) |
| CO₂e | No | Placeholder (Option C) | Yes (with risk) |
| Third-party verification | No | No (future-ready) | Yes |
| Historical/retroactive | Simple | Full | Full + automated |
| Confidence scoring | No | Yes | Yes |
| ESG framework alignment | No | Partial (GRI 306) | Full (GRI + GHG) |
| Configurable fields | No | Yes | Yes |
| Methodology references | No | Yes | Yes |
| Double-counting prevention | N/A | Canonical unit + UNIQUE | Same |
| Gap reconciliation | N/A | Explicit (never silent) | Same |
| Admin configurability | No | Pathway + field config | Full ESG admin |

---

## 20. Recommended Option & Justification

### ⭐ Option 2 — MVP Pathway-Allocation Sustainability Report

1. **Credibility × Speed:** Delivers a methodology-backed, defensible report within 4–6 weeks.
2. **Greenwashing protection:** Pathway allocation forces specificity; CO₂e deferred via Option C.
3. **Architecture fit:** Four additive tables following Tadweerah's patterns. Zero modifications to existing tables.
4. **Methodology grounding:** GRI 306 structural alignment and waste hierarchy references.
5. **Customer value:** Both sellers and buyers get tangible sustainability metrics.
6. **Historical support:** Lazy eligibility + admin batch triggers cover all completed records.
7. **Configurable display:** Admin adjusts visible fields without breaking methodology.
8. **Future-ready:** Clean upgrade path to CO₂e, verification, ESG dashboards.

---

## 21. Recommended Implementation Phasing (APPROVED — see §1A D11–D17)

### Phase SR-0: Technical Spike — Arabic PDF (Week 0, ~2 days)
- [ ] Render test PDF with real Arabic content, bilingual labels, tables, page breaks, logo, disclaimer
- [ ] Test browser `window.print()` with RTL Arabic + `@media print` CSS
- [ ] Test server-side Puppeteer/headless Chromium as fallback
- [ ] **Decision gate:** Choose browser print vs server-side PDF for MVP
- [ ] Document results and share with CTO

### Phase SR-1: Foundation (Weeks 1–2)
- [ ] Database schema: Create 5 new tables via Drizzle migration
  - `sustainability_pathways`
  - `sustainability_received_lines` ⭐ (NEW in v2.3)
  - `sustainability_allocations` (with `received_line_id` FK)
  - `sustainability_allocation_lines`
  - `sustainability_report_field_config` (thin field registry)
- [ ] Seed `sustainability_pathways` with 10 pathways (GRI mappings, hierarchy tiers)
- [ ] Seed thin field registry with MVP field definitions (key, labels, provenance, methodology_governed, show_in_pdf)
- [ ] Backend: `routes/sustainability.ts` — pathway lookup + field config endpoints
- [ ] Backend: Eligibility query (deals + shipments) **with cross-transaction exclusion** (see §6.5)
- [ ] Backend: Auto-derive `sustainability_received_lines` on deal completion / shipment close
- [ ] Backend: Allocation submission endpoint with gap reconciliation validation (100%, no silent balancing)
- [ ] Audit log integration for sustainability actions
- [ ] i18n: Add all sustainability labels (~100 keys)

### Phase SR-2: Buyer Allocation UI (Weeks 2–4)
- [ ] Frontend: `sustainability-dashboard.tsx` — pending allocations list
- [ ] Frontend: `ParentOperationHeader` + `ReceivedLineSummaryCard` (line-level UI)
- [ ] Frontend: `PathwayAllocationForm` (thin-field-registry-driven rendering)
- [ ] Frontend: `sustainability-allocate.tsx` — line-level allocation page
- [ ] Frontend: Action buttons on completed deals and closed shipments
- [ ] Frontend: Draft → finalize lifecycle
- [ ] Frontend: Post-finalization revision flow (reason + audit + admin approval)
- [ ] Backend: Company-scoped allocation listing endpoint

### Phase SR-3: Report Generation + PDF (Weeks 3–5)
- [ ] Backend: Report generation endpoint with metrics calculation
- [ ] Backend: Provenance + confidence on ALL rates (diversion, energy, disposal, residue)
- [ ] Frontend: `sustainability-report.tsx` — fixed report layout
- [ ] Frontend: `SustainabilityMetricsCards` with provenance badges on each rate
- [ ] Frontend: `ConfidenceLevelIndicator`, `DataLayerLabel`
- [ ] Frontend: `MethodologyFooter` with GRI reference + cross-transaction disclaimer
- [ ] Frontend: Professional branded PDF (per spike results from SR-0)
- [ ] Snapshotting: qty, allocations, version, disclaimer_version, methodology_version
- [ ] Report numbering: `TDW-SIR-YYYY-NNNN`
- [ ] Reports tab split: **Operational | Sustainability**

### Phase SR-4: Admin, Historical & Polish (Weeks 4–6)
- [ ] Backend: Admin sustainability endpoints (list, review, batch-create)
- [ ] Frontend: Admin sustainability tab
- [ ] Backend: Batch auto-derive received lines for historical completed deals/shipments
- [ ] Backend: Admin batch-create pending allocations for historical records
- [ ] Backend: Seller-facing report endpoints
- [ ] Frontend: Seller sustainability view
- [ ] Notification integration (allocation requested, submitted, finalized)
- [ ] Non-configurable fields enforcement (§1A D7)

### Phase SR-5: Testing & UAT (Week 6)
- [ ] Integration testing across deal + shipment + contract flows
- [ ] RTL/Arabic layout verification in PDF
- [ ] Cross-transaction double-counting edge cases
- [ ] Edge case testing (E1–E10)
- [ ] UAT script creation
- [ ] Documentation updates

### Phase 2 (Future — Designed, Not Built)
- [ ] Admin presentation-config UI (show/hide/reorder/relabel)
- [ ] Report profiles / saved views
- [ ] Excel export with summary + detail + methodology sheets
- [ ] Customer-facing methodology page
- [ ] Per-role column visibility
- [ ] Multi-material entry + multi-line allocation UI
- [ ] CO₂e estimation (after factor governance)
- [ ] Factor governance workflow
- [ ] Customer period summaries
- [ ] Advanced snapshotting (presentation labels)

### Phase 3 (Future)
- [ ] QR verification on reports
- [ ] Third-party verifier workflow
- [ ] Scope 3 emission feed
- [ ] GRI 306 structured export
- [ ] Advanced customer ESG dashboards
- [ ] Server-side PDF (if not already from spike)

---

## 22. Exact Files Likely Affected

### New Files

| File | Location | Purpose |
|------|----------|---------|
| `sustainability-pathways.ts` | `lib/db/src/schema/` | Drizzle schema |
| `sustainability-received-lines.ts` | `lib/db/src/schema/` | Drizzle schema ⭐ NEW in v2.3 |
| `sustainability-allocations.ts` | `lib/db/src/schema/` | Drizzle schema |
| `sustainability-allocation-lines.ts` | `lib/db/src/schema/` | Drizzle schema |
| `sustainability-report-field-config.ts` | `lib/db/src/schema/` | Drizzle schema (thin field registry) |
| `sustainability.ts` | `artifacts/api-server/src/routes/` | Express router |
| `sustainability-dashboard.tsx` | `artifacts/tadweerah/src/pages/` | Dashboard page |
| `sustainability-allocate.tsx` | `artifacts/tadweerah/src/pages/` | Line-level allocation form page |
| `sustainability-report.tsx` | `artifacts/tadweerah/src/pages/` | Report view page |
| `sustainability-print.css` | `artifacts/tadweerah/src/styles/` | Print / PDF CSS |
| Drizzle migration file | `lib/db/drizzle/` | Auto-generated |

### Modified Files

| File | Location | Change |
|------|----------|--------|
| `index.ts` | `lib/db/src/schema/` | Export new schema tables |
| `index.ts` | `artifacts/api-server/src/` | Register `/sustainability` router |
| `index.tsx` | `artifacts/tadweerah/src/i18n/` | Add ~100 sustainability i18n keys |
| `App.tsx` (or router) | `artifacts/tadweerah/src/` | Add sustainability routes |
| `reports.tsx` | `artifacts/tadweerah/src/pages/` | Add "Sustainability" tab/link |
| `dashboard.tsx` | `artifacts/tadweerah/src/pages/` | Add sustainability summary card |
| `participations.tsx` | `artifacts/tadweerah/src/pages/` | Add allocation action on completed deals |
| `contract-detail.tsx` | `artifacts/tadweerah/src/pages/` | Add allocation link on closed shipments |
| `admin.tsx` | `artifacts/tadweerah/src/pages/` | Add "Sustainability" admin tab |
| `lib/audit.ts` | `artifacts/api-server/src/` | Add sustainability action constants |

### Unchanged Files (Confirmed)

All existing schema files, `routes/deals.ts`, `routes/contracts.ts`, `routes/reports.ts`, `jobs/expire-deals.ts`, `lib/email.ts`, `lib/csv.ts` — zero modifications.

---

## 23. Documentation Updates Required

### `docs/PROJECT_MAP.md`

| Section | Change |
|---------|--------|
| §1 Monorepo Structure | Add sustainability schema files to tree |
| §2 Route Files | Add `routes/sustainability.ts` row |
| §3 Database Schema | Add 4 new tables to table list |
| §9 Frontend Pages | Add 3 new page entries |
| §11 Phase Roadmap | Add Phase SR-1 through SR-5 |

### `docs/READINESS_FINDINGS_AND_RISKS.md`

| Section | Change |
|---------|--------|
| §2 Active Risks | Add sustainability-specific risks (R1–R12) |
| §4 Single Source of Truth | Add pathway lookup + field config as SOT |
| §7 Readiness Scoring | Add "Sustainability Reporting" scoring row |
| §8 Phase Roadmap | Add Phase SR entry |

### `docs/OPERATIONAL_RULES_AND_NOTIFICATIONS_AUDIT.md`

| Section | Change |
|---------|--------|
| §6 Notification Inventory | Add sustainability notification types |
| §8 Contract Lite Rules | Cross-reference sustainability allocation for closed shipments |
| New §13 | Sustainability Reporting Rules — allocation validation, tolerance, confidence, disclaimers |

---

## 24. Open Questions for Founder / CTO

> [!NOTE]
> Questions resolved in v2.3 are marked with ✅. Remaining open questions must be resolved before or during implementation.

### ✅ Resolved in v2.3

| # | Question | Decision |
|---|---------|----------|
| Q1 | Confirm Option 2? | ✅ **Approved** — MVP Pathway-Allocation Sustainability Report |
| Q9 | CO₂e approach? | ✅ **Option C** — placeholder only, no estimation in MVP |
| Q15 | Introduce `sustainability_received_lines` now? | ✅ **Option A — approved** (methodologically correct, not just migration convenience) |
| Q18 | Report profiles in MVP? | ✅ **Phase 2** — designed now, built later |
| Q20 | PDF approach? | ✅ **Technical spike first** — browser print tested against server-side; decision after spike |
| Q21 | Excel methodology sheet in MVP? | ✅ **Phase 2** |
| Q22 | Snapshot labels at export? | ✅ **MVP snapshots values/versions** — defer label snapshotting to Phase 2 unless needed for PDF |

### Still Open — Architecture & Scope

| # | Question | Options | Impact |
|---|---------|---------|--------|
| Q2 | **Should pathway allocation be mandatory for future completions?** | Yes / No (optional) | Workflow complexity |
| Q3 | **Should admin review be required before report is "final"?** | Yes / No (buyer-sufficient for MVP) | Admin workload |
| Q4 | **Should sellers receive notification when buyer submits allocation?** | Yes / No | Notification volume |
| Q5 | **Should sustainability reports be visible to both parties?** | Both / Buyer-only | Access control |

### Still Open — Data & Methodology

| # | Question | Options | Impact |
|---|---------|---------|--------|
| Q6 | **Default allocation tolerance %?** | 1% / 2% / 5% / Admin-configurable | Validation strictness |
| Q7 | **Should "Other" pathway count as circular diversion?** | Yes / No / Admin per-case | Rate calculation |
| Q8 | **Is the pathway list complete? Saudi-specific additions?** | Complete / Add pathways | Seed data |

### Still Open — Naming & Branding

| # | Question | Options | Impact |
|---|---------|---------|--------|
| Q10 | **Confirm report name: "تقرير أثر الاستدامة"?** | Confirm / Alternative | Labels, print |
| Q11 | **Should report carry Tadweerah tagline?** | Yes / No / Different tagline | Footer |
| Q12 | **Confirm disclaimer wording (including cross-transaction scope)?** | Confirm / Edit | Legal text |

### Still Open — Priority & Timeline

| # | Question | Options | Impact |
|---|---------|---------|--------|
| Q13 | **Target timeline for Phase SR-0 (PDF spike)?** | Immediate / After current phase | Blocking for SR-3 |
| Q14 | **Historical backfill: admin batch or lazy?** | Admin batch / Lazy / Hybrid | Phase SR-4 |

### Still Open — Multi-Material & Cross-Transaction

| # | Question | Options | Impact |
|---|---------|---------|--------|
| Q16 | **When multi-material arrives, auto-derive lines from new parent schema?** | Auto-derive / Manual admin trigger / Hybrid | Automation level |
| Q17 | **Should MVP allocation UI use line-level layout (future-ready)?** | Yes (line-level now) / No (flat form, redesign later) | Frontend effort |
| Q19 | **Should data dictionary be visible to end users or admin-only?** | Both / Admin-only (MVP) / Both (Phase 2) | UI complexity |

### NEW — Cross-Transaction & Eligibility (v2.3)

| # | Question | Options | Impact |
|---|---------|---------|--------|
| Q23 | **How to flag processed-output resale vs original-waste listings?** | New listing attribute (`is_processed_output`) / Listing type classification / Waste-type enum | Cross-transaction eligibility query |
| Q24 | **Should the cross-transaction disclaimer be a mandatory non-removable section in every PDF?** | Yes (always) / Only when applicable / Admin-choosable | Legal protection |
| Q25 | **If a buyer corrects a received quantity after allocation is finalized, should the allocation be auto-invalidated or manually re-evaluated?** | Auto-invalidate + notify / Manual admin review / Both (auto-flag + admin review) | Supersede workflow |

---

## Appendix A: Existing Schema Fields Relevant to Sustainability

### Deals

| Field | Used For | Notes |
|-------|----------|-------|
| `id` | Entity reference | `sustainability_received_lines.parent_entity_id` |
| `status` | Eligibility check | Must be `completed` |
| `buyer_company_id` | Allocation actor | Who submits pathway allocation |
| `producer_company_id` | Report recipient | Seller sees impact of their waste |
| `actual_quantity` | Final received qty (preferred) | Set for by_weight deals at dispatch |
| `estimated_amount` | Final received qty (fallback) | Used if `actual_quantity` is NULL |
| `received_at` | Completion timestamp | Date filter for reports |
| `payment_proof_url` | Evidence quality | Confidence score |

### Contract Shipments

| Field | Used For | Notes |
|-------|----------|-------|
| `id` | Entity reference | `sustainability_received_lines.parent_entity_id` |
| `status` | Eligibility check | Must be `closed` |
| `final_weight` | Final received qty | Immutable after close; primary qty source |
| `closed_at` | Completion timestamp | Date filter for reports |
| `source_ticket_url` | Evidence quality | Dispatch weighbridge ticket |
| `destination_ticket_url` | Evidence quality | Receipt weighbridge ticket |
| `contract_id` | Contract-level aggregation | Group shipments by contract |
| `material_line_id` | Material identification | Links to material category |

### Material Categories

| Field | Used For | Notes |
|-------|----------|-------|
| `name_ar` / `name_en` | Material label in report | Human-readable material name |
| `hazard_level` | Report context | Whether material is hazardous |
| `regulatory_code` | Future: emission factor lookup | Key for matching emission factors |
| `physical_state` | Report context | Solid/liquid/gas |

---

## Appendix B: Integration Points with Existing Flows

### 1. Marketplace Deal Flow
```
Listing → Offer → Deal → Payment → Dispatch → Receipt → Completed
                                                              │
                                                              └→ Eligible for sustainability allocation (buyer)
                                                                  └→ Sustainability Impact Report
```

### 2. Shipment Flow
```
Contract → Material Line → Shipment (planned → dispatched → received → closed)
                                                                          │
                                                                          └→ Eligible for sustainability allocation (buyer)
                                                                              └→ Sustainability Impact Report (per shipment)
```

### 3. Contract Delivery Flow (Aggregate)
```
Contract (active → completed)
    ├── Shipment 1 (closed) → Allocation 1
    ├── Shipment 2 (closed) → Allocation 2
    ├── Shipment 3 (closed) → Allocation 3 (pending)
    └── Contract-level Report = SUM(Allocation 1 + 2)
            Coverage: 66% (2 of 3 allocated)
```

### 4. Existing Reports (Unchanged)
```
Current:  Operational Report (deals/shipments) → CSV export
Proposed: Sustainability Impact Report → CSV + Browser PDF
          ↑ Separate report, separate tab, separate endpoint
          ↑ Does NOT replace or modify operational reports
```

### 5–8. Dashboard & Admin Integration
- **Seller dashboard:** + Sustainability summary card
- **Buyer dashboard:** + Pending allocations count with link
- **Admin panel:** + "Sustainability" tab (allocations, eligibility, batch-create, field config, review)
- **Future summaries:** Monthly/annual company-level and platform-level aggregations

---

## Appendix C: Methodology Quick-Reference for Stakeholders

### What is this report?
A **Sustainability Impact Report** (تقرير أثر الاستدامة) that documents what happened to waste materials after they were received by the buyer/processor through the Tadweerah platform.

### What methodology does it use?
- **Waste hierarchy** (EU Waste Framework Directive 2008/98/EC) — prioritizes reuse > recycling > recovery > disposal
- **GRI 306 (2020)** waste disclosure structure — separates waste diverted from disposal vs. directed to disposal
- **Screening-level indicators only** — not third-party verified, not suitable for carbon credit claims

### What does it NOT do?
- ❌ NOT an environmental certificate
- ❌ Does NOT claim carbon credits or offsets
- ❌ Does NOT represent third-party verification
- ❌ Does NOT reduce the waste generator's carbon inventory
- ❌ Does NOT claim GRI compliance (follows GRI structure for future readiness)

### What data sources does it use?
1. **Confirmed data** from Tadweerah platform (quantities, dates, parties)
2. **Declared data** from the buyer/processor (pathway allocations)
3. **Estimated data** calculated by the platform (rates, percentages)
4. **Verified data** from third parties (future — not yet available)

---

*End of Engineering Discovery Document (v2)*
*Phase: Sustainability Reports 0-A — Design Review Only*
*No implementation, migration, commit, or deployment approved unless separately authorized.*
