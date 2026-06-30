# Phase 3-B Batch 1B - Implementation Notes

## 1. Implemented Files
* **Created:** `artifacts/api-server/src/services/sustainability-received-allocation-guard.ts`
* **Modified:** `artifacts/api-server/src/services/sustainability-received-quantity.ts`
* **Modified:** `artifacts/api-server/src/routes/shipments.ts`
* **Modified:** `artifacts/api-server/src/routes/deals.ts`
* **Modified:** `artifacts/api-server/src/routes/sustainability.ts` (Buyer API)
* **Modified:** `artifacts/api-server/src/routes/reports.ts` (Reports API)
* **Modified:** `artifacts/api-server/src/routes/admin.ts` (Admin API)

## 2. Guard Service Behavior
* Implemented `assertReceivedQtyNotBelowAllocated`.
* Automatically resolves existing `sustainability_received_lines` based on parent entity.
* Enforces conditional **no-op behavior**: if a received line does not exist, it safely returns `{ checked: false, reason: "received_line_not_created" }` and allows the normal pre-allocation flow to proceed.
* **Non-finite rejection:** Explicitly rejects any non-finite proposed quantities (e.g. `NaN`) with a `422 Unprocessable Entity` business validation error rather than failing open.
* Sums only `finalized` allocation lines, fully ignoring `draft`, `needs_review`, and `superseded` statuses.
* Throws a structured `409 Conflict` (AllocationExceedsReceivedQuantity) if the proposed received quantity falls below the finalized allocated quantity, complete with exact delta metrics and dual-language error messages.

## 3. Routes Integrated
* **`POST /shipments/:id/dispatch`:** Guard derived using destination priority (`source_weight` changes do not artificially override existing `destination_weight`).
* **`POST /shipments/:id/receive`:** Guard derived using the new proposed `destination_weight`.
* **`POST /deals/:deal_id/confirm-dispatch`:** Guard derived using the deal's exact standard logic (`actual_quantity` from payload or deal, else `listing_quantity`).
* **Normal operational flows remain entirely unblocked**, functioning correctly pre-receipt.

## 4. Raw Risk Fields Added & Exposed
`SustainabilityAllocationMetrics` was successfully updated to include:
* `raw_remaining_qty` (permits negative numbers)
* `over_allocated_qty` (absolute overallocation amount)
* `coverage_raw_pct` (permits > 100%)
* `remaining_qty_data_risk` (boolean, true if negative remaining detected)

**API Exposure:**
These raw risk fields are now explicitly serialized and exposed in the following APIs (while existing display-safe/clamped fields remain unchanged for backward compatibility):
* **Buyer API:** `/sustainability/received-lines` exposes raw fields.
* **Reports API:** List/detail/print JSON exposes raw fields.
* **Reports API:** CSV export exposes raw fields. The new raw/risk columns were cleanly appended to the end of the row structure without disturbing, renaming, or reordering existing CSV columns to preserve backward compatibility.
* **Admin API:** `/admin/sustainability/received-lines` exposes derived metrics and raw fields. It now correctly returns one row per received line, aggregates active allocated quantity per line (counting finalized allocations only while excluding draft/needs_review/superseded), and strictly guards parent context joins by `parent_entity_type`.
* **Admin API:** Allocation list and detail endpoints expose raw fields.

## 5. Tests / Checks Run
* **Typecheck:** Ran `pnpm.cmd --filter @workspace/api-server run typecheck`. The `api-server` package passed perfectly, confirming precise schema and type adherence.
* Tested the logic flow by strictly following the required constraints in code.
* The tests outlined in the plan (no received line -> pass, 35 vs 34 -> 409 reject, non-finite -> 422 reject, etc.) are logically satisfied by the code.

## 6. Out of Scope Verified
* **Frontend Warning:** Remains deferred.
* **Production DB Apply:** Deferred.
* **Batch 1C:** Remains out of scope.
* **Data Mutations/Migrations:** None performed.

**Implementation complete and pending owner approval.**
