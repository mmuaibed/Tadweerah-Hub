# 05 Seller/Producer Auth Discovery

## Scope

- Mode: Discovery Mode
- Startup profile: `staging-readonly-uat`
- Date: 2026-06-28
- Approved browser target: `https://tadweerah.com`
- Approved role for this run: seller/producer UAT account
- Browser/UAT status: authenticated by project owner before this pass
- Approved output location: `docs/pre-phase-3b-visual-journey/`
- Screenshot folder: `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/`

## Constraints

- No credentials requested, captured, stored, printed, or written.
- No screenshots captured while credential fields were visible.
- No create, edit, submit, approve, finalize, upload, or correction actions clicked.
- No `POST`, `PUT`, `PATCH`, or `DELETE` actions intentionally triggered.
- No direct database access.
- No Clerk setting changes.
- No source-code edits.
- No commits or deploys.

## Evidence Log

| Item | Evidence Type | Evidence | Status |
| --- | --- | --- | --- |
| Auth handoff | Browser evidence | Project owner logged in manually as seller/producer UAT; current visible URL was `https://tadweerah.com/dashboard` | Complete |
| Dashboard | Browser evidence | Seller/producer dashboard rendered with cards, counts, and platform tools | Active |
| Reports and sustainability dashboard card | Browser evidence | Dashboard exposed plain anchor card `التقارير والاستدامة` with `href="/reports"` | Active navigation entry |
| Sustainability data entry dashboard card | Browser evidence | Dashboard exposed plain anchor card `إدخال بيانات الاستدامة` with `href="/sustainability/allocations"` | Active navigation entry |
| `/reports` via card | Browser evidence | Clicking the `التقارير والاستدامة` dashboard anchor opened `https://tadweerah.com/reports` | Active |
| `/sustainability/allocations` | Browser evidence | Direct read-only navigation opened `https://tadweerah.com/sustainability/allocations` | Active but empty |
| `/reports` | Browser evidence | Direct read-only navigation opened `https://tadweerah.com/reports` | Active |
| Reports sustainability tab | Browser evidence | Non-mutating `تقارير الاستدامة` tab opened sustainability report view inside `/reports` | Active tab/view |

## Browser Journey

| Screen | URL | Previous Screen | Visible Title/Headings | Labels/Statuses/Quantities | Buttons/Actions Visible | Route State | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Seller/producer dashboard | `https://tadweerah.com/dashboard` | Current logged-in dashboard | Title: `Tadweerah`; headings include `[TEST] Tadweerah Seller Demo`, `إضافة إعلان مواد`, `السوق`, `إعلاناتي`, `مشاركاتي`, `التقارير والاستدامة`, `عقودي`, `إدخال بيانات الاستدامة` | Counts: `11` ads, `6` received offers, `1` submitted offers, `3` completed deals, `227,000` deal value, notification count `7` | `English`, `الرئيسية`, `الإبلاغ عن مشكلة`, notification `7`, `تسجيل الخروج`; navigation cards listed below | Active | `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/dashboard.png` |
| Reports and sustainability card | `https://tadweerah.com/reports` | Dashboard card `التقارير والاستدامة` | Title: `Tadweerah`; heading `تقاريري` | Notification count `7`; filters/status labels visible | Tabs/actions: `الصفقات`, `العقود`, `تقارير الاستدامة`, `الكل`, `مبيعاتي`, `مشترياتي`, `عرض التقرير` | Active | `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/reports-sustainability-entry.png` |
| Sustainability allocations | `https://tadweerah.com/sustainability/allocations` | Direct read-only route navigation | Title: `Tadweerah`; headings `إدخال بيانات الاستدامة`, `لا توجد مواد مستلمة جاهزة لإدخال بيانات الاستدامة حالياً.` | Notification count `7`; no allocation rows, statuses, or material quantities visible | `English`, `الرئيسية`, `الإبلاغ عن مشكلة`, notification `7` | Active route, empty state | `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/sustainability-allocations.png` |
| Reports | `https://tadweerah.com/reports` | Direct read-only route navigation | Title: `Tadweerah`; heading `تقاريري` | Labels: `من تاريخ`, `إلى تاريخ`, `الحالة`, `المدينة`; status options include `مكتملة`, `ملغاة`, `منتهية الصلاحية`; notification count `7` | `الصفقات`, `العقود`, `تقارير الاستدامة`, `الكل`, `مبيعاتي`, `مشترياتي`, `عرض التقرير` | Active | `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/reports.png` |
| Reports sustainability tab | `https://tadweerah.com/reports` | Reports screen, non-mutating `تقارير الاستدامة` tab | Title: `Tadweerah`; headings `تقاريري`, `تقارير الاستدامة المعتمدة للفترة من ... إلى ...` | Labels: `من تاريخ`, `إلى تاريخ`, `المرجع التجاري`; notification count `7`; no report row quantities visible | `الصفقات`, `العقود`, `تقارير الاستدامة`, `عرض التقرير` | Active tab/view | `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/reports-sustainability-tab.png` |

## Navigation Cards Observed On Dashboard

