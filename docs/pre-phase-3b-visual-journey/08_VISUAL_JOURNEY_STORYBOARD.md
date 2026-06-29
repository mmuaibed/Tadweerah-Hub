# 08 Visual Journey Storyboard

Last updated: 2026-06-29  
Mode: Discovery Mode  
Profile: `staging-readonly-uat`  
Approved evidence scope: `docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md` through `07_ADMIN_AUTH_DISCOVERY.md`  
Evidence types used: Browser evidence, Documentation evidence, Config evidence

## 1. Executive Summary

### What Was Discovered

Pre-Phase 3-B confirmed the current browser-reachable sustainability journey across four personas:

- Anonymous users can render `https://tadweerah.com/`, but cannot reach sustainability allocations or reports as active product journeys.
- Seller/producer UAT can reach `/reports` and `/sustainability/allocations`; allocations render an empty state for that role/context.
- Buyer/processor/recycler UAT can reach `/sustainability/allocations`, open allocation details, and observe not-eligible, approved, and draft allocation states.
- Admin UAT can reach `/admin`, including admin reports, sustainability records, review, issues, operations log, and shipment governance entry points.

### What Was Blocked

- `https://tadweerah-staging.web.app` rendered a blank shell because Clerk rejected the origin.
- Anonymous `/sustainability/allocations` and `/reports` attempts fell back to the public home page.
- `/reports/sustainability/:id/print` was not reached in any role.
- `عرض التقرير` was visible but not safe to classify as read-only navigation in the observed contexts:
  - Buyer/seller reports exposed it as a button, not an ordinary visible link.
  - Admin sustainability rows showed it disabled.
- Admin correction/revision detail was not opened because visible actions were load/refresh, disabled, ambiguous, or mutation-capable.

### What Is Confirmed Active

Browser-confirmed active paths and views:

- `https://tadweerah.com/`
- Seller/producer `/dashboard`
- Seller/producer `/reports`
- Seller/producer `/reports` sustainability tab
- Seller/producer `/sustainability/allocations` empty state
- Buyer/processor/recycler `/dashboard`
- Buyer/processor/recycler `/sustainability/allocations`
- Buyer/processor/recycler `/sustainability/allocations/:id` for three visible detail links
- Buyer/processor/recycler `/reports`
- Buyer/processor/recycler `/reports` sustainability tab
- Admin `/admin`
- Admin in-page reports tab
- Admin reports `الاستدامة` subtab
- Admin in-page review/issues/log/shipments tabs

### What Still Needs Phase 3-B

Phase 3-B should audit source-of-truth and report logic without treating this storyboard as a fix list:

- Whether final reports should show received quantity, distributed quantity, approved allocation quantity, or all of them.
- Whether `عرض التقرير` is intended to be a read-only report/detail action and how to safely verify it.
- Whether admin `تفاصيل` opens a read-only sustainability detail or a workflow action.
- Whether correction/revision flows require a separate controlled read-only UAT profile.
- Whether admin sustainability rows correctly represent versions, replacement state, and correction status.

## 2. Current User Journey Storyboard

### Anonymous Journey

| Step | Persona | Screen | URL / Path | Visible Title / Headings | Visible Labels / Terminology | Visible Statuses | Visible Quantities | User Intent | Next Possible Read-Only Step | Evidence Source | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Anonymous | Public home | `https://tadweerah.com/` | `Tadweerah`; `من المصدر إلى المعالجة — مسار موثّق للمواد القابلة للتدوير` | `تدويرة`, `ابدأ الآن`, `تسجيل الدخول`, `ليس لديك حساب؟ أنشئ حساب شركتك الآن` | None visible | No business quantities | Learn about platform or start/login | Owner-approved login handoff with named UAT profile | `02_BROWSER_JOURNEY_LOG.md`, `04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md` | High |
| A2 | Anonymous | Allocations direct route attempt | `/sustainability/allocations` final URL `/` | Public home headings | Public home labels only | None visible | None | Attempt protected sustainability entry | Login required before journey can be observed | `02_BROWSER_JOURNEY_LOG.md`, `04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md` | High |
| A3 | Anonymous | Reports direct route attempt | `/reports` final URL `/` | Public home headings | Public home labels only | None visible | None | Attempt protected reports entry | Login required before journey can be observed | `02_BROWSER_JOURNEY_LOG.md`, `04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md` | High |

