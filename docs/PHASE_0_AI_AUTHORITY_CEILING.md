# AI Authority Ceiling

**Date:** 2026-07-03
**Purpose:** One-page control defining the authority ceiling for all AI tools (Claude Code, Antigravity, Codex, and any future AI tool) engaged on this project. This ceiling applies regardless of role, phase, or how "trusted" a tool has become through prior good performance.

---

## 1. AI-Permitted Actions

- Read-only source code, configuration, and documentation inspection.
- Read-only evidence review (screenshots, logs, prior findings) using only test/anonymized data.
- Producing findings, analysis, option notes, and recommendations in report form.
- Producing implementation *plans* (a described sequence of steps) — not implementation itself.
- Proposing terminology, wording, and UX options, marked "Proposed" or "Candidate for governance," never final.
- Flagging risk, ambiguity, or the need for human/legal/regulatory validation.
- Creating exactly the report file(s) explicitly named in an approved task brief.

## 2. AI-Prohibited Actions

- Any code edit or config edit.
- Any database access, read or write, beyond what an approved read-only tool exposes.
- Any admin action.
- Any commit or deploy.
- Any DB migration.
- Any authentication/authorization/permission change.
- Any payment or financial-transaction change.
- Any design or mockup production.
- Any fee-document design.
- Any document deletion.
- Any live, state-changing action against the application.
- Any use of real customer, partner, pilot, or payment data.
- Reproduction of any secret, credential, token, or OTP value.
- Declaring any term, calculation, or process "legally correct," "regulatory-valid," or "Saudi-market validated."
- Ratifying architecture, approving merges, or authorizing any implementation step.

## 3. Human-Only Actions

- Running or activating any AI tool for a new investigation (founder decision, every time).
- Reconciling conflicting AI outputs where the conflict touches source-of-truth, enum/status meaning, or architecture (Claude Code proposes a reconciliation; the Founder or a designated human technical owner confirms it where it's consequential).
- Ratifying canonical terminology that affects roles, marketplace flows, reports, contracts, payments, compliance, or partner-facing outputs.
- Approving any code change, config change, migration, deploy, or commit.
- Granting or revoking access to any AI tool, admin key, or credential.
- Reviewing and accepting/rejecting legal, tax, ZATCA, MWAN, or PDPL-adjacent conclusions.

## 4. Founder-Only Strategic Decisions

- Approving or amending Phase 0 scope, sequencing, or governance (CR-001 and its amendments).
- Deciding whether to proceed to Phase 1 implementation at all.
- Choosing between Path 1 (improve current platform) and Path 2 (separate prototype), or pursuing both.
- Ratifying final canonical terminology (per §3, but named here as the strategic layer above the operational reconciliation layer).
- Assigning the human accountable technical owner (§5).
- Deciding the platform-fee/commission rate and structure itself (terminology has been proposed and reconciled; the business decision is the Founder's).

## 5. Required Human Accountable Technical Owner Before Phase 1 Implementation

**No AI tool may be the last checkpoint before any code ships.** Before Phase 1 implementation begins, a named human accountable technical owner must be assigned who:

- Reviews and approves any code change before merge.
- Owns the decision to deploy.
- Owns rollback/incident response if something breaks.
- Is the point of accountability for any security, compliance, or data-integrity consequence.

This role does not currently exist in the Phase 0 governance structure and **must be assigned before Phase 1 implementation begins** — this is a gating condition, not a formality.

## 6. Escalation Rules for AI Disagreement

- If Antigravity, Codex, or Claude Code disagree on any source-of-truth, enum, status, value-ownership, or data-propagation question, the item is marked **"Unknown / Needs Technical Review"** — never auto-resolved by any single AI's preference, including Claude Code's own.
- If two AI tools produce conflicting terminology recommendations, both are logged in the reconciliation log with their reasoning; Claude Code does not silently pick a winner — it surfaces the conflict for Founder ratification.
- If an AI tool's finding depends on a legal, regulatory, or Saudi-market assumption it cannot validate, it must say so explicitly rather than presenting the finding as settled.

## 7. No AI-to-AI Delegation of State-Changing Work

No AI tool may instruct, prompt, or configure another AI tool to perform a state-changing action on its behalf. Claude Code may prepare a task brief/prompt for Antigravity or Codex, but that prompt is always returned to the Founder for review and manual activation — Claude Code does not send it directly, and no AI tool may activate another AI tool autonomously.

## 8. Reconciliation-Overhead Monitoring

As more AI lanes are added, the reconciliation burden on Claude Code (and on the Founder for ratification-track items) grows. To keep this sustainable:

- Every external review must stay within its approved bounded scope (per the control sheet's task-boundary split) — scope creep increases reconciliation overhead disproportionately.
- If a reconciliation pass finds that most findings are duplicates of already-established conclusions (as both Antigravity passes have so far), that is logged plainly, not treated as failure — but it is also a signal to narrow future task briefs to genuinely open questions rather than re-running broad sweeps.
- If reconciliation overhead starts exceeding the value of the findings produced (e.g., large volumes of low-confidence or duplicate findings), Claude Code should flag this to the Founder as a reason to narrow scope, slow cadence, or pause a lane — not silently absorb the overhead.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001, per the PMO's approved Multi-Agent Investigation & Review model. This is a governance document. No code/config/DB/admin/commit/deploy actions occurred in its preparation.*
