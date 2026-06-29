# Phase 3-B Batch 1B Frontend Reports Plan

## 1. Current Frontend Fields Consumed
Currently, on the `/reports` sustainability tab, the frontend consumes the following fields from the `GET /api/reports/sustainability` endpoint (via `SustainabilityReportRow`):
- `quantity` (the legacy received quantity)
- `unit`
- `pathways` (an array with `pathway_id`, `pathway_name_ar`, `pathway_name_en`, `quantity`, `percentage`)
- Other metadata (`finalized_at`, `source_type`, `commercial_ref`, `my_role`, `counterparty_name`, `material_ar`, `material_en`, `status`, `allocation_id`)

## 2. Current Labels Shown to User
In the sustainability table header (`reports.tsx`):
- **Arabic**: "الكمية المستلمة" (Received Qty)
- **English**: "Received Qty"
Currently, the value rendered under this column is the legacy `quantity` field.

In the CSV export header:
- **Arabic**: "الكمية المستلمة"
- **English**: "Received Qty"

## 3. Required UI Display Changes

1. **Update Types**: Add the new backend fields to `SustainabilityReportRow`:
   - `received_qty: string`
   - `reportable_qty: string`
   - `remaining_qty: string`
   - `remaining_qty_data_risk: boolean`
   - `allocation_coverage_pct: string | null`
2. **Table Header Addition**: Insert a new column next to "Received Qty" for the "Reportable Sustainability Qty".
3. **Primary Quantity Switch**:
   - The old `quantity` field should be ignored as it is deprecated.
   - The new primary reported impact quantity will be `reportable_qty`.
   - The `received_qty` will act as context alongside the `reportable_qty`.
4. **Coverage and Remaining Context**:
   - Surface the `allocation_coverage_pct` as a subtle badge or sub-text near the `reportable_qty`.
   - If `remaining_qty > 0`, it can optionally be shown as tooltips or subtext (e.g., "5 kg unallocated").
   - If `remaining_qty_data_risk === true`, show a warning icon indicating an over-allocation data integrity risk.

## 4. Arabic/English Label Recommendations

- **Received Quantity** (Context):
  - AR: الكمية المستلمة
  - EN: Received Qty
- **Reportable Sustainability Quantity** (Impact):
  - AR: الكمية الموزعة للاستدامة
  - EN: Allocated Sustainability Qty
- **Coverage Percentage**:
  - AR: نسبة التوزيع
  - EN: Coverage %

*(Note: These align with the CSV headers added in Batch 1A).*

## 5. Backward Compatibility Handling
If the API fields are missing (e.g. backend lag or old cached response), the frontend should gracefully fallback to the legacy `quantity` field.
```tsx
const safeReceived = row.received_qty ?? row.quantity ?? "0";
const safeReportable = row.reportable_qty ?? row.quantity ?? "0"; // fallback if new backend is not fully synced
```
*(Ideally, since the backend is already merged, `received_qty` and `reportable_qty` will always exist, but fallback prevents breaking old mocked or cached data)*.

## 6. Empty/Null/Zero Handling
- If `reportable_qty` is `"0"` or `0.0000`, it should display as `0`.
- If `allocation_coverage_pct` is `null`, omit the coverage badge.
- Pathway columns that do not match the row's pathways should explicitly render `0` or a faded `-` (currently it renders `0` which is fine).

## 7. Partial Allocation Display Behavior
When a record has a partial allocation (e.g., 40 received, 35 reportable):
- "Received Qty" column shows `40`.
- "Allocated Sustainability Qty" column shows `35`.
- "Coverage %" shows `87.5%` as a badge next to `35`.

## 8. UAT Cases
1. **Fully Allocated (40 / 40 / 0)**:
   - Received: 40
   - Reportable: 40
   - Coverage: 100%
   - No warnings.
2. **Partial Old Case (40 / 35 / 5)**:
   - Received: 40
   - Reportable: 35
   - Coverage: 87.5%
   - Unallocated is 5.
3. **Zero/Null Received**:
   - Received: 0
   - Reportable: 0
   - Coverage: Null (no badge)
4. **Reportable Qty 0**:
   - Received: 10
   - Reportable: 0
   - Coverage: 0%
5. **Legacy quantity still not used as impact**:
   - Prove that `row.quantity` is not what the frontend is rendering in the impact column.

## 9. Files Likely to Change
- `artifacts/tadweerah/src/pages/reports.tsx`:
  - Interface `SustainabilityReportRow`.
  - The `<tbody>` render block for the sustainability table.
  - The CSV generation header and rows.

## 10. Risks and Owner Approval Checklist

- [ ] Does the addition of an extra column break the table layout on small screens? (Risk: low, it scrolls horizontally).
- [ ] Should the CSV export in the frontend match the new backend admin CSV perfectly? (Yes, we will sync it).
- [ ] Do we need to update the `reports.tsx` CSV export explicitly? (Yes, the frontend currently generates its own CSV from `sustReport.rows`).

*Ready for Owner Approval.*
