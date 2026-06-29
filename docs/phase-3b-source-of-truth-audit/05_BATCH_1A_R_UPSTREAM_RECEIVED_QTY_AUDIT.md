# Phase 3-B Batch 1A-R Upstream Received Quantity Audit

## Commercial Approved Weight vs Sustainability Received Weight

**Goal:** Correct the upstream population of `sustainability_received_lines.final_received_qty` to adhere to the strict sustainability impact rule: sustainability impact must not exceed the actual buyer-site received quantity, regardless of commercial weight policies.

**Owner-Approved Clarification / Rule Hierarchy:**
For contract shipments, sustainability received quantity must follow this hierarchy:
1. **If source_weight and destination_weight both exist:** Sustainability received quantity = `destination_weight` (buyer-site).
2. **If only destination_weight exists:** Use `destination_weight`.
3. **If only source_weight exists:** Use `source_weight`.
4. **If no valid physical weight exists:** Sustainability received quantity is unavailable/pending.
   *Never use final_weight, commercial approved weight, or weight_policy for sustainability when physical source/destination fields are available. Do not use higher/lower contract rules for sustainability.*

**NULL / 0 / Absent Handling:**
- NULL / missing / empty / non-numeric = not available.
- 0 should not be treated as a confirmed sustainability physical weight in the current flow unless there is an explicit future zero-received/rejected-load status.
- For now, no valid physical weight means:
  - `final_received_qty` may be stored as 0 only because the schema is non-null.
  - `is_eligible = false`.
  - `ineligibility_reason = "missing_physical_quantity"`.
  - No confirmed sustainability impact/report should be generated from it.

**Commercial Separation Acceptance Criteria:**
- Commercial/financial approved weight remains strictly for settlement, invoices, and financial calculations. It may follow contract terms and `weight_policy`.
- Commercial approved weight must not override sustainability received quantity when two physical weights exist.
- Settlement/invoice/`final_weight` logic remains untouched.
- TDW-CTR-2026-0006-S010 should preserve commercial approved weight = 40 while sustainability received quantity becomes 35.

### 1. Which code path creates `sustainability_received_lines.final_received_qty`?
`final_received_qty` is **stored and persisted** in the database table `sustainability_received_lines`.
The persisted creation path is located in `artifacts/api-server/src/services/sustainability-derivation.ts`.
- `deriveReceivedLineForShipment`: Called when a shipment is closed (e.g. from `shipments.ts` or `contract-shipments.ts`). It currently uses `contract.weight_policy` and writes `sustainability_received_lines.final_received_qty`.

Additionally, duplicated read/derive logic exists in `artifacts/api-server/src/routes/sustainability.ts`:
- `enrichReceivedLineQty`: Currently dynamically re-evaluates weight policies.

Because `final_received_qty` is stored and persisted, code-path refactor fixes only new/future rows. Existing rows require separate correction after dry-run and owner approval. No data correction is included in 1A-R1.

### 2. Grep-Backed Writer/Read Audit
- **Writers to `final_received_qty`:** 
  - `artifacts/api-server/src/services/sustainability-derivation.ts` (`deriveReceivedLineForShipment` and `deriveReceivedLineForDeal`).
- **Key Readers of `final_received_qty`:**
  - `artifacts/api-server/src/routes/sustainability.ts` (`enrichReceivedLineQty`, `/sustainability/received-lines` derived display logic, mismatch/finalized checks).
  - `artifacts/api-server/src/routes/admin.ts`.
  - `artifacts/api-server/src/routes/reports.ts`.
- **Status of `deals.actual_quantity`:** 
  - Under current deal flow, `deals.actual_quantity` acts as the physical weighbridge value entered at dispatch.
- **Other Route Updates:** 
  - No route outside of `sustainability-derivation.ts` and `sustainability.ts` actively creates or updates the `sustainability_received_lines` records.

### 3. Is `final_received_qty` currently using the financial approved weight instead of the buyer-site received quantity?
**Yes.** `deriveReceivedLineForShipment` and `enrichReceivedLineQty` both currently mimic the commercial `weight_policy`. If a contract specifies `source_weight_only`, it assigns `shipment.source_weight` to `final_received_qty`, improperly injecting financial logic into sustainability logic.

### 4. Which field should drive each process?
- **Payment / Settlement:** Commercial approved weight (`contractShipmentsTable.final_weight` / `dealsTable.actual_quantity`).
- **Contract Value:** Commercial approved weight.
- **Sustainability Received Quantity:** Physical weight hierarchy (favoring `destination_weight`).
- **Sustainability Allocation:** Sustainability received quantity (`final_received_qty` mapped from the physical weight).
- **Reportable Sustainability Quantity:** Sum of finalized allocations.
- **Certificate / Print Impact:** Reportable sustainability quantity (`reportable_qty`).

### 5. Finalized/Immutable Allocation Rule
If an existing sustainability allocation is finalized/immutable and was built on an incorrect `final_received_qty`, **do not silently update it**.
Data correction must identify whether finalized allocations depend on the received line. Correction may require SIR-2D reopen/supersede/versioning or an owner-approved correction policy. This is explicitly blocked for correction and not part of 1A-R1.

### 6. Batch 1B UAT Status
Batch 1B code structure remains valid. However, live UAT for S010 must be re-run after the upstream received quantity source is corrected.
**Expected S010 after correction:**
- Received: 35
- Reportable: 35
- Remaining: 0
- Coverage: 100%