### Seller / Producer Journey

| Step | Persona | Screen | URL / Path | Visible Title / Headings | Visible Labels / Terminology | Visible Statuses | Visible Quantities | User Intent | Next Possible Read-Only Step | Evidence Source | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Seller/producer | Dashboard | `/dashboard` | `[TEST] Tadweerah Seller Demo`, `التقارير والاستدامة`, `إدخال بيانات الاستدامة` | `إضافة إعلان مواد`, `السوق`, `إعلاناتي`, `مشاركاتي`, `عقودي` | None specific to sustainability | `11` ads, `6` received offers, `1` submitted offer, `3` completed deals, `227,000` deal value, notification `7` | Find report and sustainability entry points | Open `/reports` or `/sustainability/allocations` | `05_SELLER_PRODUCER_AUTH_DISCOVERY.md` | High |
| S2 | Seller/producer | Sustainability allocations empty state | `/sustainability/allocations` | `إدخال بيانات الاستدامة`; `لا توجد مواد مستلمة جاهزة لإدخال بيانات الاستدامة حالياً.` | Empty-state message | No allocation statuses | No material quantities | Check whether seller has received materials to enter sustainability data | Return to dashboard/reports | `05_SELLER_PRODUCER_AUTH_DISCOVERY.md` | High |
| S3 | Seller/producer | Reports | `/reports` | `تقاريري` | `الصفقات`, `العقود`, `تقارير الاستدامة`, `من تاريخ`, `إلى تاريخ`, `الحالة`, `المدينة`, `مبيعاتي`, `مشترياتي`, `عرض التقرير` | `مكتملة`, `ملغاة`, `منتهية الصلاحية` | Notification `7`; no sustainability row quantity captured | Review reports and sustainability reports | Open `تقارير الاستدامة` tab | `05_SELLER_PRODUCER_AUTH_DISCOVERY.md` | High |
| S4 | Seller/producer | Reports sustainability tab | `/reports` tab view | `تقارير الاستدامة المعتمدة للفترة من ... إلى ...` | `المرجع التجاري`, `تقارير الاستدامة`, `عرض التقرير` | Approved-report framing in heading | No row quantities visible | Find approved sustainability reports | Controlled read-only test of `عرض التقرير` if explicitly approved | `05_SELLER_PRODUCER_AUTH_DISCOVERY.md` | Medium |

### Buyer / Processor / Recycler Journey

