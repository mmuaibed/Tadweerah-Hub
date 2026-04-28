import { useState } from "react";

type StepType = "action" | "system" | "state" | "error" | "decision" | "note";

interface Step {
  type: StepType;
  text: string;
  branches?: Array<{ label: string; dest: string; ok?: boolean }>;
}

interface Flow {
  id: string;
  label: string;
  subtitle: string;
  steps: Step[];
}

const flows: Flow[] = [
  {
    id: "onboarding",
    label: "1 · User Onboarding",
    subtitle: "New user → creates company profile",
    steps: [
      { type: "action",   text: "User visits home page → clicks 'ابدأ الآن'" },
      { type: "system",   text: "Redirected to Clerk sign-up / sign-in" },
      { type: "action",   text: "User creates account (email + password or OAuth)" },
      { type: "system",   text: "Clerk issues JWT · App detects: no company → redirect to /onboarding" },
      { type: "action",   text: "Onboarding form:\nName · City · Phone · CR# · Category\nBusiness Actions (multi-select) · License# (optional) · T&C checkbox" },
      {
        type: "decision",
        text: "Validation",
        branches: [
          { label: "Required field empty or T&C unchecked", dest: "Show error → user stays on form", ok: false },
          { label: "All valid", dest: "Submit", ok: true },
        ],
      },
      { type: "system",   text: "POST /api/companies\n→ Creates company record\n→ Saves action_ids\n→ license_number provided? set license_status: pending\n→ Sets accepted_terms_at timestamp" },
      { type: "state",    text: "✓ Company created → redirect to /dashboard" },
      { type: "note",     text: "Future logins: JWT has company → skip onboarding → go directly to /dashboard" },
    ],
  },

  {
    id: "create-listing",
    label: "2 · Create Listing",
    subtitle: "Producer publishes waste material",
    steps: [
      { type: "action",   text: "Producer clicks 'نشر إعلان جديد' from Dashboard" },
      { type: "action",   text: "Fills form: Material · Quantity · Unit · City · Price hint (optional) · Description · Image (optional)" },
      { type: "action",   text: "Selects: Sale Type (Auction / Direct Sale) · Pricing model (Fixed / By Weight / Revenue Share)" },
      { type: "note",     text: "Auction = buyers compete by price | Direct = fixed price (first valid buyer wins)" },
      { type: "action",   text: "Optional: Required buyer capabilities · Targeting (Open / By Category / Specific Company)" },
      { type: "system",   text: "POST /api/listings\n→ ZERO eligibility checks (charter rule — always allowed)\n→ Creates waste_listings record · status: open\n→ Saves required_service_ids + targeting\n→ If specific_company → notifies target company" },
      { type: "state",    text: "✓ Listing open → appears in /marketplace feed" },
      { type: "note",     text: "Producer can close listing at any time → PUT /listings/:id/close" },
    ],
  },

  {
    id: "submit-offer",
    label: "3 · Submit Offer",
    subtitle: "Buyer places a bid on a listing",
    steps: [
      { type: "action",   text: "Buyer browses /marketplace → clicks listing → views listing detail" },
      { type: "action",   text: "Enters price_per_unit + optional message → submits offer" },
      { type: "system",   text: "POST /api/listings/:id/offers — runs 4 eligibility gates:" },
      {
        type: "decision",
        text: "Gate 1 · Targeting",
        branches: [
          { label: "specific_company → buyer not the target", dest: "❌ 403 TargetingRestricted", ok: false },
          { label: "category-targeted → buyer's category not in list", dest: "❌ 403 TargetingRestricted", ok: false },
          { label: "Open listing (or passes)", dest: "→ Gate 2", ok: true },
        ],
      },
      {
        type: "decision",
        text: "Gate 2 · Required Services",
        branches: [
          { label: "Buyer lacks required capability", dest: "❌ 403 MissingCapability", ok: false },
          { label: "Capability requires license · buyer not approved", dest: "❌ 403 LicenseRequired", ok: false },
          { label: "All capabilities met", dest: "→ Gate 3", ok: true },
        ],
      },
      {
        type: "decision",
        text: "Gate 3 · Sensitive Material",
        branches: [
          { label: "material_category.is_sensitive + buyer not licensed", dest: "❌ 403 LicenseRequired", ok: false },
          { label: "Not sensitive or buyer approved", dest: "→ Gate 4", ok: true },
        ],
      },
      {
        type: "decision",
        text: "Gate 4 · Price",
        branches: [
          { label: "price ≤ current highest offer", dest: "❌ 400 PriceTooLow", ok: false },
          { label: "price > current highest (or first offer)", dest: "→ Save", ok: true },
        ],
      },
      { type: "system",   text: "Offer saved · status: pending\n→ Previous top bidder notified (outbid)\n→ Producer notified (new offer received)" },
      { type: "state",    text: "✓ Offer active · rank #1 if highest price" },
    ],
  },

  {
    id: "bidding",
    label: "4 · Bidding Logic",
    subtitle: "How buyers compete and improve offers",
    steps: [
      { type: "action",   text: "Buyer A submits first offer at price X" },
      { type: "state",    text: "Buyer A: rank #1 · total offers: 1" },
      { type: "action",   text: "Buyer B submits offer Y where Y > X" },
      { type: "system",   text: "Buyer A outbid → receives notification\nBuyer B: rank #1 · Buyer A: rank #2" },
      { type: "action",   text: "Buyer A wants to improve → PUT /listings/:id/offers/mine" },
      {
        type: "decision",
        text: "Was Buyer A already the top bidder?",
        branches: [
          { label: "Yes (was #1 before improvement attempt)", dest: "⚠ already_top=true returned · Buyer must send explicit_self_improve=true to confirm", ok: false },
          { label: "No", dest: "→ Price check", ok: true },
        ],
      },
      {
        type: "decision",
        text: "New price check",
        branches: [
          { label: "New price ≤ current highest", dest: "❌ 400 PriceTooLow", ok: false },
          { label: "New price > current highest", dest: "→ Offer updated", ok: true },
        ],
      },
      { type: "action",   text: "Producer reviews ranked offer list on listing detail" },
      { type: "action",   text: "Producer accepts best offer → PUT /offers/:id/accept" },
      { type: "system",   text: "Accepted offer → status: accepted\nAll other pending offers → auto-rejected (reason: 'offer_accepted')\nAll rejected buyers notified\nListing → status: closed\nDeal record auto-created (status: active)" },
      { type: "state",    text: "✓ Deal created → both parties enter deal lifecycle" },
    ],
  },

  {
    id: "deal",
    label: "5 · Deal Lifecycle",
    subtitle: "Accepted offer → completed deal",
    steps: [
      { type: "state",    text: "Deal created · status: active\nBoth parties can view deal panel" },
      { type: "note",     text: "Deal panel shows: counterparty name + phone, estimated amount, settlement type, timeline" },
      { type: "action",   text: "Buyer transfers payment (offline bank transfer)" },
      { type: "action",   text: "Producer confirms payment received:\nPOST /deals/:id/confirm-payment\n• payment_reference (required) — bank transfer / transaction ID\n• payment_proof_url (optional) — document URL\n• by_weight deals: actual_quantity also required" },
      { type: "system",   text: "status → payment_confirmed\nBuyer notified: payment acknowledged · awaiting dispatch" },
      { type: "action",   text: "Producer ships goods →\nPOST /deals/:id/confirm-dispatch" },
      { type: "system",   text: "status → dispatched\nBuyer notified: goods shipped · please confirm receipt" },
      { type: "action",   text: "Buyer receives goods →\nPOST /deals/:id/confirm-receipt" },
      { type: "system",   text: "status → completed\nProducer notified: deal complete" },
      { type: "state",    text: "✓ Deal completed · counted in completed_deals + total_deal_value\nAppears in /reports stats" },
    ],
  },

  {
    id: "edge-cases",
    label: "6 · Edge Cases",
    subtitle: "Rejection, no offers, withdrawal",
    steps: [
      {
        type: "decision",
        text: "Producer manually rejects offer",
        branches: [
          { label: "rejection_reason required", dest: "Offer → rejected · Buyer notified · Cannot re-submit on this listing (409 OfferRejected)", ok: false },
        ],
      },
      {
        type: "decision",
        text: "Another offer is accepted",
        branches: [
          { label: "All other pending offers", dest: "Auto-rejected (reason: 'offer_accepted') · All rejected buyers notified", ok: false },
        ],
      },
      {
        type: "decision",
        text: "Listing closed with zero offers",
        branches: [
          { label: "Producer closes manually", dest: "status: closed · No deal created · Disappears from marketplace · No notifications", ok: false },
        ],
      },
      {
        type: "decision",
        text: "Buyer withdraws offer",
        branches: [
          { label: "Offer is pending", dest: "status: withdrawn · Buyer can re-submit later (price must still exceed current max)", ok: true },
        ],
      },
      {
        type: "decision",
        text: "Buyer already rejected tries to re-submit",
        branches: [
          { label: "Offer status = rejected", dest: "❌ 409 OfferRejected — blocked permanently on this listing", ok: false },
        ],
      },
      {
        type: "decision",
        text: "Buyer tries to bid on own listing",
        branches: [
          { label: "buyer company = listing owner", dest: "❌ 403 Forbidden — self-bidding blocked", ok: false },
        ],
      },
      {
        type: "decision",
        text: "Buyer has already submitted (pending offer exists)",
        branches: [
          { label: "Duplicate offer attempt", dest: "❌ 409 OfferExists — use PUT /offers/mine to improve instead", ok: false },
        ],
      },
    ],
  },
];

