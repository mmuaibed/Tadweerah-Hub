# 06 Buyer/Processor Auth Discovery

## Scope

- Mode: Discovery Mode
- Startup profile: `staging-readonly-uat`
- Date: 2026-06-28
- Approved browser target: `https://tadweerah.com`
- Approved role for this run: buyer/processor/recycler UAT account
- Visible account context: `[TEST] Tadweerah Buyer Demo`
- Approved output location: `docs/pre-phase-3b-visual-journey/`
- Screenshot folder: `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/`

## Constraints

- No credentials requested, captured, stored, printed, or written.
- No screenshots captured while credential fields were visible.
- No create, edit, submit, approve, finalize, upload, or correction actions clicked.
- No `POST`, `PUT`, `PATCH`, or `DELETE` actions intentionally triggered.
- No direct database access.
- No source-code edits.
- No commits or deploys.

## Evidence Log

| Item | Evidence Type | Evidence | Status |
| --- | --- | --- | --- |
| Auth context | Browser evidence | Dashboard showed `[TEST] Tadweerah Buyer Demo` | Complete |
| Dashboard | Browser evidence | Buyer/processor dashboard rendered with counts and navigation cards | Active |
| `/sustainability/allocations` | Browser evidence | Allocation list rendered with visible rows and `عرض التفاصيل` links | Active |
| Allocation detail 1 | Browser evidence | Opened visible detail link for `TDW-CTR-2026-0007-S001` | Active, not eligible |
| Allocation detail 2 | Browser evidence | Opened visible detail link for `TDW-CTR-2026-0006-S010` | Active, approved |
| Allocation detail 3 | Browser evidence | Opened visible detail link for `TDW-CTR-2026-0006-S007` | Active, draft |
| `/reports` | Browser evidence | Reports page rendered | Active |
| Sustainability reports tab | Browser evidence | Non-mutating `تقارير الاستدامة` tab rendered inside `/reports` | Active tab/view |
| Report detail/print | Browser evidence | No ordinary anchor link to sustainability detail/print was visible; `عرض التقرير` was a button and was not clicked | Not reached |

## Browser Journey

