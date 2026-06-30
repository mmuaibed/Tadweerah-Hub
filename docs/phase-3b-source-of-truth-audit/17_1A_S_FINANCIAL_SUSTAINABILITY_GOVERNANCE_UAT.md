# Phase 3-B Batch 1A-S - Financial + Sustainability Source-of-Truth Governance UAT

## 1. Overview
The **Phase 3-B Batch 1A-S Governance UAT** was successfully executed on the Staging database to prove the architectural separation between Financial Reporting and Sustainability Reporting. 

This test guarantees that physical weight changes (for sustainability tracking) do not inadvertently alter commercial/financial values, and that commercial settlements do not retroactively corrupt physical sustainability accounting.

* **Target Reference:** `TDW-CTR-2026-0006-S010`
* **Environment:** Staging (via Cloud SQL Auth Proxy)
* **Execution Constraint:** All tests were temporarily mutated via transactions/controlled updates and immediately reverted. No permanent changes were made.

## 2. Source-of-Truth Mapping
Code and schema review confirmed the following separation of concerns:

### 2.1 Sustainability Report Source
* **Field:** Derived at read-time via `deriveActualSustainabilityReceivedQtyForLine`.
* **Priority Logic:** 
  1. `destination_weight` (Buyer/Receiver physical weight) if > 0.
  2. `source_weight` (Seller/Sender physical weight) if > 0.
* **Separation:** Strictly ignores `final_weight` (Commercial Approved Weight) if any physical weight exists.

### 2.2 Financial Report Source
* **Field:** Directly reads `contract_shipments.final_weight` for weight and `contract_shipments.final_value` for value.
* **Separation:** Ignorant of physical `source_weight` and `destination_weight` post-closure.

### 2.3 Commercial Approved Weight Source
* **Field:** `contract_shipments.final_weight`.
* **Behavior:** Fixed and locked at the time of shipment closure based on the contract's `weight_policy`. Modifying physical weights after closure does not automatically recalculate this field unless explicitly re-triggered by an admin action.

## 3. Baseline Snapshot (Post-Batch 1A-R)
* **Seller/Source Weight:** `40.000`
* **Buyer/Destination Weight:** `35.000`
* **Commercial Approved Weight (`final_weight`):** `40.000`
* **Financial Value:** `36000.000`
* **Contract Policy:** `dual_higher_final`
* **Sustainability Received:** `35` (Derived from Destination)
* **Sustainability Allocation Sum:** `35` (Active non-superseded)

> **Note on UAT Artifacts:** The initial `75` allocation figure was a UAT script aggregation bug. Root cause: the script used `a.superseded`, but the schema uses `status = draft | finalized | needs_review | superseded`. Because `a.superseded` was undefined, the script improperly included superseded and draft rows. Correct active S010 allocation truth is `35`, based on finalized non-superseded allocation logic. Previous Batch 1A-R correction evidence and active read-model semantics confirm S010 active allocation sum = `35`.

## 4. Test Matrix & Results

### 4.1 Sustainability-Only Propagation Test
* **Mutation:** Destination weight increased from `35` to `38`.
* **Result:** Sustainability received quantity updated to `38`. Financial report weight remained strictly `40.000`.
* **Conclusion:** PASS. Physical receiving updates correctly isolate to sustainability without triggering commercial side-effects.

### 4.2 Seller/Source-Weight Priority Test
* **Mutation:** Source weight increased from `40` to `42`. Destination weight remained `35`.
* **Result:** Sustainability received quantity remained `35` (destination priority upheld). Financial report weight remained `40.000`.
* **Conclusion:** PASS. The priority queue correctly shields sustainability metrics from source adjustments if a destination weight exists.

### 4.3 Financial-Only Propagation Test
* **Mutation:** Commercial `final_weight` decreased from `40` to `38`.
* **Result:** Financial report weight immediately reflected `38.000`. Sustainability received quantity remained strictly `35`.
* **Conclusion:** PASS. Commercial dispute resolution or finalization adjustments do not corrupt the physical sustainability truth.

### 4.4 Combined Separation Test
* **Mutation:** Source = `42`, Destination = `38`, Final = `38`.
* **Result:** Sustainability locked onto `38` (Destination). Financial locked onto `38.000` (Final). 
* **Conclusion:** PASS. Systems independently follow their designated sources of truth.

## 5. Invalid-State Governance Test
* **Mutation:** Destination weight reduced to `34`, which is below the active allocated quantity.
* **Result:** The system calculated `reportable = 35` and `received = 34`. 
* **Critical Finding:** The reporting logic uses `Math.max(0, received - reportable)` for the remaining quantity, artificially returning `0` instead of `-1`. It uses `Math.min(100, ...)` for coverage, artificially returning `100.00%` instead of `102.94%`.
* **Conclusion:** Over-allocation can be masked in shared/buyer-facing display metrics and is only partially mitigated by data-risk flags in reporting/admin paths. Invalid-state masking is confirmed in shared/buyer-facing metrics using `remaining_qty = Math.max(0, received - reportable)` and `coverage_pct = Math.min(100, pct)`. Reports/admin paths partially mitigate the risk with data-risk flags such as `remaining_qty_data_risk`, and may preserve negative remaining internally.

### 5.1 Required Future Guardrail
The platform currently lacks an active DB constraint or backend validation blocking this scenario. 
* **Recommended future guardrail:** On any backend path that changes physical sustainability received quantity after allocation exists:
  - derive proposed received qty from destination/source priority
  - sum active finalized non-superseded allocation lines
  - reject if proposed_received_qty < active_finalized_allocated_qty
  - return explicit error including received, allocated, delta, and affected allocation id
* **Additional recommendation:** Expose unmasked risk fields: `raw_remaining_qty`, `over_allocated_qty`, `coverage_raw_pct`, `remaining_qty_data_risk`.

## 6. Final Restored State
All fields were safely reverted to their baseline snapshot.
* Destination weight restored to `35.000`.
* Source weight restored to `40.000`.
* Final weight restored to `40.000`.
* Sustainability received reports `35`.
* Financial reports `40.000`.

> [!IMPORTANT]
> - Batch 1A-S proves financial/sustainability source separation on staging
> - Batch 1A-S does not implement guardrails
> - Batch 1C remains out of scope and unapproved
> - Production remains untouched
> - `lib/db/uat-governance.ts` was a temporary scratch UAT script and should remain untracked unless separately reviewed and converted into an official test tool
