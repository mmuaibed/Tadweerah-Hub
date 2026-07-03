# Tadweerah Phase 0 — Project Files Intake & Current Understanding Report

---

**Audit date:** 2026-07-02
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**Scope of this pass:** File, document, and source-code intake only. This included reading project documentation, mapping frontend and backend code, inspecting the database schema files, checking Git metadata, and running a pattern-based secrets/hygiene scan. It did **not** include any live browser testing, any test-user creation, any builds/installs/deploys, any database access, or any change to code, files, data, or Git state.

### What this report is (plain language for the founder)

This is the first deliverable of Phase 0: a careful, evidence-backed "baseline" of what the Tadweerah platform *appears* to be, built by reading the project's own files and code. Think of it as taking inventory of a warehouse by reading every label and opening every box we can safely open — **without moving, changing, or shipping anything.**

**What this report is NOT:** it is not a live test of the running website, it is not a security penetration test, and it is not a final verdict. Many of the platform's older planning documents make confident claims ("this was fixed," "this passed testing") — Phase 0 treats those as *hypotheses to be verified later*, not as proven facts. Where this report could confirm something directly by reading the actual code, it says so. Where it could not, it says "Not yet checked" rather than guessing. Nothing here should be read as alarmist; the security-relevant items are flagged plainly so **you** can decide how urgent they are.

---

## How to read this report — Evidence Tiers

Every substantive claim below is tagged with one of four evidence tiers, so you always know *how much to trust it*:

| Tier | Meaning | How much to trust it |
|---|---|---|
| **[Code-confirmed]** | Verified by directly reading the actual source code, config, or schema files in this repository during this audit. | Highest. This is what the platform actually does at the code level. |
| **[Document claim]** | Stated in one of the project's own planning/discovery documents, but **not** independently verified in this pass. A hypothesis from that document's author. | Medium. Could be current, stale, or aspirational. Verify before relying on it. |
| **[Browser-observed — prior doc]** | Reported as seen in a live browser by a *previous* AI/work session, recorded in a document, but **not re-verified** by this audit. | Medium-low. It was observed once, by someone else, at some past date. |
| **[Not yet checked]** | Explicitly not examined in this pass. An open item, not a finding. | None — it's a to-do, not a fact. |

An important principle carried over from the project's own governance documents (`.ai/constitution.md`): **"code-present is not active."** A route or function existing in the code does **not** prove it is reachable, used, or working in the live product. Keep this in mind throughout.

---

## Repository & Environment Structure

**One project, three folders — not three competing versions.** [Code-confirmed / Git-confirmed]

On disk under `C:\Users\user\Documents\Tadweerah-Hub\` there are three sibling folders that can, at first glance, look like three different copies of the platform. They are not. They are three **worktrees** of a single Git repository — the software equivalent of having the same book open to three different pages at once on three desks. All three share one underlying `.git` history (verified via Git plumbing, not guessed):

| Folder | What it is | State at audit time |
|---|---|---|
| `Tadweerah-Hub` | **The canonical (main) working copy.** All findings in this report are anchored here. | Branch `feature/public-homepage-redesign`, HEAD `e208aef`. Was **1 commit behind** its remote (`origin` tip `bd07a0d`, "polish(home): refine Arabic copy and hero sizing"). |
| `Tadweerah-Hub-homepage-redesign` | A checkout parked exactly at the remote's latest homepage commit. | Detached at `bd07a0d` (same as the origin tip above). |
| `Tadweerah-Hub-react-fix` | A checkout for a dependency fix. | Branch `fix/react-peer-resolution`, HEAD `6303dd7`. |

**Founder takeaway:** This is normal, disciplined multi-tasking, not a "which repo is real?" emergency. The only minor housekeeping item is that the main folder is one commit behind its remote — that commit is a small Arabic-copy/hero-sizing polish on the homepage. No action required beyond awareness. **The canonical repository for all Phase 0 work is `Tadweerah-Hub`.**

### Technology stack (confirmed)

- **Structure:** a pnpm monorepo (frontend, backend, shared libraries in one repository). [Code-confirmed]
- **Frontend** (`artifacts/tadweerah`): React **19.1.4** + Vite + TypeScript + Wouter (routing) + TanStack Query + Clerk (auth UI). [Code-confirmed — `react` is `"19.1.4"` in root `package.json`; matches the `pnpm-workspace.yaml` catalog.]
- **Backend** (`artifacts/api-server`): Node/Express 5 + TypeScript + `@clerk/express` + Drizzle ORM. [Code-confirmed]
- **Database:** PostgreSQL via Drizzle ORM; shared schema package in `lib/db`. [Code-confirmed]
- **Authentication:** Clerk, fully delegated. There is **no** local login/password/session/password-reset code anywhere in this repository. [Code-confirmed]

> **Contradiction resolved (good sign):** `docs/PROJECT_MAP.md` claims "React 18." The actual code says React 19.1.4. **The code wins** — `PROJECT_MAP.md` is stale on this specific point. This is a small but useful example of the audit process working: a confident document claim, checked against reality, turned out to be wrong.

---

## Platform Areas

For each area below: **what the code actually contains**, **what the documents claim**, and **what remains unverified.**

### Public Homepage

- **Code:** `artifacts/tadweerah/src/pages/home.tsx`, served at route `/` **only to signed-out users** (signed-in users are redirected to `/dashboard`). [Code-confirmed]
- **Code:** No dedicated public homepage or contact-form API endpoint was found on the backend. The nearest analog, `POST /issue-reports`, requires authentication, so it is **not** a public contact form. [Code-confirmed]
- **Document claim:** The live public site at `https://tadweerah.com` rendered a real landing page anonymously; the `tadweerah-staging.web.app` URL rendered a blank shell because Clerk rejected that origin. [Browser-observed — prior doc]
- **Not yet checked:** Whether any public contact-form API exists outside the mapped backend path.

