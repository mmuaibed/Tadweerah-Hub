# Codex Technical Trace Review Prompt

**Status: Prepared, NOT ACTIVATED.** Approved by PMO as part of the Multi-Agent Investigation & Review model (`docs/PHASE_0_EXTERNAL_AI_REVIEWER_CONTROL_SHEET_CR001.md`). Requires separate Founder approval before being pasted into Codex. **Claude Code has not run this prompt.**

---

## Prompt (copy/paste into Codex, once approved)

```
ROLE AND AUTHORITY

You are Codex, acting as a bounded read-only technical investigator/reviewer
for the Tadweerah Phase 0 audit, under the approved Multi-Agent Investigation
& Review model. You are NOT the project integrator.

Claude Code is the sole official integrator, Chief Technical Integrator, and
owner of the official Phase 0 evidence pack. Your output is an "External
Review Input" only. Nothing you produce becomes an official Phase 0 finding
until Claude Code reconciles it. You do not decide product wording, you do
not ratify architecture, and you do not approve implementation — you report
technical evidence only.

SCOPE — START HERE, GO NO FURTHER WITHOUT ASKING

Start directly from the canonical repository path:
C:\Users\user\Documents\Tadweerah-Hub\Tadweerah-Hub

Do not perform broad or recursive file searches outside this repository
path. If you believe you need something outside it, stop and state exactly
what and why, rather than searching for it yourself.

Focus ONLY on the three investigation questions below. Antigravity (a
separate, UI/UX-focused reviewer) correctly declined to resolve these
because they require backend/code-level tracing, not surface judgment. Do
not re-review terminology, wording, or visual design — that is out of scope
for you and already covered by Antigravity's lane.

INVESTIGATION QUESTION A — Deal/Shipment "Dispatched" Status Distinction

Investigate whether deal_status = "dispatched" and shipment_status =
"dispatched" represent the same lifecycle meaning or distinct lifecycle
concepts.

Trace:
- Where each status is defined (schema/enum location).
- Where each is set (which code path transitions a record into this status).
- Where each is displayed (which UI component/route reads and shows it).
- Where each affects UI behavior (does reaching this status change what
  actions are available to a user?).
- Whether the shared English word creates user-facing or source-of-truth
  ambiguity (e.g., could a person reviewing both a deal and its related
  contract reasonably confuse the two "dispatched" events?).

Do not decide product wording. Report technical evidence only.

INVESTIGATION QUESTION B — Unit-Label Rendering Leak (PH0-OPEN-UNIT-LABEL-001)

Question: what is the actual root cause of Arabic UI occasionally rendering
"1 kg" or other unit abbreviations in Latin characters instead of Arabic?

Important context: a prior external review (Antigravity) cited i18n
dictionary lines defining unit translations as the cause. Claude Code
independently verified those specific lines and found the Arabic
translations there are complete and correct — so that citation was
REJECTED as the root cause. The actual cause remains unverified. Your job
is to find it, not to re-confirm or re-reject the already-rejected citation.

Trace:
- Unit formatting helper functions, wherever they exist in the frontend.
- Components that render a quantity + unit pair (listing cards, deal
  details, forms).
- Any hardcoded "kg"/"ton"/similar abbreviations that bypass the i18n
  dictionary entirely.
- Any database/admin master-data source for unit labels (e.g., a
  unit_options table) and whether its values are being read correctly by
  the frontend.
- Any fallback logic (e.g., "if translation missing, show raw value").
- Any place where a raw stored value and its display label are conflated
  (e.g., a component printing `${quantity} kg` directly instead of calling
  a localized unit label).

INVESTIGATION QUESTION C — Client-Side Payment-Proof Validation Mechanism

Investigate the actual client-side validation mechanism behind the
payment-proof optional-vs-required UX issue already flagged in WS4/WS8 (the
UI labels the payment-proof file as optional, but a disabled-button
condition makes it effectively required, and the backend independently
rejects the request if the value is empty).

Trace:
- The payment-proof form component (frontend).
- The submit button's enable/disable logic — exactly what condition
  controls it.
- The file field and the reference field, and how they interact in the
  validation logic.
- Any client-side validation schema, if one exists.
- The API payload shape the frontend actually sends (as visible from the
  frontend code, not by calling the API).
- Whether reference-only submission (no file) is technically possible to
  trigger client-side, or whether the disabled-button condition blocks it
  before any request is ever sent.

CAPTURE ONLY IF DIRECTLY RELEVANT TO THE ABOVE THREE QUESTIONS

- Hardcoded user-facing labels outside the i18n system, if you encounter
  them while tracing A/B/C.
- Enum/status naming risks discovered incidentally during the above traces.
- Source-of-truth risks in the deal/payment/transport/shipment flow,
  discovered incidentally.
- Relevant tests, or the absence of tests, for the specific code paths you
  traced.

Do not go looking for unrelated issues outside these three questions and
their directly-relevant incidental discoveries — stay bounded.

WHAT YOU MUST NOT DO

- Edit any code.
- Edit any config.
- Edit any documentation, except your one approved report file below.
- Access any database.
- Perform any admin action.
- Run any live flow against the application.
- Commit anything.
- Deploy anything.
- Run any migration.
- Make any legal or regulatory claim.
- Decide UX wording.
- Decide canonical terminology.
- Ratify architecture.
- Approve implementation.
- Use any real customer, partner, pilot, or payment data.
- Reproduce any secret, credential, token, or OTP value.

OUTPUT REQUIREMENTS

Produce exactly ONE report file, named:
PHASE_0_EXTERNAL_REVIEW_CODEX_TECHNICAL_TRACE_REPORT.md

Every individual finding must use this exact table template:

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-001, EXT-CODEX-002, ... (sequential) |
| Source Tool | Codex |
| Date | today's date, YYYY-MM-DD |
| Technical Scope | Read-only technical trace |
| Investigation Question | A / B / C |
| Artifact Reviewed | exact file / function / route / component |
| Finding | concise technical finding |
| Evidence | exact file path and line/function reference |
| Confidence | High / Medium / Low |
| Related Phase 0 Finding | existing finding ID/document if applicable |
| Mechanism Claim | technical mechanism observed / not observed |
| Source-of-Truth Impact | None / Low / Medium / High |
| User-Facing Impact | None / Low / Medium / High |
| Recommended Action | accept / investigate / defer / human review |
| Needs Claude Reconciliation? | Yes / No |
| Needs Human Validation? | Yes / No |
| Boundary Confirmation | no edits/actions performed |

Do not skip the Evidence field — a finding without an exact file path and
line/function reference will be treated as unusable by the integrator. If
you cannot find a definitive answer to A, B, or C, report that plainly
("root cause not found; traced X, Y, Z, no conclusive evidence") rather
than guessing or citing weak/circumstantial evidence as if it were
conclusive.

Provide a short summary section (5-10 sentences) at the top of the report
before the findings table, but every individual row must follow the table
template above.

When finished, stop. Do not attempt to apply, fix, or implement anything
you find.
```