| Step | Persona | Screen | URL / Path | Visible Title / Headings | Visible Labels / Terminology | Visible Statuses | Visible Quantities | User Intent | Next Possible Read-Only Step | Evidence Source | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | Buyer/processor/recycler | Dashboard | `/dashboard` | `[TEST] Tadweerah Buyer Demo`, `التقارير والاستدامة`, `إدخال بيانات الاستدامة` | `إعلاناتي`, `مشاركاتي`, `عقودي`, `أعضاء الفريق`, `معلومات الشركة` | Pending action indicator | `2` ads, `1` received offer, `6` submitted offers, `3` completed deals, `227,000` deal value, `2` pending actions, notification `9+` | Enter sustainability or reports flow | Open `/sustainability/allocations` | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | High |
| B2 | Buyer/processor/recycler | Allocation list | `/sustainability/allocations` | `إدخال بيانات الاستدامة` | `التاريخ`, `المادة`, `الكمية`, `المصدر`, `الأهلية`, `الحالة`, `عرض التفاصيل` | Includes eligible/not-eligible and workflow states | Visible rows include `50`, `45`, `40`, `35`, `30`, `20`, `10`, `60`, `100` tons | Select received material for sustainability distribution review | Open visible `عرض التفاصيل` links | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | High |
| B3 | Buyer/processor/recycler | Allocation detail: not eligible | `/sustainability/allocations/f218907f-2900-4029-8c50-c77daccb135a` | `إدخال بيانات الاستدامة`; `هذه المادة غير قابلة للتوزيع` | `سبب عدم الأهلية`, `الكمية المستلمة الإجمالية`, `إجمالي التوزيع`, `الكمية المتبقية` | Not eligible for distribution | Source `TDW-CTR-2026-0007-S001`; received `50 طن`; distributed `0 طن`; remaining `50 طن`; ratio `0.0%` | Understand why a material cannot be distributed | Return to allocation list | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | High |
| B4 | Buyer/processor/recycler | Allocation detail: approved report-like state | `/sustainability/allocations/7a8934ec-19fa-46cd-a81e-9c052cd4205a` | `إدخال بيانات الاستدامة`; `تقرير الاستدامة` | `الكمية المستلمة الإجمالية`, `إجمالي التوزيع`, `الكمية المتبقية`, `نسبة التوزيع`, `طلب تعديل التوزيع` | `معتمد` | Source `TDW-CTR-2026-0006-S010`; received `40 طن`; distributed `35 طن`; remaining `5 طن`; ratio `87.5%`; approved date `27/06/2026` | Review final/approved sustainability allocation | Return; do not request correction | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | High |
| B5 | Buyer/processor/recycler | Allocation detail: draft | `/sustainability/allocations/6ff20251-23bf-49a9-ae18-04a8bc8bbb55` | `إدخال بيانات الاستدامة`; `مسودة توزيع الاستدامة` | `إضافة مسار`, `حفظ المسودة`, `اعتماد بيانات الاستدامة` | `مسودة`; save/approve controls disabled | Source `TDW-CTR-2026-0006-S007`; received `30 طن`; distributed `0 طن`; remaining `30 طن`; ratio `0.0%` | View draft distribution state | Return; do not edit/finalize | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | High |
| B6 | Buyer/processor/recycler | Reports | `/reports` | `تقاريري` | `الصفقات`, `العقود`, `تقارير الاستدامة`, `عرض التقرير`, `من تاريخ`, `إلى تاريخ`, `الحالة`, `المدينة` | `بانتظار تأكيد الدفع`, `مكتملة`, `منتهية الصلاحية`, `ملغاة` | Notification `9+`; no report row quantity captured | Review commercial and sustainability reports | Open sustainability tab | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | High |
| B7 | Buyer/processor/recycler | Reports sustainability tab | `/reports` tab view | `تقارير الاستدامة المعتمدة للفترة من ... إلى ...` | `المرجع التجاري`, `TDW-...`, `عرض التقرير` | Approved-report framing in heading | No row quantity captured | Find approved sustainability reports | Controlled read-only test of `عرض التقرير` if approved | `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | Medium |

### Admin Journey

| Step | Persona | Screen | URL / Path | Visible Title / Headings | Visible Labels / Terminology | Visible Statuses | Visible Quantities | User Intent | Next Possible Read-Only Step | Evidence Source | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AD1 | Admin | Admin panel / company governance | `/admin` | `لوحة إدارة الصفقات`, `إحصائيات المنصة` | `الشركات`, `الصفقات`, `العقود`, `الشحنات`, `طلبات النقل`, `التقارير`, `مشاكل العملاء`, `سجل العمليات`, `عمليات تحتاج مراجعة` | `قيد المراجعة`, `معتمد`, `مرفوض`, `منتهي الصلاحية` | `4` companies, `0` pending approval, `3` approved companies, `13` listings, `6` active listings, `7` offers, `4` deals, `3` transports, `1` pending transport | Inspect platform governance | Open admin reports tab | `07_ADMIN_AUTH_DISCOVERY.md` | High |
| AD2 | Admin | Admin reports tab | `/admin` in-page tab | `لمحة عامة (مؤشرات سريعة)`, `تقرير الصفقات المفصل` | `الصفقات`, `العقود`, `الشحنات`, `الشركات`, `نشاط المنصة`, `الاستدامة`, `عرض التقرير`, `تصدير Excel` | Commercial deal states | `247,000 ر.س`, `37,050 ر.س`, `284,050 ر.س`; rows include `20.000`, `100.000`, `60.000`, `50.000 ton` | Inspect report governance | Open `الاستدامة` subtab | `07_ADMIN_AUTH_DISCOVERY.md` | High |
| AD3 | Admin | Admin reports / sustainability subtab | `/admin` in-page subtab | `سجلات الاستدامة` | `المرجع التجاري`, `الشركة`, `المادة`, `الكمية`, `الحالة`, `النسخة`, `حالة التصحيح`, `تاريخ الاعتماد`, `إجراءات`, `تفاصيل`, `عرض التقرير`, `تعديل (إعادة فتح)` | `مسودة`, `معتمد`, `مستبدل` | `TDW-CTR-2026-0006-S010` appears with `40 طن`, `معتمد`, version `2`, and a replaced version `1`; also `65,000 طن`, `50,000 طن` | Inspect sustainability governance records | Separate safe discovery for detail/report buttons if approved | `07_ADMIN_AUTH_DISCOVERY.md` | High |
| AD4 | Admin | Operations needing review | `/admin` in-page tab | `عمليات تحتاج مراجعة` | `تحديث البيانات` | No row statuses visible | Platform stats remain visible | Inspect review queue | Avoid refresh/load unless explicitly approved | `07_ADMIN_AUTH_DISCOVERY.md` | Medium |
| AD5 | Admin | Customer issues | `/admin` in-page tab | Admin panel headings | `كل الحالات`, `مفتوح`, `قيد المراجعة`, `مغلق`, `محلول`, `تحميل البلاغات` | Issue status filters visible | Platform stats remain visible | Inspect support/correction-adjacent entry point | Separate safe loading review if approved | `07_ADMIN_AUTH_DISCOVERY.md` | Medium |
| AD6 | Admin | Operations log | `/admin` in-page tab | Admin panel headings | `البحث بالعملية`, `نوع الكيان`, `عرض السجل` | No rows loaded | Platform stats remain visible | Inspect audit/log entry point | Separate safe log loading review if approved | `07_ADMIN_AUTH_DISCOVERY.md` | Medium |
| AD7 | Admin | Shipments | `/admin` in-page tab | Admin panel headings | `حالة الشحنة`, `مخططة`, `تم الشحن`, `تم الاستلام`, `مغلقة`, `ملغاة`, `تحميل الصفقات` | Shipment status filters visible | Platform stats remain visible | Inspect shipment governance entry point | Separate safe load review if approved | `07_ADMIN_AUTH_DISCOVERY.md` | Medium |

## 3. Active vs Obsolete / Unconfirmed Paths

No path is classified as obsolete in this report. Pre-Phase 3-B collected browser reachability evidence, not lifecycle/ownership evidence sufficient to mark paths obsolete.

| Classification | Path / View | Evidence Type | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Active browser-confirmed path | `/` on `https://tadweerah.com` | Browser evidence | Public landing page rendered anonymously | Active public entry |
| Active browser-confirmed path | `/dashboard` seller/producer | Browser evidence | Seller dashboard rendered after manual login | Role-specific active dashboard |
| Active browser-confirmed path | `/dashboard` buyer/processor/recycler | Browser evidence | Buyer dashboard rendered after manual login | Role-specific active dashboard |
| Active browser-confirmed path | `/reports` seller/producer | Browser evidence | `تقاريري` rendered | Active but report detail not reached |
| Active browser-confirmed path | `/reports` buyer/processor/recycler | Browser evidence | `تقاريري` rendered | Active but report detail not reached |
| Active browser-confirmed path | `/reports` sustainability tab | Browser evidence | `تقارير الاستدامة المعتمدة...` rendered for seller and buyer | Active in-page tab/view |
| Active browser-confirmed path | `/sustainability/allocations` seller/producer | Browser evidence | Empty state rendered | Active but no seller rows |
| Active browser-confirmed path | `/sustainability/allocations` buyer/processor/recycler | Browser evidence | Allocation list rendered with rows | Active journey path |
| Active browser-confirmed path | `/sustainability/allocations/:id` visible buyer details | Browser evidence | Three visible details opened | Active for not-eligible, approved, draft states |
| Active browser-confirmed path | `/admin` | Browser evidence | Admin panel rendered | Active admin path |
| Active browser-confirmed path | `/admin` reports and sustainability tabs | Browser evidence | Admin reports and sustainability rows rendered | Active in-page admin views |
| Reachable but not journey-active path | Anonymous `/sustainability/allocations` | Browser evidence | Final URL became `/` public home | Host reachable; allocation journey not active anonymously |
| Reachable but not journey-active path | Anonymous `/reports` | Browser evidence | Final URL became `/` public home | Host reachable; reports journey not active anonymously |
| Reachable but incomplete/empty | Seller `/sustainability/allocations` | Browser evidence | Empty state: no received materials ready | Active route but not enough for allocation detail discovery |
| Blocked path | `https://tadweerah-staging.web.app/...` | Browser/Network evidence | Blank shell; Clerk rejected origin | Blocked by auth/domain config |
| Blocked path | `/reports/sustainability/:id/print` | Browser evidence | No visible safe navigation reached it | Requires controlled read-only verification |
| Blocked or mutation-risk path | Admin `تعديل (إعادة فتح)` | Browser evidence | Visible mutation-capable action | Forbidden in discovery |
| Unconfirmed path | Buyer/seller `عرض التقرير` | Browser evidence | Button visible, not opened | Needs controlled read-only verification |
| Unconfirmed path | Admin `تفاصيل` on sustainability row | Browser evidence | Button visible, not href | Likely read-only by label, but not confirmed |
| Unconfirmed path | Admin correction/revision detail | Browser evidence | `حالة التصحيح` column visible, no detail opened | Needs separate safe discovery |
| Requires Phase 3-B/source-reading audit | `TDW-CTR-2026-0006-S010` report/allocation quantities | Browser evidence | Buyer detail shows 40/35/5; admin list shows 40 | Source-reading risk, not a text-only issue |

