# Phase 0 Open Validation Items Register

**Created:** 2026-07-03
**Purpose:** Track items that were flagged, investigated, or corrected during Phase 0 but remain **open** — not resolved, not verified, and not to be assumed true or false until explicitly closed. This register exists so open items are tracked centrally rather than buried inside individual workstream logs.

---

## PH0-OPEN-AR-EN-001

**Title:** Cross-language transactional listing/offer/deal content display not yet validly verified.

**Description:** Earlier WS3-A evidence was reclassified because the supposed English-side Receiver session had actually been switched to Arabic (by the founder, during WS2 registration, to demonstrate the bilingual dashboard bug), not a genuine English-active session. Therefore, whether listing/offer/deal transactional content displays correctly when created in one language and viewed in the other **remains unverified** — the only confirmed cross-language finding on record is the dashboard company-name/city bug (WS2), not the transactional layer.

**Impact:**
- AR/EN parity.
- Partner demo confidence.
- Bilingual trust.
- WS6 evidence completeness.

**Recommended resolution:**
- Resolve during **WS6 AR/EN parity review**, or
- Resolve during the **buyer-responsibility transport exception**, if later approved, by deliberately capturing genuine Arabic and English views at listing, offer, deal, payment, transport, receipt, and completion stages (i.e., ensuring each account's UI language toggle is explicitly set and confirmed before each capture, not assumed from onboarding-time settings).

**Status: Open.**

---

## PH0-OPEN-UNIT-LABEL-001

**Title:** Root cause of the "1 kg"-style unit-label rendering leak inside Arabic screens is unverified.

**Description:** WS4-A §5 visually observed unit abbreviations (e.g., "kg") rendering in Latin characters inside otherwise fully-Arabic screens. The Antigravity external review (EXT-AG-003) proposed this was caused by `i18n/index.tsx` lines 466-474 lacking localized strings; Claude Code independently verified those lines and found complete, correct Arabic unit translations already present (`كجم`, `طن`, etc.). **That citation is rejected as the root cause.** The underlying visual issue remains real and open; the actual cause (likely a component hardcoding an abbreviation instead of using these i18n keys) has not been traced.

**Impact:** AR/EN parity; minor but repeated professionalism issue on bilingual screens.

**Recommended resolution:** Resolve during WS6 AR/EN parity review, or via a dedicated technical (Codex-scope) code trace if Codex is later activated.

**Status: Open.**

## PH0-OPEN-EXT-AG-SCHEDULE-001

**Title:** Antigravity log showed "Used tool: schedule" — founder-side environment check needed.

**Description:** During the first Antigravity external review run, its log reportedly included a "Used tool: schedule" entry. No evidence of any resulting scheduled/background task was found in this repository (no new files, no workflow/CI changes). Claude Code could not verify Antigravity's own execution environment from this side.

**Resolution (2026-07-03):** Founder reviewed the full Antigravity session log directly. The entry was immediately followed by "I am locating the Tadweerah repository files and the required Phase 0 documentation on your system to begin the review" — an internal execution/status indicator, not a recurring task, automation, or scheduled action. No such action appears anywhere in the session log. **Not treated as a boundary breach.**

**Related minor process note:** Antigravity's broad read-only file search under `C:\Users\user` (rather than starting from the repo path) showed no evidence of secret reproduction, code/config changes, DB/admin/live access, commit, deploy, or deletion. The specialist prompt has been tightened accordingly (see `PHASE_0_ANTIGRAVITY_SPECIALIST_TERMINOLOGY_UX_PROMPT.md`).

**Status: Resolved — 2026-07-03.**

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This register will be updated as items are opened or closed; items are never deleted, only marked resolved with a closure note and date.*
