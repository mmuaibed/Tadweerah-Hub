# WS2 — Test User & Access Setup Plan

---

**Date:** 2026-07-02
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**WS1 status:** Closed with documented limitations. One remaining limitation carried forward: `Tadweerah_Operational_Truth_Workflows_v5.pdf` (12 pages, a self-declared "source of truth" document) has **not yet been checked** — it is a visual/PDF document that a text-based audit cannot close, and it requires a later, visually-capable review pass. See `docs/PHASE_0_WS1_COVERAGE_ADDENDUM.md`.

### What WS2 is (plain language for the founder)

This document is a **plan and a checklist only**. It does not touch the live application, it does not create any test users, it does not create any test transactions or data, and it does not read from or write to any database. It writes exactly one file — this one.

Its single purpose is to work out, **in advance**, what access and what test accounts a *later* workstream (WS3 — the live browser journey audit) would need in order to safely walk through the platform as real users would. WS3 is a separate step that has **not** been approved yet and must not begin until the open items in this document are resolved by you (the founder). Think of WS2 as writing the packing list and safety rules before anyone opens the door — no one walks through the door in WS2.

Everything below is either traceable to the WS1 findings (`docs/PHASE_0_PROJECT_FILES_INTAKE_AND_CURRENT_UNDERSTANDING.md`, `docs/PHASE_0_WS1_COVERAGE_ADDENDUM.md`) and the existing governance profiles (`.ai/profiles/staging-readonly-uat.md`, `.ai/profiles/local-readonly-discovery.md`), or it is explicitly marked **"Founder input needed."** Nothing here is invented.

---

## 1. Founder Input Checklist (Decisions Received 2026-07-02)

The founder has now answered the questions this section originally posed. This table is the record of those decisions, what (if anything) is still open, and whether each item is settled enough for WS2 planning to proceed.

| # | Input needed | Founder decision | Remaining blocker (if any) | Can WS2 proceed? |
|---|---|---|---|---|
| 1 | Primary audit environment / URL | **Use `https://tadweerah-staging.web.app`** as the primary WS3 audit target. | This URL reportedly rendered a blank shell (Clerk rejected the origin) in a past observation — not yet re-verified. That health re-check is the **first action of WS3**, not a WS2 task. | **Yes** — target is decided for planning purposes. |
| 2 | Role of `tadweerah.com` | Treat as a **secondary/comparison domain**, not the source of truth. May be checked later for domain/environment comparison. | None for WS2. | **Yes.** |
| 3 | Role of `tadweerah.sa` | **Not approved** for WS3 use now. | None — excluded from scope unless separately confirmed later. | **Yes.** |
| 4 | Reuse old `[TEST]` accounts or create new ones? | **Do not assume old `[TEST]` accounts are valid.** Prepare a required test-account matrix first; prefer dedicated Phase 0 audit accounts with clear naming. | The matrix itself can be finalized now (see Section 2 addendum below), but **actually creating the accounts is a WS3/execution action** requiring separate approval — not done here. | **Partially** — matrix can be finalized in WS2; account creation stays blocked. |
| 5 | Real/sensitive data handling (e.g. "Al Qaryan") | Any record or reference using a **real partner/customer name** (e.g. Al Qaryan) is **sensitive** — must not be used, modified, completed, or built into test flows. | None for WS2 — adopted as a hard boundary (folded into Section 4). | **Yes.** |
| 6 | Test-data naming convention | Use **`[AUDIT-TEST-20260702]`** or **`[PHASE0-AUDIT]`** as the required prefix. Every test record must log **role, language, timestamp, and purpose** in a run log. | None for WS2 — convention adopted (Section 5 updated accordingly). Run-log discipline applies starting WS3. | **Yes.** |
| 7 | View-only database access | **Assume none is available** for now. WS3 proceeds **UI-only**. A later workstream (WS5, source-of-truth mapping) may mark DB-dependent items **"Unknown"** if read-only DB access is never granted. | None — resolved as "not available"; plan proceeds without it. | **Yes.** |
| 8 | Evidence storage location | Founder asked WS2 to **propose** a location (not create it yet). **Proposed:** `docs/phase-0-audit/evidence/`, with `screenshots/<role>/` and `run-logs/` subfolders, mirroring the existing `docs/pre-phase-3b-visual-journey/` convention. | A one-line founder confirmation of this exact path is still pending, but it does not block finishing this plan. | **Yes** (proposal made; final confirmation is a small remaining step). |
| 9 | Admin access | Requires **(a)** a founder-approved admin test email/account, and **(b)** a confirmed safe method to supply `ADMIN_API_KEY` for audit use without printing or storing it in repo files. | **Both (a) and (b) are still open.** No admin test email has been named yet; no safe key-delivery method has been confirmed. No secret values requested or printed here. | **No** — genuine open blocker for any admin-journey testing. |
| 10 | Authority to approve moving into WS3 | Not addressed in the founder's decisions above — carried forward from the original plan. | Still needs an explicit sign-off statement when WS3 is formally proposed. | **Not yet** — separate future approval step. |

