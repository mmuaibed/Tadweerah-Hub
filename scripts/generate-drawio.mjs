import { writeFileSync } from "fs";

// ─── Flow data ────────────────────────────────────────────────────────────────
const flows = [
  {
    name: "1 · User Onboarding",
    steps: [
      { type: "action",   text: "User visits home page\nclicks 'ابدأ الآن'" },
      { type: "system",   text: "Redirect to Clerk sign-up / sign-in" },
      { type: "action",   text: "User creates account\n(email + password or OAuth)" },
      { type: "system",   text: "Clerk issues JWT\nApp detects: no company → redirect /onboarding" },
      { type: "action",   text: "Onboarding form:\nName · City · Phone · CR# · Category\nBusiness Actions (multi-select) · License# (opt) · T&C checkbox" },
      { type: "decision", text: "Validation",
        branches: [
          { ok: false, label: "Required field empty\nor T&C unchecked",  dest: "Show error\nUser stays on form" },
          { ok: true,  label: "All valid",                                dest: null },
        ]
      },
      { type: "system",   text: "POST /api/companies\n→ Creates company record + action_ids\n→ license_number? → license_status: pending\n→ Sets accepted_terms_at timestamp" },
      { type: "state",    text: "✓ Company created\nRedirect → /dashboard" },
      { type: "note",     text: "Future logins: JWT has company\n→ skip onboarding → go to /dashboard" },
    ],
  },

  {
    name: "2 · Create Listing",
    steps: [
      { type: "action",   text: "Producer clicks\n'نشر إعلان جديد' from Dashboard" },
      { type: "action",   text: "Fills form:\nMaterial · Quantity · Unit · City\nPrice hint (opt) · Description · Image (opt)" },
      { type: "action",   text: "Selects: Sale Type (Auction / Direct)\nPricing model (Fixed / By Weight / Revenue Share)" },
      { type: "note",     text: "Auction = buyers compete by price\nDirect = first valid buyer wins" },
      { type: "action",   text: "Optional:\nRequired buyer capabilities\nTargeting: Open / By Category / Specific Company" },
      { type: "system",   text: "POST /api/listings\n→ ZERO eligibility checks (charter rule)\n→ Creates waste_listings · status: open\n→ If specific_company → notifies target" },
      { type: "state",    text: "✓ Listing open\nVisible in /marketplace" },
      { type: "note",     text: "Producer can close anytime\nPUT /listings/:id/close" },
    ],
  },

  {
    name: "3 · Submit Offer",
    steps: [
      { type: "action",   text: "Buyer browses /marketplace\nclicks listing → views detail" },
      { type: "action",   text: "Enters price_per_unit + optional message\nclicks Submit Offer" },
      { type: "system",   text: "POST /api/listings/:id/offers\n4 eligibility gates run:" },
      { type: "decision", text: "Gate 1\nTargeting",
        branches: [
          { ok: false, label: "specific_company &\nbuyer not the target",          dest: "❌ 403 TargetingRestricted" },
          { ok: false, label: "category-targeted &\nbuyer's category not in list", dest: "❌ 403 TargetingRestricted" },
          { ok: true,  label: "Open or passes",                                    dest: null },
        ]
      },
      { type: "decision", text: "Gate 2\nRequired Services",
        branches: [
          { ok: false, label: "Buyer lacks capability",               dest: "❌ 403 MissingCapability" },
          { ok: false, label: "Capability needs license,\nnot approved", dest: "❌ 403 LicenseRequired" },
          { ok: true,  label: "All capabilities met",                 dest: null },
        ]
      },
      { type: "decision", text: "Gate 3\nSensitive Material",
        branches: [
          { ok: false, label: "is_sensitive material &\nbuyer not licensed", dest: "❌ 403 LicenseRequired" },
          { ok: true,  label: "Not sensitive or approved",                   dest: null },
        ]
      },
      { type: "decision", text: "Gate 4\nPrice",
        branches: [
          { ok: false, label: "price ≤ current highest", dest: "❌ 400 PriceTooLow" },
          { ok: true,  label: "price > current highest\n(or first offer)",  dest: null },
        ]
      },
      { type: "system",   text: "Offer saved · status: pending\n→ Previous top bidder notified (outbid)\n→ Producer notified (new offer)" },
      { type: "state",    text: "✓ Offer active\nRank #1 if highest price" },
    ],
  },

  {
    name: "4 · Bidding Logic",
    steps: [
      { type: "action",   text: "Buyer A submits first offer at price X" },
      { type: "state",    text: "Buyer A: rank #1 · total offers: 1" },
      { type: "action",   text: "Buyer B submits offer Y where Y > X" },
      { type: "system",   text: "Buyer A outbid → notification sent\nBuyer B: rank #1 · Buyer A: rank #2" },
      { type: "action",   text: "Buyer A clicks Improve Offer\nPUT /listings/:id/offers/mine" },
      { type: "decision", text: "Was Buyer A already\ntop bidder?",
        branches: [
          { ok: false, label: "Yes (was #1 before)",  dest: "⚠ already_top=true returned\nMust send explicit_self_improve=true\nto confirm" },
          { ok: true,  label: "No",                   dest: null },
        ]
      },
      { type: "decision", text: "New price check",
        branches: [
          { ok: false, label: "New price ≤ current highest", dest: "❌ 400 PriceTooLow" },
          { ok: true,  label: "New price > current highest", dest: null },
        ]
      },
      { type: "action",   text: "Producer reviews ranked offer list\non listing detail page" },
      { type: "action",   text: "Producer accepts best offer\nPUT /offers/:id/accept" },
      { type: "system",   text: "Accepted offer → status: accepted\nAll other pending → auto-rejected (offer_accepted)\nAll rejected buyers notified\nListing → status: closed\nDeal record auto-created · status: active" },
      { type: "state",    text: "✓ Deal created\nBoth parties enter deal lifecycle" },
    ],
  },

  {
    name: "5 · Deal Lifecycle",
    steps: [
      { type: "state",    text: "Deal created · status: active\nBoth parties can view deal panel" },
      { type: "note",     text: "Deal panel shows: counterparty name + phone\nestimated amount · settlement type · timeline" },
      { type: "action",   text: "Buyer transfers payment\n(offline bank transfer)" },
      { type: "action",   text: "Producer confirms payment received\nPOST /deals/:id/confirm-payment\n• payment_reference (required) — bank/transfer ID\n• payment_proof_url (optional)\n• by_weight deals: actual_quantity required" },
      { type: "system",   text: "status → payment_confirmed\nBuyer notified: payment acknowledged\nawaiting dispatch" },
      { type: "action",   text: "Producer ships goods\nPOST /deals/:id/confirm-dispatch" },
      { type: "system",   text: "status → dispatched\nBuyer notified: goods shipped\nplease confirm receipt" },
      { type: "action",   text: "Buyer receives goods\nPOST /deals/:id/confirm-receipt" },
      { type: "system",   text: "status → completed\nProducer notified: deal complete" },
      { type: "state",    text: "✓ Deal completed\nCounted in completed_deals + total_deal_value\nAppears in /reports" },
    ],
  },

  {
    name: "6 · Edge Cases",
    steps: [
      { type: "decision", text: "Producer manually\nrejects offer",
        branches: [
          { ok: false, label: "rejection_reason required", dest: "Offer → rejected\nBuyer notified\nCannot re-submit on this listing (409)" },
        ]
      },
      { type: "decision", text: "Another offer\nis accepted",
        branches: [
          { ok: false, label: "All other pending offers", dest: "Auto-rejected (offer_accepted)\nAll buyers notified" },
        ]
      },
      { type: "decision", text: "Listing closed\nwith 0 offers",
        branches: [
          { ok: false, label: "Producer closes manually", dest: "status: closed\nNo deal created\nDisappears from marketplace" },
        ]
      },
      { type: "decision", text: "Buyer withdraws\noffer",
        branches: [
          { ok: true, label: "Offer is pending", dest: "status: withdrawn\nBuyer can re-submit later\n(price must exceed current max)" },
        ]
      },
      { type: "decision", text: "Rejected buyer\ntries to re-submit",
        branches: [
          { ok: false, label: "Offer status = rejected", dest: "❌ 409 OfferRejected\nBlocked permanently on this listing" },
        ]
      },
      { type: "decision", text: "Buyer bids on\nown listing",
        branches: [
          { ok: false, label: "buyer company = listing owner", dest: "❌ 403 Forbidden\nSelf-bidding blocked" },
        ]
      },
      { type: "decision", text: "Buyer already has\npending offer",
        branches: [
          { ok: false, label: "Duplicate offer attempt", dest: "❌ 409 OfferExists\nUse PUT /offers/mine to improve" },
        ]
      },
    ],
  },
];

