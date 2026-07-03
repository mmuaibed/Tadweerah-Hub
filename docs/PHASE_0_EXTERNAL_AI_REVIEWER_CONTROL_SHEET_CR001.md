# CR-001 External AI Reviewer Control Sheet
## Antigravity and Codex Read-Only Parallel Review Model

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Status:**
- Antigravity Review: **Approved for activation.** Final task prompt prepared for founder copy/paste (see `PHASE_0_ANTIGRAVITY_TASK_PROMPT.md`). Not yet run by Claude Code — the founder runs it directly in Antigravity.
- Codex Review: **Not started / deferred until after Antigravity review and reconciliation process is validated.**

**Reason for sequencing:** validate the External AI Review model on the lower-risk UI/UX surface-review lane before introducing Codex's higher-risk technical/source-of-truth review lane.

---

## 1. PMO Decision Summary

**Decision: Approved with conditions.**

**Purpose:** Use Antigravity and Codex for coverage breadth, not uncontrolled acceleration.

**Primary governance rule:** Claude Code remains the single source-of-truth integrator. External AI review outputs are **not official findings** until reconciled by Claude Code.

This is not permission for Antigravity or Codex to edit official Phase 0 documents, code, config, DB, admin state, commits, deploys, designs, mockups, or deletions.

## 2. Operating Model

- **Claude Code** = official integrator, evidence owner, tracker owner, reconciliation-decision owner. Remains Primary AI Project Lead and sole official integrator.
- **Antigravity** = read-only external UI/UX/front-end surface reviewer.
- **Codex** = read-only external technical/code/source-of-truth reviewer.
- External outputs are **quarantined as External AI Review Inputs** — they sit outside the official Phase 0 evidence pack until reconciled.
- No external reviewer may update official Phase 0 records directly.
- No finding becomes official until reconciled by Claude Code and logged in the reconciliation log (§6/§C3).

## 3. Hard Boundaries for All Tools

Applies to Claude Code, Antigravity, and Codex alike. No:

- Code edits
- Config edits
- DB access or writes
- Admin actions
- Commits
- Deploys
- Permission changes
- Live state-changing UI actions
- Design/mockup production
- Fee-document design
- Document deletion
- Real customer/partner/pilot/payment data
- Secret reproduction

## 4. C1 — Explicit Task-Boundary Split

### Antigravity scope
- UI/UX surface review.
- Visual hierarchy.
- Navigation, tabs, cards, buttons, status badges.
- User-facing terminology clarity.
- Arabic/English surface-level parity as seen by users.
- User confusion risks.
- Partner-demo readiness.
- Screens that are show / fix-first / do-not-show.
- Homepage/app/front-end experience.
- i18n surface/visual behavior only.

**Antigravity must not:**
- Decide backend source-of-truth.
- Decide DB/enums/status correctness.
- Resolve technical architecture disputes.
- Edit code or official docs.

### Codex scope
- Code-level i18n key coverage.
- Hardcoded business-term detection.
- Backend enums/status values.
- Source-of-truth risks.
- Route/component structure where it affects architecture or value ownership.
- Deal/listing/payment/transport status mapping.
- Config/master-data patterns.
- Tests/architecture gaps.
- Code evidence that confirms or contradicts Phase 0 findings.

**Codex must not:**
- Judge final UI wording quality beyond technical consistency.
- Produce visual design recommendations as final.
- Edit code or official docs.

### Overlap rules
- i18n surface/visual parity → **Antigravity**.
- i18n key coverage/code completeness → **Codex**.
- Route/component user-flow clarity → **Antigravity**.
- Route/component architecture/source-of-truth risk → **Codex**.
- **Any disagreement on source-of-truth/enum/status → "Unknown / Needs Technical Review," not integrator preference.**

## 5. C2 — External AI Review Input Template

**Every external reviewer output must follow this template — no exceptions.**