const stepStyles: Record<StepType, { border: string; bg: string; badge: string; badgeText: string; dot: string }> = {
  action:   { border: "border-blue-200",  bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",    badgeText: "User Action",   dot: "bg-blue-400" },
  system:   { border: "border-gray-200",  bg: "bg-gray-50",   badge: "bg-gray-100 text-gray-600",    badgeText: "System",        dot: "bg-gray-400" },
  state:    { border: "border-green-200", bg: "bg-green-50",  badge: "bg-green-100 text-green-700",  badgeText: "State",         dot: "bg-green-500" },
  error:    { border: "border-red-200",   bg: "bg-red-50",    badge: "bg-red-100 text-red-700",      badgeText: "Error",         dot: "bg-red-500" },
  decision: { border: "border-amber-200", bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-700",  badgeText: "Decision",      dot: "bg-amber-400" },
  note:     { border: "border-violet-200",bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700",badgeText: "Note",          dot: "bg-violet-400" },
};

export default function WorkflowDiagrams() {
  const [active, setActive] = useState(0);
  const flow = flows[active];

  return (
    <div className="flex h-screen bg-white font-sans text-sm overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Tadweerah</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">Workflow Diagrams</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {flows.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActive(i)}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                i === active
                  ? "bg-white border-r-2 border-blue-500 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-white hover:text-gray-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </nav>
        {/* Legend */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Legend</p>
          {(Object.entries(stepStyles) as [StepType, typeof stepStyles[StepType]][]).map(([type, s]) => (
            <div key={type} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-[11px] text-gray-600">{s.badgeText}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-4">
          <h1 className="text-base font-bold text-gray-900">{flow.label}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{flow.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="px-8 py-6 max-w-3xl">
          {flow.steps.map((step, idx) => {
            const s = stepStyles[step.type];
            return (
              <div key={idx} className="relative">
                {/* Step card */}
                <div className={`rounded-lg border ${s.border} ${s.bg} px-4 py-3`}>
                  {/* Badge */}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold mb-1.5 ${s.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.badgeText}
                  </span>
                  {/* Text — handle newlines */}
                  <div className="text-xs font-medium text-gray-800 whitespace-pre-line leading-relaxed">
                    {step.text}
                  </div>
                  {/* Branches */}
                  {step.branches && step.branches.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-amber-100 pt-3">
                      {step.branches.map((b, bi) => (
                        <div key={bi} className="flex gap-2">
                          <span className={`mt-0.5 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${b.ok === false ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                            {b.ok === false ? "✗" : "✓"}
                          </span>
                          <div className="text-[11px] text-gray-700 leading-snug">
                            <span className="text-gray-400">{b.label}</span>
                            <span className="mx-1.5 text-gray-300">→</span>
                            <span className={b.ok === false ? "text-red-600" : "text-green-700"}>{b.dest}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow connector (not after last) */}
                {idx < flow.steps.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="flex flex-col items-center gap-0">
                      <div className="w-px h-3 bg-gray-200" />
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M5 6L0 0H10L5 6Z" fill="#d1d5db" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
