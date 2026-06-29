# 07 Admin Auth Discovery

Last updated: 2026-06-29
Mode: Discovery Mode
Profile: staging-readonly-uat
Approved target: https://tadweerah.com
Approved role: admin UAT account
Evidence types used: Browser evidence

## Status

Admin read-only discovery completed.

The session was verified as an admin context before admin discovery continued.

## Role / Context Verification

- Checked URL: `https://tadweerah.com/admin`
- Page title: `Tadweerah`
- Visible admin heading: `لوحة إدارة الصفقات`
- Visible admin subtitle: `مراقبة الصفقات وجاهزية بيانات مَوَن`
- Visible account context: `مدير تدويرة`
- `Company Context Required`: not visible during this run
- `Go to Admin Panel`: not needed; the browser was already on the admin panel
- Admin-key password field visible: yes, but no value was inspected, captured, printed, or stored
- Screenshot rule: no screenshot was captured while the admin-key field was visible in the viewport

## Current Session Re-Verification

Re-verified on 2026-06-29 after the admin report had already been completed.

- Checked URL: `https://tadweerah.com/admin`
- Page title: `Tadweerah`
- Current visible context remains admin UAT.
- Visible headings:
  - `لوحة إدارة الصفقات`
  - `إحصائيات المنصة`
  - `لمحة عامة (مؤشرات سريعة)`
  - `سجلات الاستدامة`
- `Company Context Required`: not visible
- `Create Test Company`: not visible
- Admin-key password field visible: yes; no value inspected, captured, printed, or stored
- Current visible sustainability record evidence still includes `TDW-CTR-2026-0006-S010`, `40 طن`, `معتمد`, version `2`, and a replaced version `1`
- Visible mutation-capable action `تعديل (إعادة فتح)` remains unclicked
- Visible `عرض التقرير` buttons remain disabled in the sustainability rows

## Screens Reached

### 1. Admin Panel / Companies Default

- URL: `https://tadweerah.com/admin`
- Route state: active by browser reachability
- Screen type: admin governance / company oversight
- Visible headings:
  - `لوحة إدارة الصفقات`
  - `إحصائيات المنصة`
- Visible navigation tabs:
  - `الشركات`
  - `الصفقات`
  - `العقود`
  - `الشحنات`
  - `طلبات النقل`
  - `التقارير`
  - `مشاكل العملاء`
  - `سجل العمليات`
  - `عمليات تحتاج مراجعة`
  - `إدارة القوائم`
  - `ملاحظات وتطوير`
- Visible statuses:
  - `قيد المراجعة`
  - `معتمد`
  - `مرفوض`
  - `منتهي الصلاحية`
- Visible quantities:
  - `4` إجمالي الشركات
  - `0` شركات بانتظار الاعتماد
  - `3` Approved Companies
  - `13` Total Listings
  - `6` Active Listings
  - `7` Total Offers
  - `4` Total Deals
  - `0` Active Deals
  - `3` Completed Deals
  - `3` Total Transports
  - `1` Pending Transports
- Visible actions not clicked:
  - `تحميل الشركات`
  - `تطبيق`
  - `عرض التفاصيل`
- Screenshot:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-dashboard-companies-safe-scroll.png`

### 2. Admin Reports Tab

- URL: `https://tadweerah.com/admin`
- Route state: active in-page admin tab by browser navigation
- Screen type: admin reports
- Previous screen: admin companies/default tab
- Visible headings:
  - `لمحة عامة (مؤشرات سريعة)`
  - `تقرير الصفقات المفصل`
- Visible report subtabs:
  - `الصفقات`
  - `العقود`
  - `الشحنات`
  - `الشركات`
  - `نشاط المنصة`
  - `الاستدامة`
- Visible labels:
  - `من تاريخ`
  - `إلى تاريخ`
  - `الحالة`
  - `المدينة`
  - `معرّف الشركة (اختياري)`