## 4. Title & Terminology Consistency Map

| Screen | Current Visible Term | What It Represents | Suitability | Note |
| --- | --- | --- | --- | --- |
| Dashboard cards | `التقارير والاستدامة` | Combined entry to reports and sustainability reporting | Suitable but broad | Seen for seller and buyer dashboards; leads to `/reports`. |
| Dashboard / allocation list | `إدخال بيانات الاستدامة` | Entry into sustainability allocation/data-entry route | Mostly suitable | Seller sees empty state; buyer sees list/details. It can include viewing approved reports, not only entry. |
| Buyer approved detail | `تقرير الاستدامة` | Approved/final report-like allocation detail | Suitable | Strong browser evidence for approved detail state. |
| Buyer draft detail | `مسودة توزيع الاستدامة` | Draft allocation/distribution detail | Suitable | Accurately signals non-final distribution state. |
| Buyer list/detail | `الكمية المستلمة الإجمالية` | Received/source quantity | Suitable | Must remain distinct from distributed/approved quantity. |
| Buyer detail | `إجمالي التوزيع` | Distributed quantity | Suitable | Critical term for 35-ton value. |
| Buyer detail | `الكمية المتبقية` | Remaining undistributed quantity | Suitable | Critical term for 5-ton value. |
| Buyer detail | `الكمية المعتمدة` | Requested term not observed in captured buyer/admin evidence | Unconfirmed | Do not assume active terminology without browser evidence. |
| Seller/buyer reports | `تقارير الاستدامة` | Sustainability reports tab | Suitable | Active tab/view, but detail route not reached. |
| Seller/buyer reports | `تقارير الاستدامة المعتمدة للفترة من ... إلى ...` | Approved sustainability reports over selected date range | Suitable but incomplete | Row/detail quantity evidence was limited. |
| Admin reports | `سجلات الاستدامة` | Admin sustainability record list | Suitable for governance | Differs from user-facing `تقارير الاستدامة`; likely admin inventory wording. |
| Admin sustainability row | `حالة التصحيح` | Correction/revision status column | Suitable but unpopulated in observed rows | Needs Phase 3-B or separate safe discovery for correction workflow. |
| Admin sustainability row | `النسخة` | Version of sustainability record | Suitable | Version 2 approved and version 1 replaced were visible. |
| Admin sustainability row | `عرض التقرير` | Report view action | Ambiguous / blocked | Disabled in admin sustainability rows; button elsewhere, not href. |
| Admin sustainability row | `تفاصيل` | Detail action | Ambiguous | Likely read-only by label, but button was not opened. |
| Admin sustainability row | `تعديل (إعادة فتح)` | Reopen/edit workflow | Unsuitable for discovery action | Mutation-capable; correctly avoided. |
| Requested terminology | `توزيع بيانات الاستدامة` | Intended distribution concept | Unconfirmed as exact visible term | Concept appears via `إجمالي التوزيع` and draft allocation screen, but exact term was not observed. |

