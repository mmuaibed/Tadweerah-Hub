# Phase 3-B Batch 1A-R4B: `is_eligible` Allocation Anomaly Review

## Objective
Investigate the misleading persisted database field `sustainability_received_lines.is_eligible`, clarify its meaning and effect, and define a precise data governance rule to eliminate ambiguity without dropping columns during the current phase.

## 1. Current Meaning & Ambiguity
**What does `is_eligible` currently mean in the DB?**
Historically, the field was intended as a quick flag to denote that a received line was fully valid for sustainability reporting (i.e., it had a positive physical quantity and a classified material). 

However, because the schema decoupled this flag from the underlying physical weight and material classification, it became a stale snapshot rather than a reliable real-time rule.

## 2. Current Effect & Code Paths
**Code paths reading `is_eligible`:**
- `sustainability-derivation.ts`: Sets the initial persisted value in the database.
- `sustainability.ts`: The `GET` routes fetch the value, but **immediately override it** in memory via `enrichReceivedLineQty()` based on actual material classification and physical weights.

**Code paths ignoring `is_eligible`:**
- **Allocation Creation:** `POST /sustainability/received-lines/:id/allocation` checks the *in-memory* property after dynamic recalculation. It completely ignores the raw persisted database value.
- **Reporting:** `reports.ts` queries allocations and joins received lines. It **does not filter** by `sustainabilityReceivedLinesTable.is_eligible`.
- **Admin Views:** `admin.ts` does not rely on this field to filter reports.
- **Print/Certificates:** These rely on existing allocations, bypassing the `is_eligible` DB flag entirely.

**Conclusion:** The persisted `is_eligible` field does **not** block allocation creation, reporting, or certificates. The system has already organically evolved to ignore the persisted database field in favor of dynamic recalculation.

## 3. Data-Source Decision: Option A (Remove as source-of-truth)
**Recommendation: Option A.**
We must stop treating the persisted `is_eligible` database column as authoritative. It is currently a misleading, stale cache that contradicts actual system behavior. 

**Eligibility must be structurally derived from:**
1. Valid **Actual Sustainability Received Weight** (وزن الاستلام الفعلي للاستدامة) > 0.
2. Presence of a valid material classification.

The old DB field will be kept temporarily for schema compatibility but is formally marked as **deprecated**. A future migration batch will drop the column.

## 4. Required Naming Recommendation
While the DB field will be deprecated, the API payload still requires a precise boolean property to inform the frontend whether the line is ready to be allocated. We must rename the ambiguous API property from `is_eligible` to:

**English:** `is_ready_for_allocation`
**Arabic:** جاهز_للتخصيص

*Alternative for strict classification checks:*
**English:** `is_material_classified`
**Arabic:** مصنف_كمادة_استدامة

*We recommend `is_ready_for_allocation` because it precisely describes the combined business rule (has Actual Sustainability Received Weight + is classified).*

## 5. Correction Impact (Batch 1A-R4)
For existing rows like S010 (and the 3 seemingly safe changed rows):
- The physical weight correction (Actual Sustainability Received Weight) **must proceed**.
- Since we are deprecating the persisted `is_eligible` flag as a source of truth, the 1A-R4 correction script does not technically *need* to repair the flag for the system to function (since the API dynamically recalculates anyway). 
- **However, to prevent DB-level confusion for analysts during the transition:** The 1A-R4 correction script should explicitly recalculate and update the persisted flag to `true` when saving the new Actual Sustainability Received Weight, if the row has a valid material classification. 

## 6. Migration Caution
- **No columns will be dropped or renamed in the database during Phase 3-B.**
- The API response payload property renaming (`is_ready_for_allocation`) and the formal DB column drop will be scheduled as a separate future implementation batch after Phase 3-B data correction stabilizes.

## 7. Status & Next Steps
**Can 1A-R4 data correction proceed?**
Yes. 1A-R4 can now proceed safely. The "anomaly" is confirmed to be a stale DB cache issue, not a structural corruption of the allocations. 

**Recommended Next Prompt:**
```text
Approve 1A-R4B findings. Proceed to update the Batch 1A-R2 dry-run script to include the recalculation of the deprecated is_eligible flag alongside the Actual Sustainability Received Weight correction. Re-run the dry-run script locally to confirm the final changes before owner authorization of 1A-R4.
```
