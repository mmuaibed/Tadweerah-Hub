# WS4-A Expanded Core UX, Terminology, Onboarding, Deal Trust & Bilingual Experience Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Method:** Synthesis of existing evidence only — WS2 registration logs/screenshots, WS3 live-journey logs (Batch A, WS3-A, WS3-A2, Batch B-1, Batch B-2A), Transport Responsibility Review, WS5-A, WS5-B, and the WS5→WS4/WS8 transition note. **No new live UI actions were performed.** No code/config changes, no DB access, no admin action, no commits, no deploys, no transport/shipment/receipt/completion action.

---

## 1. Executive Summary

Tadweerah's underlying engineering is more sophisticated and more regulation-aware than a first glance suggests — real VAT handling, MWAN-aligned role modeling, e-Manifest hooks, and a consistent server-side approval gate. The gap between "solid engine" and "enterprise-impressive experience" is concentrated in a small number of specific, fixable places: two live-tested dead-ends (payment-proof upload, the transport-responsibility contradiction), one structural bilingual-data limitation, and a general pattern of the UI not explaining *why* something is blocked when it is. None of this requires a rebuild. Most of it is copy, messaging, and a handful of well-located code fixes already traced in WS5-A/B. The Sponsor's vision of "highly trusted, impressive, bilingual, governed" is achievable on the current platform with a fix-first pass — this review's job is to say exactly where.

**One methodology correction made in this pass, in the interest of rigor:** WS3-A previously stated that "listing/offer content displayed correctly cross-language" between Generator (Arabic) and Receiver (English). Re-checking the raw evidence for this review found that Receiver Co's UI chrome had actually been switched to **Arabic** (by the founder, deliberately, during the WS2 registration screenshots, to demonstrate the bilingual bug) and that setting persisted into all of WS3's automated sessions. **This means the WS3-A "cross-language" listing/offer check was, in fact, an Arabic-to-Arabic comparison, not a genuine cross-language test.** It is corrected here rather than silently left standing, and is listed as a real open item in §14/§15 — a proper Arabic-created/English-viewed (and reverse) check of transactional content has not actually been performed yet.

---

## 2. UX Severity Matrix

