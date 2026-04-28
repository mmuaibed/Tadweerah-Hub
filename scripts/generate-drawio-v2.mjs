import { writeFileSync } from "fs";

// ─── Utilities ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\n/g, "&#xa;");
}
function lh(text, base = 54) {
  return Math.max(base, 22 + String(text ?? "").split(/\n/).length * 18);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  action:  "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=11;align=center;",
  system:  "rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#999999;fontSize=11;align=center;",
  state:   "rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=11;align=center;",
  decision:"rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=11;align=center;",
  note:    "rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;dashed=1;fontSize=11;align=center;",
  data:    "shape=note;whiteSpace=wrap;html=1;fillColor=#f9f9f9;strokeColor=#888888;fontSize=10;align=left;size=14;",
  notification:"rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=11;align=center;",
  error:   "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=11;align=center;",
  brno:    "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;align=center;",
  bryes:   "rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=10;align=center;",
  E:    "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontSize=10;",
  Eno:  "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#b85450;fontColor=#b85450;fontSize=10;",
  Eyes: "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#82b366;fontColor=#82b366;fontSize=10;",
};

// ─── Phase styles ────────────────────────────────────────────────────────────
const PHASE_S = {
  "MVP / Built":       "rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontColor=#1a5c35;fontStyle=1;fontSize=9;align=center;",
  "Pilot Enhancement": "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#1a3f6f;fontStyle=1;fontSize=9;align=center;",
  "Future Phase":      "rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#444444;fontStyle=1;fontSize=9;align=center;",
  "Needs Decision":    "rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontColor=#7d5a00;fontStyle=1;fontSize=9;align=center;",
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const BW = 360, BX = 80, BCX = BX + BW / 2;
const DW = 240, DH = 90, DX = BCX - DW / 2;
const BRNX = BX + BW + 70, BRNW = 280;
const VG = 28, BG = 8;
const ACTOR_X = 4, ACTOR_W = 68;

// ─── Page builder ────────────────────────────────────────────────────────────
let _pageSeq = 0;
function newPage() {
  const pid = ++_pageSeq;
  let _id = 1;
  const cells = [
    `<mxCell id="${pid}_0" />`,
    `<mxCell id="${pid}_1" parent="${pid}_0" />`,
  ];
  const parent = `${pid}_1`;

  function cell(val, style, x, y, w, h) {
    const id = `${pid}_${++_id}`;
    cells.push(
      `<mxCell id="${id}" value="${esc(val)}" style="${style}" vertex="1" parent="${parent}">` +
      `<mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry"/></mxCell>`
    );
    return id;
  }
  function edge(src, tgt, label = "", style = S.E) {
    const id = `${pid}_${++_id}`;
    cells.push(
      `<mxCell id="${id}" value="${esc(label)}" style="${style}" edge="1" source="${src}" target="${tgt}" parent="${parent}">` +
      `<mxGeometry relative="1" as="geometry"/></mxCell>`
    );
    return id;
  }
  return { cell, edge, xml: () => cells.join("\n") };
}

function wrapPage(name, bodyXml) {
  return [
    `<diagram id="d${_pageSeq}" name="${esc(name)}">`,
    `<mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">`,
    `<root>`, bodyXml, `</root>`,
    `</mxGraphModel></diagram>`,
  ].join("\n");
}

// ─── Master Map ───────────────────────────────────────────────────────────────
const MASTER_STAGES = [
  // Row 0
  { label: "1. Sign Up &\nOnboarding",         actor: "All Users",          fill:"#dae8fc",stroke:"#6c8ebf", row:0, col:0 },
  { label: "2. Company Profile\n& Licensing",   actor: "All + Admin",        fill:"#dae8fc",stroke:"#6c8ebf", row:0, col:1 },
  { label: "3. Create Listing\n& Targeting",    actor: "Producer",           fill:"#d5e8d4",stroke:"#82b366", row:0, col:2 },
  { label: "4. Marketplace\nVisibility",        actor: "System",             fill:"#f5f5f5",stroke:"#999999", row:0, col:3 },
  { label: "5. Browse &\nDiscover",             actor: "Buyer / Recycler",   fill:"#fff2cc",stroke:"#d6b656", row:0, col:4 },
  { label: "6. Submit Offer\n& Eligibility",    actor: "Buyer",              fill:"#fff2cc",stroke:"#d6b656", row:0, col:5 },
  { label: "7. Bidding\nCompetition",           actor: "Buyer / System",     fill:"#fff2cc",stroke:"#d6b656", row:0, col:6 },
  { label: "8. Accept / Reject\nOffer",         actor: "Producer",           fill:"#d5e8d4",stroke:"#82b366", row:0, col:7 },
  { label: "9. Deal\nCreated",                  actor: "System",             fill:"#f5f5f5",stroke:"#999999", row:0, col:8 },
  // Row 1
  { label: "10. Payment\n& Proof Upload",       actor: "Buyer + Producer",   fill:"#ffe6cc",stroke:"#d79b00", row:1, col:0 },
  { label: "11. Transport\nArrangement",        actor: "Producer + Carrier", fill:"#ffe6cc",stroke:"#d79b00", row:1, col:1, phase:"Pilot Enhancement" },
  { label: "12. Dispatch\nConfirmation",        actor: "Producer",           fill:"#d5e8d4",stroke:"#82b366", row:1, col:2 },
  { label: "13. Receipt\nConfirmation",         actor: "Buyer",              fill:"#fff2cc",stroke:"#d6b656", row:1, col:3 },
  { label: "14. Deal\nCompleted",               actor: "System",             fill:"#f5f5f5",stroke:"#999999", row:1, col:4 },
  { label: "15. Reporting\n& Records",          actor: "All Users",          fill:"#e1d5e7",stroke:"#9673a6", row:1, col:5 },
  { label: "16. Compliance\nData Layer",        actor: "System / Regulator", fill:"#e1d5e7",stroke:"#9673a6", row:1, col:6, phase:"Future Phase" },
  { label: "17. Admin\nOversight",              actor: "Admin",              fill:"#f8cecc",stroke:"#b85450", row:1, col:7, phase:"Pilot Enhancement" },
  { label: "18. Issue\nReporting",              actor: "All + Admin",        fill:"#f8cecc",stroke:"#b85450", row:1, col:8, phase:"Future Phase" },
];

function buildMasterMap() {
  const p = newPage();
  const SW = 220, SH = 80, SGAP = 20, PITCH = SW + SGAP;
  const R1Y = 220, R2Y = 460;
  const SX = 40;

  // Title
  p.cell(
    "Tadweerah — Master System Map\nFull Ecosystem View · All Actors & Flows",
    "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontSize=18;fontStyle=1;",
    0, 10, 9 * PITCH + SX * 2, 60
  );

  // Actor legend row
  const ACTORS = [
    { label:"Producer",              fill:"#d5e8d4", stroke:"#82b366" },
    { label:"Buyer / Recycler",      fill:"#fff2cc", stroke:"#d6b656" },
    { label:"Transporter / Carrier", fill:"#ffe6cc", stroke:"#d79b00" },
    { label:"Admin",                 fill:"#f8cecc", stroke:"#b85450" },
    { label:"Regulator / Compliance",fill:"#e1d5e7", stroke:"#9673a6" },
    { label:"System / Platform",     fill:"#f5f5f5", stroke:"#999999" },
  ];
  const LEG_W = 300, LEG_GAP = 20;
  ACTORS.forEach((a, i) => {
    p.cell(
      a.label,
      `rounded=1;whiteSpace=wrap;html=1;fillColor=${a.fill};strokeColor=${a.stroke};fontSize=11;fontStyle=1;align=center;`,
      SX + i * (LEG_W + LEG_GAP), 85, LEG_W, 34
    );
  });

  // Stages
  const ids = [];
  MASTER_STAGES.forEach((s, i) => {
    const x = SX + s.col * PITCH;
    const y = s.row === 0 ? R1Y : R2Y;
    const id = p.cell(
      s.label,
      `rounded=1;whiteSpace=wrap;html=1;fillColor=${s.fill};strokeColor=${s.stroke};fontSize=11;align=center;`,
      x, y, SW, SH
    );
    ids.push(id);
    // Actor sub-label
    p.cell(s.actor, "text;html=1;strokeColor=none;fillColor=none;align=center;fontSize=9;fontColor=#666666;", x, y + SH + 2, SW, 18);
    // Phase badge
    if (s.phase) {
      p.cell(s.phase, PHASE_S[s.phase], x + SW - 120, y - 22, 120, 18);
    }
  });

  // Row 1 edges (stages 0-8)
  for (let i = 0; i < 8; i++) p.edge(ids[i], ids[i + 1]);
  // Wrap arrow: end of row1 → start of row2
  p.edge(ids[8], ids[9],
    "",
    S.E + "exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
  );
  // Row 2 edges (stages 9-17)
  for (let i = 9; i < 17; i++) p.edge(ids[i], ids[i + 1]);

  // Phase legend
  const PH_LIST = [
    { label:"MVP / Built",        fill:"#d5e8d4",stroke:"#82b366" },
    { label:"Pilot Enhancement",  fill:"#dae8fc",stroke:"#6c8ebf" },
    { label:"Future Phase",       fill:"#f5f5f5",stroke:"#666666" },
    { label:"Needs Decision",     fill:"#fff2cc",stroke:"#d6b656" },
  ];
  const LY = R2Y + SH + 50;
  p.cell("Phase Readiness:", "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=10;fontStyle=1;", SX, LY, 120, 28);
  PH_LIST.forEach((ph, i) => {
    p.cell(ph.label, `rounded=1;whiteSpace=wrap;html=1;fillColor=${ph.fill};strokeColor=${ph.stroke};fontStyle=1;fontSize=10;align=center;`, SX + 130 + i * 220, LY, 200, 28);
  });

  return wrapPage("0 · Master System Map", p.xml());
}

// ─── Detail page builder ──────────────────────────────────────────────────────
function buildDetailPage(flow) {
  const p = newPage();
  let y = 40;

  // Phase badge (top-right)
  p.cell(flow.phase, PHASE_S[flow.phase] ?? PHASE_S["Needs Decision"], BX + BW - 170, y, 170, 26);

  // Page title
  p.cell(flow.name, "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;fontSize=14;fontStyle=1;", BX, y, BW - 180, 26);

  // Actors line
  if (flow.actors?.length) {
    p.cell("Actors: " + flow.actors.join(" · "), "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=9;fontColor=#666666;", BX, y + 30, BW, 16);
  }

  y += 66;

  const isEdge = !!flow.isEdgeCases;
  let prevId = null;

  for (const step of flow.steps) {
    if (step.type === "decision") {
      // Diamond
      const diaId = p.cell(step.text, S.decision, DX, y, DW, DH);
      if (prevId && !isEdge) p.edge(prevId, diaId);

      // Branches to the right
      const brs = step.branches.filter(b => b.dest);
      let by = y;
      for (const b of brs) {
        const bh = lh(b.dest, 46);
        const lbh = lh(b.label, 32);
        const maxH = Math.max(bh, lbh);
        const bStyle = b.ok === false ? S.brno : S.bryes;
        const eStyle = b.ok === false ? S.Eno : S.Eyes;
        const lbId = p.cell(b.label, bStyle, BRNX, by + (maxH - lbh) / 2, BRNW - 90, lbh);
        p.edge(diaId, lbId, b.ok === false ? "No" : "Yes", eStyle);
        const dstId = p.cell(b.dest, bStyle, BRNX + BRNW - 90 + 16, by, BRNW, bh);
        p.edge(lbId, dstId, "", eStyle);
        by += maxH + BG;
      }

      const totalBH = by - y;
      y += Math.max(DH, totalBH) + VG;
      prevId = isEdge ? null : diaId;

    } else {
      const h = lh(step.text);
      const style = S[step.type] ?? S.note;
      const id = p.cell(step.text, style, BX, y, BW, h);
      if (prevId) p.edge(prevId, id);
      // Actor badge on left
      if (step.actor) {
        p.cell(step.actor, "rounded=1;whiteSpace=wrap;html=1;fillColor=#f0f0f0;strokeColor=#aaaaaa;fontSize=8;align=center;", ACTOR_X, y, ACTOR_W, 22);
      }
      prevId = id;
      y += h + VG;
    }
  }

  return wrapPage(flow.name, p.xml());
}

// ─── All flows ────────────────────────────────────────────────────────────────
const FLOWS = [

  // 1 ─── User Onboarding ─────────────────────────────────────────────────────
  {
    name: "1 · User Onboarding",
    phase: "MVP / Built",
    actors: ["User (any role)", "Clerk Auth", "System"],
    steps: [
      { type:"action",  actor:"User",   text:"Visits home page\nClicks 'ابدأ الآن' (Get Started)" },
      { type:"system",  actor:"Clerk",  text:"Redirect to Clerk sign-up / sign-in UI" },
      { type:"action",  actor:"User",   text:"Creates account\n(email + password or OAuth)" },
      { type:"system",  actor:"Clerk",  text:"Clerk issues JWT\nApp detects: no company record → redirect /onboarding" },
      { type:"action",  actor:"User",   text:"Onboarding form:\nName · City · Phone · CR# · Category\nBusiness Actions (multi-select)\nLicense# (optional) · T&C checkbox ✓" },
      { type:"decision", text:"Validation",
        branches:[
          { ok:false, label:"Required field empty\nor T&C not checked", dest:"Show inline error\nUser stays on form" },
          { ok:true,  label:"All valid", dest:null },
        ]
      },
      { type:"system",  actor:"System", text:"POST /api/companies\n→ Creates company record + action_ids\n→ license_number provided? → license_status: pending\n→ Sets accepted_terms_at timestamp" },
      { type:"data",                    text:"Data Created:\n• companies row\n• company_actions rows\n• accepted_terms_at timestamp set" },
      { type:"state",                   text:"✓ Company created\nRedirect → /dashboard" },
      { type:"note",                    text:"Future logins: JWT has company\n→ skip onboarding, go directly to /dashboard" },
    ],
  },

  // 2 ─── Company Profile / Permissions ──────────────────────────────────────
  {
    name: "2 · Company Profile & Permissions",
    phase: "MVP / Built",
    actors: ["User", "Admin (future)", "System"],
    steps: [
      { type:"action",  actor:"User",   text:"Visits /profile page" },
      { type:"action",  actor:"User",   text:"Views: Name · City · Phone · CR#\nCategories · Business Actions · License status" },
      { type:"action",  actor:"User",   text:"Edits company info\nSaves changes → PUT /api/companies/me" },
      { type:"system",  actor:"System", text:"Updates company record\nReturns updated profile" },
      { type:"note",                    text:"License number: user submits here or during onboarding\nAdmin must manually set status: approved\n(Admin license approval = Pilot Enhancement)" },
      { type:"decision", text:"License status",
        branches:[
          { ok:false, label:"pending",  dest:"Flagged company\nCannot access license-gated listings" },
          { ok:false, label:"rejected", dest:"License rejected\nUser must re-submit" },
          { ok:true,  label:"approved", dest:"Full access to sensitive\n+ licensed material categories" },
        ]
      },
      { type:"data",                    text:"Permissions matrix:\n• Business actions → listing/offer eligibility\n• License status → gate for sensitive categories\n• CR# → future verification step" },
      { type:"note",                    text:"CR# verification: Future Phase\nProfile photo / company logo: Needs Decision" },
    ],
  },

  // 3 ─── Create Listing ──────────────────────────────────────────────────────
  {
    name: "3 · Create Listing",
    phase: "MVP / Built",
    actors: ["Producer", "System"],
    steps: [
      { type:"action",  actor:"Producer", text:"Clicks 'نشر إعلان جديد' from Dashboard" },
      { type:"action",  actor:"Producer", text:"Fills required fields:\nMaterial Category · Quantity · Unit\nCity · Description" },
      { type:"action",  actor:"Producer", text:"Selects sale type:\nAuction (buyers compete by price)\nDirect Sale (first qualified buyer wins)" },
      { type:"action",  actor:"Producer", text:"Selects pricing model:\nFixed / By Weight / Revenue Share" },
      { type:"action",  actor:"Producer", text:"Optional fields:\nPrice hint · Required buyer capabilities\nImage upload" },
      { type:"system",  actor:"System",   text:"POST /api/listings\n→ ZERO eligibility checks on producer (charter rule)\n→ Creates waste_listings · status: open\n→ Saves required_service_ids, targeting fields" },
      { type:"data",                      text:"Data Created:\n• waste_listings row\n• status: open · sale_type set\n• material_category_id linked\n• required_service_ids stored" },
      { type:"state",                     text:"✓ Listing open\nVisible in /marketplace per targeting rules" },
      { type:"note",                      text:"Producer can close listing anytime:\nPUT /listings/:id/close → status: closed\nNo deal created if closed without accepting offer" },
    ],
  },

  // 4 ─── Targeting & Visibility ─────────────────────────────────────────────
  {
    name: "4 · Targeting & Visibility",
    phase: "MVP / Built",
    actors: ["Producer", "System", "Buyer"],
    steps: [
      { type:"action",  actor:"Producer", text:"Selects targeting type on listing form" },
      { type:"decision", text:"Targeting type selected",
        branches:[
          { ok:true,  label:"Open",             dest:"Visible to all qualified buyers\nin public marketplace" },
          { ok:true,  label:"By Category",      dest:"Visible only to buyers whose\ncategory is in selected list" },
          { ok:false, label:"Specific Company", dest:"Not shown in marketplace\nTarget company gets in-app notification" },
        ]
      },
      { type:"system",  actor:"System",   text:"Marketplace GET /api/listings applies targeting filter:\n→ Each buyer sees only listings they are eligible for\n→ Private listings invisible — no indication they exist" },
      { type:"action",  actor:"Buyer",    text:"Opens /marketplace\nSees only eligible listings based on their profile" },
      { type:"notification",              text:"Notification triggered (Specific Company only):\n→ Target company: 'You have a private listing offer'" },
      { type:"data",                      text:"Targeting stored on listing:\n• targeting_type: open / by_category / specific_company\n• target_company_id (specific only)\n• target_categories[] (by_category only)" },
      { type:"note",                      text:"Gap: No 'invite multiple companies' option yet\nNeeds Decision: can producer later change targeting?" },
    ],
  },

  // 5 ─── Marketplace Browsing ────────────────────────────────────────────────
  {
    name: "5 · Marketplace Browsing",
    phase: "MVP / Built",
    actors: ["Buyer", "System"],
    steps: [
      { type:"action",  actor:"Buyer",  text:"Opens /marketplace" },
      { type:"action",  actor:"Buyer",  text:"Applies filters:\nMaterial category · City · Sale type" },
      { type:"system",  actor:"System", text:"GET /api/listings?filters\n→ Returns open listings matching buyer's eligibility\n→ Applies active filters\n→ Sorted by newest first" },
      { type:"action",  actor:"Buyer",  text:"Scrolls listing cards:\nMaterial · Quantity · City\nCurrent max offer · Time posted · Offer count" },
      { type:"action",  actor:"Buyer",  text:"Clicks listing → /listings/:id\nViews full listing detail page" },
      { type:"system",  actor:"System", text:"GET /api/listings/:id\n→ Returns full listing detail\n→ Returns buyer's own offer (if exists)\n→ Returns current max offer price" },
      { type:"action",  actor:"Buyer",  text:"Reviews: description · specs · material type\nCurrent price · Decides to submit offer" },
      { type:"note",                    text:"Not built yet:\n• Bookmark / save listing (Needs Decision)\n• Offer history visible to others (by design: hidden)\n• Notification when new listing in buyer's category (Pilot)" },
    ],
  },

  // 6 ─── Submit Offer ────────────────────────────────────────────────────────
  {
    name: "6 · Submit Offer",
    phase: "MVP / Built",
    actors: ["Buyer", "System"],
    steps: [
      { type:"action",  actor:"Buyer",  text:"On listing detail page\nEnters price_per_unit + optional message\nClicks 'Submit Offer'" },
      { type:"system",  actor:"System", text:"POST /api/listings/:id/offers\n4 eligibility gates run in sequence:" },
      { type:"decision", text:"Gate 1 · Targeting",
        branches:[
          { ok:false, label:"specific_company &\nbuyer is not the target",    dest:"❌ 403 TargetingRestricted" },
          { ok:false, label:"category-targeted &\nbuyer not in allowed list", dest:"❌ 403 TargetingRestricted" },
          { ok:true,  label:"Open listing or eligible",                       dest:"→ Gate 2" },
        ]
      },
      { type:"decision", text:"Gate 2 · Required Services",
        branches:[
          { ok:false, label:"Buyer lacks required capability",                  dest:"❌ 403 MissingCapability" },
          { ok:false, label:"Capability needs license ·\nbuyer not approved",  dest:"❌ 403 LicenseRequired" },
          { ok:true,  label:"All capabilities met",                            dest:"→ Gate 3" },
        ]
      },
      { type:"decision", text:"Gate 3 · Sensitive Material",
        branches:[
          { ok:false, label:"is_sensitive material &\nbuyer unlicensed",     dest:"❌ 403 LicenseRequired" },
          { ok:true,  label:"Not sensitive or buyer approved",               dest:"→ Gate 4" },
        ]
      },
      { type:"decision", text:"Gate 4 · Price",
        branches:[
          { ok:false, label:"price ≤ current highest offer",                 dest:"❌ 400 PriceTooLow" },
          { ok:true,  label:"price > current highest\n(or first offer)",     dest:"→ Save" },
        ]
      },
      { type:"system",  actor:"System", text:"Offer saved · status: pending\nPrevious top bidder notified (outbid)\nProducer notified (new offer received)" },
      { type:"notification",            text:"Notifications triggered:\n• Previous top bidder: 'You have been outbid'\n• Producer: 'New offer received on your listing'" },
      { type:"data",                    text:"Data Created:\n• offers row · status: pending\n• price_per_unit · optional message stored\n• offer rank calculated" },
      { type:"state",                   text:"✓ Offer active\nRank #1 if highest price" },
    ],
  },

  // 7 ─── Bidding & Competition ───────────────────────────────────────────────
  {
    name: "7 · Bidding & Competition",
    phase: "MVP / Built",
    actors: ["Buyer A", "Buyer B", "Producer", "System"],
    steps: [
      { type:"action",  actor:"Buyer A", text:"Submits first offer at price X" },
      { type:"state",                    text:"Buyer A: rank #1 · total offers: 1" },
      { type:"action",  actor:"Buyer B", text:"Submits offer Y where Y > X" },
      { type:"system",  actor:"System",  text:"Buyer A outbid → notification sent\nBuyer B: rank #1 · Buyer A: rank #2" },
      { type:"action",  actor:"Buyer A", text:"Clicks 'Improve Offer'\nPUT /listings/:id/offers/mine" },
      { type:"decision", text:"Was Buyer A already top bidder?",
        branches:[
          { ok:false, label:"Yes (was #1 before\nsubmitting improvement)", dest:"⚠ Response: already_top=true\nBuyer must send explicit_self_improve=true\nto confirm self-outbid intention" },
          { ok:true,  label:"No (was outbid first)",                      dest:"→ Price check" },
        ]
      },
      { type:"decision", text:"New price check",
        branches:[
          { ok:false, label:"New price ≤ current highest",   dest:"❌ 400 PriceTooLow" },
          { ok:true,  label:"New price > current highest",   dest:"→ Update offer" },
        ]
      },
      { type:"system",  actor:"System",  text:"Offer updated · new rank calculated\nOutbid notifications sent to affected buyers" },
      { type:"state",                    text:"Competition ongoing\nProducer can view ranked offer list anytime\nvia listing detail page" },
    ],
  },

  // 8 ─── Accept / Reject Offer ──────────────────────────────────────────────
  {
    name: "8 · Accept / Reject Offer",
    phase: "MVP / Built",
    actors: ["Producer", "Buyer", "System"],
    steps: [
      { type:"action",  actor:"Producer", text:"Reviews ranked offer list\non listing detail page" },
      { type:"decision", text:"Producer decision",
        branches:[
          { ok:false, label:"Manually reject\nspecific offer",   dest:"rejection_reason required\nOffer → rejected · Buyer notified\nCannot re-bid on this listing" },
          { ok:true,  label:"Accept best offer",                 dest:null },
        ]
      },
      { type:"system",  actor:"System",  text:"PUT /offers/:id/accept\n→ Accepted offer → status: accepted\n→ All other pending → auto-rejected (reason: offer_accepted)\n→ All rejected buyers notified\n→ Listing → status: closed\n→ Deal record auto-created · status: active" },
      { type:"notification",             text:"Notifications triggered:\n• Accepted buyer: 'Your offer was accepted · Deal created'\n• Rejected buyers: 'Another offer was accepted'\n• Producer: deal confirmation" },
      { type:"data",                     text:"Data Updated:\n• offers.status = accepted / rejected\n• waste_listings.status = closed\n• deals row created · status: active\n• deals.payment_model set from listing" },
      { type:"state",                    text:"✓ Deal created · Listing closed\nBoth parties enter deal lifecycle" },
      { type:"note",                     text:"Alternative: Producer closes without accepting:\nPUT /listings/:id/close\n→ No deal created · All pending offers auto-cancelled" },
    ],
  },

  // 9 ─── Deal Lifecycle ──────────────────────────────────────────────────────
  {
    name: "9 · Deal Lifecycle",
    phase: "MVP / Built",
    actors: ["Producer", "Buyer", "System"],
    steps: [
      { type:"state",                    text:"Deal · status: active\nBoth parties view deal panel" },
      { type:"note",                     text:"Deal panel shows:\nCounterparty name + phone · Estimated amount\nSettlement type · Status timeline" },
      { type:"action",  actor:"Buyer",   text:"Transfers payment offline\n(bank transfer / SADAD)" },
      { type:"action",  actor:"Producer",text:"Confirms payment received\nPOST /deals/:id/confirm-payment\n• payment_reference (required)\n• payment_proof_url (optional)\n• actual_quantity (required if by_weight)" },
      { type:"system",  actor:"System",  text:"status → payment_confirmed\nTimestamp set · Buyer notified" },
      { type:"action",  actor:"Producer",text:"Prepares and ships goods\nPOST /deals/:id/confirm-dispatch" },
      { type:"system",  actor:"System",  text:"status → dispatched\nBuyer notified: goods shipped · confirm receipt" },
      { type:"action",  actor:"Buyer",   text:"Receives goods\nPOST /deals/:id/confirm-receipt" },
      { type:"system",  actor:"System",  text:"status → completed\nProducer notified · Stats updated" },
      { type:"state",                    text:"✓ Deal completed\nAppears in /reports for both parties" },
      { type:"note",                     text:"Gap: No timeout / escalation if deal goes inactive\nNeeds Decision: expiry policy" },
    ],
  },

  // 10 ─── Payment Confirmation ───────────────────────────────────────────────
  {
    name: "10 · Payment Confirmation",
    phase: "MVP / Built",
    actors: ["Buyer", "Producer", "System"],
    steps: [
      { type:"note",                     text:"Payment is OFFLINE (bank transfer / SADAD)\nPlatform captures reference only · no payment processing" },
      { type:"action",  actor:"Buyer",   text:"Transfers funds via bank\nObtains transfer reference / IBAN confirmation" },
      { type:"action",  actor:"Producer",text:"Receives funds in bank\nOpens deal panel → Payment tab\nEnters payment_reference (required)\nOptional: uploads payment_proof_url" },
      { type:"decision", text:"Deal pricing model",
        branches:[
          { ok:false, label:"by_weight",              dest:"actual_quantity also required\nFinal amount = actual_qty × price_per_unit" },
          { ok:true,  label:"fixed / revenue_share",  dest:"Standard confirmation · no extra fields" },
        ]
      },
      { type:"system",  actor:"System",  text:"POST /deals/:id/confirm-payment\n→ Validates payment_reference present\n→ Records proof_url if provided\n→ status → payment_confirmed\n→ Sets payment_confirmed_at" },
      { type:"data",                     text:"Data Updated:\n• deals.payment_reference\n• deals.payment_proof_url\n• deals.actual_quantity (if by_weight)\n• deals.status = payment_confirmed\n• deals.payment_confirmed_at timestamp" },
      { type:"notification",             text:"Notification → Buyer:\n'Payment confirmed · Producer will dispatch soon'" },
      { type:"state",                    text:"✓ status: payment_confirmed\nProducer now prepares for dispatch" },
      { type:"note",                     text:"Future: Online payment via Mada / STC Pay\nEscrow mechanism: Future Phase" },
    ],
  },

  // 11 ─── Transport Flow ─────────────────────────────────────────────────────
  {
    name: "11 · Transport Flow",
    phase: "Pilot Enhancement",
    actors: ["Producer", "Transporter / Carrier", "Buyer", "System"],
    steps: [
      { type:"note",                     text:"Phase: Pilot Enhancement\nMVP: Producer handles dispatch manually (no carrier marketplace)\nThis page documents the future Transport module" },
      { type:"action",  actor:"Producer",text:"Deal is in payment_confirmed state\nCreates transport request:\nPickup city · Delivery city\nMaterial · Weight / Volume · Date range" },
      { type:"system",  actor:"System",  text:"Creates transport_request · status: open\nNotifies registered Transporters in pickup city" },
      { type:"action",  actor:"Carrier", text:"Views transport request\nSubmits bid: price + estimated pickup date" },
      { type:"action",  actor:"Producer",text:"Reviews transport bids · selects carrier" },
      { type:"system",  actor:"System",  text:"Transport request → assigned\nCarrier, Producer, and Buyer notified" },
      { type:"action",  actor:"Carrier", text:"Picks up goods at producer location\nConfirms pickup in app\nOptional: uploads pickup photo" },
      { type:"system",  actor:"System",  text:"Transport status → in_transit\nBuyer notified: goods in transit" },
      { type:"action",  actor:"Carrier", text:"Delivers goods to buyer location" },
      { type:"action",  actor:"Buyer",   text:"Confirms receipt via app\n→ see Flow 12" },
      { type:"state",                    text:"✓ Delivery confirmed\nTransport marked complete\nDeal proceeds to completion" },
      { type:"note",                     text:"Gaps:\n• No dispute mechanism for transport damage\n• No tracking link / live GPS\n• Carrier rating system: Future Phase" },
    ],
  },

  // 12 ─── Completion & Receipt ───────────────────────────────────────────────
  {
    name: "12 · Completion & Receipt",
    phase: "MVP / Built",
    actors: ["Buyer", "System", "Producer"],
    steps: [
      { type:"state",                    text:"Deal · status: dispatched\nBuyer waiting for goods arrival" },
      { type:"action",  actor:"Buyer",   text:"Receives goods physically\nInspects for quality and completeness" },
      { type:"decision", text:"Buyer inspection",
        branches:[
          { ok:false, label:"Issue found\n(quality / quantity mismatch)", dest:"No dispute mechanism in MVP\nBuyer contacts producer directly\nNeeds Decision: formal dispute flow" },
          { ok:true,  label:"Goods acceptable",                           dest:null },
        ]
      },
      { type:"action",  actor:"Buyer",   text:"Confirms receipt\nPOST /deals/:id/confirm-receipt" },
      { type:"system",  actor:"System",  text:"status → completed · Sets completed_at\nUpdates company stats:\n• completed_deals_count +1\n• total_deal_value += deal amount" },
      { type:"data",                     text:"Data Updated:\n• deals.status = completed\n• deals.completed_at timestamp\n• companies.completed_deals_count\n• companies.total_deal_value" },
      { type:"notification",             text:"Notification → Producer:\n'Deal completed · Buyer confirmed receipt'" },
      { type:"state",                    text:"✓ Deal completed\nAppears in /reports for both parties" },
    ],
  },

  // 13 ─── Reporting & Records ────────────────────────────────────────────────
  {
    name: "13 · Reporting & Records",
    phase: "MVP / Built",
    actors: ["Producer", "Buyer", "System"],
    steps: [
      { type:"action",  actor:"User",   text:"Opens /reports page" },
      { type:"system",  actor:"System", text:"GET /api/reports\n→ Returns company's deal history (as producer and buyer)\n→ Aggregates by status · date range\n→ Filters: material type · role · date" },
      { type:"action",  actor:"User",   text:"Views stats:\n• Completed deals count\n• Total deal value (SAR)\n• Active listings count\n• Pending / active offers" },
      { type:"data",                    text:"Data surfaced:\n• deals (by company role: producer or buyer)\n• waste_listings (own listings)\n• offers (own offers submitted)\n• Aggregated totals per period" },
      { type:"note",                    text:"Built for MVP: basic stats + deal list\nPilot Enhancement: breakdown by material / city\nFuture Phase: PDF / CSV export · waste certificates" },
      { type:"note",                    text:"Waste transfer certificate / GRN per deal:\nFuture Phase — requires legal design\nCompliance export to gov systems: Future Phase" },
    ],
  },

  // 14 ─── Compliance Reporting ───────────────────────────────────────────────
  {
    name: "14 · Compliance Reporting",
    phase: "Future Phase",
    actors: ["Regulator", "Admin", "System"],
    steps: [
      { type:"note",                     text:"Phase: Future\nRequires regulatory API or export process design\nNot planned for MVP or Pilot" },
      { type:"action",  actor:"Regulator",text:"Requests waste transfer records\nfor a company, region, or material category" },
      { type:"system",  actor:"System",   text:"Generates compliance report:\n• Waste type & environmental classification\n• Volume / Weight transferred\n• Origin city · Destination city\n• Transfer date · Deal reference\n• CR# of both parties" },
      { type:"action",  actor:"Admin",    text:"Reviews report\nRedacts sensitive commercial data if needed\nExports to regulator (PDF / API)" },
      { type:"data",                      text:"Compliance record covers:\n• All completed deals within date range\n• Material category + volume aggregates\n• Company CR# + license status\n• Chain of custody (producer → buyer)" },
      { type:"state",                     text:"Compliance record delivered\nAudit trail preserved in platform" },
      { type:"note",                      text:"Gaps:\n• Material categories not mapped to env. codes yet\n• Volume in non-standard units across listings\n• No gov API integration\n• Legal framework for waste certificates needed" },
    ],
  },

  // 15 ─── Admin Oversight ────────────────────────────────────────────────────
  {
    name: "15 · Admin Oversight",
    phase: "Pilot Enhancement",
    actors: ["Admin", "System"],
    steps: [
      { type:"note",                     text:"Phase: Pilot Enhancement\nAdmin panel not built for MVP\nBasic admin needed before public pilot launch" },
      { type:"action",  actor:"Admin",   text:"Logs into admin panel\nViews platform overview:\n• Total companies · Active listings\n• Active deals · Flagged items" },
      { type:"action",  actor:"Admin",   text:"Reviews license submissions\n(companies with license_status: pending)" },
      { type:"decision", text:"License review decision",
        branches:[
          { ok:false, label:"Reject license", dest:"license_status → rejected\nCompany notified\nAccess to gated categories blocked" },
          { ok:true,  label:"Approve license",dest:"license_status → approved\nCompany notified · Full access unlocked" },
        ]
      },
      { type:"action",  actor:"Admin",   text:"Monitors listings for policy violations\nCan close / remove listing" },
      { type:"action",  actor:"Admin",   text:"Investigates reported issues\nCan intervene in deal state\nCan flag / suspend company" },
      { type:"action",  actor:"Admin",   text:"Reviews platform analytics:\nGMV · Completion rate · Material breakdown\nActive users · Offer conversion rate" },
      { type:"note",                     text:"Gap: No admin routes implemented in MVP\nAdmin must use Drizzle Studio or direct DB access\nNeeds: dedicated admin dashboard before pilot" },
    ],
  },

  // 16 ─── Issue Reporting ────────────────────────────────────────────────────
  {
    name: "16 · Issue Reporting",
    phase: "Future Phase",
    actors: ["User", "Admin", "System"],
    steps: [
      { type:"note",                     text:"Phase: Future\nNot built for MVP or Pilot\nDispute path for MVP: direct contact via shared phone" },
      { type:"action",  actor:"User",    text:"On active or completed deal panel\nClicks 'Report Issue'" },
      { type:"action",  actor:"User",    text:"Selects issue type:\n• Payment not received\n• Goods not delivered\n• Quality dispute\n• Quantity mismatch\n• Other" },
      { type:"action",  actor:"User",    text:"Submits description + optional evidence\n(photos · documents · screenshots)" },
      { type:"system",  actor:"System",  text:"Creates dispute record\nAdmins alerted\nDeal flagged: status → disputed" },
      { type:"action",  actor:"Admin",   text:"Investigates dispute\nContacts both parties\nReviews submitted evidence" },
      { type:"decision", text:"Admin resolution",
        branches:[
          { ok:false, label:"Escalate outside platform", dest:"Legal / manual process\nRecord preserved" },
          { ok:true,  label:"Resolved on platform",       dest:"Admin closes dispute\nDeal → resolved\nBoth parties notified" },
        ]
      },
      { type:"state",                    text:"Dispute resolved\nRecord preserved for compliance audit" },
    ],
  },

  // 17 ─── Edge Cases ─────────────────────────────────────────────────────────
  {
    name: "17 · Edge Cases",
    phase: "MVP / Built",
    actors: ["Buyer", "Producer", "System"],
    isEdgeCases: true,
    steps: [
      { type:"decision", text:"Listing closed with\nzero offers",
        branches:[{ ok:false, label:"Producer closes manually", dest:"status: closed · No deal created\nDisappears from marketplace · No notifications" }]
      },
      { type:"decision", text:"Producer manually\nrejects an offer",
        branches:[{ ok:false, label:"rejection_reason required", dest:"Offer → rejected · Buyer notified\nCannot re-bid on this listing (409 OfferRejected)" }]
      },
      { type:"decision", text:"Buyer withdraws\ntheir offer",
        branches:[{ ok:true, label:"Offer status = pending", dest:"status: withdrawn\nBuyer CAN re-submit later\n(price must beat current max)" }]
      },
      { type:"decision", text:"Rejected buyer tries\nto re-submit",
        branches:[{ ok:false, label:"Offer status = rejected", dest:"❌ 409 OfferRejected\nPermanently blocked on this listing" }]
      },
      { type:"decision", text:"Buyer bids on\nown listing",
        branches:[{ ok:false, label:"buyer_company_id = listing.company_id", dest:"❌ 403 Forbidden · Self-bidding blocked" }]
      },
      { type:"decision", text:"Duplicate offer\nsubmission",
        branches:[{ ok:false, label:"Buyer already has a pending offer", dest:"❌ 409 OfferExists\nUse PUT /offers/mine to improve instead" }]
      },
      { type:"decision", text:"User stops mid-onboarding\n(closes browser after Clerk)",
        branches:[{ ok:false, label:"Before submitting onboarding form", dest:"No company record created\nNext login: redirected back to /onboarding" }]
      },
      { type:"decision", text:"Deal goes inactive\n(neither party acts)",
        branches:[{ ok:false, label:"No timeout mechanism (MVP gap)", dest:"⚠ Deal stays in current state indefinitely\nNeeds Decision: expiry / escalation policy" }]
      },
      { type:"decision", text:"Buyer tries to confirm-receipt\nbefore dispatch",
        branches:[{ ok:false, label:"deal.status ≠ dispatched", dest:"❌ 400 Bad Request\nInvalid state transition blocked" }]
      },
    ],
  },
];

// ─── Assemble file ────────────────────────────────────────────────────────────
const pages = [buildMasterMap(), ...FLOWS.map(f => buildDetailPage(f))];
const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<mxfile host="app.diagrams.net" version="21.0.0">`,
  ...pages,
  `</mxfile>`,
].join("\n");

writeFileSync("tadweerah-workflows-v2.drawio", xml);
console.log(`✓ tadweerah-workflows-v2.drawio written (${pages.length} pages)`);