| Screen | URL | Previous Screen | Visible Title/Headings | Labels/Statuses/Quantities | Buttons/Actions Visible | Route State | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Buyer/processor dashboard | `https://tadweerah.com/dashboard` | Current logged-in dashboard | Title: `Tadweerah`; headings include `[TEST] Tadweerah Buyer Demo`, `التقارير والاستدامة`, `إدخال بيانات الاستدامة` | Counts: `2` ads, `1` received offers, `6` submitted offers, `3` completed deals, `227,000` deal value, `2` pending actions, notification `9+` | `English`, `الرئيسية`, `الإبلاغ عن مشكلة`, `تسجيل الخروج`; navigation cards visible | Active | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/dashboard.png` |
| Sustainability allocations | `https://tadweerah.com/sustainability/allocations` | Direct read-only route navigation | Title: `Tadweerah`; heading `إدخال بيانات الاستدامة` | Table labels: `التاريخ`, `المادة`, `الكمية`, `المصدر`, `الأهلية`, `الحالة`; visible rows include 50, 45, 40, 35, 30, 20, 10, 60, 100 ton quantities | Filters: `كل الحالات`, `كل الأهلية`, `كل المصادر`; many `عرض التفاصيل` links | Active | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/sustainability-allocations.png` |
| Allocation detail 1 | `https://tadweerah.com/sustainability/allocations/f218907f-2900-4029-8c50-c77daccb135a` | Visible `عرض التفاصيل` link | Heading `إدخال بيانات الاستدامة`; material `المنيوم`; heading `هذه المادة غير قابلة للتوزيع` | Source `شحنة عقد / TDW-CTR-2026-0007-S001`; date `28/06/2026`; received `50 طن`; distributed `0 طن`; remaining `50 طن`; ratio `0.0%`; non-eligibility reason visible | `العودة إلى إدخال بيانات الاستدامة`, `إلغاء` | Active detail, not eligible | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/allocation-detail-1.png` |
| Allocation detail 2 | `https://tadweerah.com/sustainability/allocations/7a8934ec-19fa-46cd-a81e-9c052cd4205a` | Visible `عرض التفاصيل` link | Heading `إدخال بيانات الاستدامة`; material `حديد`; heading `تقرير الاستدامة` | Source `شحنة عقد / TDW-CTR-2026-0006-S010`; date `26/06/2026`; received `40 طن`; distributed `35 طن`; remaining `5 طن`; ratio `87.5%`; approved date `27/06/2026`; status `معتمد` | `طلب تعديل التوزيع`, `رجوع`; pathway selectors/quantities visible but not edited | Active detail, approved/final report-like | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/allocation-detail-2.png` |
| Allocation detail 3 | `https://tadweerah.com/sustainability/allocations/6ff20251-23bf-49a9-ae18-04a8bc8bbb55` | Visible `عرض التفاصيل` link | Heading `إدخال بيانات الاستدامة`; material `حديد`; heading `مسودة توزيع الاستدامة` | Source `شحنة عقد / TDW-CTR-2026-0006-S007`; date `26/06/2026`; received `30 طن`; distributed `0 طن`; remaining `30 طن`; ratio `0.0%`; status `مسودة` | `إضافة مسار`, `إلغاء`, disabled `حفظ المسودة`, disabled `اعتماد بيانات الاستدامة`; none clicked | Active detail, draft | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/allocation-detail-3.png` |
| Reports | `https://tadweerah.com/reports` | Direct read-only route navigation | Title: `Tadweerah`; heading `تقاريري` | Labels: `من تاريخ`, `إلى تاريخ`, `الحالة`, `المدينة`; statuses include `بانتظار تأكيد الدفع`, `مكتملة`, `منتهية الصلاحية`, `ملغاة`; notification `9+` | Tabs/buttons: `الصفقات`, `العقود`, `تقارير الاستدامة`, `الكل`, `مبيعاتي`, `مشترياتي`, `عرض التقرير` | Active | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/reports.png` |
| Reports sustainability tab | `https://tadweerah.com/reports` | Non-mutating `تقارير الاستدامة` tab | Title: `Tadweerah`; headings `تقاريري`, `تقارير الاستدامة المعتمدة للفترة من ... إلى ...` | Labels: `من تاريخ`, `إلى تاريخ`, `المرجع التجاري`, `TDW-...`; notification `9+`; no visible report row quantity captured | `الصفقات`, `العقود`, `تقارير الاستدامة`, `عرض التقرير`; detail/print link not exposed as ordinary anchor | Active tab/view | `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/reports-sustainability-tab.png` |

## Allocation Rows / Details Visible

Visible allocation list rows included:
- `28/06/2026` `المنيوم` `50 طن` `شحنة عقد / TDW-CTR-2026-0007-S001` `غير مؤهل للتوزيع` / not eligible detail.
- `26/06/2026` `حديد` `40 طن` `شحنة عقد / TDW-CTR-2026-0006-S010` with approved detail showing `35 طن` distributed and `5 طن` remaining.
- `26/06/2026` `حديد` `30 طن` `شحنة عقد / TDW-CTR-2026-0006-S007` with draft detail.
- Additional visible list quantities included `45 طن`, `35 طن`, `30 طن`, multiple `20 طن`, `10 طن`, `60 طن`, `100 طن`, and `50 طن`.

## Sustainability Report Rows / Details Visible

- `/reports` exposes a `تقارير الاستدامة` tab.
- Sustainability tab heading: `تقارير الاستدامة المعتمدة للفترة من ... إلى ...`.
- Visible labels include `المرجع التجاري` and `TDW-...`.
- A visible `عرض التقرير` button exists, but it was not opened because it was not exposed as an ordinary anchor/detail URL in this run.
- `/reports/sustainability/:id/print` was not reached.

## Terminology Observed

- `إدخال بيانات الاستدامة`
- `عرض التفاصيل`
- `المادة`
- `الكمية المستلمة الإجمالية`
- `إجمالي التوزيع`
- `الكمية المتبقية`
- `نسبة التوزيع`
- `مؤهل للتوزيع`
- `غير مؤهل للتوزيع`
- `لم يبدأ`
- `مسودة`
- `معتمد`
- `هذه المادة غير قابلة للتوزيع`
- `سبب عدم الأهلية`
- `تقرير الاستدامة`
- `مسودة توزيع الاستدامة`
- `طلب تعديل التوزيع`
- `تقارير الاستدامة`
- `تقارير الاستدامة المعتمدة للفترة من ... إلى ...`

## Quantities Observed

