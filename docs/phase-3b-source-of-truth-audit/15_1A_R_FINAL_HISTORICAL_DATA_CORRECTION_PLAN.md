# 15. Phase 3-B Batch 1A-R Final Historical Data Correction Plan

## 1. Correction Scope
This historical data correction targets ONLY the legacy cached `sustainability_received_lines.final_received_qty` values where they conflict with the mathematically derived Actual Sustainability Received Weight.

**Strict Boundaries:**
* **Correct ONLY**: `sustainability_received_lines.final_received_qty` and, if necessary for readiness, `is_eligible` mapping cache.
* **DO NOT** change `contract_shipments.final_weight` or `contract_shipments.weight_policy`.
* **DO NOT** change `contract_shipments.final_value`, payment/deal financial amounts, or any commercial fields.
* **DO NOT** modify existing allocation line quantities (especially S010) unless explicitly required by a future explicit owner decision.
* **DO NOT** alter any issued commercial documents.

## 2. Safe Rows Handling (S001, S003, S006)
These rows currently do not have a finalized/approved allocation dependency, meaning correcting their cached volume has no downstream ripple effect on impact metrics.

**Guards and Rules:**
* Classify as "Safe" ONLY if an execution-time check verifies `allocation_status IS NULL` or `allocation_status = 'draft'`.
* **Expected-Current-Value Guards:** The script will strictly enforce that the DB value at execution time exactly matches the known dry-run legacy value (e.g., S001 = 40.000). If it has changed, the script aborts.
* Update `final_received_qty` to the proposed Actual Sustainability Received Weight (e.g., S001 -> 50.000).
* Repair the deprecated `is_eligible` cache only if needed to align with the final active readiness rules.
* Insert a structured `audit_log` entry documenting the correction.

## 3. S010 Special Handling
S010 has a finalized and approved allocation dependency, requiring extreme caution. The commercial `final_weight` is 40, but the Actual Sustainability Received Weight is 35. 

**Handling Rules:**
* DO NOT silently mutate finalized artifacts.
* **Proposed Exact Handling:** Because the active read model securely isolates the legacy cache, we can safely execute a narrowly scoped, owner-approved direct correction of the `final_received_qty` legacy cache from 40 to 35. This must be accompanied by a rigorous `audit_log` entry capturing the before/after snapshot.
* Commercial `final_weight` remains explicitly 40.
* Allocation impact remains explicitly 35. Since the allocation lines already sum to 35, they will NOT be changed.

## 4. Idempotent Correction Script Design
**Recommended Script:** `scripts/phase-3b-1a-r-final-historical-correction.ts`

**Design Requirements:**
* **Dry-Run by Default:** The script runs in dry-run mode unless the explicit `--apply` flag is passed.
* **Pre-Execution Table:** Prints a clear before/after table for manual verification.
* **Transactional Execution:** In `--apply` mode, wraps all updates in a single `db.transaction()`.
* **Guards:** 
  * Aborts if any row's `final_received_qty` has changed since the dry-run.
  * Aborts if S010's allocation dependency state is NOT exactly 35 allocated and 'finalized'.
* **Auditing:** Writes explicit `audit_log` records for each corrected row in apply mode only.
* **Reporting:** Produces a markdown execution report (`execution-report.md`) containing the exact transaction log.
* **Isolation:** Explicitly prevented from touching commercial tables or fields (e.g., `contract_shipments.final_weight`, `contract_shipments.final_value`, `deals.actual_quantity`, `payment_requests`, `VAT/tax`, `buyer/seller payable amounts`).

## 5. Validation After Correction
Post-execution, the following conditions must mathematically and observably hold true:

* **Database Cache:** S001, S003, S006 legacy cache (`final_received_qty`) exactly equals their proposed Actual Sustainability Received Weight. S010 legacy cache equals 35.
* **Active API Mapping:**
  * `received_qty` = Actual Sustainability Received Weight
  * `final_received_qty` = Active derived value
  * `legacy_final_received_qty` = The newly corrected cache
* **S010 Active Views (Buyer List, Buyer Detail, Admin, Reports, Print):**
  * `received_qty` = 35
  * `reportable_qty` = 35
  * `remaining_qty` = 0
  * `coverage_pct` = 100
* **Commercial Context:** `final_weight` mathematically and visually remains 40 in financial contexts.

## 6. Owner Decision Point
To proceed, the owner must decide the execution path:

* **Option A (Split Execution):** Write and run the script for the Safe Rows (S001, S003, S006) first. Address S010 in a separate, isolated script after verifying the safe rows.
* **Option B (Single Guarded Script - Recommended):** Write a single script that includes strict transaction guards for both Safe Rows and S010. Since the S010 correction only touches the `final_received_qty` cache (which no longer controls the active read model) and writes an audit log, the risk is completely neutralized.

**Recommended Safest Option:** Option B is recommended. The active read model is already closed, meaning the database cache is completely decoupled from active UI and reporting logic. A single guarded script reduces operational overhead while maintaining absolute data integrity.
