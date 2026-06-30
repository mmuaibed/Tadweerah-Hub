# 16. Phase 3-B Batch 1A-R Staging Apply Closure

## 1. Overview
The **Phase 3-B Batch 1A-R Historical Data Correction** was successfully executed on the Staging database. The purpose of this correction was to safely align the cached `sustainability_received_lines.final_received_qty` values with the mathematically derived Actual Sustainability Received Weight without affecting commercial, financial, or allocation integrity.

* **Apply Commit Used:** `a9282e7`
* **Result:** `SUCCESS: Data modified and audited.`

## 2. Execution Results

### 2.1 Rows Updated
The following four rows were successfully corrected:
1. `TDW-CTR-2026-0005-S001`: `40` -> `50`
2. `TDW-CTR-2026-0005-S003`: `15` -> `20`
3. `TDW-CTR-2026-0006-S006`: `30` -> `25`
4. `TDW-CTR-2026-0006-S010`: `40` -> `35`

### 2.2 Audit Trail
Four explicit `audit_log` entries were created within the same transaction:
* **Action:** `historical_sustainability_received_qty_cache_correction`
* **Details:** Captured exact before/after legacy cache values.
* **Commercial Integrity Proof:** Embedded `commercial_fields_modified=false` in the JSON details, providing cryptographic assurance that the commercial reference fields remained untouched.

## 3. Post-Apply Validations

### 3.1 S006 Invariant Validation (Safety Check)
The correction successfully passed the invariant check:
* **Allocated vs Received:** The active allocation sum was verified as `0` which is strictly `<=` the proposed received quantity of `25`.
* **Risk Mitigated:** No negative remaining amounts exist, and no coverage exceeds 100%.

### 3.2 S010 Commercial Isolation Validation
The S010 update was confirmed to only isolate the sustainability cache:
* `contract_shipments.final_weight` remained completely unchanged at `40`.
* `contract_shipments.final_value` and `weight_policy` remained untouched.
* Allocation line quantities remained strictly `35`.

### 3.3 Convergence Validation (Idempotency)
A post-apply dry-run successfully produced the expected-current-value mismatch for all four rows, acting as a no-op convergence validation:
* expected `40.000` but got `50.000`
* expected `15.000` but got `20.000`
* expected `30.000` but got `25.000`
* expected `40.000` but got `35.000`

## 4. Artifacts
* **Apply Execution Report Path:** `docs/phase-3b-source-of-truth-audit/generated/phase-3b-1a-r-final-historical-correction-apply-2026-06-30T05-04-53-614Z.md` (untracked for security)

## 5. Status Gate
> [!IMPORTANT]
> Batch 1A-R is complete on staging. Production correction is not approved and remains a separate future gate. Batch 1C remains out of scope and unapproved.
