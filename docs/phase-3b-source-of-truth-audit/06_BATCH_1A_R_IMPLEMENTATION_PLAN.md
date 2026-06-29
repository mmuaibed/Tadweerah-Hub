# Phase 3-B Batch 1A-R Implementation Plan: Upstream Received Quantity Fix

## Objective
Implement the owner-approved hierarchy for computing the sustainability received quantity (`sustainability_received_lines.final_received_qty`) so it is strictly derived from physical weights rather than commercial settlement rules.

## Owner-Approved Physical Weight Hierarchy
For contract shipments:
1. If `source_weight` and `destination_weight` both exist, sustainability received quantity = `destination_weight` (buyer-site).
2. If only `destination_weight` exists, use `destination_weight`.
3. If only `source_weight` exists, use `source_weight`.
4. If no valid physical weight exists, sustainability received quantity is unavailable/pending.
   *Never use final_weight, commercial approved weight, or weight_policy for sustainability when physical source/destination fields are available.*

**NULL / 0 / Absent Handling:**
- NULL / missing / empty / non-numeric = not available.
- 0 should not be treated as a confirmed sustainability physical weight in the current flow unless there is an explicit future zero-received/rejected-load status.
- For now, no valid physical weight means `is_eligible = false`, `ineligibility_reason = "missing_physical_quantity"`, and no confirmed sustainability impact/report should be generated from it. (The `final_received_qty` may be stored as 0 only because the schema is non-null).

## Implementation Gates

### 1A-R1 — Code-Path Refactor Only
- **Update physical-weight hierarchy:** Introduce a shared sustainability physical-weight helper/hierarchy used consistently by:
  - `deriveReceivedLineForShipment` (`sustainability-derivation.ts`)
  - `enrichReceivedLineQty` (`sustainability.ts`)
  - `/sustainability/received-lines` derived display logic
  - Any mismatch/finalized checks currently using `weight_policy`.
- **No data writes** beyond normal app future behavior.
- **No correction script.**
- **No migration.**
- **No deployment until reviewed.**

### 1A-R2 — Dry-Run Report Script
- **Tracked/reviewed script only.** Do not reuse untracked `scripts/sustainability-dry-run.ts` as-is.
- **Output affected rows only.**
- **No writes.**
- **Dry-run requirements:** Must classify rows as:
  - changed
  - unchanged
  - becomes pending/unavailable
- **Row output must include:** `received_line_id`, `shipment_id`, commercial reference if available, `source_weight`, `destination_weight`, `final_weight`, `weight_policy`, current `final_received_qty`, proposed sustainability received qty, delta, whether finalized allocations depend on it, and whether correction is safe or requires owner/SIR-2D decision.

### 1A-R3 — Owner Review of Dry-Run
- Owner reviews current/proposed values and references.

### 1A-R4 — Data Correction (Only if Explicitly Approved)
- Idempotent script.
- Rollback values captured.
- Handles finalized/immutable allocation issue safely.

### 1A-R5 — Retest 1A/1B
- Retest `/reports`, allocation detail, admin list/detail, and later print/detail.
- **Real partial fixture requirement:** Because S010 becomes 35/35/0/100 after upstream correction, it no longer tests partial allocation. We must create or identify a separate genuine partial-allocation case for testing `remaining_qty` and coverage.
