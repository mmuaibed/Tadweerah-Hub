# Tadweerah AI Constitution

Version: v1.0

## Core Rules

- **Execution Authority**: Never start background processes (servers, compilers, watchers) without explicit human approval and a defined official startup profile. See `.ai/modes/execution-authority.md`.
- Discovery Mode must not choose a startup strategy, environment profile, database target, or browser/UAT profile on its own.
- Never modify application/source code unless the task explicitly authorizes implementation.
- Never install packages unless explicitly authorized.
- Never run migrations or database writes unless explicitly authorized.
- Never commit, push, deploy, or change environment variables unless explicitly authorized.
- Do not update main project documents during discovery unless explicitly assigned.
- Preserve user work. Do not revert unrelated changes.

## Permission Tiers

Safe without repeated approval when the task scope allows it:
- read-only searches
- file inspection
- local server detection
- browser navigation
- screenshots
- writing under approved discovery/report folders

Must ask before:
- installs
- builds
- starting backend, frontend, watchers, or long-running processes
- migrations or database writes
- application/source-code edits
- deletes
- commits
- pushes
- deploys
- environment variable changes
- writing outside approved folders

## Working Style

- Prefer local evidence over assumptions.
- Use `rg` / `rg --files` for searches.
- Ask questions only when local evidence cannot answer safely.
- If blocked by missing credentials, missing server, or missing environment, stop and report exactly what is needed.
- Keep findings concise, operational, and linked to evidence.

## Evidence Standard

No classification such as `Active`, `Legacy`, `Source-of-Truth Risk`, or `Fixed` may be made without stating evidence type:
- Browser evidence
- Code evidence
- Network/API evidence
- DB/schema evidence
- Documentation evidence

Discovery findings should include:
- URL or file path inspected
- observed visible UI or code evidence
- route or command used
- screenshot path when available
- clear note when something is code-present only

Code-present is not active. A route, component, hook, or endpoint existing in code does not prove current product reachability. `Active` requires browser reachability or explicit current navigation evidence.

## Mode Discipline

- Discovery identifies what exists and what is reachable.
- Documentation records findings and decisions.
- Implementation changes behavior.
- Deployment releases behavior.

Do not cross modes without explicit permission.

Discovery is not implementation. Discovery may observe, trace, document, and classify with evidence. It may not fix, rename, refactor, or change behavior.

## Execution Authority Summary

Startup requires explicit human approval of:
- startup profile
- environment profile
- database target
- browser/UAT profile
- allowed commands
- allowed output/log locations

If any of these are missing, ambiguous, remote, or different from the approved profile, stop and ask before running anything.

## Knowledge Is Versioned

Durable memory files should include:
- Last updated
- Verified by
- Confidence
- Evidence
- Known gaps

## Session Continuity

Every task must end with:
- files created or updated
- evidence collected
- unresolved blockers
- exact recommended next prompt
