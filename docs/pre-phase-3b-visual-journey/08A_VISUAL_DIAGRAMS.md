# 08A Visual Diagrams

Last updated: 2026-06-29  
Mode: Discovery Mode  
Source of truth: Mermaid diagrams in this Markdown file  
Evidence base: `02_BROWSER_JOURNEY_LOG.md` through `08_VISUAL_JOURNEY_STORYBOARD.md`

## Diagram Legend

- Green: browser-confirmed active journey
- Yellow: reachable but incomplete/empty
- Orange: visible source-reading risk
- Red: blocked or mutation-risk
- Gray: unconfirmed / not reached

```mermaid
flowchart LR
  green["Green: browser-confirmed active"]
  yellow["Yellow: reachable but incomplete"]
  orange["Orange: source-reading risk"]
  red["Red: blocked or mutation-risk"]
  gray["Gray: unconfirmed"]

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef yellow fill:#fff5c4,stroke:#b58a00,color:#241a00;
  classDef orange fill:#ffe3c2,stroke:#c46b00,color:#2a1300;
  classDef red fill:#ffd6d6,stroke:#b42318,color:#2a0000;
  classDef gray fill:#eeeeee,stroke:#777,color:#222;

  class green green;
  class yellow yellow;
  class orange orange;
  class red red;
  class gray gray;
```

## 1. Persona Journey Map

Observed facts:

- Anonymous discovery confirms public rendering only.
- Seller/producer discovery confirms report entry and an empty allocation state.
- Buyer/processor/recycler discovery confirms the active allocation journey and allocation details.
- Admin discovery confirms governance/reporting views under `/admin`.

```mermaid
flowchart TD
  anon["Anonymous\nhttps://tadweerah.com/"]
  anonHome["Public home\nRenders"]
  anonAlloc["/sustainability/allocations\nfalls back to /"]
  anonReports["/reports\nfalls back to /"]

  seller["Seller / Producer\n[TEST] Seller Demo"]
  sellerDash["/dashboard\ncards visible"]
  sellerAlloc["/sustainability/allocations\nempty state"]
  sellerReports["/reports\nتقاريري"]
  sellerSustReports["تقارير الاستدامة tab\nactive tab"]

  buyer["Buyer / Processor / Recycler\n[TEST] Buyer Demo"]
  buyerDash["/dashboard\ncards visible"]
  buyerAlloc["/sustainability/allocations\nrows visible"]
  buyerNotEligible["Allocation detail\nnot eligible\n50 / 0 / 50"]
  buyerApproved["Allocation detail\nمعتمد\n40 / 35 / 5"]
  buyerDraft["Allocation detail\nمسودة\n30 / 0 / 30"]
  buyerReports["/reports\nactive"]
  buyerSustReports["تقارير الاستدامة tab\nactive tab"]

  admin["Admin\nمدير تدويرة"]
  adminPanel["/admin\nلوحة إدارة الصفقات"]
  adminReports["Admin reports tab"]
  adminSust["Admin الاستدامة subtab\nسجلات الاستدامة"]
  adminReview["عمليات تحتاج مراجعة"]
  adminIssues["مشاكل العملاء"]
  adminLog["سجل العمليات"]

  anon --> anonHome
  anon --> anonAlloc
  anon --> anonReports

  seller --> sellerDash
  sellerDash --> sellerAlloc
  sellerDash --> sellerReports
  sellerReports --> sellerSustReports

  buyer --> buyerDash
  buyerDash --> buyerAlloc
  buyerAlloc --> buyerNotEligible
  buyerAlloc --> buyerApproved
  buyerAlloc --> buyerDraft
  buyerDash --> buyerReports
  buyerReports --> buyerSustReports

  admin --> adminPanel
  adminPanel --> adminReports
  adminReports --> adminSust
  adminPanel --> adminReview
  adminPanel --> adminIssues
  adminPanel --> adminLog

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef yellow fill:#fff5c4,stroke:#b58a00,color:#241a00;
  classDef orange fill:#ffe3c2,stroke:#c46b00,color:#2a1300;
  classDef red fill:#ffd6d6,stroke:#b42318,color:#2a0000;

  class anonHome,sellerDash,sellerReports,sellerSustReports,buyerDash,buyerAlloc,buyerNotEligible,buyerDraft,buyerReports,buyerSustReports,adminPanel,adminReports,adminSust,adminReview,adminIssues,adminLog green;
  class sellerAlloc yellow;
  class buyerApproved orange;
  class anonAlloc,anonReports red;
```

## 2. Active Route Map

Observed facts:

- Active requires browser evidence.
- Code-present alone is not classified as active.
- No route is called obsolete in this diagram.