- Visible statuses:
  - `بانتظار تأكيد الدفع (حوالة بنكية)`
  - `بانتظار تأكيد الدفع`
  - `تم تأكيد الدفع (الحوالة المستلمة)`
  - `البضاعة في الطريق`
  - `بانتظار تأكيد الاستلام`
  - `مكتملة`
  - `منتهية الصلاحية`
  - `ملغاة`
- Visible quantities:
  - `4` إجمالي الصفقات
  - `3` مكتملة
  - `0` نشطة / قيد التنفيذ
  - `247,000 ر.س` المبلغ قبل الضريبة
  - `37,050 ر.س` ضريبة القيمة المضافة
  - `284,050 ر.س` الإجمالي شامل الضريبة
  - Deal rows include `20.000 ton`, `100.000 ton`, `60.000 ton`, `50.000 ton`
- Visible actions not clicked:
  - `تصدير Excel`
  - `عرض التقرير`
- `عرض التقرير` assessment:
  - Browser evidence: visible as a button, not a normal href link.
  - Conclusion: ambiguous for this discovery run; not clicked.
- Screenshot:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-reports-tab.png`

### 3. Admin Reports / Sustainability Subtab

- URL: `https://tadweerah.com/admin`
- Route state: active in-page admin reports subtab by browser navigation
- Screen type: admin sustainability report/governance list
- Previous screen: admin reports tab
- Visible heading:
  - `سجلات الاستدامة`
- Visible labels:
  - `المرجع التجاري`
  - `الشركة`
  - `المادة`
  - `الكمية`
  - `الحالة`
  - `النسخة`
  - `حالة التصحيح`
  - `تاريخ الاعتماد`
  - `إجراءات`
- Visible statuses:
  - `مسودة`
  - `معتمد`
  - `مستبدل`
- Visible quantities and records:
  - `مرجع غير متوفر` / `[TEST] Tadweerah Buyer Demo` / `معادن` / `65,000 طن` / `مسودة` / version `1`
  - `TDW-CTR-2026-0006-S010` / `[TEST] Tadweerah Buyer Demo` / `حديد` / `40 طن` / `معتمد` / version `2` / approved date `٢٧‏/٦‏/٢٠٢٦`
  - `TDW-CTR-2026-0006-S010` / `[TEST] Tadweerah Buyer Demo` / `حديد` / `40 طن` / `مستبدل` / version `1` / approved date `٢٦‏/٦‏/٢٠٢٦`
  - `TDW-2026-000001` / `[TEST] Tadweerah Buyer Demo` / `معادن` / `50,000 طن` / `معتمد` / version `1` / approved date `٢٥‏/٦‏/٢٠٢٦`
- Visible actions not clicked:
  - `تفاصيل`
  - `عرض التقرير`
  - `تعديل (إعادة فتح)`
  - `تصدير Excel`
- `تفاصيل` assessment:
  - Browser evidence: visible as a button, not a normal href link.
  - Conclusion: likely read-only by label, but not clicked because it was not explicit normal navigation.
- `عرض التقرير` assessment:
  - Browser evidence: visible but disabled in the sustainability rows.
  - Conclusion: report detail/print route was not reachable from admin during this run.
- `تعديل (إعادة فتح)` assessment:
  - Browser evidence: visible mutation-capable action.
  - Conclusion: forbidden; not clicked.
- Screenshots:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-reports-sustainability-subtab.png`
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-reports-sustainability-rows.png`
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-reports-sustainability-rows-40.png`

### 4. Admin Operations Needing Review Tab

- URL: `https://tadweerah.com/admin`
- Route state: active in-page admin tab by browser navigation
- Screen type: admin review queue
- Previous screen: admin reports / sustainability subtab
- Visible heading:
  - `عمليات تحتاج مراجعة`
- Visible description:
  - `يعرض العمليات التي تجاوزت الفترات الزمنية المعتادة أو تحتاج لمتابعة تشغيلية.`
- Visible action not clicked:
  - `تحديث البيانات`
- Correction/revision visibility:
  - No sustainability correction/revision row was visible without clicking refresh/load actions.
