# Phase 3-B Batch 1B UAT Reports

## Out-of-scope admin observation carried to Batch 1D

**Context / Screenshot:** Admin sustainability tab (operations/sustainability records)
**Classification:** Out of Batch 1B scope
**Carry-forward target:** Phase 3-B Batch 1D admin view/governance
**Code changes performed:** None

During the Phase 3-B Batch 1B review, the following observations were made regarding the admin sustainability tab:

1. **Missing Commercial Reference:**
   - Some admin rows display `مرجع غير متوفر` (reference unavailable).
   - Admin operations and sustainability records require a clear, reliable reference for traceability.
   - **Risk:** Admins cannot reliably trace a sustainability record back to the operational/commercial source.
   - **Action needed for Batch 1D:** If a commercial reference is not available, the UI should provide a safe technical fallback or explanatory label (e.g., allocation id, received line id, shipment/deal/contract reference if available, or a clear status such as “لم يتم ربط مرجع تجاري بعد”).

2. **Legacy Quantity Display:**
   - The admin quantity display still shows the old/general quantity column.
   - **Action needed for Batch 1D:** The admin quantity display must be updated to reflect the new `allocated` / `received` / `reportable` split established in Batch 1A/1B.

*Batch 1B UAT continues to remain focused exclusively on the frontend `/reports` sustainability tab.*

## Batch 1B Frontend `/reports` UAT Results

**Account/Role Used:** Standard User (Seller/Buyer)
**URL/Path Reached:** `/reports?tab=sustainability`

**Rows & Quantities Observed:**
- The sustainability reports table displays successfully with the two new semantic columns.
- **Received Quantity** is shown strictly as context ("الكمية المستلمة" / "Received Quantity").
- **Reportable Sustainability Quantity** is correctly shown as the primary impact quantity ("كمية الاستدامة المعتمدة للتقرير" / "Reportable Sustainability Quantity").
- Legacy `quantity` is no longer used as the impact value.

**Specific Test Cases Verified:**
- **40 / 35 / 5 Case Displays Correctly:** Yes.
  - Received: 40
  - Reportable: 35
  - Remaining: 5 (displays as "الكمية المتبقية غير الموزعة: 5" / "Remaining Unallocated Quantity: 5")
  - Coverage: 87.5% (displays as "نسبة التوزيع 87.5%" / "Coverage 87.5%")
- **Missing `reportable_qty` Fallback:** Yes. When `reportable_qty` is absent, the UI correctly displays the warning "غير متاح — يحتاج تحديث البيانات" / "Unavailable — refresh required" and safely refuses to fall back to the legacy quantity for impact.
- **Data Risk Warning (`remaining_qty_data_risk === true`):** Yes. When true, a red alert warning appears stating "خطأ في البيانات: توزيع يفوق الاستلام" / "Data risk: Over-allocation". It does not describe the issue as fixed or resolved.
- **CSV/Download:** Yes. Clicking export correctly fetches the CSV from the backend `/api/reports/sustainability?format=csv` endpoint, utilizing the Batch 1A structure without client-side conflicts.

**Visual or Wording Issues:**
- None. Layout accommodates the extra context cleanly using badges and secondary text.

**Screenshots Status:**
- Explicit note: No local visual screenshots were captured or attached for this test run.

**Batch 1B Pass/Fail:** PASS
**Next Step:** Batch 1C (Print Route Adjustment) can be planned next.