| Field | Required Content |
|---|---|
| External Review ID | `EXT-AG-###` or `EXT-CX-###` |
| Source Tool | Antigravity / Codex |
| Date | YYYY-MM-DD |
| Reviewer Scope | UI/UX surface / technical code review |
| Artifact Reviewed | file / route / component / screenshot / doc |
| Finding | concise claim |
| Evidence | file path / route / screenshot / code reference |
| Confidence | High / Medium / Low |
| Classification | Confirmed / Likely / Needs Claude reconciliation / Needs human validation |
| Related Phase 0 Finding | existing ID if applicable |
| Risk Area | UX / i18n / source-of-truth / security / compliance / partner-readiness |
| Recommended Action | accept / investigate / defer / human review |
| Boundary Confirmation | no edits/actions performed |

## 6. C3 — Reconciliation Decision Log

Maintained separately at `docs/PHASE_0_EXTERNAL_AI_REVIEW_RECONCILIATION_LOG.md` (created alongside this control sheet — see that file for the live table).

**Claude Decision values:** Accepted / Rejected / Merged / Flagged for human review / Deferred / Duplicate of existing finding.

**Rule: no silent merging.** Every promoted or rejected external input must carry a one-line reason in the log.

## 7. C4 — Source-of-Truth Disagreement Escalation

**Rule:** if Antigravity, Codex, or Claude Code disagree on any source-of-truth, enum, status, value ownership, or data-propagation issue, the item must be marked **"Unknown / Needs Technical Review."** Do not auto-resolve based on model preference — this applies to Claude Code's own reconciliation judgment as much as to the external tools.

## 8. Data-Handling Rule

**No real customer, partner, pilot, or payment data may enter Antigravity or Codex.**

**Allowed inputs:**
- Code files.
- i18n files.
- Anonymized/test-tagged evidence.
- Phase 0 docs.
- Screenshots that contain only test/anonymized data (all screenshots produced in this audit are tagged `[PHASE0-AUDIT]`/`[AUDIT-TEST-...]` test data per the WS2 evidence policy).
- Public product/UX observations without secrets.

**Not allowed:**
- Real customer records.
- Real partner names if sensitive (including "Al Qaryan," per standing instruction).
- Real payment proofs.
- Secret values.
- OTPs/tokens.
- Production-sensitive credentials.

## 9. Approved External Reviewer Charges

See the two task briefs below. **These are not executed by Claude Code — they are returned here for founder review before being sent to the external tools.**

**Antigravity is now approved for activation.** The final, ready-to-run copy/paste prompt (a refined, execution-ready version of the Antigravity brief below) is maintained separately at `docs/PHASE_0_ANTIGRAVITY_TASK_PROMPT.md`. The brief below remains the source charge; the standalone prompt file is what the founder actually runs.

---

### Antigravity External Review Charge

**Role:** Read-only External UI/UX/Front-End Surface Reviewer for the Tadweerah Phase 0 audit.

**You are not the integrator.** Claude Code is the sole official integrator and owner of the Phase 0 evidence pack. Your output is an **External AI Review Input**, not an official finding, until Claude Code reconciles it.

**Scope — what to review:**
- UI/UX surface quality: visual hierarchy, navigation, tabs, cards, buttons, status badges.
- User-facing terminology clarity (does a non-technical business user understand the label?).
- Arabic/English surface-level parity **as seen by a user** (not backend data correctness).
- User confusion risks in the journey (listing → offer → deal → payment → transport).
- Partner-demo readiness: which screens are show-ready, which need a fix first, which should not be shown yet.
- Homepage, dashboard, marketplace, onboarding, and deal-page front-end experience.
- i18n **surface/visual behavior only** (e.g., does a translated string overflow a button, does RTL/LTR mirroring look correct) — not i18n key coverage in the codebase (that's Codex's job).