### Sign-Up & Registration

- **Code:** No backend registration endpoint exists. Sign-up is handled entirely by Clerk on the client via `artifacts/tadweerah/src/pages/sign-up.tsx` (wraps Clerk's hosted `<SignUp>`). After a user is authenticated by Clerk, `POST /companies` creates their company record — which is *onboarding*, not sign-up, from the backend's view. [Code-confirmed]

### Login / Authentication

- **Code:** Fully delegated to Clerk. Frontend `sign-in.tsx` uses Clerk; the auth token is bridged to the API client via `AuthTokenSync` in `App.tsx`. Backend uses `clerkMiddleware()` in `app.ts`, `requireAuth.ts` wrapping Clerk's `getAuth(req)`, and `clerkProxyMiddleware.ts` to make Clerk auth work on custom domains. [Code-confirmed]
- **Code:** There are **no** local session, token, or password tables anywhere in `lib/db` or `schema.sql`. A code comment confirms "all auth configuration is done through the Auth pane" (Clerk). [Code-confirmed]

### Company Onboarding

- **Code:** Multi-step form in `artifacts/tadweerah/src/pages/onboarding.tsx` (company name, city, CR number, category, activities, role selection). [Code-confirmed]
- **Code:** Backend endpoints `POST /companies`, `GET/PUT /companies/mine`, `GET/PUT /companies/mine/capabilities`, `PUT /companies/mine/roles`, `POST /companies/mine/logo`, `GET /companies/search`. Approval gating (pending/approved/rejected/incomplete) lives in `middlewares/requireCompany.ts`, keyed off `companies.license_status`. Tables include `companies`, `company_capabilities`, `company_categories`, `company_actions`. [Code-confirmed]
- **Code:** Member/invite endpoints `GET/POST /companies/members`, `DELETE /companies/members/:user_id`, and `GET /invitations/:id` — the invitation-fetch endpoint has **no auth middleware** (inferred to be an intentionally public invite-acceptance link, but this is not confirmed as intentional). [Code-confirmed that it lacks auth; intent Not yet checked]
- **Document claim:** Onboarding flow is OTP/password via Clerk → company profile submission → admin license approval. [Document claim]

### Company Roles

- **Code:** The real role model is a `company_roles` table plus an enum `mwan_role` = `generator | receiver | transporter`. The code explicitly notes this **replaces a "legacy"** `companies.type` enum (`producer/buyer/carrier`) — and **both still coexist** in the schema, a signal of an in-progress, not-fully-cleaned-up migration. [Code-confirmed]
- **Code:** Frontend uses the same three roles (`generator`/`receiver`/`transporter`), selected in `onboarding.tsx`; role-gated UI examples include a "Carrier section" in `dashboard.tsx` shown only when roles include `transporter`. Member-level role (owner/member) is tracked separately in `company_members.role`. [Code-confirmed]
- **Document claim:** Personas described in docs are Generator/Source (seller/producer), Recycler/Processor + Buyer, Licensed/Qualified Transporter, Admin, and Company Team (with a distinction between "Company Account Owner" and "Email Notification Recipient"). [Document claim — `WORKFLOW_ARCHITECTURE.md` self-labels as "Architecture Intent, NOT current operational truth."]
- **Document claim:** Transport today is "Offline-Assisted" (manual/phone/WhatsApp coordination by ops staff); a full "Licensed Transporter Marketplace" is explicitly labeled a *proposed future*, not built. [Document claim]

### Marketplace / Listings

- **Code:** Frontend pages `marketplace.tsx` (browse), `listing-new.tsx` (create), `my-listings.tsx`, `listing-detail.tsx`. Backend: `GET /listings`, `GET /listings/mine`, `POST /listings`, `DELETE /listings/:id`, `GET /listings/:id`, `POST /listings/:id/close`, `POST /listings/:id/image`. Tables: `waste_listings`, `listing_target_categories`, `listing_required_services`. [Code-confirmed]
- **Document claim:** Listing states are open/filled/expired/cancelled. [Document claim]

### Offers

- **Code:** There is **no** standalone offers page. Offer logic lives inside `listing-detail.tsx` and `deal-panel.tsx`. i18n has an `offer_window.*` key group (24h/3d/7d/14d/30d windows, min/max validation). [Code-confirmed]
- **Code:** Backend: `GET /offers/mine`, `GET /listings/:id/offers/summary`, `GET /listings/:id/offers`, `POST /listings/:id/offers`, `PUT`/`DELETE /listings/:id/offers/mine`, `POST /offers/:id/accept`, `POST /offers/:id/reject`. Admin can block/unblock a company's ability to make offers (`PATCH /admin/companies/:id/unblock-offers`). Table: `listing_offers`. [Code-confirmed]

### Deals

- **Code:** The core component is `artifacts/tadweerah/src/components/deal-panel.tsx`. The deal state machine (`DealStatus` type) is: `active → payment_submitted → payment_confirmed → dispatched → receipt_pending → completed`, with `expired` and `cancelled` as terminal exits. [Code-confirmed]
- **Code:** Backend: `GET /deals/pending`, `GET /deals/:id`, `POST /deals/:id/submit-payment`, `/confirm-payment`, `/confirm-dispatch`, `/confirm-receipt`, `/cancel`, `/extend`. Admin lifecycle controls: cancel / force-complete / reopen / request-payment-resubmission / list / details. Table: `deals`. [Code-confirmed]
- **Code:** A background job `jobs/expire-deals.ts` exists for auto-expiry, but **how or whether it is actually scheduled/triggered in production was not found.** [Code-confirmed the file exists; scheduling Not yet checked]
- **Document claim:** Hard-coded timers govern the lifecycle (31 days active, 8 days payment_confirmed, 72h dispatched, 48h receipt_pending), flagged in docs as needing explicit founder sign-off before pilot use. [Document claim — and see the timer contradiction below.]

### Payment Proof

- **Code:** Handled inside `POST /deals/:id/submit-payment` and `/confirm-payment`; on the frontend, embedded in `deal-panel.tsx` (fields `payment_proof_url`, `payment_submitted_at`, `payment_confirmed_at`, an upload UI, and a `proofUploadError` state). There is **no** separate payment-proof page. [Code-confirmed]
- **Code:** File uploads generally appear to route through `lib/gcs-upload.ts` (Google Cloud Storage), but the exact upload mechanics for payment proof were **not fully traced.** [Inferred from code; exact mechanics Not yet checked]
- **Code:** Admin can force a payment resubmission. [Code-confirmed]

### Transport / Shipment

- **Code:** Standalone frontend page `transport-requests.tsx`; `deal-panel.tsx` also carries dispatch states and a `confirm-dispatch` action. [Code-confirmed]
- **Code:** Backend: `POST /deals/:dealId/transport-request`, `PATCH /deals/:dealId/transport-decision`, `GET /transport-requests/mine|/available|/:id`, `PATCH /transport-requests/:id/:action`, `GET /deals/:dealId/mwan-summary` (+ a PDF summary endpoint), plus quotes endpoints. Shipments: `GET/POST /contracts/:id/shipments`, `POST /shipments/:id/evidence`, `GET /shipments/pending|/:id`, `POST /shipments/:id/dispatch|/receive|/close|/cancel`. Tables: `transport_requests`, `transport_quotes`, `contract_shipments`, `manifest_records` (the last likely tied to MWAN e-Manifest government integration). [Code-confirmed]
- **Document claim / flagged risk:** The transport "quote select" is described as **label-only** in the UI — selecting a quote does **not** actually assign a transporter or notify them. Flagged in docs as a high operational risk. [Document claim — Not yet re-verified in code detail]

### Receipt / Completion

- **Code:** Modeled as deal-panel statuses `receipt_pending → completed` (action `confirm-receipt`); there is **no** separate receipt page — completion is a terminal state of the deal state machine. Backend: `POST /deals/:id/confirm-receipt` (buyer side), `POST /shipments/:id/receive` and `/close` (physical shipment close-out), `POST /contracts/:id/complete` (contract-level completion). [Code-confirmed]
- **Code:** A completion-notification helper `lib/deal-completion-email.ts` exists (its content was not opened this pass). Its existence independently corroborates a document claim that a completion-email helper was added. [Code-confirmed the file exists; content Not yet checked]
- **Document claim:** The old "48-hour wait" receipt-completion gap was resolved in Phase 2-A (buyer confirm-receipt now completes immediately). **This conflicts with** the still-present 48h `receipt_pending` timer in the timer table — see Contradictions below. [Document claim]

### Sustainability Reports

- **Code:** This is a large, heavily-built area. Frontend: `reports.tsx`, `sustainability-allocations.tsx` (list), `sustainability-allocation-detail.tsx` (detail), `sustainability-print.tsx` (print view at `/reports/sustainability/:id/print`). [Code-confirmed]
- **Code:** Backend: `GET /reports/deals`, `/reports/contract-shipments`, `/reports/sustainability`, `/reports/sustainability/:id`; allocation endpoints `GET/POST /sustainability/received-lines*`, `/allocation`, `/allocation/finalize`, `/correction-requests` — all gated by `requireAuth` + `requireCompany`. Logic is well-factored into dedicated services including `sustainability-derivation.ts`, `sustainability-physical-weight.ts`, `sustainability-received-allocation-guard.ts`, `sustainability-received-quantity.ts` (computes reportable/remaining quantity, coverage %, eligibility), and `sustainability-validation.ts`. [Code-confirmed]
- **Code:** Tables — `sustainability_received_lines`, `sustainability_allocations`, `sustainability_allocation_lines`, `sustainability_pathways`, `sustainability_correction_requests`, `sustainability_report_field_config`, `sustainability_reports`. **All of these are absent from root `schema.sql`** (see Schema Staleness below). Correction-requests were added later via migration `0008_add_sustainability_corrections.sql`. [Code-confirmed]
- **Document claim:** The flow is: deal/shipment completes → system derives a "received line" → buyer/processor allocates quantity across GRI-306-aligned pathways (reuse, recycling, energy recovery, disposal, residue/loss) → draft → finalize → optional admin review → report/print. [Document claim]
- **Browser-observed — prior doc:** A buyer test login showed allocation rows in three states (not-eligible, approved, draft), including a record `TDW-CTR-2026-0006-S010` showing 40 received / 35 distributed / 5 remaining (87.5%). [Browser-observed — prior doc]
- **Not yet checked:** The print view `/reports/sustainability/:id/print` was **never actually opened/verified** in any role per the docs. The latter halves (~50%) of the two big sustainability planning docs were not read.

### Admin

- **Code:** Frontend `admin.tsx` (large) + `MasterDataTab.tsx`. Access to *see* the admin UI is controlled by a **client-side email allowlist** — env var `VITE_TADWEERAH_ADMIN_EMAILS` compared to the signed-in Clerk user's email. This check is **duplicated in three files** (`admin.tsx`, `route-guard.tsx`, `topbar.tsx`) rather than centralized. The `/admin` route is notably **not** wrapped in the standard `CompanyRoute` guard — it uses its own separate, weaker allowlist check. [Code-confirmed]
- **Code:** On the backend, all admin endpoints live in `routes/admin.ts` and are gated by `requireAdminKey` — a **shared-secret header check** (`x-admin-key` vs `process.env.ADMIN_API_KEY`). **Admin is NOT a database-backed user or role.** The backend cannot tell *which human* is acting as admin, only that *someone* presented the correct shared key. [Code-confirmed] — see Cross-Cutting Findings for why this matters.
- **Code:** Admin coverage spans companies, stats, issue-reports, deals lifecycle, contracts, audit-log, transport, shipments, findings CRUD, sustainability, notifications. Audit logging exists via `lib/audit.ts` (`logAudit` → `audit_log` table), invoked e.g. on unauthorized admin attempts. Tables `admin_findings`, `admin_notifications` are absent from `schema.sql` (added via migrations 0002–0004). [Code-confirmed]
- **Browser-observed — prior doc:** Admin panel showed governance tabs and platform stats (4 companies, 13 listings, 4 deals at time of observation). [Browser-observed — prior doc]

### Arabic / English Experience

- **Code:** A single bilingual dictionary file `artifacts/tadweerah/src/i18n/index.tsx` — **2,199 lines, ~1,301 keys**, structured as `Record<string, {ar, en}>`. Because both languages live in the same object per key, Arabic/English are **structurally always in parity** — there is no way to have a key present in one language but missing in the other. [Code-confirmed]
- **Code:** Default language is Arabic (`ar`). RTL direction is set on `document.documentElement.dir` based on language and persisted to `localStorage` (`tadweerah_lang`). Language switcher: `language-toggle.tsx`. Clerk's own auth UI is localized separately via `@clerk/localizations` (arSA/enUS) with custom overrides in `App.tsx`. [Code-confirmed]
- **Note on drift:** An older doc said this file was "1829 lines." It has since grown to 2,199 lines — expected drift over time, not a contradiction. [Code-confirmed]
- **Not yet checked:** Actual *rendered* Arabic/English quality, translation accuracy, and RTL correctness in a live browser (structural parity ≠ correct or good translations).

#### Route / feature quick map

| Route | File | Guard | Tier |
|---|---|---|---|
| `/` | `home.tsx` | signed-out only | [Code-confirmed] |
| `/sign-in/*`, `/sign-up/*` | Clerk pages | Clerk | [Code-confirmed] |
| `/onboarding/company` | `onboarding.tsx` | signed-in | [Code-confirmed] |
| `/dashboard` | `dashboard.tsx` | `CompanyRoute` | [Code-confirmed] |
| `/marketplace`, `/listings/*` | listing pages | `CompanyRoute` | [Code-confirmed] |
| `/participations`, `/pending-actions` | deal list views | `CompanyRoute` | [Code-confirmed] |
| `/reports`, `/sustainability/allocations*` | sustainability pages | `CompanyRoute` | [Code-confirmed] |
| `/reports/sustainability/:id/print` | `sustainability-print.tsx` | `CompanyRoute` | [Code-confirmed] |
| `/contracts*`, `/transport-requests`, `/company/*` | respective pages | `CompanyRoute` | [Code-confirmed] |
| `/admin` | `admin.tsx` | **own email allowlist (not `CompanyRoute`)** | [Code-confirmed] |

---

## Cross-Cutting Findings

### 1. Admin authorization architecture (security-readiness item for review — not a confirmed breach)

Putting the two independent code findings together:

- **Frontend:** who can *see* the admin UI = a client-side email allowlist (`VITE_TADWEERAH_ADMIN_EMAILS`), duplicated across three files. [Code-confirmed]
- **Backend:** who can *perform* admin actions = a single shared secret in the `x-admin-key` header (`ADMIN_API_KEY`). No per-admin identity. [Code-confirmed]

**Why this matters, plainly:** the email list decides who sees the admin buttons in normal use, but the *actual* gate on the powerful admin actions is one shared password. Anyone who holds that one key — legitimately or by leak — could call the admin API directly, regardless of their email or identity, and the system could not tell *who* did it (only that the key was correct). This is an **architecture and readiness observation**, presented as a hypothesis for the founder to review — it is **not** evidence of any actual break-in, and no attack was performed. Founder decision needed on whether this model is acceptable for the pilot/production stage. [Code-confirmed architecture; exploitation status Not yet checked and out of scope]

### 2. `schema.sql` is confirmed stale

The root `schema.sql` file **predates the entire sustainability feature** (zero mentions of "sustainability") and is missing multiple tables that exist in the real Drizzle schema + numbered migrations: `company_invitations`, `transport_quotes`, `admin_findings`, `admin_notifications`, and all seven `sustainability_*` tables. **Treat `lib/db` schema files + the numbered migrations (0000–0008) as the real, current database schema — not `schema.sql`.** [Code-confirmed]

### 3. React version contradiction (resolved)

`PROJECT_MAP.md` says React 18; the code says React 19.1.4. **Resolved in favor of the code.** Included here as a concrete example of why documents are treated as hypotheses. [Code-confirmed]

### 4. The "40 / 35 / 5" sustainability quantity discrepancy

Prior browser observation recorded the *same* sustainability record showing **different meaningful numbers on different screens**: the buyer detail screen showed 40 received / 35 distributed / 5 remaining, while the admin list screen showed "40 طن" (the *received* quantity, 40 — not the *distributed* 35). Docs flag this as the **top "source-reading risk"** carried forward. [Browser-observed — prior doc]

The code offers a plausible explanation: the service `sustainability-received-quantity.ts` computes exactly these distinct values (reportable/received vs. remaining vs. coverage). So different screens may simply be displaying *different valid fields* of the same record — which is not necessarily a bug, but **is** a real user-confusion / data-interpretation risk if screens don't label which number they show. **This is a plausible reconciliation, not an independently re-verified conclusion.** [Code-confirmed the computation exists; the cross-screen behavior itself is Not yet re-verified]

### 5. Staging vs. production infrastructure (open, high-priority question)

Documents claim the branded public domain **`tadweerah.com` runs on the *staging* Firebase project and staging Cloud Run / Cloud SQL**, and that **"there is no separate production DB environment"** at this time. If accurate, the public-facing site and any real data would be running on infrastructure labeled "staging." This is a **document claim only** and could not be confirmed from files alone — it would require inspecting the live deployment/secret configuration, which is out of Phase 0 file-audit scope. Flagged as high-priority to verify. [Document claim / Not yet checked]

### 6. Secrets & scratch-file hygiene (needs founder attention — no values reproduced here)

- **Good news, tracked files:** No actual secret *values* were found committed anywhere in tracked Git history (checked AWS/PEM/Clerk/Google/GitHub/Slack/DB-credential patterns — all zero). Source code reads secrets only via `process.env.*` (correct). The `tadweerah-env-variables*` files list env-var **names only**, self-labeled and verified as containing no values. `.env.example` is a template only. `artifacts/tadweerah/.env.local` and `.env.production` exist on disk but are untracked **and** correctly covered by the `.env.*` gitignore rule. [Code-confirmed / Git-confirmed]
- **Needs immediate founder attention, untracked files:** Two files under `scratch/` — `scratch/test-route-auth.js` and `scratch/test-cloud-run.js` — each contain a **hardcoded, live-looking credential** (respectively, a value formatted like a live Clerk secret key, and a value formatted like an admin API token), used in request headers. **No characters of these values are reproduced in this report, by design.** [Code-confirmed that hardcoded values are present; whether they are currently valid is Not yet checked]
- **The specific risk:** the `scratch/` directory is **not** covered by any `.gitignore` rule today (verified — the current `.gitignore` has no `scratch/` entry). These files are safe *only by accident*: a single `git add -A` would commit live-looking credentials into permanent Git history.
- **Recommended founder-approved actions (for a later phase — not performed in Phase 0):** (a) rotate both credential types regardless, as a precaution; (b) remove the hardcoded values from the scratch files; (c) add `scratch/` (and proactively `*.pem`, `*.key`, `*serviceaccount*.json`) to `.gitignore`. The audit has **not** deleted, moved, or edited these files.
- **Related open item:** `READINESS_FINDINGS_AND_RISKS.md` contains the project's own note that `ADMIN_API_KEY` "was exposed during UAT/debug" with a rotation action item that appears **still open/unconfirmed**. Whether it was ever rotated cannot be determined from files alone. [Document claim / Not yet checked]

---

## Contradictions & Ambiguities Requiring Founder Judgment

| # | Contradiction / ambiguity | Status |
|---|---|---|
| 1 | **React version** — `PROJECT_MAP.md` says 18, code says 19.1.4. | **Resolved** (code wins). Included as proof the process works. |
| 2 | **Contract Lite readiness** — `PROJECT_MAP.md §11` says Phase 2-E is "ready for pilot use," yet both it and `READINESS_FINDINGS_AND_RISKS.md` flag Contract Lite as needing a dedicated "Phase-CLT" audit first. Internal tension within the docs. | **Open** — founder judgment needed on true readiness. |
| 3 | **Receipt-completion timer** — docs claim the 48h receipt gap was "resolved in Phase 2-A (completes immediately)," yet the 48h `receipt_pending` timer still appears in the timer table. The timer table may itself be stale. | **Open** — verify actual runtime behavior later. |
| 4 | **Staging vs. production** — docs claim `tadweerah.com` runs on staging infra with no separate production DB. | **Open** — high priority to verify against live environment. |
| 5 | **Was `ADMIN_API_KEY` ever rotated** after its doc-flagged exposure? | **Open** — undeterminable from files. |
| 6 | **Contract Lite notifications / admin UI** — the `AL_QARYAN...UAT_SCRIPT.md` (2026-06-10) says these were out of scope at the time; later docs describe them as active. UAT script may now be stale on these points. | **Open** — verify current state. |
| 7 | **Dead-code email helper** — one doc says `sendDealCompletionEmail` is defined but never called; a later doc says it was "closed" via a separate helper (`deal-completion-email.ts`, which the code confirms exists). Unclear whether the original dead code was removed or just bypassed. | **Open** — code cleanup verification later. |
| 8 | **`READINESS_FINDINGS_AND_RISKS.md`** contains large duplicated/garbled (mojibake) blocks — careless append-editing. Don't assume the later duplicate is "newer" truth. Also carries a self-assigned "9.7/10 readiness score" that should be treated skeptically (self-scored, not an independent result). | **Open** — treat doc with caution. |
| 9 | **Legacy vs. current role model** — `mwan_role` (generator/receiver/transporter) coexists with legacy `companies.type` (producer/buyer/carrier) in the schema; migration appears incomplete. | **Open** — confirm which is authoritative and whether cleanup is needed. |
| 10 | **Waived route-level test** — a Phase 3-B "Batch 1B route-level owner-authenticated test" was **waived/deferred by owner**, not actually performed. A guardrail exists at code/service-test level but was not manually verified through the real authenticated route. | **Open** — verify later. |

---

## Test Data & Real Data

**Founder-provided context (stated as founder input):** the founder describes the platform as experimental, with no real company or customer data. **Nothing found in this file/code audit contradicts that**, and the following evidence is consistent with it:

- **Confirmed test/demo indicators** [Browser-observed — prior doc / Code-confirmed]:
  - Prior browser sessions saw accounts explicitly named **`[TEST] Tadweerah Seller Demo`** and **`[TEST] Tadweerah Buyer Demo`** — clearly demo accounts, even though running on the live `tadweerah.com` domain. [Browser-observed — prior doc]
  - The seeding script `artifacts/api-server/src/scripts/seed-pilot.ts` **guards against production use** (requires `FORCE_PILOT_SEED=true` + manual confirmation when `NODE_ENV=production`) and tags rows with a **`[PILOT DEMO]`** prefix. This is a good-practice signal. [Code-confirmed]

- **Worth the founder double-checking against the "no real data" statement:**
  - `AL_QARYAN_CONTRACT_LITE_UAT_SCRIPT.md` frames **"Al Qaryan"** as a real *prospective* pilot partner, while explicitly calling the environment a "sandbox" / "controlled pilot workspace" to test before "activating production transactions." So a real *company name* appears in pilot framing, though the docs treat the environment as a sandbox. [Document claim]
  - `21_PHASE_3B_STATUS_AND_NEXT_STEPS.md` references a "historical sustainability correction on staging," implying some real/seeded historical data existed on staging that needed correcting — described as "no commercial side-effects." [Document claim]
  - **No document in the reviewed set explicitly confirms a separate, isolated production database exists yet.** [Document claim / Not yet checked]

**Bottom line:** consistent with "experimental, no real customer data," but the Al Qaryan pilot references and the staging-data references are worth the founder explicitly confirming.

---

## Top 10 Things the Founder Should Review

1. **The two `scratch/` files with live-looking credentials** (`scratch/test-route-auth.js`, `scratch/test-cloud-run.js`) — rotate the affected keys, remove the hardcoded values, and add `scratch/` to `.gitignore` before any `git add -A`. Highest-urgency housekeeping item.
2. **Admin authorization model** — a single shared `ADMIN_API_KEY` on the backend with no per-person admin identity; decide if that is acceptable for pilot/production.
3. **Whether `ADMIN_API_KEY` was ever rotated** after the doc-flagged prior exposure.
4. **Staging-vs-production reality** — is `tadweerah.com` really running on "staging" infrastructure with no separate production database?
5. **Contract Lite (Phase 2-E / "Phase-CLT")** — reconcile the "ready for pilot" vs. "needs dedicated audit" tension before any Al Qaryan pilot transactions.
6. **The "40/35/5" sustainability number display** — confirm each screen clearly labels *which* quantity it shows (received vs. distributed vs. remaining).
7. **Al Qaryan pilot framing vs. "no real data"** — confirm whether any real partner data has entered the system.
8. **The main worktree being 1 commit behind its remote** — trivial, but worth a conscious sync decision.
9. **The unauthenticated `GET /invitations/:id` and `GET /lookup/*` endpoints** — confirm these are intentionally public.
10. **`schema.sql` staleness** — decide whether to retire/regenerate it so no one is misled by the outdated file.

## Top 10 Hypotheses That Must Be Verified Later

1. That `tadweerah.com` runs on staging infra with **no** separate production DB. [Document claim]
2. That the buyer's confirm-receipt now **completes immediately** (vs. the still-present 48h timer). [Document claim — contradiction]
3. That the transport "quote select" is **label-only** and doesn't actually assign/notify a transporter. [Document claim]
4. That `/reports/sustainability/:id/print` actually **works** end-to-end. [Not yet checked]
5. That the auto-expiry job `expire-deals.ts` is **actually scheduled** and runs. [Not yet checked]
6. That Contract Lite notifications and admin UI now exist (later docs) vs. absent (UAT script). [Contradiction]
7. That the "dead" completion-email code was actually removed, not just bypassed. [Contradiction]
8. That the buyer auto-block-after-2-failed-receipts happens **silently** with no notification. [Document claim]
9. That Arabic/English *renders* correctly and translations read well in a live browser (structural parity is confirmed; quality is not). [Not yet checked]
10. That the hard-coded lifecycle timers (31d / 8d / 72h / 48h) are the real live values. [Document claim]

## Top 10 Source-of-Truth Values to Protect in Phase 0

*(The reliable references future work should anchor to, and the traps to avoid.)*

1. **`lib/db` schema files + migrations 0000–0008** = the real current database schema. **Do not trust root `schema.sql`.**
2. **Root `package.json` / `pnpm-workspace.yaml`** = the real dependency versions (React 19.1.4). **Do not trust `PROJECT_MAP.md`'s "React 18."**
3. **`artifacts/tadweerah/src/App.tsx`** = the single, authoritative frontend route table.
4. **`artifacts/tadweerah/src/i18n/index.tsx`** = the single bilingual dictionary (ar/en always paired).
5. **`artifacts/api-server/src/routes/*` + `middlewares/*`** = the real API surface and its guards (`requireAuth`, `requireCompany`, `requireAdminKey`).
6. **`deal-panel.tsx` `DealStatus` type** = the real deal state machine, not the prose in docs.
7. **The `mwan_role` enum (generator/receiver/transporter)** = the current role model; `companies.type` is legacy.
8. **`docs/PROJECT_MAP.md` (dated 2026-06-30)** = the most current, best-structured doc — but still a hypothesis, and wrong on React.
9. **The `.git` history and `git worktree list`** = proof that the three folders are one repo (canonical = `Tadweerah-Hub`).
10. **The Phase 0 governance files (`CLAUDE.md`, `.ai/constitution.md`)** = the rules this audit and all Phase 0 outputs must obey ("documents are hypotheses"; "code-present is not active"; never print secrets).

## Confirmation: No Code, Data, or Deployment Changes Were Made

**This Phase 0 pass made no changes of any kind to the platform, its data, or its deployment.** The only file created is this report itself (`docs/PHASE_0_PROJECT_FILES_INTAKE_AND_CURRENT_UNDERSTANDING.md`), as explicitly required by the Phase 0 first task.

**What WAS performed (all strictly read-only):**
- Read-only review of project documentation and planning files (`.ai/`, `docs/`).
- Read-only mapping of frontend source (`artifacts/tadweerah`) and backend source (`artifacts/api-server`, `lib/db`).
- Read-only inspection of the database **schema files** (never the database itself).
- Read-only Git **metadata** inspection (branch/commit/worktree/ignore status) — no state-changing Git commands.
- A **pattern-based** secrets/hygiene scan that identified file paths and credential *patterns/types* only — **no secret values were ever viewed, printed, or reproduced.**

**What was explicitly NOT performed:**
- No live browser testing and no re-verification of prior browser observations.
- No test-user creation and no UI walkthroughs.
- No builds, installs, dependency updates, or deployments.
- No database access, reads, writes, or migrations.
- No file edits, moves, or deletions (including the flagged `scratch/` files).
- No Git state changes (no commit, push, pull, merge, branch change, or checkout).
- No permission, access, or security-setting changes, and no penetration testing or active security probing.

*Prepared 2026-07-02 under CLAUDE.md Phase 0 rules. All findings are evidence-tagged; items marked "Not yet checked" or "Document claim" are open questions, not verified facts.*