| Text | Href | Notes |
| --- | --- | --- |
| `11 إعلانات` | `/listings/mine` | Count card |
| `6 عروض مستلمة` | `/listings/mine` | Count card |
| `1 عروض مقدمة` | `/participations` | Count card |
| `3 صفقات مكتملة` | `/reports` | Count card |
| `227,000 قيمة الصفقات (ريال)` | `/reports` | Count card |
| `لديك عروض وصلتك — راجعها الآن` | `/listings/mine` | Alert/navigation |
| `إضافة إعلان مواد` | `/listings/new` | Mutation-capable creation entry; not clicked |
| `السوق` | `/marketplace` | Marketplace navigation |
| `إعلاناتي` | `/listings/mine` | Listings navigation |
| `مشاركاتي` | `/participations` | Participations navigation |
| `التقارير والاستدامة` | `/reports` | Reports/sustainability entry; clicked as normal navigation |
| `أعضاء الفريق` | `/company/members` | Team management; not clicked |
| `معلومات الشركة` | `/company/profile` | Company profile; not clicked |
| `عقودي` | `/contracts` | Contracts navigation; not clicked |
| `إدخال بيانات الاستدامة` | `/sustainability/allocations` | Sustainability data entry route; direct route opened |

## Sustainability / Report Entry Points

- Dashboard card: `التقارير والاستدامة` → `/reports`
- Dashboard card: `إدخال بيانات الاستدامة` → `/sustainability/allocations`
- Reports tab: `تقارير الاستدامة`
- Reports action visible: `عرض التقرير` was observed but not clicked.

## Terminology Observed

- `التقارير والاستدامة`
- `إدخال بيانات الاستدامة`
- `تقارير الاستدامة`
- `تقارير الاستدامة المعتمدة للفترة من ... إلى ...`
- `المرجع التجاري`
- `من تاريخ`
- `إلى تاريخ`
- `الحالة`
- `المدينة`
- `مبيعاتي`
- `مشترياتي`
- `مكتملة`
- `ملغاة`
- `منتهية الصلاحية`

## Quantities Observed

- Dashboard notification count: `7`
- Dashboard ads: `11`
- Dashboard received offers: `6`
- Dashboard submitted offers: `1`
- Dashboard completed deals: `3`
- Dashboard deal value: `227,000` Riyal
- Sustainability allocations route: no material quantities visible
- Reports sustainability tab: no row quantities visible

## Route Status

| Route/View | Status | Evidence |
| --- | --- | --- |
| `/dashboard` | Active | Seller/producer dashboard rendered after manual login |
| `/reports` via dashboard card | Active | Plain dashboard anchor opened reports screen |
| `/reports` direct | Active | Reports screen rendered |
| `/reports` sustainability tab | Active tab/view | `تقارير الاستدامة` view rendered inside reports |
| `/sustainability/allocations` | Active but empty | Route rendered empty state: no received materials ready for sustainability entry |
| `/sustainability/allocations/:id` | Not reached | No allocation row/detail link visible |
| `/reports/sustainability/:id/print` | Not reached | No report detail/print link opened; `عرض التقرير` was visible but not clicked |

## Observed Facts

- The seller/producer dashboard is reachable and active after manual login.
- The dashboard exposes both report/sustainability and sustainability data entry entry points.
- The seller/producer account can reach `/sustainability/allocations`, but the screen is empty for this user state.
- The seller/producer account can reach `/reports`.
- The reports page contains a sustainability reports tab/view.
- A `عرض التقرير` action is visible, but it was not clicked in this run.

## Inferred Risks

- Seller/producer UAT is not sufficient to discover allocation draft/detail behavior because no received material rows are available.
- A processor/recycler-style role is likely needed to see sustainability allocations with actionable received-material rows.
- A buyer run may be needed to compare report visibility and whether buyer-side sustainability reports differ.

## Open Questions

- Which UAT role owns received materials that should appear in `/sustainability/allocations`?
- Is `عرض التقرير` a safe read-only detail action for a later approved detail-page discovery pass?
- Should the next pass prioritize processor/recycler or buyer?

## Forbidden Actions

- Do not click `إضافة إعلان مواد`.
- Do not click create/edit/finalize/correction/approval/upload/submit actions.
- Do not click `عرض التقرير` unless a later prompt explicitly approves report detail navigation as read-only.
- Do not infer detail routes as active without browser navigation.

## Session Continuity

Files created or updated:
- `docs/pre-phase-3b-visual-journey/05_SELLER_PRODUCER_AUTH_DISCOVERY.md`
- `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/dashboard.png`
- `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/reports-sustainability-entry.png`
- `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/sustainability-allocations.png`
- `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/reports.png`
- `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/reports-sustainability-tab.png`

Evidence collected:
- Browser evidence from authenticated seller/producer dashboard.
- Browser evidence from safe dashboard card navigation to `/reports`.
- Browser evidence from direct read-only navigation to `/sustainability/allocations` and `/reports`.
- Browser evidence from non-mutating reports sustainability tab.
- Screenshot evidence for all reached screens.

Unresolved blockers:
- Allocation detail route not reached because no allocation rows were visible.
- Sustainability print/detail route not reached because report detail was not opened in this run.
- Processor/recycler and buyer roles remain untested.

Exact recommended next prompt:
- "Start authenticated read-only processor/recycler UAT discovery for Pre-Phase 3-B on `https://tadweerah.com`. Continue from the current visible dashboard after manual login. Do not create, edit, submit, approve, finalize, upload, or request corrections. Focus on `/sustainability/allocations`, allocation detail if visible by normal navigation, `/reports`, and sustainability report detail/print only if explicitly visible as read-only navigation."