```mermaid
flowchart LR
  active["Active browser-confirmed"]
  reachable["Reachable but not journey-active"]
  blocked["Blocked"]
  unconfirmed["Unconfirmed"]
  mutation["Mutation-risk / not clicked"]

  active --> root["https://tadweerah.com/"]
  active --> dash["/dashboard\nseller and buyer"]
  active --> reports["/reports\nseller and buyer"]
  active --> reportsTab["/reports\nتقارير الاستدامة tab"]
  active --> allocList["/sustainability/allocations\nbuyer rows"]
  active --> allocDetail["/sustainability/allocations/:id\nvisible buyer details"]
  active --> admin["/admin"]
  active --> adminTabs["/admin in-page tabs\nreports / sustainability / review / issues / log / shipments"]

  reachable --> anonAlloc["Anonymous /sustainability/allocations\nfinal URL /"]
  reachable --> anonReports["Anonymous /reports\nfinal URL /"]
  reachable --> sellerEmpty["Seller /sustainability/allocations\nempty state"]

  blocked --> webapp["tadweerah-staging.web.app\nClerk origin blocked"]
  blocked --> print["/reports/sustainability/:id/print\nnot reached"]

  unconfirmed --> reportButton["عرض التقرير\nbutton visible, not verified as safe navigation"]
  unconfirmed --> adminDetails["Admin تفاصيل\nbutton visible, not opened"]
  unconfirmed --> correctionDetail["Admin correction/revision detail\nnot reached"]

  mutation --> reopen["تعديل (إعادة فتح)"]
  mutation --> requestCorrection["طلب تعديل التوزيع"]
  mutation --> draftControls["إضافة مسار / حفظ المسودة / اعتماد بيانات الاستدامة"]
  mutation --> loadButtons["تحميل / تحديث / عرض السجل buttons"]

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef yellow fill:#fff5c4,stroke:#b58a00,color:#241a00;
  classDef red fill:#ffd6d6,stroke:#b42318,color:#2a0000;
  classDef gray fill:#eeeeee,stroke:#777,color:#222;

  class active,root,dash,reports,reportsTab,allocList,allocDetail,admin,adminTabs green;
  class reachable,anonAlloc,anonReports,sellerEmpty yellow;
  class blocked,webapp,print red;
  class unconfirmed,reportButton,adminDetails,correctionDetail gray;
  class mutation,reopen,requestCorrection,draftControls,loadButtons red;
```

## 3. Sustainability Allocation Flow

Observed facts:

- Seller/producer reaches the allocation route but sees an empty state.
- Buyer/processor/recycler reaches the active allocation list and detail states.
- Mutation actions were visible but not clicked.

```mermaid
flowchart TD
  dashboard["/dashboard"]
  reportsCard["التقارير والاستدامة\ncard"]
  entryCard["إدخال بيانات الاستدامة\ncard"]
  allocations["/sustainability/allocations"]
  sellerEmpty["Seller view\nempty state"]
  buyerRows["Buyer/processor view\nallocation rows"]
  detail["Allocation detail\nvia visible عرض التفاصيل"]
  notEligible["Not eligible\nغير مؤهل للتوزيع\n50 received / 0 distributed / 50 remaining"]
  draft["مسودة\n30 received / 0 distributed / 30 remaining"]
  approved["معتمد\n40 received / 35 distributed / 5 remaining\n87.5%"]
  noMutations["No mutation actions clicked"]
  mutationActions["Mutation-risk controls\nطلب تعديل التوزيع\nإضافة مسار\nحفظ المسودة\nاعتماد بيانات الاستدامة"]

  dashboard --> reportsCard
  dashboard --> entryCard
  entryCard --> allocations
  allocations --> sellerEmpty
  allocations --> buyerRows
  buyerRows --> detail
  detail --> notEligible
  detail --> draft
  detail --> approved
  detail --> mutationActions
  mutationActions --> noMutations

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef yellow fill:#fff5c4,stroke:#b58a00,color:#241a00;
  classDef orange fill:#ffe3c2,stroke:#c46b00,color:#2a1300;
  classDef red fill:#ffd6d6,stroke:#b42318,color:#2a0000;

  class dashboard,reportsCard,entryCard,allocations,buyerRows,detail,notEligible,draft green;
  class sellerEmpty yellow;
  class approved orange;
  class mutationActions,noMutations red;
```

## 4. Reports Flow

Observed facts:

- Seller and buyer can reach `/reports`.
- `تقارير الاستدامة` tab is active.
- `عرض التقرير` was visible but not clicked.
- `/reports/sustainability/:id/print` is not browser-confirmed active.