- Screenshot:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-operations-needing-review-tab.png`

### 5. Admin Customer Issues Tab

- URL: `https://tadweerah.com/admin`
- Route state: active in-page admin tab by browser navigation
- Screen type: admin customer issues / support governance
- Previous screen: admin operations needing review tab
- Visible labels/statuses:
  - `كل الحالات`
  - `مفتوح`
  - `قيد المراجعة`
  - `مغلق`
  - `محلول`
- Visible action not clicked:
  - `تحميل البلاغات`
- Correction/revision visibility:
  - Customer issue workflow is visible as an admin entry point.
  - No sustainability-specific correction/revision row was visible without loading reports.
- Screenshot:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-customer-issues-tab.png`

### 6. Admin Operations Log Tab

- URL: `https://tadweerah.com/admin`
- Route state: active in-page admin tab by browser navigation
- Screen type: admin audit/operations log
- Previous screen: admin customer issues tab
- Visible labels:
  - `البحث بالعملية`
  - `نوع الكيان`
- Visible placeholders:
  - `مثال: cancel`
  - `مثال: deal`
- Visible action not clicked:
  - `عرض السجل`
- Correction/revision visibility:
  - Operations log entry point is visible.
  - No log rows were loaded because `عرض السجل` was not clicked.
- Screenshot:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-operations-log-tab.png`

### 7. Admin Shipments Tab

- URL: `https://tadweerah.com/admin`
- Route state: active in-page admin tab by browser navigation
- Screen type: admin shipment governance entry point
- Previous screen: admin operations log tab
- Visible labels/statuses:
  - `حالة الشحنة`
  - `كل الحالات`
  - `مخططة`
  - `تم الشحن`
  - `تم الاستلام`
  - `مغلقة`
  - `ملغاة`
- Visible action not clicked:
  - `تحميل الصفقات`
- Screenshot:
  - `docs/pre-phase-3b-visual-journey/screenshots/admin/admin-shipments-tab.png`

## Active Admin Routes / Paths

- `https://tadweerah.com/admin`: active by browser reachability.
- Admin in-page `التقارير` tab: active by visible tab navigation.
- Admin reports `الاستدامة` subtab: active by visible tab navigation.
- Admin in-page `عمليات تحتاج مراجعة` tab: active by visible tab navigation.
- Admin in-page `مشاكل العملاء` tab: active by visible tab navigation.
- Admin in-page `سجل العمليات` tab: active by visible tab navigation.
- Admin in-page `الشحنات` tab: active by visible tab navigation.

## Blocked / Not Opened Routes

- `/reports`: not opened during this admin run because the observed admin report surface was exposed inside `/admin`.
- `/sustainability/allocations`: not opened during this admin run because no visible admin read-only navigation exposed it.
- `/reports/sustainability/:id/print`: not reached during this admin run.
- Sustainability detail/print from admin: not reached because `عرض التقرير` was disabled in the sustainability rows and `تفاصيل` was a button, not explicit normal navigation.

## Correction / Revision Visibility

Observed:

- Admin sustainability rows expose `حالة التصحيح`.
- Admin sustainability rows expose version state through `النسخة`.
- The `TDW-CTR-2026-0006-S010` record appears twice:
  - version `2`, status `معتمد`
  - version `1`, status `مستبدل`
- Admin review and issue entry points are visible:
  - `عمليات تحتاج مراجعة`
  - `مشاكل العملاء`
  - `سجل العمليات`

Not observed:

- No visible correction request row with a populated correction status.
- No sustainability-specific correction/revision detail screen.
- No correction resolution workflow was opened.

## Report Detail / Print Visibility

Observed:

- `عرض التقرير` is visible in admin reports as a button.
- `عرض التقرير` is visible but disabled in the admin sustainability rows.
- `تفاصيل` is visible in the admin sustainability rows as a button.

Conclusion:

- No report detail or print page was reached from admin during this run.
- `عرض التقرير` is not clearly normal read-only navigation in the admin panel because it appears as a button and is disabled on the sustainability rows.
- `تفاصيل` may be read-only by label, but it was not clicked because it was not exposed as explicit normal navigation.