**Net effect:** 8 of 10 inputs are now fully or provisionally resolved for planning purposes. **Two items remain genuinely open before WS3 can begin:** admin test-account/key arrangements (#9) and explicit authorization to start WS3 (#10). Everything else in this document has been updated to reflect the decisions above.

---

## 2. Required Test Roles / Accounts

The platform uses **four different role vocabularies** that do not fully map onto each other (confirmed in WS1 addendum). To exercise every area of the platform map, WS3 needs accounts that cover each vocabulary. Crucially, some journeys need **two distinct companies** (e.g. a deal has a selling side and a buying side that cannot be the same company).

**The four role vocabularies (all code-confirmed in WS1):**

| Vocabulary | Where it is used | Values |
|---|---|---|
| `mwan_role` (company-level) | Company profile / onboarding | `generator` (source/seller/producer), `receiver` (buyer/processor), `transporter` |
| Contract Lite | Contract Lite flow only | `seller`, `buyer` |
| Marketplace deals / pending-actions | Deal & pending-action views | `producer`, `buyer` |
| Team membership (within a company) | Team management | `owner`, `admin`, `member` |

Platform **admin** is separate again: it is *not* a database role. It is a frontend client-side email allowlist (`VITE_TADWEERAH_ADMIN_EMAILS`, documented current value is the single address `mmuaibed@outlook.com` — a plain config value, not a secret) plus a backend shared-secret header (`ADMIN_API_KEY`) with no per-user identity on the backend.

### Coverage map — what each platform area needs

| Platform area (from WS1 map) | Role(s) needed to exercise it | Distinct companies needed? |
|---|---|---|
| Public homepage | None — anonymous / signed-out | No account |
| Sign-up & onboarding / company creation | A brand-new signed-in user creating a company; then `generator` and/or `receiver` role selection | At least 1; ideally observe onboarding fresh |
| Company team management (invite/remove) | Team `owner` (to invite), plus `admin` and `member` to observe permission differences | 1 company, multiple team members |
| Marketplace / listings (browse + create) | `generator` (creates listings) and `receiver` (browses/responds) | Yes — a seller company and a separate buyer company |
| Offers | `generator` (receives/accepts/rejects offers) and `receiver`/`producer` (makes offers) | Yes — two distinct companies |
| Deals (full lifecycle) | Both sides: a `generator`/seller/producer company **and** a `receiver`/buyer company that are **NOT the same company** | **Yes — mandatory two distinct companies** |
| Payment proof | The paying side (buyer/`receiver`) submits; the other side confirms | Yes — both sides of a deal |
| Transport / shipment | `transporter` role, plus the two deal-side companies that request/decide transport | Ideally a 3rd company holding `transporter`, or a company that also holds `transporter` |
| Receipt / completion | Buyer/`receiver` side confirms receipt | Yes — both sides of a deal |
| Sustainability reports & allocations | Buyer/processor (`receiver`) side — allocation happens after a deal/shipment completes | Yes — needs a completed deal, so both sides |
| Contracts / Contract Lite | Contract Lite `seller` and `buyer` (separate vocabulary; payment-free flow) | Yes — a seller and a buyer |
| Admin | An account whose email is on the `VITE_TADWEERAH_ADMIN_EMAILS` allowlist, plus (for any backend admin action) the `ADMIN_API_KEY` — **but note: read-only discovery should not trigger admin write actions** | Admin identity (see Section 4 boundaries) |

### Practical account minimum

- **A single company can hold multiple `mwan_role` values simultaneously** (code-confirmed), so one company could be both `generator` and `receiver` and `transporter` for *viewing* purposes.
- **However, a real end-to-end deal requires two genuinely different companies** — one selling side, one buying side — because a company cannot transact with itself. This is the hard reason at least **two distinct company accounts** are required.
- **Minimum viable set for full coverage (proposal — pending founder confirmation of accounts):**
  1. Company A — holds `generator` (seller/producer side), with an `owner` team member.
  2. Company B — holds `receiver` (buyer/processor side), with an `owner` team member.
  3. A `transporter` capability — either a third Company C, or added to A or B, to observe transport flows.
  4. Additional team members (`admin`, `member`) inside one company to observe team-permission differences.
  5. An admin-allowlisted identity to observe (not mutate) the admin panel.
- **Decided (Section 1, item 4):** the existing `[TEST]` seller/buyer demo accounts are **not** assumed valid. New, dedicated Phase 0 audit accounts are preferred. The matrix below is the required-account list for WS3 to eventually create — no accounts are created by this document.

### Required Test-Account Matrix (planning only — no accounts created yet)

Using the founder-approved naming convention (`[PHASE0-AUDIT]` prefix; see Section 5):

| Account label (proposed) | `mwan_role` | Contract Lite role | Team role | Purpose | Status |
|---|---|---|---|---|---|
| `[PHASE0-AUDIT] Generator Co` | `generator` | `seller` | `owner` | Create listings; receive/accept/reject offers; dispatch; sustainability source side | To be created (WS3, pending approval) |
| `[PHASE0-AUDIT] Receiver Co` | `receiver` | `buyer` | `owner` | Browse marketplace; make offers; submit payment proof; confirm receipt; sustainability allocation | To be created (WS3, pending approval) |
| `[PHASE0-AUDIT] Transporter Co` (or `transporter` role added to one of the above) | `transporter` | — | `owner` | Transport request / quote flows | To be created or merged — decide at WS3 kickoff |
| `[PHASE0-AUDIT] Team Admin` | (within Generator or Receiver Co) | — | `admin` | Observe team-permission differences vs. owner/member | To be created (WS3, pending approval) |
| `[PHASE0-AUDIT] Team Member` | (within same company) | — | `member` | Observe team-permission differences | To be created (WS3, pending approval) |
| Admin test identity | platform admin (email allowlist) | — | — | Observe (not mutate) the admin panel | **Founder input needed — no admin test email named yet (Section 1, item 9)** |

Every account/record created from this matrix must be logged with **role, language (ar/en), timestamp, and purpose** per the run-log requirement in Section 5.

---

## 3. Environment Confirmation Checklist

Updated with founder decisions from 2026-07-02. Remaining open boxes are the actual blockers before WS3.

- [x] **Correct domain confirmed.** `https://tadweerah-staging.web.app` is the primary WS3 target. `tadweerah.com` is secondary/comparison only; `tadweerah.sa` is not approved for use.
- [ ] **Staging vs. production confirmed.** Founder has directed WS3 to target staging explicitly; the underlying "is there truly no separate production DB" question remains an open WS1/WS5 hypothesis, not required to block WS3 since staging is the deliberate choice regardless.
- [ ] **Staging URL health re-check.** `tadweerah-staging.web.app` reportedly rendered a blank shell (Clerk rejected the origin) in a past observation. Not yet re-verified. **This is the first action of WS3**, not WS2 — must succeed before any journey proceeds.
- [x] **Governing profile chosen.** `.ai/profiles/staging-readonly-uat.md` governs WS3 (matches the founder-decided target: deployed staging, anonymous-first, no DB, no mutations). `local-readonly-discovery.md` is not in use since the target is staging, not local.
- [x] **No local server without approval.** Confirmed not applicable — WS3 targets deployed staging, not a local server. This constraint is retained in case that ever changes.
- [x] **Evidence folder proposed.** `docs/phase-0-audit/evidence/` with `screenshots/<role>/` and `run-logs/` subfolders (Section 1, item 8). Final one-line founder confirmation still pending but not blocking.
- [ ] **Account availability confirmed.** The accounts in the Required Test-Account Matrix (Section 2) do not exist yet and require separate approval to create in WS3. Admin test identity additionally requires Section 1 item 9 to be resolved.

---

## 4. Access Boundaries

These boundaries apply **now (WS2)** and continue to apply into **WS3 unless a specific item is separately and explicitly approved**. They restate, in plain terms, the rules already set by CLAUDE.md and the two existing profiles.

- **No database writes.** No inserts, updates, deletes, migrations, seeds, or schema changes. (CLAUDE.md; both profiles.)
- **No database reads beyond what is explicitly granted.** The default is *no direct DB access at all*. A read-only DB path may be used only if the founder explicitly grants one (Section 1, item 5). Observations otherwise come only from the browser UI and read-only network evidence.
- **No code changes, commits, merges, pushes, deploys, installs, or dependency updates.** (CLAUDE.md.)
- **No test-user creation without approval.** Accounts may be created only through the application UI, only after founder approval, and only tagged with the agreed naming convention (Section 5). Never via direct DB writes or scripts. (CLAUDE.md "Test-User Operations.")
- **No test transactions without approval.** No creating listings, offers, deals, payments, allocations, corrections, contracts, or shipments during discovery unless that specific action is explicitly approved.
- **No mutating actions during discovery.** No `POST`/`PUT`/`PATCH`/`DELETE`, no form submissions, no approvals, no allocations, no finalizations, no corrections — unless explicitly approved. (Per `staging-readonly-uat.md` §8.)
- **No secrets ever printed.** No tokens, session data, cookies, local storage, passwords, API keys, or database URLs are to be viewed, inspected, or reproduced in any output. Credentials for test accounts must be delivered out-of-band, never in audit files. (CLAUDE.md; both profiles.)
- **Admin caution.** Even with an admin-allowlisted identity, WS3 discovery should **observe** the admin UI only. Admin backend actions require the `ADMIN_API_KEY` and are all mutating — they are out of scope for read-only discovery unless a specific action is explicitly approved. Admin-journey testing additionally cannot start until a founder-approved admin test email and a confirmed safe `ADMIN_API_KEY` supply method both exist (Section 1, item 9).
- **Real/sensitive-named records are off-limits.** Any record or reference using a real partner/customer name (e.g. "Al Qaryan") must not be used, modified, completed, or built into test flows, even though the platform is otherwise experimental with no real operational company data. (Founder decision, Section 1 item 5.)

**Stop conditions (halt immediately and ask):**

- Login is required and no approved named account is available.
- The app redirects to production (or to a domain other than the approved target).
- A user role is unclear or cannot be determined.
- The environment is ambiguous (unclear whether staging or production).
- Any action would mutate data, or any network request is non-read-only.
- Secrets or tokens may be exposed.
- Browser evidence conflicts with the approved target.

---

## 5. Test-Data Naming Convention (Founder-Approved 2026-07-02)

This supersedes the earlier proposal and builds on precedents already found in the codebase (`[TEST]` demo accounts, and the `[PILOT DEMO]` prefix used by the guarded seeding script `artifacts/api-server/src/scripts/seed-pilot.ts`).

**Approved rule:**

- Any company, user, listing, offer, deal, contract, or other record created for audit purposes must carry one of these prefixes at the **start** of its human-visible name:
  - **`[AUDIT-TEST-20260702]`**, or
  - **`[PHASE0-AUDIT]`**
- Example: `[PHASE0-AUDIT] Generator Co`, `[PHASE0-AUDIT] Receiver Co`, `[PHASE0-AUDIT] Cardboard Listing` (see the Required Test-Account Matrix in Section 2).

**Run-log requirement (mandatory for every test record created):**

- Every test record must be logged with: **role** (which account/vocabulary it represents), **language** (ar/en), **timestamp**, and **purpose** (why it was created / what journey it exercises).
- This run log should live alongside the evidence output — proposed under `docs/phase-0-audit/evidence/run-logs/` (Section 1, item 8).

**Hard rules that go with the convention:**

- **No real customer or company data may be used in any WS3 test activity.** (Founder-stated: platform is experimental with no real company/customer data.)
- **Real-named records are off-limits.** Do not reuse, modify, complete, or build test flows around any record referencing a real partner/customer name — e.g. "Al Qaryan" — even for observation purposes. (Founder decision, Section 1 item 5.)
- This convention is **approved** but not yet in use — no records have been created; creation itself is a WS3 execution action requiring separate approval.

---

## 6. What Is Blocked Before WS3 Can Begin

WS3 (live browser journey testing) **must not start** until all of the following are resolved. Founder decisions on 2026-07-02 closed most items; the remainder are listed as still-open.

**Resolved by founder decision (2026-07-02):**

1. ~~Confirm the correct target domain~~ — **Resolved:** `tadweerah-staging.web.app` is primary; `tadweerah.com` secondary; `tadweerah.sa` excluded.
2. ~~Confirm whether old `[TEST]` accounts are usable~~ — **Resolved:** do not assume valid; use the new Required Test-Account Matrix (Section 2) instead.
3. ~~Confirm the naming convention~~ — **Resolved:** `[AUDIT-TEST-20260702]` / `[PHASE0-AUDIT]`, with mandatory role/language/timestamp/purpose logging.
4. ~~Confirm whether read-only DB access is available~~ — **Resolved:** assume none for now; WS3 is UI-only.
5. ~~Confirm sensitive/real-named-record handling~~ — **Resolved:** real-named records (e.g. Al Qaryan) are off-limits for test activity.
6. ~~Propose an evidence-output location~~ — **Resolved (proposed):** `docs/phase-0-audit/evidence/` with `screenshots/<role>/` and `run-logs/` subfolders — a one-line final confirmation is a small remaining step, not a blocker.
7. ~~Confirm the governing profile~~ — **Resolved:** `.ai/profiles/staging-readonly-uat.md` governs WS3.

**Still open — genuine blockers before WS3:**

8. **Re-check that `tadweerah-staging.web.app` actually loads** (reportedly a blank shell / Clerk origin rejection in the past, not yet re-verified). This is the **first action of WS3** itself.
9. **Name a founder-approved admin test email/account** and **confirm a safe method to supply `ADMIN_API_KEY`** for audit use without printing or storing it in repo files. No admin-journey testing can proceed without both.
10. **Create the accounts in the Required Test-Account Matrix (Section 2)** — this has not happened; it requires separate approval to actually create anything via the UI, which is a WS3 action, not WS2.
11. **Confirm who authorizes the move into WS3**, and obtain that explicit sign-off.

---

## 7. Recommendation

**This planning document (WS2) is complete, updated with founder decisions, and ready for final sign-off.** The environment target, account matrix, naming convention, evidence-folder proposal, and boundaries are all now defined and traceable to either evidence or an explicit founder decision (Section 1). Nothing further needs to be produced for the plan itself.

**WS3 is still NOT approved to begin** — per the founder's explicit instruction accompanying these decisions. Independent of that instruction, three concrete items also remain genuinely open and would need to close before WS3 could responsibly start:

1. **Admin access is unresolved** — no admin test email named yet, and no safe `ADMIN_API_KEY` supply method confirmed (Section 1, item 9). This blocks admin-journey testing specifically, though it does not need to block non-admin journeys.
2. **The staging URL health re-check hasn't happened** — `tadweerah-staging.web.app` reportedly failed to load in a past observation; this must be re-verified as the first action of WS3, not before.
3. **No test accounts have been created yet** — the Required Test-Account Matrix (Section 2) is a plan, not live accounts; creating them is itself a WS3 execution action requiring separate approval.

**Bottom line for the founder:** This plan reflects your decisions and is ready for your final review. When you are ready to authorize WS3, that authorization should explicitly cover: (a) re-checking the staging URL, (b) creating the accounts in the Required Test-Account Matrix, and (c) the admin-access arrangements in item 9. Until that authorization is given, no browser will be opened, no accounts will be created, and no database will be accessed.

---

*Prepared 2026-07-02 under CLAUDE.md Phase 0 rules. WS2 is planning only: no live app access, no user creation, no data creation, no database access, and no code/Git/deploy changes were performed. The only file produced is this one.*