```mermaid
flowchart TD
  dashboard["/dashboard"]
  reportsEntry["التقارير والاستدامة\ncard / count cards"]
  reports["/reports\nتقاريري"]
  deals["الصفقات tab"]
  contracts["العقود tab"]
  sustTab["تقارير الاستدامة tab"]
  reportButton["عرض التقرير\nvisible button"]
  printRoute["/reports/sustainability/:id/print\nnot confirmed"]
  adminReports["/admin reports tab"]
  adminSust["Admin الاستدامة subtab\nسجلات الاستدامة"]
  adminReportButton["Admin عرض التقرير\ndisabled in rows"]

  dashboard --> reportsEntry
  reportsEntry --> reports
  reports --> deals
  reports --> contracts
  reports --> sustTab
  sustTab --> reportButton
  reportButton -. "not clicked / read-only safety unconfirmed" .-> printRoute
  adminReports --> adminSust
  adminSust --> adminReportButton
  adminReportButton -. "disabled" .-> printRoute

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef yellow fill:#fff5c4,stroke:#b58a00,color:#241a00;
  classDef red fill:#ffd6d6,stroke:#b42318,color:#2a0000;
  classDef gray fill:#eeeeee,stroke:#777,color:#222;

  class dashboard,reportsEntry,reports,deals,contracts,sustTab,adminReports,adminSust green;
  class reportButton yellow;
  class adminReportButton,printRoute gray;
```

## 5. 40 / 35 / 5 Evidence Map

Observed facts:

- Buyer/processor allocation detail is the strongest evidence for the 40/35/5 split.
- Admin sustainability record shows 40 tons for the same reference.
- This is a Phase 3-B source-reading risk, not a confirmed fix.

```mermaid
flowchart LR
  ref["TDW-CTR-2026-0006-S010"]

  buyerDetail["Buyer/processor allocation detail\n/sustainability/allocations/:id"]
  received["40 طن\nreceived/source quantity"]
  distributed["35 طن\ndistributed"]
  remaining["5 طن\nremaining"]
  ratio["87.5%\nمعتمد"]

  adminView["Admin sustainability row\n/admin reports > الاستدامة"]
  adminQty["40 طن\nمعتمد\nversion 2"]
  replaced["40 طن\nمستبدل\nversion 1"]

  risk["Source-reading risk for Phase 3-B\nreports must distinguish received vs distributed/approved quantity"]
  noFix["No fix inferred in Pre-Phase 3-B"]

  ref --> buyerDetail
  buyerDetail --> received
  buyerDetail --> distributed
  buyerDetail --> remaining
  buyerDetail --> ratio

  ref --> adminView
  adminView --> adminQty
  adminView --> replaced

  received --> risk
  distributed --> risk
  adminQty --> risk
  risk --> noFix

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef orange fill:#ffe3c2,stroke:#c46b00,color:#2a1300;
  classDef gray fill:#eeeeee,stroke:#777,color:#222;

  class ref,buyerDetail,adminView green;
  class received,distributed,remaining,ratio,adminQty,replaced,risk orange;
  class noFix gray;
```

## 6. Terminology Flow Diagram

Observed facts:

- Some requested terms are browser-confirmed exactly.
- `توزيع بيانات الاستدامة` was not observed as an exact visible phrase, but the distribution concept appears through `إجمالي التوزيع` and `مسودة توزيع الاستدامة`.
- Mutation-risk terms are shown for context only.

```mermaid
flowchart TD
  entry["إدخال بيانات الاستدامة\nbrowser-confirmed"]
  distributionConcept["توزيع بيانات الاستدامة\nconcept observed, exact term unconfirmed"]
  draft["مسودة\nمسودة توزيع الاستدامة"]
  approved["معتمد\nتقرير الاستدامة"]
  reports["تقارير الاستدامة\nreports tab"]
  viewReport["عرض التقرير\nvisible, not clicked / disabled in admin rows"]
  reopen["تعديل (إعادة فتح)\nmutation-risk, not clicked"]
  received["الكمية المستلمة الإجمالية"]
  totalDistribution["إجمالي التوزيع"]
  remaining["الكمية المتبقية"]

  entry --> distributionConcept
  distributionConcept --> draft
  distributionConcept --> approved
  approved --> reports
  reports --> viewReport
  approved --> received
  approved --> totalDistribution
  approved --> remaining
  reports --> reopen

  classDef green fill:#d9f7df,stroke:#218a42,color:#123;
  classDef yellow fill:#fff5c4,stroke:#b58a00,color:#241a00;
  classDef orange fill:#ffe3c2,stroke:#c46b00,color:#2a1300;
  classDef red fill:#ffd6d6,stroke:#b42318,color:#2a0000;

  class entry,draft,approved,reports,received,totalDistribution,remaining green;
  class distributionConcept,viewReport yellow;
  class reopen red;
```

## Evidence References

- Anonymous/custom-domain evidence: `02_BROWSER_JOURNEY_LOG.md`, `04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md`
- URL/config evidence: `03_URL_RESOLUTION.md`
- Seller/producer evidence: `05_SELLER_PRODUCER_AUTH_DISCOVERY.md`
- Buyer/processor/recycler evidence: `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md`
- Admin evidence: `07_ADMIN_AUTH_DISCOVERY.md`
- Cross-persona storyboard: `08_VISUAL_JOURNEY_STORYBOARD.md`

## Notes

- These diagrams do not classify any path as obsolete.
- These diagrams do not propose fixes.
- These diagrams do not turn Pre-Phase 3-B into Phase 3-B.
- Static PNG/PDF exports may be produced later, but this Markdown file remains the editable source of truth.