## Terminology Observed

Observed directly in admin browser evidence:

- `لوحة إدارة الصفقات`
- `مراقبة الصفقات وجاهزية بيانات مَوَن`
- `الشركات`
- `الصفقات`
- `العقود`
- `الشحنات`
- `طلبات النقل`
- `التقارير`
- `مشاكل العملاء`
- `سجل العمليات`
- `عمليات تحتاج مراجعة`
- `سجلات الاستدامة`
- `المرجع التجاري`
- `الشركة`
- `المادة`
- `الكمية`
- `الحالة`
- `النسخة`
- `حالة التصحيح`
- `تاريخ الاعتماد`
- `إجراءات`
- `مسودة`
- `معتمد`
- `مستبدل`
- `عرض التقرير`
- `تفاصيل`
- `تعديل (إعادة فتح)`

Requested terminology not observed in admin browser evidence:

- `إدخال بيانات الاستدامة`
- `توزيع بيانات الاستدامة`
- `مسودة توزيع الاستدامة`
- `تقرير الاستدامة`
- `تقارير الاستدامة`
- `الكمية المستلمة`
- `إجمالي التوزيع`
- `الكمية المتبقية`
- `الكمية المعتمدة`

## Quantities Observed

Admin platform statistics:

- `4` إجمالي الشركات
- `0` شركات بانتظار الاعتماد
- `3` Approved Companies
- `13` Total Listings
- `6` Active Listings
- `7` Total Offers
- `4` Total Deals
- `0` Active Deals
- `3` Completed Deals
- `3` Total Transports
- `1` Pending Transports

Admin detailed reports:

- `247,000 ر.س` amount before VAT
- `37,050 ر.س` VAT
- `284,050 ر.س` total including VAT
- Deal quantities: `20.000 ton`, `100.000 ton`, `60.000 ton`, `50.000 ton`

Admin sustainability records:

- `65,000 طن`
- `40 طن`
- `40 طن`
- `50,000 طن`

## 35 / 40 / 5 Source-Reading Risk Observation

Browser evidence from the admin sustainability subtab confirms the admin list shows `TDW-CTR-2026-0006-S010` with `40 طن`.

Browser evidence from the earlier buyer/processor detail screen in `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` showed the same allocation context as:

- received quantity: `40 طن`
- total distributed: `35 طن`
- remaining quantity: `5 طن`
- status: `معتمد`

Risk:

- Admin list evidence appears to show the received/source quantity (`40 طن`) rather than distributed quantity (`35 طن`).
- Any final storyboard or findings report should explicitly distinguish received quantity, distributed quantity, and remaining quantity.

## Forbidden Actions Preserved

No create, edit, approve, reject, resolve, submit, upload, finalize, or correction-request action was performed.

No mutation-capable admin control was clicked, including:

- `تعديل (إعادة فتح)`
- `تطبيق`
- `تحميل الشركات`
- `تحميل البلاغات`
- `عرض السجل`
- `تحديث البيانات`
- `تحميل الصفقات`
- `تصدير Excel`

No credentials, tokens, cookies, local storage, session storage, or database data were inspected.

No source code, Clerk setting, database, deployment, commit, or environment change was performed.

## Evidence Sufficiency For Final Storyboard

Enough browser evidence now exists to compile the Pre-Phase 3-B visual journey storyboard across:

- anonymous custom-domain access
- seller/producer account
- buyer/processor/recycler account
- admin account

Remaining limitation:

- Admin did not expose a reachable report print/detail route through clearly safe read-only navigation.
- Admin correction/revision detail was not opened because visible actions were either load/refresh, disabled, or mutation-capable.

## Exact Recommended Next Prompt

Compile the Pre-Phase 3-B Visual Journey Storyboard from docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md through 07_ADMIN_AUTH_DISCOVERY.md. Discovery-only; write only under docs/pre-phase-3b-visual-journey/.
