# Phase 3-B Batch 1: Implementation Plan

Last updated: 2026-06-29
Mode: Planning (No Implementation)
Prerequisite: [01_BATCH_1_QUANTITY_SOURCE_AUDIT.md](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/docs/phase-3b-source-of-truth-audit/01_BATCH_1_QUANTITY_SOURCE_AUDIT.md)
Evidence baseline: [08A_VISUAL_DIAGRAMS.md](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md)

---

## 1. Owner-Approved Quantity Definitions

| Term | Arabic | English | Source | Definition |
|---|---|---|---|---|
| **Received Quantity** | الكمية المستلمة | Received Quantity | `sustainability_received_lines.final_received_qty` | Total weight received by the buyer/processor from the source transaction (deal or contract shipment). Context only — does NOT represent sustainability impact. |
| **Allocated Quantity** | الكمية الموزعة للاستدامة | Allocated Sustainability Quantity | `SUM(sustainability_allocation_lines.quantity)` for the active allocation | Total weight distributed across sustainability pathways. This IS the reportable sustainability impact. |
| **Remaining Quantity** | الكمية المتبقية غير الموزعة | Remaining Unallocated Quantity | Computed: `final_received_qty - SUM(allocation_lines.quantity)` | Weight not yet assigned to any pathway. |
| **Reportable Sustainability Quantity** | كمية التقرير المعتمدة | Reportable Sustainability Quantity | Same as Allocated Quantity when `status = 'finalized'` | The quantity that may appear on sustainability certificates and reports as verified impact. |
| **Allocation Coverage** | نسبة التوزيع | Allocation Coverage | Computed: `(allocated_qty / received_qty) * 100` | Percentage of received material that has been assigned to pathways. 100% = fully allocated. |

**Owner decision:** The 40 / 35 / 5 case renders as:
- 40 طن = Received Quantity (context)
- 35 طن = Allocated / Reportable Sustainability Quantity (primary)
- 5 طن = Remaining Unallocated
- 87.5% = Allocation Coverage

---

## 2. Backend Changes Needed

### 2.1. Endpoint: `GET /api/reports/sustainability` (Reports List)

**File:** [reports.ts](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/reports.ts)

**Current behavior:** The `groupedMap` sets `quantity: Number(row.final_received_qty).toString()` as the top-level quantity.

**Required change:**
- Keep `quantity` field mapped to `final_received_qty` for backward compatibility (it already has that name in the response shape).
- **Add new explicit fields:**
  - `received_qty` — alias of `final_received_qty` (explicit name)
  - `allocated_qty` — sum of `pathway.quantity` from the `pathways` array
  - `allocation_coverage_pct` — `(allocated_qty / received_qty) * 100`
- After building the `groupedMap`, compute `allocated_qty` from the accumulated `pathways` array.
- The existing `quantity` field can remain for backward compatibility but the frontend must switch to reading `allocated_qty` for sustainability impact display.

**Compatibility risk:** LOW. The `quantity` field keeps its current value. New fields are additive.

**CSV export:** Update the sustainability CSV export to include both `Received Qty` and `Allocated Qty` columns. The current single `الكمية المستلمة` column must be split into two.

### 2.2. Endpoint: `GET /api/reports/sustainability/:id` (Print Detail)

**File:** [reports.ts](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/reports.ts)

**Current behavior:** Same as 2.1 — `quantity: row.final_received_qty`.

**Required change:**
- Add `received_qty`, `allocated_qty`, `allocation_coverage_pct` to the single-item response.
- Compute `allocated_qty` from the accumulated pathways after grouping.

### 2.3. Endpoint: `GET /api/admin/sustainability/allocations` (Admin List)

**File:** [admin.ts](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/admin.ts)

**Current behavior:** Returns `received_line.final_received_qty` in each row. No pathway-sum field.

**Required change:**
- Add a subquery or post-processing step to compute the sum of `sustainability_allocation_lines.quantity` per allocation and return it as `total_allocated_qty` alongside `final_received_qty`.
- Add `allocation_coverage_pct` as a computed field.

**Approach options:**

| Option | Description | Risk |
|---|---|---|
| **A: SQL subquery** | Add a correlated subquery `(SELECT SUM(quantity) FROM sustainability_allocation_lines WHERE allocation_id = …)` to the main query. | Clean, single round-trip. Slightly more complex SQL. |
| **B: Post-query compute** | After fetching rows, batch-load allocation line sums and merge. | Simpler SQL but extra round-trip. |

