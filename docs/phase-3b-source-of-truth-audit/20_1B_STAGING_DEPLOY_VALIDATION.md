# Phase 3-B Batch 1B — Staging Deploy Validation

## 1. Deployment Summary
- **Cloud Run Revision:** `tadweerah-api-00174-zs8`
- **Commit:** `20296cbb0a90be7fbe2e1d56081891837129dcaf`
- **Mechanism:** The backend was deployed via automatic CI/CD from a push to `main` (triggered by Cloud Build), not manually via CLI.

## 2. Validations Completed
- **S010 Smoke Test:** Verified via Cloud Run Admin API. Current state:
  - received = `35`
  - allocated = `35`
  - remaining = `0`
  - coverage = `100%`
- **Raw Field Exposure:** Deployed Cloud Run API accurately exposes unmasked raw risk fields:
  - `raw_remaining_qty = 0`
  - `over_allocated_qty = 0`
  - `coverage_raw_pct = 100`
  - `remaining_qty_data_risk = false`
- **Service-Level 409 Guard Behavior:** Local simulated test of the `assertReceivedQtyNotBelowAllocated` service successfully rejected a proposed received of `34` against a finalized allocated of `35`. It returned `409 Conflict`, code `AllocationExceedsReceivedQuantity`, and the correct EN/AR messages.
- **No-Op Service Behavior:** Verified that the service correctly bypasses enforcement (`received_line_not_created`) when no received line yet exists.

## 3. Owner Decision & Validation Waived
- **Route-Level Authenticated Rejection Test:** Waived / Deferred.
- **Reason:** The owner has elected not to pursue the route-level manual test at this time. There is sufficient confidence from the Codex review, backend typecheck, and the deployed service/API validations. Furthermore, the future governance direction dictates a move away from post-allocation weight edits entirely.

## 4. Future Product Direction
For materially wrong completed/allocated shipment lines, the future product direction will enforce the following:
- **No Post-Facto Edits:** Avoid direct post-allocation weight edits except controlled admin/internal emergency paths.
- **Void/Cancellation Workflow:** 
  - Users must submit a formal cancellation/void request for the materially incorrect operation/line.
  - The request requires a documented reason and evidence.
  - Tadweerah/admin review and approval are required.
- **Audit Trail:** If approved, the line/operation is voided/cancelled with a full audit log. The cancelled/voided line should remain visible as a historical record.
- **Recreation:** The user creates a new shipment/line to properly document the corrected operation.

## 5. Closure Status & Explicit Notes
- **Batch 1B Status:** Deployed to staging, raw fields exposed, and service-level guard validated. Route-level owner-authenticated test has been deferred/waived. 
- **DB State:** No permanent DB changes or migrations were run.
- **Deploy State:** No frontend deploy occurred.
- **Batch 1C:** Remains completely out of scope and has not been started.
- **Production:** The production database and deployment remain untouched. This validation only documents the closure status and future direction.