## 5. Data-Reading Risk Observations

These are evidence-based risks for Phase 3-B review, not fixes.

| Screen | Value Shown | Why It May Confuse | Likely Risk Type | Needs Phase 3-B? |
| --- | --- | --- | --- | --- |
| Buyer approved allocation detail | `40 طن` received, `35 طن` distributed, `5 طن` remaining, `87.5%`, status `معتمد` | One record contains multiple valid quantities with different meanings. Users/reports may confuse source received quantity with distributed quantity. | Source-reading / field-label risk | Yes |
| Admin sustainability list | `TDW-CTR-2026-0006-S010`, `40 طن`, `معتمد`, version `2` | Admin list appears to show received/source quantity, not the distributed `35 طن` from buyer detail. | Cross-screen source-reading risk | Yes |
| Admin sustainability list | `TDW-CTR-2026-0006-S010`, `40 طن`, `مستبدل`, version `1` | Same reference appears twice with versioning; readers need to distinguish active approved version from replaced version. | Version-state interpretation risk | Yes |
| Reports sustainability tab | `عرض التقرير` visible but not opened | The action looks report-related, but read-only safety and target route were not confirmed. | Journey confirmation risk | Yes |
| Admin sustainability rows | `عرض التقرير` disabled | Report route may exist but was not reachable from admin rows during discovery. | Reachability / state gating risk | Yes |
| Admin review/issues/log tabs | Load/refresh buttons visible but not clicked | Correction/revision evidence may require loading data, but those actions need controlled approval. | Governance visibility risk | Yes |