**Out of scope — do not do this:**
- Do not decide what the backend source-of-truth for any value is.
- Do not judge whether a database enum or status value is "correct."
- Do not resolve or take a position on any technical architecture question.
- Do not edit any code, config, or official Tadweerah/Phase 0 document.
- Do not perform any live, state-changing action against the application (no real sign-ups, no real submissions, no live data entry beyond what's already provided as evidence).
- Do not use any real customer, partner, pilot, or payment data — use only the test-tagged evidence and code/screenshots provided to you.

**Inputs you will be given:** existing Phase 0 screenshots (test-tagged only), the public-facing homepage and app source (frontend only), and relevant prior Phase 0 findings documents for context (WS4-A, WS4-B).

**Output format — mandatory:** every finding must use the External AI Review Input template (§C2 of the control sheet), including a Confidence level and a Classification. Findings without evidence (a file path, route, or screenshot reference) will not be accepted into reconciliation.

**Hard boundaries (apply to you at all times):** no code/config edits, no DB access, no admin actions, no commits, no deploys, no permission changes, no live state-changing UI actions, no design/mockup production, no fee-document design, no document deletion, no real customer/partner/pilot/payment data, no secret reproduction.

---

### Codex External Review Charge

**Role:** Read-only External Technical/Code/Source-of-Truth Reviewer for the Tadweerah Phase 0 audit.

**You are not the integrator.** Claude Code is the sole official integrator and owner of the Phase 0 evidence pack. Your output is an **External AI Review Input**, not an official finding, until Claude Code reconciles it.

**Scope — what to review:**
- i18n **key coverage** in the codebase (missing keys, orphaned keys, keys defined in only one language).
- Hardcoded business terms that should be i18n-controlled or master-data-controlled but aren't.
- Backend enums and status values (deal/offer/listing/transport/shipment/license status) — their definitions, consistency, and where they're referenced.
- Source-of-truth risks: places where the same concept is computed, stored, or displayed in more than one way.
- Route/component structure **where it affects architecture or value ownership** (not general code style).
- Deal/listing/payment/transport status mapping across subsystems.
- Config/master-data table patterns (which tables are admin-managed, which are hardcoded, and whether that's consistent).
- Test coverage and architecture gaps relevant to the above.
- Code evidence that **confirms or contradicts** existing Phase 0 findings (you will be given the relevant prior findings documents — WS5-A, WS5-B, WS5-C, WS5-C Addendum, WS8 — to check against, not to take at face value).

**Out of scope — do not do this:**
- Do not judge final UI wording quality beyond technical consistency (i.e., you can flag "this string exists in two different i18n keys with different wording," but do not propose which wording is "better" from a UX standpoint — that's Antigravity's and Claude Code's job).
- Do not produce visual design recommendations as final outputs.
- Do not edit any code, config, or official Tadweerah/Phase 0 document.
- Do not access the database, run migrations, or execute any write operation, even a read-only-seeming query against a live database.
- Do not use any real customer, partner, pilot, or payment data.

**Inputs you will be given:** the full backend and frontend source tree (read-only), `lib/db/src/schema/*`, the i18n dictionary, and relevant prior Phase 0 findings documents (WS5-A, WS5-B, WS5-C, WS5-C Addendum, WS8) for cross-checking.

**Output format — mandatory:** every finding must use the External AI Review Input template (§C2 of the control sheet), including a Confidence level and a Classification. If you disagree with an existing Phase 0 finding, say so explicitly and cite the code evidence — do not silently omit it.

**Hard boundaries (apply to you at all times):** no code/config edits, no DB access or writes, no admin actions, no commits, no deploys, no permission changes, no live state-changing UI actions, no design/mockup production, no fee-document design, no document deletion, no real customer/partner/pilot/payment data, no secret reproduction.

---

# External Specialist Work Package — Antigravity Terminology & UX Wording

**Date:** 2026-07-03
**Status: Approved by PMO with refinements R1–R3.** Antigravity specialist review is **not yet activated** — governance and prompt prepared only, pending founder go-ahead.

**Approved role:** Antigravity may act as a bounded External Specialist Reviewer/Proposer for terminology, user-facing wording, bilingual surface consistency, and UI/UX language clarity.

**Purpose:** Produce deeper specialist recommendations and option notes that can feed WS5-C / WS5-C Addendum, WS9 backlog, WS11 next-phase charter, Path 1 current-platform improvement, and Path 2 future prototype exploration.

**Important — this is a depth upgrade, not an authority upgrade:**
- Antigravity does not decide official terminology. **Antigravity proposes.**
- **Claude Code reconciles.**
- **Founder ratifies** anything that affects canonical terminology, reports, contracts, payments, compliance, or partner-facing outputs.

Claude Code remains sole official integrator, owner of the official evidence pack, owner of the reconciliation log, owner of tracker updates, and the only tool allowed to promote external input into official Phase 0 records after reconciliation. Antigravity remains read-only, external, report-only, non-authoritative, and not allowed to implement or edit official records. Codex remains deferred.

## R1 — Meaning vs. Mechanism Boundary

**Antigravity may assess:**
- Whether a term is confusing to a user.
- Whether Arabic/English wording is clear.
- Whether similar labels read as different concepts.
- Whether a term helps or harms user understanding.
- Whether wording is visually suitable in buttons, tabs, cards, statuses, and reports.

**Antigravity may not assert:**
- Backend source-of-truth.
- DB field ownership.
- Enum/status correctness.
- Whether two labels map to the same backend value.
- Technical architecture correctness.

**If a wording recommendation depends on a backend-mapping assumption, Antigravity must flag the assumption as "Needs Claude reconciliation."**

## R2 — Canonical Terms Are Proposed, Not Decisions

- Every canonical term recommendation must carry status **"Proposed."**
- Every locked/governed term recommendation must carry status **"Candidate for governance."**
- No Antigravity recommendation becomes official until (a) Claude Code reconciles it, and (b) the Founder ratifies it if it affects canonical terminology, reports, contracts, payments, compliance, or partner-facing outputs.

## R3 — Regulatory/Legal/Market-Fit Terms Are Flagged, Not Validated

For terms touching MWAN, ZATCA, invoice/tax invoice, license/verification/eligibility, Saudi regulatory wording, legal enforceability, commission/عمولة, payment request terminology, or tax/VAT wording:

**Antigravity may:** flag risk, offer wording options with caveats, mark human/domain/legal validation required.

**Antigravity may not:** declare a term legally correct, declare a term regulatory-valid, declare a term Saudi-market validated, or finalize a canonical term in these areas.

## Activation Condition

**Status: Ready for Founder activation.** `PH0-OPEN-EXT-AG-SCHEDULE-001` is resolved — founder reviewed the full Antigravity session log directly and found no persistent scheduled/background task; the "Used tool: schedule" entry was an internal execution/status indicator, not a boundary breach. The specialist prompt (`docs/PHASE_0_ANTIGRAVITY_SPECIALIST_TERMINOLOGY_UX_PROMPT.md`) has also been tightened to start from the canonical repository path only, per the founder's minor process note on the general review's broader file search. **Founder approval is still required to actually paste/run the prompt — Claude Code will not activate it.**

---

# Multi-Agent Investigation & Review Operating Model

**Date:** 2026-07-03
**PMO decision:** Approved for the investigation-and-review layer. **Not approved for the implementation layer as written.**

The project transitions to a Multi-Agent Investigation & Review model under CR-001:

- **Claude Code** remains Chief Technical Integrator and sole source-of-truth owner.
- **Antigravity and Codex are permanent bounded specialist reviewers/investigators** — not a one-time pilot, but a standing lane, still fully bounded by the control sheet's hard limits and R1-R3.
- Their outputs are **non-authoritative input packages**.
- Parallel bounded packages may converge on **Claude-controlled integration gates** for evidence and analysis.
- The model is **explicitly limited to read-only investigation, review, and planning.**

**Hard boundary:** No AI ratifies architecture, approves merges, authorizes deploys, authorizes DB migrations, authorizes auth/permission/payment changes, or owns implementation. **Anything that ships must be gated by a human accountable technical owner before Phase 1 implementation begins.**

**Approved for:** investigation, review, and planning only.
**Not approved for:** implementation ownership.
**Claude Code controls:** evidence/analysis integration gates (reconciliation).
**Human accountable technical owner controls:** any state-changing implementation gates (this role does not yet exist and must be assigned before Phase 1 implementation).

## Antigravity — Permanent Lane

UI/UX, terminology, bilingual surface consistency, information architecture, visual hierarchy, partner-demo readiness.

## Codex — Permanent Lane

Source-of-truth tracing, enum/state-machine analysis, backend consistency investigation, technical debt identification, i18n key coverage, and **implementation planning only** (not implementation itself).

**Full detail on authority limits, escalation, and human-only actions is maintained separately at `docs/PHASE_0_AI_AUTHORITY_CEILING.md`.**

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This is a governance/control document. No code/config/DB/admin/commit/deploy actions occurred in its preparation, and no external tool has been activated or granted access as a result of this document alone — activation requires separate founder go-ahead.*
