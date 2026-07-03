# WS2 Target Pivot Check — tadweerah.com

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**Scope:** Limited target-pivot check only. **Not WS3.** No forms submitted, no sign-up/sign-in attempted, no accounts created, no listings/offers/deals/payments/shipments, no DB access, no code edits, no Clerk/config changes, no deploy, no commit.

**Prior finding on record (unchanged, not re-litigated here):** `https://tadweerah-staging.web.app` is HTTP-healthy but visually/auth-blocked — Clerk rejects the origin with `origin_invalid`, so it is not currently usable as the primary WS3 target unless Clerk origin/domain configuration is changed. No settings were changed to investigate that; this document only checks the alternative.

---

## 1. Visual Result for `/`

✅ **Fully renders.** Full homepage: navigation menu (الرئيسية / كيف تعمل / الخدمات / لمن؟ / الامتثال / عن تدويرة / تواصل معنا), hero heading and description, and both "تسجيل الدخول" (Sign In) and "سجّل شركتك" (Register your company) call-to-action buttons. 4,641 characters of visible text; 29.4 KB of rendered HTML. Zero console/network errors.

Screenshot: `docs/phase-0-audit/evidence/screenshots/public/tadweerah-com-home-2026-07-03.png`

## 2. Visual Result for `/sign-up`

✅ **Fully renders.** The actual Clerk sign-up form appears: "أنشئ حسابك" (Create your account) heading, email field, password field, submit button, and a "Secured by [Clerk]" footer confirming the widget loaded correctly. Zero console/network errors.

Screenshot: `docs/phase-0-audit/evidence/screenshots/auth/tadweerah-com-sign-up-2026-07-03.png`

## 3. Visual Result for `/sign-in`

✅ **Fully renders.** The actual Clerk sign-in form appears: "أهلاً بعودتك" (Welcome back) heading, email/password fields, a mention of an email OTP-code login option, and a link to create a new company account. Zero console/network errors.

Screenshot: `docs/phase-0-audit/evidence/screenshots/auth/tadweerah-com-sign-in-2026-07-03.png`

## 4. Does Clerk Initialize Successfully?

✅ **Yes.** Across all three page loads, **zero requests returned a 400 or any other error status** — a direct contrast with `tadweerah-staging.web.app`, where every page load fired two `origin_invalid` (400) failures to `clerk.tadweerah.com`. This confirms the hypothesis from the prior check: Clerk is configured for the `tadweerah.com` domain family, and `tadweerah.com` itself satisfies that configuration.

## 5. Usable for WS3 Non-Admin Journeys?

**Yes, on the evidence gathered so far.** All three checked pages render completely, the auth widgets load and appear interactive, and no errors were observed. This is a meaningfully different result from the staging URL — not a partial improvement, a clean pass.

## 6. Remaining Environment Risk — Staging-Backed or Only Document-Claimed?

**Not resolved by this check, and worth stating plainly.** This test only observed **frontend rendering and Clerk auth-widget initialization** — it did not and could not determine which backend/database environment `tadweerah.com` actually talks to. The WS1 finding that `tadweerah.com` may be served by staging Firebase/Cloud Run/Cloud SQL infrastructure, with "no separate production DB environment at this time," is **still only a document claim** (from `docs/phase-3b-source-of-truth-audit/21_PHASE_3B_STATUS_AND_NEXT_STEPS.md`) — this check neither confirms nor refutes it. Practically: **the fact that the sign-up form is real and functional here means any test account created on this domain would be a real, live account on whatever backend this domain is wired to** — reinforcing why the naming convention (`[PHASE0-AUDIT]` prefix) and the "no real-named records" rule matter even more once WS3 actually starts here.

## 7. Recommendation

**Founder decision needed between two valid paths — both are now technically viable, this check does not pick one for you:**

- **Option A — Use `tadweerah.com` as the WS3 target.** Supported by direct evidence: full rendering, working auth forms, zero errors, on exactly the domain Clerk is configured for. The unresolved trade-off is the staging-infrastructure question in Section 6 — you'd be testing against a domain whose backend tier isn't independently confirmed.
- **Option B — Fix Clerk's origin configuration to also allow `tadweerah-staging.web.app`.** This would preserve the original staging-only intent (a URL clearly separate from the branded public domain) but requires a configuration change that is explicitly out of scope for this audit to perform (per your instruction: no Clerk/config changes).

**This audit does not recommend one over the other** — that is a founder/engineering call involving factors (domain-separation preference, who can make the Clerk config change, timeline) outside what a read-only file/browser audit can weigh. **WS2 remains blocked until you choose.** Once you do, the corresponding gate (this document for `tadweerah.com`, or a re-run of the prior check after a Clerk fix) is already evidenced and WS3 account creation (per the previously prepared matrix) can proceed on your approval.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. Activity performed: read-only Puppeteer navigation (no clicks/forms/sign-up/sign-in) to exactly the three approved `tadweerah.com` URLs using already-installed tooling, screenshot capture to the approved evidence folder, and this report. No installs, no code edits, no Clerk/config changes, no commits, no deploys, no DB access, no accounts created, no forms submitted, and no secret values were printed or stored.*
