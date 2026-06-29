# 08B Visual Diagrams Maintenance

Last updated: 2026-06-29  
Mode: Discovery / Documentation  
Scope: maintenance rules for Pre-Phase 3-B visual diagrams  
Canonical diagram source: `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`

## 1. Diagram Source-Of-Truth Rule

Mermaid Markdown files are the canonical diagram source.

The source of truth for Pre-Phase 3-B visual diagrams is:

- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`

Rules:

- Keep diagrams editable as Mermaid in Markdown.
- Do not treat generated PNG/PDF exports as canonical.
- If a static export is created later, regenerate it from the Mermaid source.
- If an exported diagram disagrees with the Mermaid source, the Mermaid source wins.
- Do not update diagrams from assumptions; update only from browser, code, network/API, DB/schema, or documentation evidence.

## 2. Update Triggers

These diagrams must be reviewed and updated whenever a future phase changes or verifies any of the following:

- Sustainability allocation routes.
- Received-line, allocation, distribution, or report data sources.
- Reports page behavior.
- Sustainability reports tab behavior.
- Report detail behavior.
- Report print behavior.
- Correction, revision, or admin governance flows.
- Terminology or titles shown to users.
- Buyer, seller, producer, processor, recycler, or admin role visibility.
- Any field related to:
  - received quantity
  - distributed quantity
  - remaining quantity
  - approved quantity
  - report quantity
- Any change to `عرض التقرير`.
- Any change to `تفاصيل` in admin sustainability rows.
- Any change to `تعديل (إعادة فتح)`.
- Any change to how versions such as `معتمد` and `مستبدل` are displayed.

## 3. Required Update Checklist

For every future relevant implementation, audit, or UAT phase:

- Update the active route map if route reachability changes.
- Update the persona journey map if a role gains or loses a visible path.
- Update the sustainability allocation flow if allocation states, controls, or detail screens change.
- Update the reports flow if `/reports`, `تقارير الاستدامة`, `عرض التقرير`, or print/detail behavior changes.
- Update the 40/35/5 or quantity risk map if received/distributed/remaining/approved quantity behavior changes.
- Update the terminology map if visible Arabic/English labels change.
- Add evidence references to the relevant phase UAT/discovery file.
- Mention in closure notes whether diagrams were updated or not applicable.
- Preserve a clear split between observed facts and inferred risks.
- Do not call a path obsolete unless evidence supports that classification.

## 4. Required Evidence Standard

Every diagram update should state or imply the evidence source.

Accepted evidence types:

- Browser evidence.
- Code evidence.
- Network/API evidence.
- DB/schema evidence.
- Documentation evidence.

Rules:

- Browser-confirmed active paths require browser evidence.
- Code-present is not active by itself.
- Source-reading risk must name the conflicting or confusing values.
- Mutation-risk paths must stay marked as not clicked unless explicit approval and safe evidence changes that status.

## 5. Recommended Permanent Linking

Recommended for a separate documentation-closure task only:

- Add a reference to `08A_VISUAL_DIAGRAMS.md` in `docs/PROJECT_MAP.md`.
- Mention these diagrams in the future Phase 3-B closure report.
- Use these diagrams as the baseline for the Phase 3-B source-of-truth audit.
- Link the diagrams from any future sustainability reporting UAT checklist.

Do not perform those updates during this Pre-Phase 3-B discovery task unless separately approved.

## 6. Phase 3-B Baseline

Use the current diagrams as the baseline for later audit work:

- Persona Journey Map: role-specific access and visibility.
- Active Route Map: browser-confirmed vs blocked/unconfirmed paths.
- Sustainability Allocation Flow: allocation list and detail states.
- Reports Flow: report tab visibility and unconfirmed print/detail behavior.
- 40/35/5 Evidence Map: received vs distributed vs remaining quantity risk.
- Terminology Flow Diagram: visible user/admin terms and mutation-risk labels.

## 7. Closure Reminder

Before closing any future relevant phase, answer:

- Were the Mermaid diagrams reviewed?
- Were any diagrams updated?
- If not updated, why not applicable?
- Which evidence file supports the decision?
- Did the phase affect the 40/35/5 quantity risk?
- Did the phase affect report detail or print reachability?
- Did the phase affect admin correction/revision visibility?

## 8. Current Status

Pre-Phase 3-B visual diagrams are created and maintainable as Markdown Mermaid source.

Pre-Phase 3-B may be closed from a visual-discovery documentation standpoint after owner approval.

Remaining items are Phase 3-B or later:

- Source-of-truth audit for received/distributed/remaining/approved quantity fields.
- Controlled read-only verification of report detail/print behavior.
- Controlled read-only verification of admin correction/revision detail behavior.
- Future documentation-closure links from main project documents.

## Exact Recommended Closure Prompt

Close Pre-Phase 3-B discovery documentation. Review `docs/pre-phase-3b-visual-journey/08_VISUAL_JOURNEY_STORYBOARD.md`, `08A_VISUAL_DIAGRAMS.md`, and `08B_VISUAL_DIAGRAMS_MAINTENANCE.md`; do not modify source code, do not implement fixes, and do not update main project docs unless explicitly approved.
