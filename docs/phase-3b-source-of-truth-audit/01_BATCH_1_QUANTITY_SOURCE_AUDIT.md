# Phase 3-B Batch 1: Quantity Source Audit

Last updated: 2026-06-29
Mode: Discovery Mode (Audit Only)

## Goal
Identify the exact source fields, backend endpoints, frontend consumers, and report-generation paths for sustainability quantity fields to address the "40 / 35 / 5" discrepancy risk identified in Pre-Phase 3-B.

## 1. Field Inventory

| Concept | Database Source | Description |
|---|---|---|
| **Received Quantity** | `sustainability_received_lines.final_received_qty` | The canonical source weight received by the buyer. It is populated by the backend via `enrichReceivedLineQty` based on `deals.actual_quantity` (fallback `waste_listings.quantity`) or `contract_shipments` destination/source weights. |
| **Distributed Quantity** | Computed (Frontend / Backend API) | The sum of all allocated pathways. Sourced from `sustainability_allocation_lines.quantity` mapped by `pathway_id` under a specific allocation record. |
| **Remaining Quantity** | Computed (Frontend) | `final_received_qty` minus the sum of `sustainability_allocation_lines.quantity`. |
| **Approved Quantity** | Contextual | There is no single "approved_quantity" column. It implies the allocated sum when `sustainability_allocations.status = 'finalized'`. However, current reports and admin tables conflate this by displaying `final_received_qty` instead of the allocated sum. |
| **Report Quantity** | `sustainability_received_lines.final_received_qty` | The main quantity printed on the final PDF report and exported CSV, which causes the discrepancy. Pathway breakdowns show the true distributed amounts. |

## 2. API Endpoint Inventory

| Endpoint | Role | Returned Quantity Fields |
|---|---|---|
| `GET /api/sustainability/received-lines` | Buyer UI List | `received_line.final_received_qty` (Received) |
| `GET /api/sustainability/received-lines/:id/allocation` | Buyer UI Detail | `received_line.final_received_qty`, `allocation`, `lines` (containing `quantity` for pathways), and `validation` which returns `gap` (Remaining). |
| `GET /api/admin/sustainability/allocations` | Admin List | `received_line.final_received_qty` is mapped directly to the table row without checking if the full amount was distributed. |
| `GET /api/reports/sustainability` | Reports List | `quantity` maps to `final_received_qty` alongside pathway breakdowns. |
| `GET /api/reports/sustainability/:id` | Print Detail | `quantity` maps to `final_received_qty`, displayed as "Finalized Sustainability Qty" in the print UI. |

## 3. Frontend Screen Inventory

| Route | Component | Behavior |
|---|---|---|
| `/sustainability/allocations` | `sustainability-allocations.tsx` | Displays "Quantity" using `rl.final_received_qty`. |
| `/sustainability/allocations/:id` | `sustainability-allocation-detail.tsx` | Computes `currentTotalAllocated` (Distributed) and `remaining`. Displays them distinctly. Allowed to finalize even if remaining > 0 (if valid per tolerance). |
| `/admin` (Sustainability Tab) | `admin.tsx` | Renders `rl.final_received_qty` in the main table row. |
| `/reports` (Sustainability Tab) | `reports.tsx` | Uses `final_received_qty` as the top-level quantity. |
| `/reports/sustainability/:id/print` | `sustainability-print.tsx` | Renders "Finalized Sustainability Qty" using `row.quantity` (which maps to `final_received_qty`). |

## 4. The 40 / 35 / 5 Trace Hypothesis

**Observation:** Buyer detail shows 40 received, 35 distributed, 5 remaining (status `finalized`). Admin shows 40. Report shows 40.

**Hypothesis Confirmed:**
1. The buyer received 40 tons (`final_received_qty` = 40).
2. The buyer distributed 35 tons across pathways (`allocation_lines.quantity` sums to 35).
3. The remaining 5 tons were legally left unallocated (perhaps residue loss not requiring explicit pathway logging, or within tolerance).
4. The system successfully `finalized` the allocation.
5. **The Bug:** Admin lists, Reports, and Print views query `final_received_qty` (40) and label it "Finalized Sustainability Qty" or "Quantity". They do *not* display the actual distributed/approved sum (35) at the top level. This creates a severe business misrepresentation where a report certifies 40 tons of sustainability activity when only 35 tons were actually logged to pathways.

## 5. Confirmed Facts vs Inferred Risks

**Confirmed Facts:**
- The database schema correctly separates `final_received_qty` from pathway `quantity`.
- The buyer detail page correctly computes and separates received, distributed, and remaining.
- Admin, Reports, and Print views hardcode `final_received_qty` as the primary display value for finalized records.

**Inferred Risks:**
- **Source-of-Truth Risk:** Certificates/Reports printed right now overstate the sustainability outcome by including the "remaining/unallocated" quantity.
- **Compliance Risk:** If a processor receives 40t, rejects 5t, and allocates 35t, the platform generates a certificate saying 40t was sustainably processed.
- **Admin Confusion Risk:** Admins cannot see at a glance whether an allocation was 100% distributed or partially distributed.

## 6. Affected Routes

- `GET /api/admin/sustainability/allocations`
- `GET /api/reports/sustainability`
- `GET /api/reports/sustainability/:id`
- `/admin` UI (Sustainability Allocations Table)
- `/reports` UI (Sustainability Export CSV)
- `/reports/sustainability/:id/print` UI

## 7. Owner Decision Points

1. **Top-Level Quantity Definition:** Should the Admin list, Reports list, and printed certificate top-level "Quantity" represent the **Received Quantity** (40) or the **Total Distributed/Allocated Quantity** (35)?
2. **Tolerance Visibility:** If 5 tons are lost/residue, should the system enforce a mandatory "Residue Loss" pathway to make distributed = received, OR should the UI simply display both Received (40) and Allocated (35) side-by-side to prevent confusion?
3. **Print Layout:** Should the print certificate be updated to clearly state: `Received: 40 | Sustainably Allocated: 35`?

## 8. Proposed Implementation Scope (For Approval Only)

- Update `GET /api/admin/sustainability/allocations` to return both `final_received_qty` and a computed `total_allocated_qty`.
- Update `GET /api/reports/sustainability` and `/:id` to include `total_allocated_qty`.
- Update Admin UI table to show `[Allocated] / [Received]` (e.g., `35 / 40`).
- Update the Print Certificate to clarify the labels (e.g., rename "Finalized Sustainability Qty" to "Received Source Qty" and add an "Allocated Qty" summary).

## 9. UAT Cases Needed After Approval

- Complete an allocation with 100% distribution -> verify Admin/Reports show matching values.
- Complete an allocation with <100% distribution -> verify Admin/Reports show the split clearly without misrepresenting the pathway sum.
- Print the certificate -> verify the printed PDF does not overstate the pathway outcomes.

## 10. Diagrams/Docs to Update After Fixes

- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`: Update "Reports Flow" and "40 / 35 / 5 Evidence Map" to reflect the new API fields and UI labels.
- `docs/PROJECT_MAP.md`: Update the definition of `sustainability_allocations` behavior regarding quantities.
