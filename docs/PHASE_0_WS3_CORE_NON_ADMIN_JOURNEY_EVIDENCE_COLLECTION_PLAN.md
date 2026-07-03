# WS3 — Core Non-Admin Journey Evidence Collection Plan

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**Status: PLAN ONLY. WS3 has not started. Do not open the browser, log in, create listings, submit offers, create deals, upload payment proof, create shipments, or complete any transaction until the founder explicitly approves execution.**

**WS2 status (context):** Closed for core non-admin Generator/Receiver journeys, with documented limitations — see `docs/PHASE_0_WS2_ACCOUNT_PROVISIONING_EXECUTION_LOG.md` §8.

---

## 1. WS3 Objective

Exercise the core non-admin marketplace flow end-to-end using the two already-confirmed test accounts, to (a) verify which parts of the platform map from Phase 0's file/code audit are actually reachable and working in the live product, and (b) extend the bilingual/data-display findings from WS2 registration into the transactional layer (listings, offers, deals), where they haven't been tested yet. This is evidence collection only — no fixes, no admin actions, no real transactions.

## 2. Accounts and Roles to Use

Only the two accounts already confirmed in WS2. No new accounts will be created in WS3 unless a specific step is found to require one, in which case execution pauses and asks (see Section 8/9).

| Account | Role in this plan | Company name (as actually registered) | Email (as actually registered) | Language |
|---|---|---|---|---|
| **Generator Co** | Seller / generator side | "شركة تجريبية (١)" | `mmuaibed+seller2@outlook.com` | Arabic |
| **Receiver Co** | Buyer / receiver side | "Test recycler company" | `mmuaibed+buyer3@outlook.com` | English |

## 3. Journey Sequence

1. **Generator Co logs in** (Arabic) → dashboard baseline check.
2. **Listing creation** — Generator Co creates one test material listing, clearly tagged (`[PHASE0-AUDIT]` prefix in the listing title/description), small/fake quantity.
3. **Receiver Co logs in** (English) → **marketplace browsing** — locate the listing created in Step 2.
4. **Offer submission** — Receiver Co submits one offer on that listing.
5. **Offer review/acceptance** — Generator Co reviews and accepts the offer → **deal formation**, if reachable.
6. **Payment proof step**, if reachable — Receiver Co submits proof, Generator Co confirms. No real payment will be made or referenced.
7. **Transport/shipment step**, if reachable **without** creating a transporter account — if the flow blocks and genuinely requires a separate transporter identity, **stop and ask** rather than creating Transporter Co unilaterally.
8. **Receipt/completion step**, if reachable — Receiver Co confirms receipt, closing the deal's state machine.
9. Throughout: deliberate **cross-language spot-checks** (Section 7) at each screen where one party's data is viewed by the other party in a different UI language.

## 4. Evidence Required Per Step

For each numbered step above:
- One screenshot showing the action/result.
- One run-log entry: role, language, timestamp, purpose, route/URL, expected-vs-observed note.
- Evidence tier tag: `[Browser-observed — WS3]`, and `[Unexpected]` for anything that contradicts the WS1 code-mapping or WS2 findings (flagged for founder review, not silently resolved).

## 5. What Screenshots/Logs to Capture

Reuse the existing evidence structure, no new folders needed beyond what already exists:
- `docs/phase-0-audit/evidence/screenshots/generator-seller/` — Generator Co's side of every step.
- `docs/phase-0-audit/evidence/screenshots/receiver-buyer/` — Receiver Co's side of every step.
- `docs/phase-0-audit/evidence/screenshots/transporter/` — only if the transport step is reached without a dedicated account (e.g., if Generator or Receiver can self-serve a transport request).
- `docs/phase-0-audit/evidence/run-logs/` — one entry per session/step, following the established role/language/timestamp/purpose format.
- **No screenshot will include an OTP, password, IP address, or geolocation** — login screens will be captured only after authentication completes, not during credential/verification entry, per the WS2 hygiene lesson.

## 6. Values to Track for Future WS5 Source-of-Truth Mapping