| Finding | Area | Severity | Live-confirmed? |
|---|---|---|---|
| Payment-proof "optional" label, required in practice, unreachable error message | Payment proof | **High** | Yes |
| Transport-responsibility contradiction (seller-selected → shown as buyer's) | Deal Details / Transport | **High** | Yes |
| Bilingual company data (single-column schema, no ar/en split) | Bilingual | **High** | Yes (dashboard); structural (schema-confirmed) |
| Generic, non-actionable authorization error messages | Onboarding / Marketplace | **High** | Yes |
| Four-concept role/activity/type/capability model shown without hierarchy | Onboarding | Medium | Yes (WS2 screenshots) + code-confirmed (WS5-B) |
| Free-text city, no validation beyond length | Onboarding / Marketplace / Deal | Medium | Yes |
| Cross-language transactional content — **not actually verified**, correction noted above | Bilingual / Marketplace | Unknown (open item) | No — miscategorized as tested in WS3-A |
| Verification-email deliverability (Junk/Spam) | Onboarding | Medium | Yes |
| `sale_type`/"auction" internal-only naming | Terminology | Low | Code-confirmed, no user-facing impact |
| Deal vs. Contract Lite reference formats | Terminology | Low | Code-confirmed, resolved as expected |
| Print/export output quality | Deal Details | Unknown (deferred) | Not assessable by automation |
| No personal full-name capture | Onboarding | Medium | Yes |

## 3. Journey-by-Journey Findings

**Onboarding (both languages):** Clear multi-step wizard with a visible progress indicator — a genuine strength. Undermined by: no explanation of the roles/activities/license relationship; a license field marked optional that is not practically optional; no personal name captured (dashboards greet by company name only); free-text city/CR fields accept anything of the right length.

**Sign-up/sign-in:** Clean, Clerk-hosted, consistent branding. No issues found beyond the platform-wide bot-protection interaction already documented in WS2 (not a UX defect).

**Marketplace browsing:** Functional, informative cards (material, quantity, city, status, price, seller). Legacy demo listings (`[TEST] Tadweerah Seller Demo`) still visible in the live marketplace — a stray data-hygiene item for a partner-facing environment, not a code defect.

**Listing creation:** A well-structured 3-step wizard. Two problems live-confirmed: the approval-gate error was generic and unexplained (before the founder's manual approval), and the "who's responsible for transport" choice made here is later contradicted downstream (§9).

**Offer submission & acceptance:** The cleanest part of the journey. Correct VAT math, a clear and well-written "this action cannot be undone" confirmation modal for offer acceptance — genuinely good enterprise-grade practice already present in the codebase.

**Payment proof:** The single worst live-tested moment in the whole journey (§7).

**Payment confirmation:** Clean, well-labeled, correct confirmation-modal pattern repeated consistently (a positive sign the *pattern* is right, even where individual screens have gaps).

**Deal Details / transport handoff:** Where the transport-responsibility bug surfaces directly to the user, at the exact moment real money and goods are implied (§9).

## 4. Terminology Consistency Register

| Term (AR) | Term (EN) | Consistency | Source | Confidence |
|---|---|---|---|---|
| دور الشركة في منظومة النفايات / مولّد نفايات / مستلم نفايات / ناقل مرخّص | Company Role in Waste System / Waste Generator / Waste Receiver / Licensed Transporter | Consistent translation pair | i18n / hardcoded label pair | High (internal consistency only — **not market-validated**) |
| ماذا تعمل شركتك؟ (بيع/شراء/معالجة/نقل) | What does your company do? (Sell/Buy/Process/Transport) | Consistent translation pair | i18n | High (internal only) |
| استقبال عروض | receive offers | Consistent **user-facing** pair; diverges from internal DB enum `"auction"`, which users never see | i18n (UI) vs. backend enum (`waste-listings.ts`) | High that this is intentional layering, not a translation error (WS5-A) |
| رقم الترخيص (اختياري) | License Number (Optional) | Consistent translation; **the word "optional" itself is the problem**, not the translation | i18n | High that translation is accurate; High that the underlying claim is misleading (WS5-A/B) |
| بانتظار تأكيد الدفع (حوالة بنكية) / تم تأكيد الدفع / البضاعة في الطريق / مكتملة | (English equivalents not independently confirmed in a genuine English session — see methodology correction, §1) | **Unverified** | i18n keys (`deal.transport.*` etc., confirmed to exist bilingually in code per WS5-A) | Medium — code has both languages defined; live English rendering of deal-lifecycle content not actually observed |
| النقل مسؤولية المشتري / النقل مسؤولية البائع | Transport is the buyer's/seller's responsibility | Consistent translation pair; **the underlying value selecting between them is buggy** (§9), not the translation | i18n (`deal.transport.not_responsible_buyer/_seller`) | High that translation is accurate; the bug is data, not language |
| مَوَن / MWAN | MWAN | Consistent — used as a proper noun/regulatory reference in both languages | i18n + schema comments | **Needs human validation** — is this the correct official rendering/spelling convention Saudi regulators and industry use? |
| البيان الإلكتروني (electronic manifest reference) | Not independently observed in English | Unverified | UI copy (deal page) | **Needs human validation** — official MWAN e-Manifest terminology |
| Material category names (بلاستيك، ورق وكرتون، معادن، إلخ) | Plastic, Paper & Cardboard, Metals, etc. (inferred, not independently confirmed in English UI) | Plausible, not independently verified | `company_actions`/material category lookup tables | **Needs human validation** — Saudi industrial/recycling sector standard terms |

## 5. Bilingual Findings

1. **Structural limitation (WS5-B, code-confirmed):** `companies.name` and `companies.city` are single plain-text columns — there is no way to store an Arabic and an English value separately today. This is the root cause of the dashboard bilingual bug, not a display-logic bug.
2. **UI chrome (navigation, buttons, labels) correctly switches per the active language toggle** — the `I18nProvider`/localStorage mechanism (per WS1) does work for static UI text.
3. **Company-entered free-text data (name, city) does not adapt** — it displays exactly as typed, regardless of viewer language, because there is nothing to adapt (see #1).
4. **Correction (this review):** the WS3-A claim that transactional *content* (listing/offer text) was verified to display correctly cross-language should be treated as **unconfirmed**, since the "English-language" Receiver session used for that check was actually running in Arabic by that point (the founder had switched it during WS2). A genuine cross-language transactional check remains an open item.
5. **Minor recurring artifact:** unit labels (e.g., "1 kg") consistently render in Latin/English characters even inside otherwise-fully-Arabic screens — likely because units are stored/rendered as a fixed abbreviation rather than a translated string. Low severity, but a small, repeated professionalism ding worth a one-line fix.

## 6. Trust and Partner-Readiness Findings

- **Strengths:** consistent, well-written "this cannot be undone" confirmation modals at every consequential step (offer accept, payment confirm) — this is exactly the kind of careful UX a large enterprise counterpart would notice positively. Correct, live VAT math. A genuinely thoughtful MWAN-aligned data model underneath.
- **Weaknesses:** any moment a user hits an unexplained block (generic listing/offer errors, the payment-proof dead button) reads as unfinished, not "governed." The transport-responsibility contradiction is the single most damaging trust moment identified, because it appears to actively assert something false at the exact point a real transaction would involve real goods and money.
- **Regulatory confidence:** the MWAN role model and e-manifest references are a genuine asset for regulator-facing credibility, but the unclear approval/verification audit trail (WS5-B) and the "optional-but-required" license framing would raise questions from a sophisticated institutional reviewer.

## 7. Error/Validation Findings

1. **Listing-creation blocker:** generic "تعذر نشر الإعلان. تأكد من البيانات وحاول مرة أخرى" — never surfaced the real `CompanyIncomplete`/`CompanyPending` reason.
2. **Payment-proof optional label vs. required-in-practice file upload** — the disabled-button condition (`deal-panel.tsx` line 2064) silently blocks submission with zero visible feedback.
3. **Unreachable, otherwise well-written error message** (`deal-panel.tsx` lines 1507-1510: "Please attach the transfer receipt before submitting payment details.") — written correctly by the original developer, but dead code because the disabled-button guard fires first.
4. **Pattern:** every authorization/validation failure observed in this audit shares the same shape — the *system* usually has the right information (a specific error code, a specific message), but the *UI* either shows a generic fallback or never reaches the specific message at all.

## 8. Contract/Deal Details Findings

- **No separate "contract" reference exists** for a marketplace deal — `TDW-2026-9F6688` is derived client-side from the deal's own ID; this is a designed convention (confirmed in WS5-A), not a gap, but worth a one-line explanation somewhere (e.g., a tooltip) so a partner doesn't wonder whether they're missing a "real" contract number.
- **Deal Details tab** (financial summary: settlement type, unit price, estimated/final amount, deal date) is clear and complete for what's shown — no issues found in its own right.
- **VAT breakdown is displayed clearly and correctly** (subtotal, 15% VAT, total) at every stage checked.
- **Print/export** exists but its actual visual output has never been reviewed by a human (WS3-A2) — cannot be assessed for trust/branding quality here.

## 9. Transport-Responsibility UX Impact

- **What happened:** Generator Co explicitly selected "seller" as responsible for transport at listing creation. By the time the deal reached the payment-confirmed stage, the seller's own screen stated *"Transport is the buyer's responsibility"* — the exact opposite of what was chosen, due to a confirmed backend data-propagation gap (root-caused in the Transport Responsibility Review, tracked as **TDW-TRANS-001**).
- **User/business impact:** at the single moment a real transaction would need to coordinate physical logistics, both parties could see contradictory or duplicated calls-to-action about who arranges transport. This is not a cosmetic bug — it could cause a real shipment to stall or double-book.
- **Partner trust impact:** this is precisely the kind of defect that, if seen live by a strategic partner mid-demo, would undermine confidence in the platform's reliability far more than a purely cosmetic issue would.
- **Not retested here**, per instruction — this section is UX-impact analysis of the already-documented bug, not new live verification.

## 10. Screens Acceptable for MVP (Based on Existing Screenshots)

- Public homepage, both languages — clean, well-branded, informative.
- Sign-up / sign-in — clear, consistent, Clerk-hosted.
- Marketplace browsing / listing cards — informative and reasonably professional, provided demo data is curated (no typos left in a partner-facing dataset).
- Offer submission and offer-acceptance flow — the strongest part of the tested journey; correct math, clear confirmation modals.
- Payment confirmation screen itself (once reached) — clear labeling, correct amounts.

## 11. Screens Not Recommended for Partner Demo Before Improvement

- **Payment-proof submission screen** — a live presenter could hit the same dead-end Generator/Receiver Co did, with no way to explain it on the spot.
- **Deal Details / post-payment-confirmation transport view** — actively displays incorrect information; a real risk if demoed live to a partner asking "who arranges transport here?"
- **Company profile / dashboard, if viewed in a different language than the company's data was entered in** — the raw-text bilingual issue is highly visible and undermines the "impressive, bilingual" positioning immediately.
- **Onboarding's license/compliance step**, if a partner tries a live self-signup — they would hit the same unexplained approval wall Generator Co did.
- **Print/export output** — unknown quality; do not demo until a human has actually reviewed the rendered result.

## 12. Recommended Future Fixes (Documented Only — Not Implemented)

*(Consolidated from WS5-A/B; not new work items — restated here for WS4 planning convenience.)*

1. Add the missing `listingExtra` joins for `transport_responsibility` (6 call sites, `deals.ts`) and move the frontend off binary ternaries to a three-state model.
2. Resolve the payment-proof label/behavior mismatch — either make the file genuinely optional end-to-end, or change the label, and ensure the existing well-written error message can actually display.
3. Surface specific authorization error reasons (`CompanyIncomplete`/`CompanyPending`/etc.) in the UI instead of generic fallbacks.
4. Bilingual schema work for `companies.name`/`city` (and `waste_listings.city`) — the structural fix for the bilingual-display issue.
5. Onboarding copy explaining the roles/activities/license/approval relationship in plain language.
6. Fix the "1 kg"-style unit-label language leakage.
7. Perform a genuine cross-language transactional content check (Arabic-created content viewed by a truly English-active session, and vice versa) — this review found the earlier attempt was invalid.
8. Human/manual review of the print/export output.

## 13. Mapping to Workstreams

| Finding | WS4 | WS5 | WS8 | WS9 | WS10 | WS11 |
|---|---|---|---|---|---|---|
| Payment-proof trap | ✓ primary | ✓ (validation logic) | — | ✓ (fix item) | — | — |
| Transport-responsibility bug | ✓ (messaging) | ✓ primary | ✓ (role-gating) | ✓ (fix item) | — | ✓ (Path 1 fix-first candidate) |
| Bilingual schema gap | ✓ (symptom) | ✓ primary (structural) | — | ✓ primary (schema change) | — | ✓ (Path 1/2 comparison criterion) |
| Generic error messaging | ✓ primary | ✓ | — | ✓ | — | — |
| Four-concept role model confusion | ✓ primary | ✓ | — | ✓ (simplify/consolidate) | — | — |
| Terminology register (internal consistency) | ✓ primary | — | — | — | ✓ (feeds terminology unification track) | — |
| Terminology market-fit (Saudi/MWAN/industrial) | — | — | — | — | ✓ primary — human validation required | — |
| Unverified cross-language transactional check | ✓ (open item, needs live test) | ✓ | — | — | — | — |
| Print/export output quality | ✓ primary (pending manual review) | — | — | — | — | — |
| Verification/approval audit-trail clarity | ✓ | — | ✓ | — | — | — |

## 14. Human Validation Required List

- **Saudi terminology:** all MWAN-role and general marketplace terminology (مولّد نفايات، مستلم نفايات، ناقل مرخّص، etc.) — needs confirmation these match how the actual Saudi waste/recycling industry and regulators refer to these roles.
- **MWAN/regulatory wording:** "البيان الإلكتروني" (electronic manifest) and any other MWAN e-Manifest-adjacent copy — needs confirmation against official MWAN terminology.
- **Industrial-sector wording:** material category names and descriptions — needs confirmation against how real Saudi industrial/recycling companies categorize and refer to these materials.
- **ZATCA/invoice/tax wording:** per CR-001 Amendment A6, no invoice/tax language may be used anywhere until legal/ZATCA status is confirmed — this applies to all future payment-request/fee-statement copy, not just what exists today.

## 15. Recommendations

1. **Is WS4-B needed? Yes.** This pass found enough (the invalidated cross-language check, admin screens never visually reviewed at all, the print/export output still unreviewed) to justify a focused WS4-B that specifically: (a) performs a genuine cross-language transactional content check, (b) reviews admin-facing screens for the first time, (c) obtains the pending manual print/export review.
2. **Should the buyer-responsibility transport test be planned before or after WS4-B?** **Prepare the plan now (done separately, per this same instruction set), but recommend actual execution happen alongside or after WS4-B**, not before it — WS4-B's terminology-register work would benefit from capturing the transport/receipt/completion screens' terminology at the same time they're first observed live, rather than as a separate pass.
3. **Should WS8 remain after WS4-B?** **Yes, unchanged from the WS5→WS4/WS8 transition recommendation.** Nothing found here surfaces a new urgent security item that would argue for moving WS8 earlier — if anything, the newly-found "admin screens never reviewed" gap and the transport role-gating impact both benefit from WS4-B's fuller picture first.

---

# WS4-A Expanded Closure Decision

**Date:** 2026-07-03
**Founder decision:** WS4-A Expanded is accepted and closed. The WS3-A methodology correction is treated as a **positive audit-quality correction, not a failure.**

**Status: Completed ahead of baseline, with one open validation item.**

**Accepted outputs:**
- UX severity matrix.
- Journey-by-journey findings.
- Terminology consistency register.
- Bilingual findings.
- Trust and partner-readiness findings.
- Error/validation findings.
- Deal Details / Contract Lite findings.
- Transport-responsibility UX impact.
- MVP-acceptable vs. partner-risk screen classification.
- Human validation list.
- Mapping to WS4 / WS5 / WS8 / WS9 / WS10 / WS11.

**Methodology correction (carried forward as an open item, not a defect in this review):** The earlier WS3-A statement that listing/offer content displayed correctly cross-language is corrected. That conclusion was based on a Receiver session that had been switched to Arabic, not a valid English transactional-content check. Therefore:
- Cross-language transactional content display is **not** treated as verified.
- It is logged as an open validation item: **`PH0-OPEN-AR-EN-001`** (see `docs/PHASE_0_OPEN_VALIDATION_ITEMS_REGISTER.md`).
- It is carried forward to WS6 AR/EN parity review, or to the buyer-responsibility transport exception if that test is later executed with deliberate AR/EN capture.

**WS4-A Expanded is now closed on this basis.** Per standing instruction, it will not be reopened unless new evidence contradicts what's documented here.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This document is synthesis of existing evidence only. No new live UI actions, no code/config changes, no DB access, no admin action, no commits, no deploys, no transport/shipment/receipt/completion action.*
