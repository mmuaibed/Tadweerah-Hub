# Phase 3-B Batch 1B - Received-vs-Allocated Guardrail Plan

## 1. Problem Statement
The Phase 3-B Batch 1A-S Governance UAT proved that when a physical sustainability received quantity (`destination_weight` or `source_weight`) is modified to be lower than the active finalized allocated quantity, the system silently masks the negative variance. 
* Displayed `remaining_qty` artificially clamps to `0` via `Math.max(0, ...)`.
* Displayed `coverage_pct` artificially clamps to `100%` via `Math.min(100, ...)`.
This mathematical invalid state (`proposed_received_qty < active_finalized_allocated_qty`) must be prevented at the write-path level, and existing read-models should expose unmasked data-risk flags.

## 2. Affected Write Paths
The following write paths modify the physical weights that drive the sustainability received quantity:
1. **`POST /shipments/:id/receive` (Buyer App):** Modifies `destination_weight`.
2. **`POST /shipments/:id/dispatch` (Seller App):** Modifies `source_weight`.
3. **`POST /deals/:deal_id/confirm-dispatch` (Direct Deals):** Modifies `actual_quantity`.
4. **Future Admin Reweigh/Correction Workflows or ad hoc scripts:** Will modify these fields post-closure.

**Normal-Flow Relevance:**
* `/shipments/:id/dispatch` and `/shipments/:id/receive` usually run before a `sustainability_received_lines` row exists.
* Shipment received-line derivation happens later on `/shipments/:id/close`.
* `/deals/:deal_id/confirm-dispatch` usually runs before received-line derivation.
* Deal received-line derivation happens on `/deals/:deal_id/confirm-receipt`.

**Historical Correction Context:**
Batch 1A-R corrected only `sustainability_received_lines.final_received_qty` and did *not* update physical source/destination weights. The real future risk is post-allocation edits through admin reweigh, future correction workflows, or ad hoc scripts.

## 3. Proposed Backend Guardrail
We will implement a shared backend guard function. The guard must not block normal pre-received-line operational flow; it will be a conditional no-op when no received line exists.

**Recommended Signature:**
```ts
assertReceivedQtyNotBelowAllocated(dbOrTx, {
  parentEntityType: "contract_shipment" | "deal",
  parentEntityId: string,
  proposedReceivedQty: string | number | null,
})
```

**Execution Flow:**
1. **Resolution:** Resolve existing `sustainability_received_lines` via the parent entity ID.
2. **No-op Check:** If no received line exists, return `{ checked: false, reason: "received_line_not_created" }`.
3. **Allocation Sum:** Sum `sustainability_allocation_lines` belonging to allocations with `status = 'finalized'`.
   * Include active finalized non-superseded allocation lines only.
   * Exclude `draft`.
   * Exclude `needs_review` (this is a governance context, not an active reportable impact).
   * Exclude `superseded` (original finalized allocation remains active until superseded).
4. **Validation:** Reject if `proposed_received_qty < active_finalized_allocated_qty`.
5. **Error Response:** Throw a `409 Conflict` (or equivalent) structured error:
```json
{
  "error": "AllocationExceedsReceivedQuantity",
  "message_en": "Received quantity cannot be reduced below finalized allocated quantity.",
  "message_ar": "لا يمكن تخفيض الكمية المستلمة إلى أقل من الكمية المخصصة المعتمدة.",
  "details": {
    "proposed_received": 34,
    "active_allocated": 35,
    "delta": -1,
    "received_line_id": "uuid",
    "affected_allocation_ids": ["uuid"]
  }
}
```

## 4. Implementation Scope
**Classification:** Backend-only for Batch 1B.
* Add shared guard service.
* Add raw risk fields to shared metrics.
* Call guard from existing physical quantity write paths as a conditional no-op if no received line exists.
* No data mutation.
* No DB migration.
* No production DB correction yet.
* No Batch 1C script extensions.
* Frontend warning is deferred.

## 5. Target Routes and Services
* **`artifacts/api-server/src/services/sustainability-received-quantity.ts`:**
  * Add `raw_remaining_qty`, `over_allocated_qty`, `coverage_raw_pct`, `remaining_qty_data_risk`.
* **New Service:** 
  * `artifacts/api-server/src/services/sustainability-received-allocation-guard.ts`
* **`artifacts/api-server/src/routes/shipments.ts`:**
  * `POST /shipments/:id/dispatch`
  * `POST /shipments/:id/receive`
* **`artifacts/api-server/src/routes/deals.ts`:**
  * `POST /deals/:deal_id/confirm-dispatch`
  * (No-op / future-proof unless received line already exists)

## 6. Testing Checklist
- [ ] no received line exists -> no-op/pass
- [ ] finalized allocation `35`, proposed received `34` -> reject `409`
- [ ] finalized allocation `35`, proposed received `35` -> pass
- [ ] draft/needs_review/superseded only -> not counted
- [ ] `/shipments/:id/receive` with existing received line and lower destination -> reject
- [ ] `/shipments/:id/dispatch` source change while destination exists -> derive using destination priority
- [ ] `/deals/:deal_id/confirm-dispatch` normal pre-received-line flow still works
- [ ] metrics invalid data exposes:
  - `raw_remaining_qty = -1`
  - `over_allocated_qty = 1`
  - `coverage_raw_pct ≈ 102.94`
  - `remaining_qty_data_risk = true`
