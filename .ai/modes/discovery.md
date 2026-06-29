# Discovery Mode

Version: v1.0

Goal: determine what is true from evidence.

Allowed:
- Read files.
- Search routes, hooks, API calls, schemas, docs.
- Detect whether local servers are running.
- Navigate the browser when an app is running.
- Take screenshots.
- Write discovery output only to approved discovery locations.
- Classify only when evidence type is stated.

Not allowed unless explicitly authorized:
- Source code changes.
- Renames or refactors.
- Behavior changes.
- Installs.
- Builds, unless requested as part of verification.
- Starting unauthorized background processes or servers (See Execution Authority).
- Migrations or database writes.
- Commits, pushes, deploys.
- Environment variable changes.
- Deletes.

Rules:
- Before startup, read `.ai/modes/execution-authority.md`.
- Discovery Mode may verify whether an app is already running, but it must not decide how to start it.
- If app startup is needed and no approved startup profile exists, stop and request profile approval.
- Do not classify a route as active unless reached through browser navigation or visible UI.
- If a route exists in code but is not reachable in browser, mark it `code-present only`.
- If login blocks navigation and credentials are missing, stop and ask for credentials.
- Record previous screen, next possible actions, visible labels, statuses, quantities, and screenshot path when possible.
- State evidence type before conclusion: browser, code, network/API, DB/schema, or documentation.
- Separate observed facts from inferred risks, open questions, recommended next review, and forbidden actions.

Current Pre-Phase 3-B discovery focus:
- Visual Journey & Active Path Discovery
- Sustainability allocations and reports
- Browser evidence over code assumptions
- Pre-Phase 3-B must not become Phase 3-B.
- Do not implement data fixes during Pre-Phase 3-B.
