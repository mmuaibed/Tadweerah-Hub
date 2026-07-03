# WS2 Blocker Resolution — Visual Health & Account Path

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**Scope:** WS2 Blocker Resolution only. **Not WS3.** No accounts created, no forms submitted, no login attempted, no full journeys, no dependency installs, no code edits, no DB access.

---

## 1. Browser Automation Availability

✅ **Available without any install.** `puppeteer` (v24.43.1) is already a root `devDependency` in `package.json` and already present in `node_modules` (installed previously for the project's own Mermaid-diagram PDF export tooling — see `docs/pre-phase-3b-visual-journey/exports/EXPORT_MANIFEST.md`). A Chromium binary was already cached locally at `C:\Users\user\.cache\puppeteer\chrome\` (three versions found; the newest, `win64-150.0.7871.24`, was used). **No `npm install`, `pnpm install`, `npx`, or `playwright install` was run** — the existing installation was used exactly as-is via an explicit `executablePath`, which also avoided triggering any auto-download logic.

---

## 2. Visual Health Result

**Checked exactly the three approved URLs. No clicks, no typing, no form submission, no login.**

| URL | HTTP status | What actually rendered | Screenshot |
|---|---|---|---|
| `https://tadweerah-staging.web.app/` | 200 | **Blank — zero visible text on the page** | `docs/phase-0-audit/evidence/screenshots/public/staging-home-2026-07-03.png` |
| `https://tadweerah-staging.web.app/sign-up` | 200 | Only the header/nav bar text ("الدعم" / "English") — **no sign-up form ever appears** | `docs/phase-0-audit/evidence/screenshots/auth/staging-sign-up-2026-07-03.png` |
| `https://tadweerah-staging.web.app/login` | 200 | The app's own "404 Page Not Found" screen (this exact path isn't a real route — the actual route is `/sign-in`, per code; not itself a failure) | `docs/phase-0-audit/evidence/screenshots/auth/staging-login-2026-07-03.png` |

**Visual/browser health: FAIL — confirmed, not just suspected.**

**Root cause identified precisely** (via read-only network inspection during the same page loads): every page load fires two failing requests to Clerk's auth backend:

```
https://clerk.tadweerah.com/v1/client   → 400
https://clerk.tadweerah.com/v1/environment → 400
```

Both return the same error: **`"Invalid HTTP Origin header" / code: "origin_invalid"`** — Clerk is configured to only accept requests whose origin matches or is a subdomain of `tadweerah.com`. Because the page is loaded from `tadweerah-staging.web.app`, Clerk refuses to respond, the app's authentication layer never finishes initializing, and the rest of the page never renders. **This is a domain/configuration mismatch, not a bug in the audited application code**, and it exactly matches what a prior discovery document had reported (but not proven) months ago — it has now been independently reconfirmed with fresh, direct evidence.

Full raw output and screenshots are saved under `docs/phase-0-audit/evidence/` (run logs: `2026-07-03_staging-visual-check.md` and `-raw.json`).

---

## 3. Sign-Up Path Status

**Not practically available on `https://tadweerah-staging.web.app` right now.** The sign-up page loads its shell, but Clerk's embedded sign-up widget never appears because of the origin-mismatch failure in Section 2 — there is no form to fill in, let alone submit. This isn't a restriction I applied; it's what actually happens when the page loads, observed directly.

This is not necessarily true of every domain — the fact that Clerk's proxy is reachable at `clerk.tadweerah.com` (a `tadweerah.com` subdomain) suggests the app's auth is currently configured to work from the `tadweerah.com` family of domains, not `tadweerah-staging.web.app`. This was not tested here (out of the three approved URLs, none is on `tadweerah.com`), but it is a direct, evidence-based reason to revisit which domain WS3 should target.

---

## 4. Account Creation Approval Request — Prepared, but Currently Blocked

Per your instruction, here is the minimum account set for non-admin WS3, ready to execute **once the environment issue in Section 2 is resolved**:

| Account | Purpose |
|---|---|
| `[PHASE0-AUDIT] Generator Co` | Generator/seller side — listings, offers, dispatch |
| `[PHASE0-AUDIT] Receiver Co` | Receiver/buyer side — offers, payment, receipt, sustainability allocation |
| `[PHASE0-AUDIT] Transporter Co` (or a `transporter` capability added to one of the above) | Transport request/quote flows |
| `[PHASE0-AUDIT] Team Admin` | Observe owner/admin/member permission differences |
| `[PHASE0-AUDIT] Team Member` | Same |

Admin test identity remains **deferred**, unchanged from prior gates.

**This request cannot be executed today** — not because of a scope restriction, but because the sign-up form itself does not load on the currently-approved target. It becomes actionable as soon as one of the following happens:
- **(a)** the Clerk origin configuration is updated to also allow `tadweerah-staging.web.app`, or
- **(b)** you approve switching the primary WS3 target to `tadweerah.com` (or another domain confirmed to be in Clerk's allowed-origin list), or
- **(c)** some other environment fix is applied and re-verified.

No accounts have been created. No sign-up form was submitted.

---

## 5. Remaining Blockers

1. **Clerk origin/domain mismatch on `tadweerah-staging.web.app`** — newly confirmed root cause; this is an environment/configuration issue, not something a file-based audit can fix. Needs a founder/engineering decision: fix the Clerk config, or change the WS3 target domain.
2. **Primary WS3 domain decision may need revisiting** in light of this new evidence — this is exactly the kind of finding that should prompt reconsidering the earlier domain decision, per your own instruction to reopen findings when new evidence contradicts them. Flagging for your decision, not deciding it myself.
3. **No accounts exist yet** — blocked on #1/#2 above.
4. **Admin access still unresolved** — test email + safe `ADMIN_API_KEY` delivery method, unchanged from prior gates.
5. **WS3 authorization** not yet given (and not requested here).

---

## 6. Recommendation

**WS2 Gate 2: still blocked.**

This is not the "narrow and clear, nearly closed" state from the previous gate — new direct evidence has surfaced a concrete, root-caused platform issue on the currently-approved target: **authentication cannot initialize on `tadweerah-staging.web.app` at all**, for any role, admin or otherwise. This blocks non-admin journeys just as much as admin ones, so "passed for non-admin journeys" would not be accurate.

**What would unblock it:** a founder/engineering decision on Section 4's options (a/b/c) — most likely either fixing Clerk's allowed origins, or approving a re-check of `tadweerah.com` as the primary WS3 target given it appears to be the domain Clerk is actually configured for. Once staging (or an alternate approved domain) actually completes a sign-up, the account-creation request in Section 4 is ready to execute immediately.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. Activity performed: read-only Puppeteer navigation (no clicks/forms/login) to exactly the three approved URLs using already-installed tooling, screenshot capture to the approved evidence folder, and this report. No installs, no code edits, no commits, no deploys, no DB access, no accounts created, no forms submitted, and no secret values were printed or stored.*
