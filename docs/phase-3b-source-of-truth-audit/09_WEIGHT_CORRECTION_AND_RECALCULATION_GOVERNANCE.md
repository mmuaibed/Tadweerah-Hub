# Phase 3-B Batch 1A-R4A Weight Correction & Recalculation Governance

## Objective
Establish the definitive source-of-truth and governance rules for correcting and recalculating physical weights. Ensure the distinct separation of commercial (financial) weight logic and sustainability (physical distribution) weight logic.

## 1. Core Product Rules

### Commercial / Financial Approved Weight
- **Purpose:** Used for seller entitlement, buyer payable amounts, settlement, invoices, and financial calculations.
- **Derivation:** Strictly determined by the contract terms (`weight_policy`).
- **Basis:** May rely on `source_weight`, `destination_weight`, the higher/lower of the two, or another agreed mechanism.
- **Relationship:** Commercial approved weight is financially valid even if it differs from the sustainability received weight. Commercial `final_weight` remains the financial source of truth unless a commercial correction is approved.

### Sustainability Approved / Received Weight
- **Purpose:** Used exclusively for sustainability impact, allocation, reports, and certificates.
- **Derivation:** Strictly governed by the physical receipt hierarchy:
  1. If `destination_weight` exists and is valid, use `destination_weight`.
  2. If `destination_weight` does not exist and only `source_weight` exists, use `source_weight`.
  3. If no valid physical weight exists, the value is pending/unavailable. It must not be treated as confirmed impact.
- **Restrictions:**
  - DO NOT use `final_weight` or `weight_policy` as a sustainability basis when physical weights exist.
  - A zero value (`0`) is not a confirmed sustainability weight in the current flow unless a future explicit "rejected/zero-received" workflow is introduced.

## 2. Current Fields Review
- `source_weight`: The seller-site physical weighbridge measurement.
- `destination_weight`: The buyer-site physical weighbridge measurement.
- `final_weight`: The commercial approved weight computed via `weight_policy`.
- `weight_policy`: Contractual logic dictating financial settlement.
- `sustainability_received_lines.final_received_qty`: The cached, derived sustainability physical weight.
- **Dependent Fields:** Allocation sizes, report coverage percentages, and pathway distributions all depend on `final_received_qty`.

## 3. Current Correction Capability & Identified Gaps
**Current State:**
- The schema for `contract_shipments` strictly defines the `closed` state as terminal and immutable (`final_weight` and `final_value` cannot be edited).
- `audit_log` records standard transitions.
- Weighbridge ticket attachments (`source_ticket_url`, `destination_ticket_url`) are linked directly to the shipment record.

**Identified Gaps:**
- A closed shipment correction flow is currently missing and must be designed before broad data correction.
- There is currently no existing admin or customer support flow to reopen or correct `source_weight` or `destination_weight` for a `closed` shipment.
- The current 1A-R1 code-path refactor ensures *new* rows use the correct logic, but a robust workflow to correct historical weights does not exist.
- *Issue Observation:* `is_eligible=false` with allocation lines is a blocker requiring investigation before 1A-R4 data correction. S010 exhibits this anomaly.

## 4. Source-of-Truth Decision
- **Commercial Approved Weight:** `contract_shipments.final_weight` remains the active canonical source for financials unless a commercial correction is explicitly approved.
- **Sustainability Received Weight:** The physical hierarchy evaluated dynamically from `contract_shipments.source_weight` and `destination_weight`. Sustainability received quantity may need correction to the active physical sustainability basis.
- **Reportable Sustainability Quantity:** Cached in `sustainability_received_lines.final_received_qty`, representing the active sustainability impact base.
- **Historical/Corrected Events:** Corrected physical weights must become the active source for future reports after approval. Old values must remain auditable, but reports should not continue using stale old values after an approved correction.

## 5. Recalculation Rules
When a `source_weight` or `destination_weight` is successfully corrected and approved via future administrative flows:
- **Commercial:** Recompute `final_weight` and `final_value` *only* if the correction alters the contractual financial basis according to `weight_policy`.
- **Sustainability:** Re-derive the sustainability received quantity via the physical hierarchy.
- **Synchronization:** Update or supersede `sustainability_received_lines.final_received_qty` to reflect the corrected physical basis.

## 6. Allocation Handling & Immutability Rule

- No finalized financial or sustainability artifact should be silently mutated.
- Any correction after finalization must be audited, versioned/superseded, or linked to an approved correction request with supporting weighbridge documentation.
- For draft/unfinalized allocations, it is acceptable to directly update and recalculate distributions prior to final approval.

## 7. Acceptance Scenarios

1. **Only source_weight exists:**
   - Source = 40, Destination = null
   - Sustainability Received = 40
2. **Both weights exist:**
   - Source = 40, Destination = 35, Financial Final = 40
   - Sustainability Received = 35, Commercial Final remains 40
3. **Buyer weight corrected:**
   - Destination changes from 35 to 37 with valid weighbridge document.
   - Sustainability Received becomes 37 after approved correction. Reports must use 37, not 35.
4. **Seller weight corrected while destination exists:**
   - Source changes from 40 to 42, Destination remains 35.
   - Sustainability Received remains 35. Commercial final may change based on `weight_policy`.
5. **Financial-only correction:**
   - `final_weight` changes due to contract negotiations, but physical destination remains 35.
   - Sustainability Received remains 35.
6. **No valid physical weight:**
   - Sustainability status is pending/unavailable; no confirmed report impact.

## 8. Relation to Current Dry-Run (Batch 1A-R2)
- **Total Rows Evaluated:** 14
- **Changed Rows:** 4
- **Unchanged Rows:** 10
- **Becomes Pending:** 0
- **TDW-CTR-2026-0006-S010:** Current = 40, Proposed = 35, Delta = -5.
  - S010 requires owner/SIR-2D decision because it has a finalized/approved allocation dependency. No silent override of final values will occur.
  - `is_eligible=false` with allocation lines is a blocker requiring investigation before 1A-R4 data correction can proceed.
