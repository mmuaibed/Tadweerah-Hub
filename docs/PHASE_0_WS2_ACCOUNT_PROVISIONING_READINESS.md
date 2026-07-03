# WS2 Account Provisioning Readiness

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**Scope:** Planning/readiness only. **Not WS3.** No accounts created, no sign-up forms submitted, no login attempted, no test transactions, no DB access, no code/config/Clerk changes.

---

## 1. Confirmed WS3 Target

- **Target:** `https://tadweerah.com`
- **Scope:** **Non-admin journeys only.**
- **Admin journey:** **Deferred** (Section 5).
- **Status on record:** WS2 Gate 2 target selection — **Passed for non-admin journeys.**
- **Environment classification (carried forward, unchanged by this document):**
  - Frontend/auth: **visually confirmed** on `tadweerah.com` (full rendering, working Clerk sign-up/sign-in forms, zero errors — see `PHASE_0_WS2_TARGET_PIVOT_CHECK_TADWEERAH_COM.md`).
  - Backend/DB tier: **Unknown / document-claimed staging-backed** — not independently confirmed by any browser or file check performed so far.
- `https://tadweerah-staging.web.app` remains **not in use for WS3** unless Clerk's origin configuration is changed later. No Clerk settings have been or will be changed here.

---

## 2. Required Non-Admin Accounts

| Account | Status |
|---|---|
| `[PHASE0-AUDIT] Generator Co` | Not yet created |
| `[PHASE0-AUDIT] Receiver Co` | Not yet created |
| `[PHASE0-AUDIT] Transporter Co` (or a `transporter` capability added to one of the above) | Not yet created |
| `[PHASE0-AUDIT] Team Admin` | Not yet created |
| `[PHASE0-AUDIT] Team Member` | Not yet created |

Unchanged from the prior matrix — no accounts exist yet.

---

## 3. Email/Account Options

Three practical paths, from code + platform evidence gathered so far:

- **(a) Separate founder-provided email addresses** (e.g. distinct real inboxes you control) — most straightforward, no dependency on alias support, but requires you to have or create that many distinct addresses.
- **(b) Email aliasing** (e.g. `founder+phase0-generator@yourdomain.com`, `founder+phase0-receiver@yourdomain.com`) — **likely to work.** Two supporting facts: (1) no email-format validation exists anywhere in the audited frontend code (`artifacts/tadweerah/src`) — sign-up email input is passed directly to Clerk's hosted widget with no app-level regex restricting the format; (2) Clerk's own sign-up widget generally accepts standard RFC-valid addresses, and plus-addressing is a standard email format most mail providers (Gmail, Google Workspace, Outlook/M365 with a rule, etc.) deliver correctly to the base inbox. **Caveat:** Clerk's *dashboard* configuration (not visible in this repo) could in principle restrict or normalize plus-tags for deduplication purposes — this repo cannot confirm or rule that out. The safest way to confirm is to try creating exactly **one** aliased account first (see Section 7) before committing to the pattern for all five.
- **(c) Clerk Dashboard / manual invitation**, if you'd prefer not to use self-sign-up for some accounts — this repo's code shows a company-level invitation flow (`GET /invitations/:id`, `/invite/:id` route) for adding *team members* to an *existing* company, but this is separate from Clerk-level user invitation for brand-new accounts. If you prefer manual provisioning via the Clerk Dashboard directly (bypassing the public sign-up form entirely), that is a Clerk-admin action outside this repo and outside this audit's visibility — it would need to be done by whoever holds Clerk Dashboard access, with credentials handed over through your existing safe channel, never through this audit.

**Recommendation:** use **(b) email aliasing** for the two founding company accounts (Generator Co, Receiver Co) if you're comfortable with it — it's the lowest-friction option and evidence suggests it should work — falling back to (a) or (c) if the first attempt fails.

---

## 4. Per-Account Detail