// ─── Style constants ──────────────────────────────────────────────────────────
const STYLES = {
  action:   "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=11;align=center;",
  system:   "rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#999999;fontSize=11;align=center;",
  state:    "rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=11;fontStyle=1;align=center;",
  error:    "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=11;align=center;",
  decision: "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=11;align=center;",
  note:     "rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;dashed=1;fontSize=11;align=center;",
  branch_no:"rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;align=center;",
  branch_yes:"rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=10;align=center;",
  edge:     "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;fontSize=10;",
  edge_no:  "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#b85450;fontColor=#b85450;fontSize=10;",
  edge_yes: "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#82b366;fontColor=#82b366;fontSize=10;",
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const BOX_W = 320;
const BOX_X = 80;          // left edge of main column
const BOX_CX = BOX_X + BOX_W / 2;   // center x = 240
const DIA_W  = 220;
const DIA_H  = 80;
const DIA_X  = BOX_CX - DIA_W / 2;  // center diamond
const BRANCH_X = BOX_X + BOX_W + 60; // 520
const BRANCH_W = 280;
const V_GAP  = 28;         // gap between consecutive main nodes
const B_GAP  = 10;         // gap between branch boxes

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#xa;");
}

// ─── Line-count height estimator ──────────────────────────────────────────────
function boxHeight(text, base = 52) {
  const lines = String(text).split("\n").length;
  return Math.max(base, 28 + lines * 18);
}

