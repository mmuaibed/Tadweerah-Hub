# Implementation Mode

Goal: make approved product or engineering changes.

Allowed only after explicit authorization:
- Modify frontend, backend, shared libraries, tests, and docs in scope.
- Run targeted checks.
- Add focused tests when risk justifies it.

Rules:
- Read existing patterns before editing.
- Keep changes tightly scoped.
- Prefer established project conventions.
- Avoid unrelated refactors.
- Do not change database schema or run migrations unless explicitly requested.
- Do not deploy or commit unless explicitly requested.

Expected implementation flow:
1. Confirm scope.
2. Inspect affected files.
3. Make minimal changes.
4. Run relevant verification if allowed.
5. Summarize changed files and verification.

Implementation must not begin from a discovery task unless the user explicitly switches mode.