| Account | Proposed email label | Company name (naming convention) | Role/capability needed | Purpose in WS3 | Timing |
|---|---|---|---|---|---|
| Generator Co | `<founder-email>+phase0-generator@<domain>` (or a separate address, option a/c) | `[PHASE0-AUDIT] Generator Co` | `mwan_role: generator` (+ `seller` in Contract Lite) | Create listings; receive/accept/reject offers; dispatch; sustainability source side | **Before** first non-admin journey — this is the first account WS3 will need |
| Receiver Co | `<founder-email>+phase0-receiver@<domain>` | `[PHASE0-AUDIT] Receiver Co` | `mwan_role: receiver` (+ `buyer` in Contract Lite) | Browse marketplace; make offers; submit payment proof; confirm receipt; sustainability allocation | **Before** first non-admin journey — a deal needs both sides to exist |
| Transporter Co (or capability) | `<founder-email>+phase0-transporter@<domain>` | `[PHASE0-AUDIT] Transporter Co` (or add `transporter` to Generator/Receiver Co) | `mwan_role: transporter` | Transport request/quote flows | Can be created **during** the first WS3 setup action, once it's decided whether this is a 3rd company or a role added to an existing one (founder/WS3-kickoff decision, not resolved here) |
| Team Admin | `<founder-email>+phase0-teamadmin@<domain>` | (added inside Generator or Receiver Co) | Team role: `admin` | Observe owner/admin/member permission differences | Can be created **during** WS3, once the parent company (Generator or Receiver Co) exists — team invites happen from inside a company |
| Team Member | `<founder-email>+phase0-teammember@<domain>` | (same company as Team Admin) | Team role: `member` | Same purpose as above, opposite permission level | Same — **during** WS3, after parent company exists |

**Why Generator Co and Receiver Co must exist first:** every other row in this table either depends on one of these two companies already existing (team roles are added *inside* a company) or is most naturally exercised once a deal is possible (which needs both sides). Transporter can go either way depending on your preference.

---

## 5. Admin Status

🔴 **Deferred**, unchanged. Admin journey testing will not begin until both:
- a founder-approved admin test email/account is named, and
- a safe method to supply `ADMIN_API_KEY` for audit use is confirmed — without printing, storing, or committing it anywhere in this repo.

Nothing in this document requests or assumes progress on either item.

---

## 6. Safety Rules (restated, in force for all of the above)

- No passwords printed, anywhere, ever, in any audit document.
- No secret values (`ADMIN_API_KEY`, Clerk keys, tokens, session data) printed or stored in this repo.
- No real company names used for any test account — only the `[PHASE0-AUDIT]` naming convention.
- No use of "Al Qaryan" or any other real partner/customer name or record, in any capacity.
- No listing, offer, deal, payment, shipment, or contract created yet — that is WS3 execution, not this readiness step.
- No database access of any kind.
- No code, configuration, or Clerk-settings changes.

---

## 7. Final Recommendation

**WS2 can close for non-admin journeys as soon as you provide or approve the test-account email addresses** (Section 3/4). Everything else needed to proceed is now in place: the target domain is confirmed working (Section 1), the account matrix and creation order are fully specified (Sections 2 and 4), and the naming/safety rules are settled (Section 6).

**Suggested minimal next input from you:** either (i) confirm you're comfortable with the `+phase0-<role>@<yourdomain>` aliasing pattern for Generator Co and Receiver Co (and I'll note the exact two addresses to use), or (ii) provide two separate addresses directly, or (iii) tell me you'll provision these manually via Clerk Dashboard instead. Once that's answered, **WS2 is fully ready to close for non-admin journeys**, and the first WS3 action would be creating Generator Co and Receiver Co through the real sign-up form at `https://tadweerah.com/sign-up` — which still requires your separate, explicit go-ahead to actually begin, per your standing instruction not to start WS3 yet.

**Admin remains a separate, still-blocked track** regardless of the above (Section 5).

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This document is planning/readiness only: no accounts created, no forms submitted, no login attempted, no test transactions, no DB access, and no code/config/Clerk changes were made.*