// ─── Single flow XML builder ──────────────────────────────────────────────────
function buildFlow(flow, pageId) {
  let cellId = pageId * 10000 + 2;
  const cells = [];
  const rootCells = [
    `<mxCell id="${pageId * 10000 + 0}" />`,
    `<mxCell id="${pageId * 10000 + 1}" parent="${pageId * 10000 + 0}" />`,
  ];
  const parent = `${pageId * 10000 + 1}`;

  function addCell(val, style, x, y, w, h) {
    const id = cellId++;
    cells.push(
      `<mxCell id="${id}" value="${escXml(val)}" style="${style}" vertex="1" parent="${parent}">` +
      `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`
    );
    return id;
  }

  function addEdge(src, tgt, label = "", style = STYLES.edge) {
    const id = cellId++;
    cells.push(
      `<mxCell id="${id}" value="${escXml(label)}" style="${style}" edge="1" source="${src}" target="${tgt}" parent="${parent}">` +
      `<mxGeometry relative="1" as="geometry"/></mxCell>`
    );
    return id;
  }

  let y = 40;
  let prevId = null;

  for (let si = 0; si < flow.steps.length; si++) {
    const step = flow.steps[si];

    if (step.type === "decision") {
      const h = DIA_H;
      const diaId = addCell(step.text, STYLES.decision, DIA_X, y, DIA_W, h);
      if (prevId !== null) addEdge(prevId, diaId);

      // ── Branch boxes to the right ──
      const falseBranches = step.branches.filter(b => b.dest !== null);
      let by = y;
      let lastBranchId = null;

      for (let bi = 0; bi < falseBranches.length; bi++) {
        const b = falseBranches[bi];
        const bh = boxHeight(b.dest, 46);
        // label box
        const labelH = boxHeight(b.label, 36);
        const labelId = addCell(b.label, b.ok === false ? STYLES.branch_no : STYLES.branch_yes,
          BRANCH_X, by + (bh - labelH) / 2, BRANCH_W - 80, labelH);
        addEdge(diaId, labelId, b.ok === false ? "No" : "Yes",
          b.ok === false ? STYLES.edge_no : STYLES.edge_yes);
        // dest box
        if (b.dest) {
          const destId = addCell(b.dest, b.ok === false ? STYLES.branch_no : STYLES.branch_yes,
            BRANCH_X + BRANCH_W - 80 + 20, by, BRANCH_W, bh);
          addEdge(labelId, destId, "", b.ok === false ? STYLES.edge_no : STYLES.edge_yes);
          lastBranchId = destId;
        }
        by += Math.max(bh, labelH) + B_GAP;
      }

      // ── How much y to advance ──
      const branchesHeight = by - y;
      y += Math.max(h, branchesHeight) + V_GAP;
      prevId = diaId;

    } else {
      const h = boxHeight(step.text);
      const id = addCell(step.text, STYLES[step.type], BOX_X, y, BOX_W, h);
      if (prevId !== null) addEdge(prevId, id);
      prevId = id;
      y += h + V_GAP;
    }
  }

  return [
    `<diagram id="page-${pageId}" name="${escXml(flow.name)}">`,
    `<mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">`,
    `<root>`,
    ...rootCells,
    ...cells,
    `</root></mxGraphModel></diagram>`,
  ].join("\n");
}

// ─── Assemble full .drawio file ───────────────────────────────────────────────
const diagrams = flows.map((f, i) => buildFlow(f, i + 1)).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" version="21.0.0">\n${diagrams}\n</mxfile>`;

writeFileSync("tadweerah-workflows.drawio", xml);
console.log("✓ tadweerah-workflows.drawio written");
