# CLAUDE.md — Tadweerah Project Instructions

## Project

This is the Tadweerah project.

Tadweerah is a Saudi circular economy platform. The repository is a monorepo containing frontend, backend/API, shared libraries, documentation, scripts, and project governance files.

## Current Phase: Phase 0 — Read-Only Audit

The current phase is Phase 0: Read-Only Current Platform Audit.

The goal of Phase 0 is to build an accurate, evidence-backed understanding of the current platform, project files, data sources, user journeys, UI/UX weaknesses, Arabic/English parity, technical capability, cybersecurity readiness, and V2 opportunity backlog.

Phase 0 is not an implementation phase.

## Allowed Outputs in Phase 0

Allowed outputs are limited to:

- documents
- evidence
- maps
- inventories
- registers
- audit hypotheses
- findings
- risk notes
- backlog items
- recommendations for later phases

## Strictly Forbidden in Phase 0

Do not do any of the following unless the founder explicitly approves a later phase:

- no code changes
- no commits
- no merges
- no deployments
- no database writes
- no database migrations
- no route deletion
- no file deletion
- no permission or access changes
- no production data changes
- no package installs or updates
- no git pull
- no branch changes
- no security setting changes
- no penetration testing or active security attacks

If a requested task appears to require any of the above, stop, explain the risk, and wait for explicit approval.

## Command Safety Rule

Before running any command that may:

- create files
- modify files
- delete files
- install packages
- update dependencies
- build the app
- deploy anything
- touch a database
- change Git state
- change branches
- access credentials or secrets

stop and ask for explicit approval.

Read-only commands are allowed when needed for Phase 0, such as listing files, reading files, searching text, checking git status, and inspecting project structure.

## Source-of-Truth Principle

Existing project documents are hypotheses until verified.

Do not treat old documents, roadmaps, handoff notes, or prior audit files as final truth unless they are verified against current repository state, browser evidence, routes, screenshots, code references, API references, or read-only source mapping.

If documents conflict with each other or with current code, flag the conflict explicitly.

## Evidence Standard

Every finding must be evidence-backed.

A valid finding should include one or more of:

- file path
- line reference when available
- route or URL
- screenshot reference
- user role
- language
- timestamp
- command output
- observed vs expected behavior
- source document reference
- code reference
- API or data source reference if available

A claim without evidence is only a hypothesis, not a finding.

## Secrets and Sensitive Data

Never print secrets, tokens, API keys, passwords, credentials, private keys, database URLs, or sensitive values.

If a file appears to contain a secret or sensitive value, do not reveal the value. Only state that a sensitive item may exist at the file/path/location and should be reviewed safely.

Do not paste real customer data, real contracts, real financial data, or sensitive personal data into AI outputs.

## Test-User Operations

Test-user operations may be used later only if explicitly approved for browser-based audit.

If used, test operations must be performed only through the application UI, not through direct database writes or scripts.

Audit-generated test records should be clearly tagged using an agreed naming convention.

## Audience for Outputs

All outputs must be practical and understandable for a non-technical founder.

Use clear language, structured tables, and explain why each finding matters.

Technical details may be included, but they must be tied to product, data integrity, UI/UX, enterprise readiness, compliance, or V2 impact.

## Phase 0 First Task

The first task is:

Project Files Intake & Current Understanding.

This means reviewing existing project files and documentation to build a current understanding baseline before live browser audit.

The first task should produce:

PHASE_0_PROJECT_FILES_INTAKE_AND_CURRENT_UNDERSTANDING.md

Do not start this task until explicitly instructed.

## Working Style

- Be conservative with certainty.
- Separate facts from hypotheses.
- Do not hide unknowns.
- Do not recommend fixes during Phase 0 unless clearly marked as future backlog.
- Do not modify existing documentation unless explicitly asked.
- Keep one evidence-backed source of truth for audit outputs.
- Stop and ask when source-of-truth is ambiguous, a flow is blocked, or a security/compliance concern appears.