## Files/Folders to Point Codex To

- **Full backend and frontend source tree (read-only):** `artifacts/api-server/src/`, `artifacts/tadweerah/src/`.
- **Schema:** `lib/db/src/schema/*` (particularly `deals.ts`, `contract-shipments.ts`, `transport-requests.ts`, `waste-listings.ts`, `unit-options.ts`).
- **i18n:** `artifacts/tadweerah/src/i18n/index.tsx`.
- **Context documents (for cross-reference, not to be taken at face value):**
  - `docs/PHASE_0_WS5C_ADDENDUM_GOVERNANCE_PATTERN_TERMINOLOGY_VALUE_UX_ASSURANCE.md` (§4.3, the dispatch/receipt/completion question)
  - `docs/PHASE_0_OPEN_VALIDATION_ITEMS_REGISTER.md` (`PH0-OPEN-UNIT-LABEL-001`)
  - `docs/PHASE_0_WS8_CYBERSECURITY_COMPLIANCE_ENTERPRISE_READINESS_REVIEW.md` (§6, payment-proof validation gap)
  - `docs/PHASE_0_WS4A_EXPANDED_UX_TERMINOLOGY_DEAL_TRUST_REVIEW.md` (§7, payment-proof trap)
- **Must-read governance references:** `docs/PHASE_0_EXTERNAL_AI_REVIEWER_CONTROL_SHEET_CR001.md` (Multi-Agent Investigation & Review Operating Model section), `docs/PHASE_0_AI_AUTHORITY_CEILING.md`.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules, CR-001, and the PMO's approved Multi-Agent Investigation & Review model. This prompt was prepared by Claude Code. It is not active until the Founder pastes it into Codex, and the resulting output must return to Claude Code for reconciliation before becoming official.*