To make WS5 (source-of-truth mapping) easier later, WS3 will record, at each step:
- Any auto-generated reference/ID shown (e.g., a listing ID, deal reference like `TDW-CTR-####-####`, offer ID) — exact string as displayed.
- The exact **status label** shown in the UI at each stage (e.g., whatever Arabic/English word appears for "active," "payment submitted," "dispatched," "completed") vs. the code-level state name from WS1 (`active`, `payment_submitted`, `payment_confirmed`, `dispatched`, `receipt_pending`, `completed`) — to check whether UI labels and code states line up 1:1 or diverge.
- Any quantity/weight figures shown at different screens for the same deal (directly extending the WS1 "40/35/5" received-vs-distributed-vs-remaining discrepancy into this account's own data, if the flow reaches sustainability-adjacent screens).
- Currency/amount formatting and units as displayed.
- Which language each auto-generated string (IDs, system-generated notifications, default statuses) renders in, regardless of the viewer's UI language setting — extending the WS2 bilingual finding.

## 7. Arabic/English Checks

- Generator Co's listing will be created while its own UI is set to Arabic. Receiver Co will then view that same listing with its UI set to English — check whether the listing title/description/company name display correctly, partially, or not at all (direct extension of the WS2 dashboard finding to listings).
- Symmetric check: if Receiver Co's offer includes any free-text field, check how it renders back to Generator Co in Arabic.
- Check status labels, notifications, and any auto-generated deal/offer reference strings for language consistency at each step.
- Deliberate one-time language toggle by each account mid-journey (as was done in WS2) to re-confirm the bilingual-display issue persists (or doesn't) at the transactional layer, not just onboarding/dashboard.

## 8. Stop Conditions

Execution stops and asks the founder immediately if:
- A step requires an account that doesn't exist yet (transporter, team roles) — **do not create one unilaterally**, per the founder's explicit instruction for this plan.
- Any screen requests a real payment, a real document upload of a sensitive nature, or anything that would leave real financial/commercial residue.
- Any real-named company/partner record appears anywhere (search results, matching suggestions, counterpart names) — stop before interacting with it in any way. No "Al Qaryan" or other real partner/customer data will be used, searched for, or engaged with.
- Any unexpected redirect away from `tadweerah.com` (e.g., back to the broken `tadweerah-staging.web.app`, or to unapproved infrastructure).
- Any admin-adjacent screen or action becomes reachable from a non-admin account — this itself is a finding to report immediately, not a step to continue past.
- Cloudflare Turnstile or similar bot-protection appears on any authenticated screen — stop rather than attempt any workaround, consistent with the WS2 decision.
- Any screen unexpectedly requests information that looks like it could expose secrets, tokens, or another real user's data.

## 9. Actions Requiring Founder Approval During WS3

- **Starting WS3 execution at all** (this plan itself).
- **Creating any new account** (Transporter Co, Team Admin, Team Member) if a step turns out to require one.
- **Proceeding past the payment proof step**, even though no real payment is involved — flagging it as a natural checkpoint given it's the most "transaction-like" of the steps.
- **Proceeding into the transport/shipment step**, since its exact UI path hasn't been observed live yet and may reveal it needs a role this plan doesn't currently have approval to create.
- **Any step where an unexpected/real-looking record appears** (per Section 8).

## 10. Recommendation: One Full Journey or Smaller Batches?

**Recommend splitting into two batches, with a checkpoint in between**, rather than running steps 1–8 as one continuous session:

- **Batch A (lower uncertainty, recommend approving together):** Steps 1–5 — Generator login, listing creation, marketplace browsing, offer submission, offer acceptance/deal formation. These are all code-confirmed, non-financial, and don't risk needing a new account.
- **Checkpoint:** report back what was found in Batch A (especially whether a deal actually reaches `active` state, and the bilingual-display results from Section 7) before continuing.
- **Batch B (higher uncertainty, recommend separate approval):** Steps 6–8 — payment proof, transport/shipment, receipt/completion. These are exactly the steps most likely to hit a stop condition (need a transporter account, encounter an unfamiliar screen, or reach something that feels transaction-like even in test form) — worth the founder reviewing Batch A's results first before authorizing this batch.

This mirrors the staged-approval pattern used successfully throughout WS2 and keeps each checkpoint small enough to review quickly.

---

## Hard Limits (unchanged, restated)

No code edits. No commits. No deploy. No DB access. No Clerk/config changes. No secrets/OTP/IP/geolocation reproduction. No real company names. **Do not start WS3 until the founder explicitly approves — this document is a plan only.**

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This is a planning document only. No browser was opened, no login was performed, no listings/offers/deals were created, and no code/DB/Clerk changes were made to produce this plan.*
