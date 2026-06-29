# Phase 3-B Batch 1A-R2 Dry-Run Script Plan

## Objective
Create a read-only script to identify existing `sustainability_received_lines` (where `parent_entity_type = 'contract_shipment'`) that were populated using the incorrect commercial `weight_policy` logic, and map out their proposed corrections using the newly approved physical weight hierarchy.

## Script Details
**Path:** `scripts/phase-3b-sustainability-received-qty-dry-run.ts`

**Read-Only Guarantee:**
- **Database read-only:** The script strictly uses `.select()` queries through `drizzle-orm`.
- **No database writes:** It does not contain any `.update()`, `.insert()`, or `.delete()` operations.
- **Local filesystem report output only:** It only outputs tables to the console and writes a timestamped markdown report to the local file system.

**Why Not Reuse `scripts/sustainability-dry-run.ts`?**
The existing script was originally designed for `deal` mismatches involving `estimated_amount` vs `actual_quantity`. The contract shipment correction logic is structurally different, heavily depends on the new physical weight hierarchy (source vs. destination), and involves checking finalized allocations to flag unsafe corrections. A purpose-built script is required.

## Fields Evaluated and Output
The dry-run evaluates and includes all rows (unchanged, changed, and becomes_pending_unavailable) in its output:
- **Classification:** `changed`, `unchanged`, or `becomes_pending_unavailable`
- **Identifiers:** `received_line_id`, `parent_entity_id`, `shipment_id`, `shipment_reference`, `commercial_reference`, `contract_reference`
- **Weights Evaluated:** `source_weight`, `destination_weight`, `final_weight` (commercial), `weight_policy`
- **Quantity Comparison:** Current `final_received_qty` vs. Proposed `final_received_qty`, and the calculated Delta. Comparison is strictly numeric.
- **Eligibility:** Current `is_eligible` vs. Proposed `is_eligible`
- **Reasons:** Current `reason` vs. Proposed `reason`
- **Allocation Risks:** Count of related allocation lines (via `sustainability_allocations` join), whether any parent allocation is finalized/approved.
- **Safety Status:** Whether the correction appears "YES" or "NO - Requires SIR-2D/Owner Decision".

## Classification Logic
The script leverages the physical-weight hierarchy:
1. Both `source_weight` & `destination_weight` valid -> `destination_weight`
2. Only `destination_weight` valid -> `destination_weight`
3. Only `source_weight` valid -> `source_weight`
4. Neither valid -> `null` (Pending/Unavailable)

- `unchanged`: Stored numeric value exactly matches proposed numeric value.
- `changed`: Stored numeric value differs from proposed numeric value.
- `becomes_pending_unavailable`: No valid physical weight exists but a value strictly != 0 or eligible=true was previously stored.

## Handling Finalized Allocations
If a received line is attached to a `sustainability_allocations` record that is `finalized` or `approved`, the script marks the correction as **"NO - Requires SIR-2D/Owner Decision"**. We do not silently update finalized allocations because they are immutable and represent formally distributed impact.

## Execution
**No-DB Preflight:**
Before requesting or setting `DATABASE_URL`, verify local imports and file paths from the repository root:
```bash
pnpm exec tsx scripts/phase-3b-sustainability-received-qty-dry-run.ts --preflight
```
This preflight does not import the DB client, does not require `DATABASE_URL`, and does not connect to any database.

**Command (To be confirmed before execution):**
Execution should be done from the repository root, as the script uses `process.cwd()` to output the report. It should use a `pnpm` workspace command, avoiding dynamic tool downloads or DB execution until owner approval.
Example: `pnpm exec tsx scripts/phase-3b-sustainability-received-qty-dry-run.ts`

**Report Output:**
The script writes the output to a timestamped file relative to `process.cwd()`:
`docs/phase-3b-source-of-truth-audit/dry-runs/1a-r2-sustainability-received-qty-dry-run-YYYYMMDD-HHMM.md`
