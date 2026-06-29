# Tadweerah AI Operating System

Version: v1.1

This folder is the starting point for future AI agents working on Tadweerah.

Purpose:
- Work safely inside the repo.
- Know the active mode before acting.
- Preserve evidence from discovery.
- Avoid confusing discovery with implementation.
- Reduce unnecessary questions by using local context first.
- Respect Execution Authority for all active processes.

Start every task by reading:
1. `.ai/constitution.md`
2. `.ai/modes/execution-authority.md`
3. The relevant `.ai/modes/*.md`
4. Relevant files in `.ai/memory/`
5. Relevant report template in `.ai/templates/`

Current project context:
- Frontend: React 19 + Vite under `artifacts/tadweerah`
- Backend: Express 5 under `artifacts/api-server`
- Package manager: `pnpm`
- Shared DB/schema: `lib/db`
- Current Pre-Phase 3-B goal: Visual Journey & Active Path Discovery

Default rule: inspect first, state evidence type, document findings, then stop unless the task explicitly authorizes implementation.

Execution Authority gate:
- Do not start backend, frontend, watchers, test runners, or other active processes until a named startup profile is approved for the current task.
- If no approved profile exists, report the missing profile fields and stop.

Environment Resolution gate:
- Distinguish current process env, approved env file source, dotenv-loaded runtime env, Vite frontend env, and unknown/missing env.
- Never assume `.env.example` is an approved runtime source.
- Never print, copy, or synthesize secrets.

Every task should end with:
- files created or updated
- evidence collected
- unresolved blockers
- exact recommended next prompt
