# Phase 3-B Batch 1A-R: Final Closure Plan

## Objective
Close the weight source-of-truth issue definitively by finalizing terminology, eliminating the `is_eligible` ambiguity without unsafe migrations, and preparing a bifurcated data correction strategy for the remaining anomalies.

## 1. Final Source-of-Truth Equation

### Commercial Approved Weight / الوزن المالي المعتمد
- **Usage:** Seller entitlement, buyer payable amount, settlement, financial calculations.
- **Rule:** Determined exclusively by contract `weight_policy`. May use `source_weight`, `destination_weight`, higher/lower, or another contractual basis. Stored securely via the `final_weight` and `final_value` logic.
- **Independence:** Must remain entirely separate from sustainability reporting.

### Actual Sustainability Received Weight / وزن الاستلام الفعلي للاستدامة
- **Usage:** Sustainability allocation, reports, certificates, and impact.
- **Rule:** 
  - If a valid `destination_weight` exists, use `destination_weight`.
  - If `destination_weight` does not exist and only `source_weight` exists, use `source_weight`.
  - If both exist, `destination_weight` wins.
  - **Never** use `final_weight` or `weight_policy` as the sustainability basis when physical source/destination weights exist.
- **Corrections:** If corrected weighbridge data is approved later, all sustainability reports must use the latest approved corrected physical basis, not stale old values.

## 2. Terminology Cleanup Strategy (Code & Docs)
We will systematically purge ambiguous terms from the API, UI, and code comments.
- **Search for:** `physical weight`, `correct physical weight`, `الوزن الفيزيائي الصحيح`.
- **Replace with:** `Actual Sustainability Received Weight` / `وزن الاستلام الفعلي للاستدامة`.
- **Exclusion:** Keep "Commercial Approved Weight / الوزن المالي المعتمد" fully separate.

*These code and doc replacements will be executed in the implementation step.*

## 3. `is_eligible` Cleanup & Deprecation
**Decision:** We will **not** drop or rename the database column `is_eligible` in this phase, as that requires an immediate migration which introduces unnecessary risk.

Instead, we will implement the "deprecated cache" pattern:
- **Database Schema:** Add explicit TSDoc comments in `sustainability-received-lines.ts` marking `is_eligible` and `ineligibility_reason` as `@deprecated`. Explain that these fields are legacy caches and must not be used as authoritative business truth.
- **API Response:** Modify `sustainability.ts` and `reports.ts` to stop exposing `is_eligible` as a boolean business truth.
- **New Derived Property:** Introduce `is_ready_for_allocation` (`جاهز للتخصيص`) in the API payload. This property will be dynamically derived from:
  1. Valid Actual Sustainability Received Weight > 0.
  2. Valid material classification/allocation basis.
  3. Parent entity completion status.

## 4. Data Correction Closure Strategy
The data correction will be bifurcated based on the dry-run results (14 total, 4 changed, 0 pending).

### A. Safe Non-Finalized Rows (3 Rows)
- **Rows:** `TDW-CTR-2026-0005-S001` (40→50), `S003` (15→20), `TDW-CTR-2026-0006-S006` (30→25).
- **Action:** A simple idempotent script will update `final_received_qty` to the new Actual Sustainability Received Weight.
- **Eligibility Fix:** The script will also aggressively overwrite the legacy `is_eligible` cache to `true` (if classified) to prevent data analyst confusion, even though the active code will ignore it.

### B. Finalized/Allocation-Dependent Correction (S010)
- **Row:** `TDW-CTR-2026-0006-S010` (40→35).
- **Rule:** **No silent mutation of finalized artifacts.**
- **Commercial:** `final_weight` remains 40 unless a separate commercial correction is triggered.
- **Sustainability Correction Process:** 
  1. We will create an explicit, audited correction record (via a script or support API) that formally marks the prior sustainability weight (40) as corrected.
  2. The active `final_received_qty` is updated to 35.
  3. The finalized allocation distributions must be explicitly superseded or versioned to reflect the new 35/35/0/100 state, ensuring the certificate reflects the corrected basis with a visible audit trail.

## 5. Final Acceptance UAT Checklist
Before final deployment, the following must be verified on staging:
1. [ ] **Source-Only Shipment:** Create a new shipment with only `source_weight`. Verify sustainability uses source.
2. [ ] **Dual-Weight Shipment:** Create a shipment with source=40, destination=35, final=40. Verify sustainability uses 35, while commercial remains 40.
3. [ ] **Physical Correction:** Correct a destination weight from 35 to 37 (via DB/future support API). Verify sustainability reports use 37 after approval.
4. [ ] **Financial Correction:** Apply a financial-only correction to `final_weight` without changing physical destination. Verify sustainability impact remains unchanged.
5. [ ] **No Stale Data:** Verify reports/admin/detail/print views show no stale sustainability quantity after a correction.
6. [ ] **Ambiguity Removed:** Verify no UI/API presents `is_eligible` as the business truth; verify `is_ready_for_allocation` is used instead.