Confirmed observation:

- Buyer/processor allocation detail shows `40 طن` received, `35 طن` distributed, `5 طن` remaining, `87.5%`, status `معتمد`.
- Admin shows `TDW-CTR-2026-0006-S010`, `40 طن`, `معتمد`, version `2`.
- Reports and admin summaries must distinguish received quantity from distributed/approved allocation quantity.
- This is a source-reading risk for Phase 3-B, not a text-only issue.

## 6. Journey Confidence Map

| Status Color | Meaning | Paths / Views |
| --- | --- | --- |
| Green | Browser-confirmed active journey | `https://tadweerah.com/`; seller/buyer `/dashboard`; seller/buyer `/reports`; buyer `/sustainability/allocations`; buyer allocation details; admin `/admin`; admin reports/sustainability tab |
| Yellow | Reachable but incomplete or empty | Seller `/sustainability/allocations` empty state; seller/buyer reports sustainability tab without detail/print; admin review/issues/log/shipments tabs without loading rows |
| Orange | Visible but source-reading risk | Buyer approved allocation detail `40/35/5`; admin sustainability row `TDW-CTR-2026-0006-S010` `40 طن` version `2`; admin replaced version `1` |
| Red | Blocked or mutation-risk | `tadweerah-staging.web.app` Clerk blocker; anonymous protected route fallback; `/reports/sustainability/:id/print` not reached; admin `تعديل (إعادة فتح)`; buyer `طلب تعديل التوزيع`; draft save/approve controls |

## 7. Recommended Next Review

Do not implement from this report. Recommended review areas only:

- Phase 3-B should audit the source fields behind received quantity, distributed quantity, remaining quantity, approved quantity, and report quantity.
- Manually test a controlled read-only UAT case for `عرض التقرير` from `/reports` if the project owner confirms it is safe read-only navigation.
- Confirm whether `/reports/sustainability/:id/print` is reachable through a visible UI path or only code/deep-link routing.
- Confirm whether admin `تفاصيل` on sustainability rows opens read-only detail or a workflow action.
- Run a separate safe discovery task for admin correction/revision visibility if load/refresh buttons are approved as read-only for the selected UAT dataset.
- Test a UAT case where `حالة التصحيح` is populated, if such data exists.
- Verify that final reports distinguish:
  - received/source quantity
  - distributed quantity
  - remaining quantity
  - approved/final allocation quantity
- Preserve the role split in future UAT:
  - seller/producer: empty allocation state and report entry
  - buyer/processor/recycler: allocation list and details
  - admin: governance list and versioning

## 8. Evidence Index

### Evidence Files Used

- `docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md`
- `docs/pre-phase-3b-visual-journey/03_URL_RESOLUTION.md`
- `docs/pre-phase-3b-visual-journey/04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/05_SELLER_PRODUCER_AUTH_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/06_BUYER_PROCESSOR_AUTH_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/07_ADMIN_AUTH_DISCOVERY.md`