**Recommended: Option A** — correlated subquery is standard, avoids N+1, and the allocation_lines table is small per allocation.

### 2.4. Endpoint: `GET /api/admin/sustainability/allocations/:id/details` (Admin Detail)

**File:** [admin.ts](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/admin.ts)

**Current behavior:** Returns `allocation` and `pathways` (with individual `quantity` per pathway). No summary sum.

**Required change:**
- Add `total_allocated_qty` and `allocation_coverage_pct` to the response (computed from the pathways array sum vs. the received line's `final_received_qty`).
- To get `final_received_qty`, join or fetch the `sustainability_received_lines` row (it is already linked via `allocation.received_line_id`).

### 2.5. New Field Naming Decision

> [!IMPORTANT]
> **Use new explicit field names rather than reusing `quantity`.** The existing `quantity` field in the reports response is ambiguous — it currently holds `final_received_qty` but its name implies it could be the reportable value. All new consumers should read `allocated_qty` / `received_qty` explicitly. The old `quantity` field may remain for backward compatibility during migration.

**New fields added to API responses:**

| Field | Type | Description |
|---|---|---|
| `received_qty` | `string` (numeric) | Same as `final_received_qty`. Explicit name. |
| `allocated_qty` | `string` (numeric) | Sum of pathway line quantities. |
| `remaining_qty` | `string` (numeric) | `received_qty - allocated_qty`. |
| `allocation_coverage_pct` | `string` (numeric) | `(allocated_qty / received_qty) * 100`. |

---

## 3. Frontend Changes Needed

### 3.1. `/sustainability/allocations` — Allocation List

**File:** [sustainability-allocations.tsx](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/tadweerah/src/pages/sustainability-allocations.tsx)

**Current:** Displays `rl.final_received_qty` as "Quantity" in each row.

**Change:**
- For finalized allocations: display `allocated_qty` as the primary quantity with label الكمية الموزعة للاستدامة.
- Show `received_qty` as secondary context (smaller text or tooltip).
- For draft/non-finalized: continue showing `received_qty` as the reference, since no allocation has been approved yet.

### 3.2. `/sustainability/allocations/:id` — Allocation Detail

**File:** [sustainability-allocation-detail.tsx](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/tadweerah/src/pages/sustainability-allocation-detail.tsx)

**Current:** Already correctly computes `currentTotalAllocated` and `remaining` from draft lines. Displays الكمية المستلمة الإجمالية, إجمالي التوزيع, and الكمية المتبقية.

**Change:**
- Minimal. This page is already correct in its computation.
- Update labels to use the approved terminology (if current labels differ).
- Add نسبة التوزيع if not already shown.

### 3.3. `/reports` — Sustainability Reports Tab

**File:** [reports.tsx](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/tadweerah/src/pages/reports.tsx)

**Current:** Renders `row.quantity` (which is `final_received_qty`) as the primary quantity in the sustainability tab table.

**Change:**
- Primary column: switch to `row.allocated_qty` with label الكمية الموزعة للاستدامة / Allocated Qty.
- Secondary context: show `row.received_qty` with label الكمية المستلمة / Received Qty (smaller or additional column).
- Add نسبة التوزيع / Coverage column showing `row.allocation_coverage_pct`.
- If `allocated_qty < received_qty`, show a visual indicator (e.g., amber badge "87.5%") so users understand partial allocation at a glance.

### 3.4. `/reports/sustainability/:id/print` — Print Certificate

**File:** [sustainability-print.tsx](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/tadweerah/src/pages/sustainability-print.tsx)

**Current:** Shows الكمية المستدامة المرتبطة المعتمدة / "Finalized Sustainability Qty" using `row.quantity` (= `final_received_qty`).

**Change:**
- Primary highlight: الكمية الموزعة للاستدامة المعتمدة / "Finalized Allocated Sustainability Qty" → `row.allocated_qty`.
- Context field: الكمية المستلمة / "Received Quantity" → `row.received_qty`.
- Show نسبة التوزيع / "Allocation Coverage" → `row.allocation_coverage_pct`.
- If `allocation_coverage_pct < 100`, add a visual note: "X% of received quantity was allocated to sustainability pathways."

### 3.5. `/admin` — Sustainability Tab

**File:** [admin.tsx](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/tadweerah/src/pages/admin.tsx)

**Current:** Renders `rl.final_received_qty` in the الكمية column. The detail expansion shows pathway quantities individually.

**Change:**
- Main table الكمية column: show as `[allocated_qty] / [received_qty]` (e.g., `35 / 40 طن`).
- Add نسبة التوزيع column or inline badge.
- Detail expansion: already shows pathway breakdown — add a summary row "إجمالي الموزع" showing `total_allocated_qty`.

---

## 4. Report and Print Behavior

### What drives sustainability impact:
- **`allocated_qty`** (sum of `sustainability_allocation_lines.quantity`) drives the reportable sustainability impact number.
- This is the number that appears as the headline on certificates and reports.

### What appears as context:
- **`received_qty`** appears as a reference/context field.
- **`remaining_qty`** appears as an informational field showing the gap.
- **`allocation_coverage_pct`** appears as a progress/completeness indicator.

### Partial allocation display:
- If `allocated_qty == received_qty`: show a single clean number as the sustainability impact.
- If `allocated_qty < received_qty`: show `allocated_qty` as the primary sustainability impact, and display a clear contextual note: "87.5% of received quantity allocated to sustainability pathways" (or Arabic equivalent).
- Never present `received_qty` as the sustainability impact when there is a non-zero remaining quantity.

---

## 5. Terminology Changes for Batch 1

| Current Label | New Label (Arabic) | New Label (English) | Where Used |
|---|---|---|---|
| الكمية (ambiguous) | الكمية المستلمة | Received Quantity | Admin table, reports list (context column) |
| الكمية المستدامة المرتبطة المعتمدة | الكمية الموزعة للاستدامة المعتمدة | Finalized Allocated Sustainability Qty | Print certificate primary |
| — (new) | الكمية الموزعة للاستدامة | Allocated Sustainability Quantity | Reports tab primary column |
| — (new) | الكمية المتبقية غير الموزعة | Remaining Unallocated Quantity | Detail views, admin detail |
| — (new) | كمية التقرير المعتمدة | Reportable Sustainability Quantity | Documentation / API field |
| — (new) | نسبة التوزيع | Allocation Coverage | All views showing coverage |

> [!NOTE]
> Terminology changes in i18n keys should be added as new keys. Existing keys should remain until all consumers are migrated to avoid breaking other pages.

---

## 6. UAT Cases

### UAT-1: Fully Allocated (40 / 40 / 0)

| Check | Expected |
|---|---|
| Allocation detail | Received: 40, Distributed: 40, Remaining: 0, Coverage: 100% |
| Reports tab | Allocated Qty: 40, Received Qty: 40, Coverage: 100% |
| Print certificate | Finalized Allocated Sustainability Qty: 40 |
| Admin table | 40 / 40 (100%) |
| CSV export | Both columns show 40 |

### UAT-2: Partially Allocated (40 / 35 / 5)

| Check | Expected |
|---|---|
| Allocation detail | Received: 40, Distributed: 35, Remaining: 5, Coverage: 87.5% |
| Reports tab | Allocated Qty: 35, Received Qty: 40, Coverage: 87.5% |
| Print certificate | Finalized Allocated Sustainability Qty: 35, Received: 40, note about partial |
| Admin table | 35 / 40 (87.5%) |
| CSV export | Allocated: 35, Received: 40 |

### UAT-3: Draft Allocation (30 / 0 / 30)

| Check | Expected |
|---|---|
| Allocation detail | Received: 30, Distributed: 0, Remaining: 30, Coverage: 0% |
| Reports tab | Should NOT appear in finalized reports (status = draft) |
| Admin table | 0 / 30 (0%) with draft status badge |

### UAT-4: Not Eligible (50 / 0 / 50)

| Check | Expected |
|---|---|
| Allocation detail | Shows "not eligible" state, no allocation possible |
| Reports tab | Should NOT appear (not finalized) |
| Admin table | If visible, shows 0 / 50 with ineligible indicator |

### UAT-5: Admin View

| Check | Expected |
|---|---|
| Sustainability table loads | Columns include الكمية with allocated/received split |
| Detail expansion | Shows pathway breakdown AND total allocated summary |
| Correction request flow | Unaffected by quantity display changes |

### UAT-6: Report Tab

| Check | Expected |
|---|---|
| Sustainability tab loads | Primary quantity = allocated_qty |
| CSV export | Both received and allocated columns present |
| عرض التقرير button | Navigates to print route (if safely reachable) |

### UAT-7: Print Route (if safely reachable)

| Check | Expected |
|---|---|
| Page renders | Primary headline = allocated_qty, not received_qty |
| Partial allocation note | Visible when coverage < 100% |
| Browser print dialog | Renders correctly in A4 |

---

## 7. Risks

### 7.1. Backward Compatibility
- **Risk:** Any external consumer or cached frontend reading `quantity` from the sustainability reports endpoint will continue seeing `final_received_qty` (unchanged). New consumers must read `allocated_qty`.
- **Mitigation:** Keep `quantity` in the response for one release cycle. Document deprecation.

### 7.2. Misleading Historical Reports
- **Risk:** Previously printed certificates showed `final_received_qty` as the sustainability impact. Those PDFs are already in circulation.
- **Mitigation:** This is a display correction, not a data correction. Historical data in the database is correct — the allocated lines always contained the true amounts. No data migration needed.
- **Owner decision needed:** Whether to add a note on newly printed reports: "Generated after quantity clarification update."

### 7.3. Partial Allocation Status
- **Risk:** The system currently allows finalization with remaining > 0 (within tolerance). This means some finalized allocations legitimately have `allocated_qty < received_qty`.
- **Mitigation:** The UI must handle this gracefully with the coverage percentage and a contextual note, not treat it as an error.

### 7.4. Disabled عرض التقرير
- **Risk:** Pre-Phase 3-B confirmed that `عرض التقرير` is visible in buyer reports but was not clicked. In admin rows, it appears disabled. The print route `/reports/sustainability/:id/print` was not browser-confirmed.
- **Mitigation:** Batch 1C will update the print route code but UAT must verify reachability before signing off. If the route is unreachable, file a separate bug.

### 7.5. Admin Correction/Revision Paths
- **Risk:** Admin correction approval reopens an allocation for editing. After a correction cycle, the allocated_qty may change. The display must reflect the latest active allocation version.
- **Mitigation:** The existing query already orders by version and picks the latest non-superseded allocation. The new `allocated_qty` computation will naturally reflect the current version's pathway sum.

---

## 8. Implementation Sub-Batches

### Batch 1A: Backend Field Clarification
**Scope:** Add `received_qty`, `allocated_qty`, `remaining_qty`, `allocation_coverage_pct` to backend responses.

**Files:**
- `artifacts/api-server/src/routes/reports.ts` — sustainability list and print detail endpoints
- `artifacts/api-server/src/routes/admin.ts` — admin allocations list and detail endpoints

**Verification:** TypeScript compilation. Manually inspect JSON responses via curl or API tool.

---

### Batch 1B: Frontend Display / Reports Tab
**Scope:** Update buyer-facing allocation list and reports sustainability tab to use the new fields.

**Files:**
- `artifacts/tadweerah/src/pages/sustainability-allocations.tsx`
- `artifacts/tadweerah/src/pages/reports.tsx`
- `artifacts/tadweerah/src/i18n/` (new i18n keys for quantity labels)

**Verification:** Visual inspection in staging browser. UAT-1, UAT-2, UAT-6.

---

### Batch 1C: Print / Report Route
**Scope:** Update the print certificate to use `allocated_qty` as the primary sustainability impact.

**Files:**
- `artifacts/tadweerah/src/pages/sustainability-print.tsx`

**Verification:** Navigate to print route. UAT-7.

---

### Batch 1D: Admin View
**Scope:** Update admin sustainability tab to show allocated/received split and coverage.

**Files:**
- `artifacts/tadweerah/src/pages/admin.tsx`

**Verification:** Admin UAT-5.

---

### Batch 1E: UAT + Diagram / Docs Update
**Scope:** Run all UAT cases, update Mermaid diagrams and PROJECT_MAP.

**Files:**
- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md` (update 40/35/5 evidence map and reports flow)
- `docs/PROJECT_MAP.md` (update sustainability_allocations field descriptions)
- `docs/phase-3b-source-of-truth-audit/` (add closure notes)

**Verification:** Diagram review, cross-reference with UAT evidence.

---

## 9. Files Likely to Change

| File | Sub-Batch | Change Type |
|---|---|---|
| `artifacts/api-server/src/routes/reports.ts` | 1A | Add computed fields to sustainability list and detail endpoints |
| `artifacts/api-server/src/routes/admin.ts` | 1A | Add allocated_qty subquery to admin list; add summary to admin detail |
| `artifacts/tadweerah/src/pages/sustainability-allocations.tsx` | 1B | Switch primary quantity display |
| `artifacts/tadweerah/src/pages/reports.tsx` | 1B | Switch sustainability tab primary quantity, add coverage column |
| `artifacts/tadweerah/src/pages/sustainability-print.tsx` | 1C | Switch certificate primary quantity, add context fields |
| `artifacts/tadweerah/src/pages/admin.tsx` | 1D | Update sustainability table column, add detail summary |
| `artifacts/tadweerah/src/i18n/*.ts` or `*.json` | 1B | Add new i18n keys for quantity labels |
| `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md` | 1E | Update diagrams |
| `docs/PROJECT_MAP.md` | 1E | Update field descriptions |

---

## 10. Approval Checklist

Before implementation begins, the owner must confirm:

- [ ] **Quantity definition approved:** Allocated Quantity (sum of pathway lines) is the reportable sustainability impact, not Received Quantity.
- [ ] **New field names approved:** `received_qty`, `allocated_qty`, `remaining_qty`, `allocation_coverage_pct` as additive API fields.
- [ ] **Backward compatibility approach approved:** Keep existing `quantity` field in responses for one release cycle.
- [ ] **Terminology approved:** Arabic/English labels as defined in Section 5.
- [ ] **Partial allocation display approved:** Show coverage percentage and contextual note when < 100%.
- [ ] **Print certificate layout approved:** Primary = Allocated Qty, Context = Received Qty, with coverage indicator.
- [ ] **Implementation batch order approved:** 1A → 1B → 1C → 1D → 1E.
- [ ] **Historical report decision:** Whether to add a note on newly printed reports post-update (or no note needed).
- [ ] **No database migration needed:** Confirmed — this is a display/computation change only.
- [ ] **Deployment target:** Staging first, then production after UAT sign-off.
- [ ] **`reportable_qty` field name approved** as the authoritative sustainability impact field.
- [ ] **Legacy `quantity` freeze confirmed:** `quantity` stays equal to `received_qty`, is not repurposed.
- [ ] **Supersession safety confirmed:** Only `status = 'finalized'` (non-superseded) drives `reportable_qty`.
- [ ] **Epsilon/rounding rules approved:** 0.001 tolerance, clamp dust to zero, surface material negatives as data-integrity risk.
- [ ] **Mixed-status rule approved:** Draft lines excluded from `reportable_qty`.
- [ ] **Finalize tolerance finding acknowledged:** Current finalize requires `allocated = received ± 0.001`. The 40/35/5 case is pre-existing data — see Addendum §A.

---

## Independent Review Addendum — Tightened Batch 1A Quantity Semantics

Added: 2026-06-29
Source: Independent Claude review of Batch 1 plan + code verification against current HEAD (`bf8c0b5`)

### A. Critical Schema & Code Findings

#### A.1. Supersession Mechanism — Verified Safe

The schema has a complete supersession model (SIR-2D):

| Column | Type | Purpose |
|---|---|---|
| `status` | enum: `draft`, `finalized`, `superseded` | Allocation lifecycle state |
| `version` | integer (default 1) | Monotonic version per received line |
| `source_allocation_id` | uuid FK, nullable | Points to the allocation this corrects (null for v1) |
| `superseded_by_allocation_id` | uuid FK, nullable | Points to the replacement that made this one obsolete |
| `superseded_at` | timestamptz, nullable | When this allocation was superseded |

**Unique index:** `(received_line_id, version)` — prevents duplicate versions.

**Finalize logic** ([sustainability.ts](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/sustainability.ts)): When a correction draft (v2+) is finalized, the system atomically supersedes the source allocation by setting `status = 'superseded'`, `superseded_by_allocation_id`, and `superseded_at` on the prior version.

**Conclusion:** The schema provides a clear current/superseded distinction. No additional flag is needed. Filtering by `status = 'finalized'` (excluding `superseded`) is sufficient to identify the current effective allocation.

#### A.2. Finalize Tolerance — Critical Finding

> [!WARNING]
> **Current code enforces `Math.abs(received - allocated) <= 0.001` at finalization.** This means all *newly* finalized allocations must have `allocated_qty ≈ received_qty` (within 1 gram). The 40/35/5 case is therefore **pre-existing data** that was finalized before this tolerance check was added, OR was finalized under a previous looser tolerance.

**Implication for Batch 1A:**
- For newly finalized allocations: `reportable_qty` will effectively equal `received_qty` (within epsilon).
- For pre-existing data (like the 40/35/5 case): `reportable_qty` may significantly differ from `received_qty`.
- The implementation must handle both cases correctly.
- The display logic must not assume `reportable_qty ≈ received_qty`.

#### A.3. Reports List Already Filters `status = 'finalized'`

Verified at [reports.ts L479](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/reports.ts#L479): `conditions.push(eq(sustainabilityAllocationsTable.status, "finalized"))`. Draft and superseded allocations are already excluded from the sustainability reports list. The print detail endpoint at [reports.ts L742-745](file:///C:/Users/user/Documents/Tadweerah-Hub/Tadweerah-Hub/artifacts/api-server/src/routes/reports.ts#L742-L745) allows both `finalized` and `superseded` for version history retrievability (SIR-2D).

#### A.4. Admin List Does NOT Filter by Status

The admin endpoint (`GET /admin/sustainability/allocations`) shows all statuses by default and supports an optional `status` query filter. This is correct for admin governance — admins need to see drafts and superseded records.

### B. Tightened Field Definitions

#### B.1. `received_qty`

- Source: `sustainability_received_lines.final_received_qty`
- Meaning: The received source quantity from the parent transaction.
- Type: `string` (numeric, preserving DB precision)
- No change from original plan.

#### B.2. `reportable_qty` (Replaces `allocated_qty` as Primary)

> [!IMPORTANT]
> Use `reportable_qty` as the canonical field name for the authoritative sustainability impact quantity. This is clearer than `allocated_qty` which could be misread as including draft allocations.

- Source: `SUM(sustainability_allocation_lines.quantity)` WHERE the parent `sustainability_allocations.status = 'finalized'` AND `sustainability_allocations.status != 'superseded'`.
- Meaning: The authoritative sustainability impact quantity for certificates and reports.
- Excludes: Draft allocation lines, superseded allocation lines.
- Type: `string` (numeric)
- When no finalized allocation exists: `"0"` or `null` (prefer `null` to distinguish "not yet allocated" from "zero allocated").

#### B.3. `allocated_qty` (Alias / Context)

- If present, `allocated_qty` MUST equal `reportable_qty` for finalized records.
- For admin views showing draft records: `allocated_qty` may show the draft sum for admin context, but it must NOT drive certificates.
- In reports (which already filter `status = 'finalized'`): `allocated_qty = reportable_qty`.
- Recommendation: Use `reportable_qty` in all new code. Avoid adding `allocated_qty` as a separate field to prevent semantic confusion.

#### B.4. `draft_allocated_qty` (Optional)

- Source: `SUM(sustainability_allocation_lines.quantity)` WHERE the parent `sustainability_allocations.status = 'draft'`.
- Only relevant in admin views showing draft records.
- Must NEVER drive certificates, impact calculations, or sustainability reports.
- Implementation: Only add this field if the admin view currently shows draft allocation details. Based on code verification: the admin detail endpoint already shows pathway quantities for any allocation status. This field is optional for Batch 1A.

#### B.5. `remaining_qty`

- Computed: `received_qty - reportable_qty`
- Precision: Apply `Math.abs(x) <= 0.001 ? 0 : x` epsilon clamping.
- If negative beyond epsilon: Surface as a data-integrity warning in the response (e.g., `remaining_qty_warning: true`) rather than silently clamping to zero.
- Type: `string` (numeric, after clamping)

#### B.6. `allocation_coverage_pct`

- Computed: `(reportable_qty / received_qty) * 100`
- When `received_qty` is zero, null, or unavailable: Return `null` (not `0`, not `NaN`, not `Infinity`).
- Range: `0`–`100` (percentage, not fraction).
- Rounding: `toFixed(1)` (one decimal place, e.g., `87.5`).
- Type: `string` (numeric)

#### B.7. Legacy `quantity` Field

- **Frozen at current meaning:** `quantity = received_qty = final_received_qty`.
- **Do NOT repurpose** `quantity` to mean `reportable_qty` or `allocated_qty`.
- **Mark as deprecated/legacy** in code comments and API docs.
- **No new frontend code** should read `quantity` for sustainability impact.
- **Removal timeline:** After all frontends migrate to `reportable_qty`, `quantity` may be removed in a future breaking-change cycle.

### C. Versioning / Supersession Rules

1. `reportable_qty` is computed exclusively from the **current effective allocation** — the one with `status = 'finalized'` (not `superseded`) for that received line.
2. If a correction cycle creates v2 and supersedes v1, only v2's pathway lines drive `reportable_qty`.
3. The admin detail and print detail endpoints may show superseded versions for audit/history purposes, but those views must clearly label superseded records and must NOT present their quantities as current sustainability impact.
4. The grouping logic in `reports.ts` already picks the latest allocation per received line (ordered by `finalized_at DESC`, first wins in `groupedMap`). This is safe as long as only `finalized` allocations are in the result set — verified at L479.

### D. Mixed-Status Rule

For a received line with 40 received, where:
- Finalized allocation v1 has 30 allocated across pathways
- Draft allocation v2 (correction in progress) has 5 allocated so far
- 5 remains unallocated

The correct quantities are:

| Field | Value | Rationale |
|---|---|---|
| `received_qty` | `40` | DB column |
| `reportable_qty` | `30` | Only finalized, non-superseded allocation v1 |
| `draft_allocated_qty` | `5` | Draft v2, admin context only |
| `remaining_qty` | `10` | `40 - 30`, because draft is excluded from reportable |
| `allocation_coverage_pct` | `75.0` | `30 / 40 * 100` |

> [!NOTE]
> In practice, the reports list endpoint already excludes draft and superseded allocations (L479 filter). The mixed-status scenario affects admin views only.

### E. Print / Certificate Rule

1. The print certificate's **primary impact headline** is `reportable_qty`.
2. `received_qty` appears as contextual metadata.
3. If `allocation_coverage_pct < 100`: the certificate must include a disclosure line stating the coverage percentage and remaining unallocated quantity.
4. The certificate must NOT use `received_qty` as the sustainability impact number under any circumstance.
5. For superseded allocations viewed via the print route (SIR-2D history retrieval): the print view must display a clear "Superseded — Version N" banner and must NOT present the quantities as current impact.

### F. Endpoint Completeness Verification

| Data Path | Affected? | Notes |
|---|---|---|
| `GET /api/reports/sustainability` | ✅ Yes | Add `reportable_qty`, `received_qty`, `remaining_qty`, `allocation_coverage_pct` |
| `GET /api/reports/sustainability/:id` | ✅ Yes | Same new fields for print detail |
| `GET /api/admin/sustainability/allocations` | ✅ Yes | Add computed `total_allocated_qty` (or `reportable_qty`) and coverage |
| `GET /api/admin/sustainability/allocations/:id/details` | ✅ Yes | Add summary totals to detail response |
| `/reports/sustainability/:id/print` data source | ✅ Yes | Reads from `GET /api/reports/sustainability/:id` |
| Dashboard sustainability tiles | ⚠️ No separate tile found | Dashboard has card links to `/sustainability/allocations` and `/reports` but no aggregated "total impact" tile. **No change needed** currently. |
| CSV/Excel export — reports sustainability | ✅ Yes | CSV at `GET /api/reports/sustainability?format=csv` — must add `Allocated Qty` / `الكمية الموزعة` column |
| CSV/Excel export — admin sustainability | ✅ Yes | CSV at `GET /api/admin/sustainability/allocations?format=csv` — must add allocated qty column |
| Any other consumer | ❌ None found | No other backend or frontend code reads sustainability quantities for display |

### G. Performance Rule

For list endpoints, the `reportable_qty` computation must NOT use N+1 per-row queries.

**Approach for `reports.ts`:** The existing query already joins `sustainability_allocation_lines` and returns flat rows with `pathway_qty`. The in-memory grouping loop already accumulates pathways into an array. Adding a `reduce` sum over the accumulated pathways array after grouping is O(1) per allocation (pathways are typically 2–5 lines). **No additional SQL query needed.**

**Approach for `admin.ts`:** The admin list query does NOT join allocation lines. Two options:

| Option | SQL Impact | Performance |
|---|---|---|
| **Correlated subquery** | `(SELECT COALESCE(SUM(quantity), 0) FROM sustainability_allocation_lines WHERE allocation_id = sa.id)` added to the main SELECT | Single round-trip. PostgreSQL optimizes correlated subqueries well for small result sets (≤200 rows). |
| **Lateral join** | `LEFT JOIN LATERAL (SELECT SUM(quantity) ...) ON true` | Equivalent performance, slightly cleaner for complex aggregations. |

**Recommended: Correlated subquery** — simpler, no schema change, standard PostgreSQL optimization.

### H. Additional UAT Cases

Add to the existing UAT matrix (Section 6):

#### UAT-8: Superseded Lines — No Double Count

| Check | Expected |
|---|---|
| Allocation v1 (superseded) had 40 allocated | Not counted in reportable_qty |
| Allocation v2 (finalized) has 35 allocated | `reportable_qty = 35` |
| Reports tab | Shows 35, not 75 or 40 |
| Admin view | v1 row shows "superseded" badge, v2 shows "finalized" with 35 |

#### UAT-9: Mixed Status (40 / 30 approved / 5 draft / 5 unallocated)

| Check | Expected |
|---|---|
| Reports tab | Shows `reportable_qty = 30` (draft excluded) |
| Admin view | Shows both records with correct status badges |
| Print certificate (for finalized v1) | Shows 30 as impact, 40 as received, 75% coverage |

#### UAT-10: Decimal Quantities (40.5 / 35.25)

| Check | Expected |
|---|---|
| `reportable_qty` | `35.25` (not rounded to integer) |
| `remaining_qty` | `5.25` |
| `allocation_coverage_pct` | `87.0` (one decimal) |
| Print | Displays decimals correctly in mono font |

#### UAT-11: Float-Dust Full Allocation (39.9999998 of 40)

| Check | Expected |
|---|---|
| `remaining_qty` | `0` (clamped by epsilon 0.001) |
| `allocation_coverage_pct` | `100.0` |
| No "partial allocation" warning | Correct — within tolerance |

#### UAT-12: Zero/Null Received Quantity

| Check | Expected |
|---|---|
| `allocation_coverage_pct` | `null` (no divide-by-zero) |
| `remaining_qty` | `0` or `null` |
| No crash or NaN | Confirmed |

#### UAT-13: Reopen → Re-Approve (v1 → v2)

| Check | Expected |
|---|---|
| After v2 finalization | v1 superseded, v2 finalized |
| `reportable_qty` | Uses v2 pathway sum only |
| Reports list | Shows only v2 (L479 filters finalized only) |
| Print for v1 (via direct URL) | Shows "Superseded" banner, uses v1 quantities as historical |

#### UAT-14: Legacy `quantity` Field Regression

| Check | Expected |
|---|---|
| `quantity` in API response | Equals `received_qty` / `final_received_qty` |
| NOT equal to `reportable_qty` | Correct — `quantity` is frozen as received |

#### UAT-15: Partial-Report Print

| Check | Expected |
|---|---|
| Print for 40/35/5 | Shows "Allocated: 35", "Received: 40", coverage "87.5%", remaining "5" |
| No implication that 40 was sustainably processed | Confirmed |

### I. Revised Approval Checklist Additions

The following items are added to the Section 10 approval checklist:

- [ ] **`reportable_qty` field name approved** as the authoritative sustainability impact field (replacing `allocated_qty` as primary).
- [ ] **Legacy `quantity` freeze confirmed:** `quantity` stays equal to `received_qty`, is not repurposed, marked deprecated.
- [ ] **Supersession safety confirmed:** Only `status = 'finalized'` (non-superseded) drives `reportable_qty`. Schema supports this natively.
- [ ] **Epsilon/rounding rules approved:** 0.001 tolerance for clamping remaining to zero. Material negatives surfaced as data-integrity risk.
- [ ] **Mixed-status rule approved:** Draft lines excluded from `reportable_qty`.
- [ ] **Zero/null received handling approved:** `allocation_coverage_pct = null` when received is zero or unavailable.
- [ ] **Finalize tolerance finding acknowledged:** Current code enforces `allocated = received ± 0.001` at finalization. The 40/35/5 case is pre-existing data.
- [ ] **Performance approach approved:** Correlated subquery for admin; in-memory sum for reports.
- [ ] **No `draft_allocated_qty` in Batch 1A:** Defer to a future batch unless owner requests it now.