Dashboard:
- Notifications: `9+`
- Ads: `2`
- Received offers: `1`
- Submitted offers: `6`
- Completed deals: `3`
- Deal value: `227,000`
- Pending actions: `2`

Allocation detail quantities:
- Detail 1: received `50 طن`, distributed `0 طن`, remaining `50 طن`, ratio `0.0%`
- Detail 2: received `40 طن`, distributed `35 طن`, remaining `5 طن`, ratio `87.5%`
- Detail 3: received `30 طن`, distributed `0 طن`, remaining `30 طن`, ratio `0.0%`

## 35 / 40 And Source-Reading Risk Observations

- Browser evidence confirms a live allocation detail where the same record shows:
  - `الكمية المستلمة الإجمالية`: `40 طن`
  - `إجمالي التوزيع`: `35 طن`
  - `الكمية المتبقية`: `5 طن`
  - `نسبة التوزيع`: `87.5%`
  - status `معتمد`
- This is not necessarily a defect by itself: the UI presents 40 as received quantity and 35 as distributed quantity.
- Source-reading risk: reports or summaries could be misread if they label or aggregate `35 طن` without distinguishing it from the source received quantity `40 طن`.
- The detail page is the strongest browser evidence so far for the 35-vs-40 context.

## Route Status

| Route/View | Status | Evidence |
| --- | --- | --- |
| `/dashboard` | Active | Buyer demo dashboard rendered |
| `/sustainability/allocations` | Active | List rendered with rows and detail links |
| `/sustainability/allocations/f218...` | Active, not eligible | Detail showed 50/0/50 and non-eligibility reason |
| `/sustainability/allocations/7a89...` | Active, approved | Detail showed 40/35/5 and `معتمد` |
| `/sustainability/allocations/6ff...` | Active, draft | Detail showed 30/0/30 and draft controls |
| `/reports` | Active | Reports screen rendered |
| `/reports` sustainability tab | Active tab/view | Sustainability report tab rendered |
| `/reports/sustainability/:id/print` | Not reached | No explicit ordinary read-only link visible |

## Observed Facts

- Buyer/processor/recycler UAT can reach allocation list and allocation details.
- Allocation list has many rows and visible `عرض التفاصيل` links.
- Allocation detail pages expose draft, approved, and not-eligible states.
- Mutation-capable actions were visible on draft/approved detail screens, but none were clicked.
- Reports page and sustainability reports tab are reachable.
- Sustainability report detail/print was not reached in this run.

## Inferred Risks

- The sustainability workflow has role-specific visibility; seller/producer saw an empty allocation state, while buyer/processor/recycler saw many rows.
- Admin UAT may be needed to inspect governance states, correction requests, source-of-truth display, and report detail access without mutation.
- The 35/40 context needs a report-detail pass or admin/read-only review to verify whether final reports label received vs distributed quantities clearly.

## Open Questions

- Is `عرض التقرير` safe to open as read-only in the sustainability reports tab?
- Does admin see the same allocation detail plus correction/revision governance?
- Are reports expected to show source received quantity (`40`) or distributed quantity (`35`) in each field?

## Forbidden Actions

- Do not click `إضافة مسار`.
- Do not click `حفظ المسودة`.
- Do not click `اعتماد بيانات الاستدامة`.
- Do not click `طلب تعديل التوزيع`.
- Do not submit, upload, approve, finalize, edit, or request corrections.

## Session Continuity

Files created or updated:
- `docs/pre-phase-3b-visual-journey/06_BUYER_PROCESSOR_AUTH_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/dashboard.png`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/sustainability-allocations.png`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/allocation-detail-1.png`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/allocation-detail-2.png`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/allocation-detail-3.png`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/reports.png`
- `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/reports-sustainability-tab.png`

Evidence collected:
- Browser evidence from authenticated buyer/processor dashboard.
- Browser evidence from allocation list and three visible allocation details.
- Browser evidence from reports and sustainability reports tab.
- Screenshot evidence for all reached screens.

Unresolved blockers:
- Sustainability report detail/print not reached.
- Admin governance/correction/revision visibility not inspected.

Exact recommended next prompt:
- "Start authenticated read-only admin UAT discovery for Pre-Phase 3-B on `https://tadweerah.com`. Continue after manual admin login. Do not create, edit, submit, approve, finalize, upload, or request corrections. Focus on sustainability allocation governance, correction/revision visibility, and report detail/print pages as read-only navigation only."