### Screenshot Folders Used

- `docs/pre-phase-3b-visual-journey/screenshots/`
- `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/`
- `docs/pre-phase-3b-visual-journey/screenshots/admin/`

### Key Screenshot Files Referenced

- `screenshots/custom-domain-root.png`
- `screenshots/custom-domain-sustainability-allocations.png`
- `screenshots/custom-domain-reports.png`
- `screenshots/seller-producer/dashboard.png`
- `screenshots/seller-producer/sustainability-allocations.png`
- `screenshots/seller-producer/reports.png`
- `screenshots/seller-producer/reports-sustainability-tab.png`
- `screenshots/buyer-processor/sustainability-allocations.png`
- `screenshots/buyer-processor/allocation-detail-1.png`
- `screenshots/buyer-processor/allocation-detail-2.png`
- `screenshots/buyer-processor/allocation-detail-3.png`
- `screenshots/buyer-processor/reports-sustainability-tab.png`
- `screenshots/admin/admin-dashboard-companies-safe-scroll.png`
- `screenshots/admin/admin-reports-tab.png`
- `screenshots/admin/admin-reports-sustainability-subtab.png`
- `screenshots/admin/admin-reports-sustainability-rows.png`
- `screenshots/admin/admin-reports-sustainability-rows-40.png`
- `screenshots/admin/admin-operations-needing-review-tab.png`
- `screenshots/admin/admin-customer-issues-tab.png`
- `screenshots/admin/admin-operations-log-tab.png`
- `screenshots/admin/admin-shipments-tab.png`

## Observed Facts

- The custom domain `https://tadweerah.com` rendered successfully and matched the Clerk-compatible target identified by URL resolution.
- Authenticated role determines the visible sustainability journey.
- Buyer/processor/recycler is the only observed role with active allocation rows and allocation detail pages.
- Admin has governance visibility into sustainability records and versions, but not a confirmed report print/detail route.
- No browser evidence currently proves `/reports/sustainability/:id/print` active.

## Inferred Risks

- Reports may be vulnerable to source-reading confusion if they do not clearly distinguish `40 طن` received from `35 طن` distributed.
- Admin versioning (`معتمد` version `2`, `مستبدل` version `1`) needs careful interpretation in Phase 3-B.
- `عرض التقرير` may be read-only, but it was not proven safe/reachable from current evidence.
- Admin correction/revision functionality exists as terminology and entry points, but not as a browser-confirmed detail journey.

## Open Questions

- What is the intended report quantity for sustainability summaries: received, distributed, approved, or all?
- Is `عرض التقرير` guaranteed read-only in seller/buyer reports?
- What route should `عرض التقرير` or print use when enabled?
- Is admin `تفاصيل` a read-only view or a workflow surface?
- What dataset exposes a populated `حالة التصحيح` value?

## Forbidden Actions

- Do not implement fixes from this storyboard.
- Do not rename, refactor, or change behavior during Pre-Phase 3-B.
- Do not classify code-present routes as active without browser/current navigation evidence.
- Do not click mutation-capable actions such as edit, approve, reject, resolve, submit, upload, finalize, request correction, or reopen.
- Do not deploy, commit, migrate, or access the database from this report.

## Session Continuity

Files created or updated:

- `docs/pre-phase-3b-visual-journey/08_VISUAL_JOURNEY_STORYBOARD.md`

Evidence collected:

- Browser evidence from anonymous, seller/producer, buyer/processor/recycler, and admin UAT passes.
- Documentation/config evidence from URL resolution.
- Screenshot evidence from all reached journeys.

Unresolved blockers:

- `/reports/sustainability/:id/print` not reached.
- `عرض التقرير` not confirmed as safe read-only navigation.
- Admin correction/revision detail not reached.
- Data source distinction for 40/35/5 remains a Phase 3-B audit item.

Exact recommended next prompt:

Start Phase 3-B source-of-truth audit for Tadweerah sustainability reporting. Use Pre-Phase 3-B evidence from `docs/pre-phase-3b-visual-journey/08_VISUAL_JOURNEY_STORYBOARD.md`; do not implement fixes until the audit identifies the exact source fields and owner-approved change scope.
