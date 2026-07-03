# Manual-Assisted Registration Evidence Log — Generator AR + Receiver EN

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Current Platform Audit)
**Scope:** Visual review of screenshots the founder captured while manually registering two WS2 test accounts in a normal browser (bypassing the Turnstile automation blocker). This document does not perform any new browser actions — it is a read-only visual analysis of existing image files. No code, DB, or Clerk changes were made to produce this log.

**Security note (read first):** `receiver-en/step 5.4.png` and `receiver-en/step 5.5.png` contain a real OTP verification code in plaintext and a verification email showing sender IP/geolocation metadata, respectively. **Neither value is reproduced anywhere in this document, or anywhere else in this repo's audit outputs.**

- **Classification: `receiver-en/step 5.4.png` and `receiver-en/step 5.5.png` — "temporary local evidence — delete or redact before commit/sharing."** (`step 5.5.png` is the higher-risk file: it exposes the code, sender IP, and approximate geolocation together.)
- **Founder decision on record (2026-07-03):** all screenshots in the evidence folder are temporary local audit evidence only, not permanent deliverables — they exist to extract/verify findings during Phase 0 and are not to be committed or shared externally, especially any containing OTPs/IPs/geolocation/verification details. At the end of Phase 0, raw screenshots may be deleted or moved once findings are confirmed captured in text (this document is that text capture for these two files). No automatic deletion happens before then.
- **No action taken on these files by this audit** — not deleted, not edited, not moved. Screenshots are only edited/deleted on explicit founder instruction.
- **Text capture confirmation:** every observation these two screenshots would otherwise provide is already captured in the table rows below (OTP-entry screen reached successfully; verification email received from `notifications@tadweerah.com`; message auto-filed to Junk by Outlook) — the raw images are not needed to stand behind these findings.

---

## Task 1 — Screenshot Inventory

### `docs/phase-0-audit/evidence/screenshots/registration/generator-ar/` (9 files)

| # | Filename |
|---|---|
| 1 | `step 0.png` |
| 2 | `step 1.1.png` |
| 3 | `step 1.2.png` |
| 4 | `step 2.png` |
| 5 | `step 3.png` |
| 6 | `step 4.png` |
| 7 | `step 5.png` |
| 8 | `step 6.png` |
| 9 | `step 7.png` |

### `docs/phase-0-audit/evidence/screenshots/registration/receiver-en/` (14 files)

| # | Filename |
|---|---|
| 1 | `step 0.png` |
| 2 | `step 1.1.png` |
| 3 | `step 1.2.png` |
| 4 | `step 1.3.png` |
| 5 | `step 2.png` |
| 6 | `step 3.png` |
| 7 | `step 4.png` |
| 8 | `step 5.1.png` |
| 9 | `step 5.2.png` |
| 10 | `step 5.3.png` |
| 11 | `step 5.4.png` ⚠️ contains OTP code — see security note above |
| 12 | `step 5.5.png` ⚠️ contains OTP email + IP/geolocation — see security note above |
| 13 | `step 6.1.png` |
| 14 | `step 6.2.png` |

**Visual analysis was performed on all 23 images** (this environment can render images directly) — findings below are direct visual observations, not filename/order inference.

---

## Task 2 — Evidence Log by Screenshot

Evidence tier for all rows: **[Screenshot-observed — manual founder session, reviewed visually in this pass]**.

### Account 1 — `[PHASE0-AUDIT] Generator Co`, Arabic, `mmuaibed+seller2@outlook.com` (as actually entered — see Task 3 note on email discrepancy)

| File | Screen/Step | Visible Observation | Hypothesis/Finding | Severity | Maps To |
|---|---|---|---|---|---|
| `step 0.png` | Public homepage (signed out) | Arabic homepage, RTL, nav + hero + "سجّل شركتك"/"تسجيل الدخول" buttons, app-mockup graphic | Baseline — homepage renders correctly in Arabic | Info | WS4 |
| `step 1.1.png` | Onboarding step 1/4 "البيانات الأساسية" (empty) | Fields: اسم الشركة, رقم الجوال, **المدينة (plain bordered text input, no dropdown/chevron)**, رقم السجل التجاري, تصنيف الشركة (optional dropdown) | **City field is free text, not a bilingual master list** — supports Hypothesis #4 | Medium | WS5 |
| `step 1.2.png` | Onboarding step 1/4, filled | Company name "شركة تجريبية (١)", city "الرياض" typed manually, CR "2344", category "أخرى" → free-text sub-field "شركة تقنية معلومات" | Category field also free-texts once "Other" selected — same pattern as city | Low-Medium | WS5 |
| `step 2.png` | Onboarding step 2/4 "النشاط والأدوار" | **Two separate selectors on one screen**: "دور الشركة في منظومة النفايات" (مولّد/مستلم/ناقل) and "ماذا تعمل شركتك؟" (شراء/بيع/معالجة/نقل). This account: Role=Generator, Activity=Sell materials only (clean, no overlap here) | Confirms the two-taxonomy structure exists (see Hypothesis #2 finding, worse in Account 2) | Medium | WS5, WS6 |
| `step 3.png` | Onboarding step 3/4 "التراخيص" | "رقم الترخيص (اختياري)" shown with Issuing Authority defaulting to "موان" (MWAN) and placeholder "MWAN-XXXXX" — **shown to a Generator-only company** | Supports Hypothesis #3 — MWAN license field presented even to a pure generator, though marked optional | Low-Medium | WS6 |
| `step 4.png` | Onboarding step 4/4 "الموافقة" summary | Summary shows: الأنشطة="بيع المواد", الأدوار="مولّد نفايات (Generator)" — clean 1:1 mapping for this account, license field omitted from summary (left blank) | Confirms optional MWAN field can be safely skipped; summary correctly reflects a single, unambiguous role for this account | Info | WS5 |
| `step 5.png` | "بيانات حساب الشركة" (Create account, step 2/3) | Fields: **البريد الإلكتروني للحساب only** + كلمة المرور (password masked, 8-char min). **No personal name field anywhere.** Email shown: `mmuaibed+seller2@outlook.com` | Confirms Hypothesis #5 — only email is captured, no personal name. **Also: actual email used is `+seller2`, not the planned `+generator`** | Medium (UX gap); Info (email discrepancy) | WS4, WS5 |
| `step 6.png` | Email verification step 3/3 | OTP field shown empty (placeholder "000000") — no real code visible in this screenshot | Clean, no sensitive data exposed | Info | — |
| `step 7.png` | `/dashboard` post-registration | **"أهلاً بك، شركة تجريبية (١)"** — greeting uses the **company name**, not a personal name (no "هلا محمد" style greeting exists). Dashboard also shows a "للمشترين: السوق" (For buyers: Marketplace) panel despite this account being Generator-only | Confirms Hypothesis #5 directly (company-name greeting, no personalization possible). Buyer panel shown regardless of declared role — minor role/UI relationship note, may be intentional (anyone can browse market) | Medium (#5 confirmed); Low (buyer panel) | WS4, WS5 |

### Account 2 — `[PHASE0-AUDIT] Receiver Co`, English, `mmuaibed+buyer3@outlook.com` (final; see email discrepancy note)

| File | Screen/Step | Visible Observation | Hypothesis/Finding | Severity | Maps To |
|---|---|---|---|---|---|
| `step 0.png` | Public homepage, English | Fully translated English homepage, mirrored (LTR) layout vs. Arabic version, equivalent content (mockup cards use English labels: "Material listing," "Deal status," "Sustainability report") | Homepage appears properly localized structurally — no broken/untranslated strings observed. Deeper visual-design consistency (spacing, imagery choices) still worth a dedicated WS4 pass | Info | WS4 |
| `step 1.1.png` | Onboarding step 1/4, empty | Same field set as Arabic version, fully translated labels: Company Name, City, Mobile Number, Commercial Registration, Company Category (Optional) | City again a plain text input, no dropdown — consistent with Arabic version | Medium | WS5 |
| `step 1.2.png` | Onboarding step 1/4, empty (near-duplicate of 1.1) | Same as above | Duplicate capture, no new information | Info | — |
| `step 1.3.png` | Onboarding step 1/4, filled | Company Name = "Test recycler company", **City = "dammmam" (typo, free-typed)**, Mobile = "0512345678", CR = "rr44" (obviously placeholder/fake, no format validation), Category = "Recycling Company" (free text) | **Strong, concrete evidence for Hypothesis #4**: a city name typo ("dammmam" instead of "Dammam") was accepted with zero validation — a bilingual master-city dropdown would have prevented this entirely | **Medium-High** | WS5 |
| `step 2.png` | Onboarding step 2/4 "Activity & Roles" | "What does your company do?": Sell materials ✅, Buy materials ✅, Process or recycle materials ✅ (3 of 4). "Company Role in Waste System": Waste Generator ✅, Waste Receiver ✅ (2 of 3). Sub-copy: *"Used to classify your company per MWAN requirements."* | **Strong, concrete evidence for Hypothesis #2**: a company named "Test recycler company" ends up tagged as both Generator AND Receiver, plus three of four activity types — the two selectors overlap heavily and it's unclear which one drives real platform behavior (dashboard sections, matching logic) vs. which is descriptive-only | **Medium-High** | WS5, WS6 |
| `step 3.png` | Onboarding step 3/4 "Licenses" | License Number "mwn 12345" (free text, lowercase, no format check), Issuing Authority = MWAN (dropdown), Expiry Date = 06/30/2028 | License field freely accepts any string; combined with Hypothesis #3, this field is shown/fillable for a company that also self-declared as "Waste Generator," reinforcing the ambiguity about who actually needs MWAN licensing | Low-Medium | WS6 |
| `step 4.png` | Onboarding step 4/4 "Confirm" summary | Summary explicitly shows: **Activities: "Sell materials, Process or recycle materials, Buy materials"**, **Roles: "Waste Generator, Waste Receiver"**, City: "dammmam" (typo persists unchanged into the final summary), License #: "mwn 12345" | Both Hypothesis #2 and #4 visible together in one summary screen — clean, citable single piece of evidence for both | **Medium-High** | WS5, WS6 |
| `step 5.1.png` | "Company Account" (Create Account step 2/3) | Fields: Account email address + Password only, **no personal name field**. Email shown: `mmuaibed+buyer2@outlook.com` | Confirms Hypothesis #5 again (email-only registration) in the English flow too | Medium | WS4, WS5 |
| `step 5.2.png` | Same screen, after first submit attempt | Inline error: **"That email address is taken. Please try another."** for `+buyer2` | Email-uniqueness validation works correctly (positive finding) — but confirms `+buyer2` was already registered from a prior attempt, requiring a retry | Info (validation works); Info (process note) | — |
| `step 5.3.png` | Same screen, retried | New email typed: `mmuaibed+buyer3@outlook.com`, password re-entered | This is the email that was ultimately used to complete registration for Receiver Co | Info | — |
| `step 5.4.png` | Email verification step 3/3 | **Contains a real OTP code typed into the field.** Value intentionally not reproduced here. | Verification-code screen was reached and worked as expected — no functional issue. Screenshot itself is sensitive. | **"Temporary local evidence — delete or redact before commit/sharing."** | — |
| `step 5.5.png` | Screenshot of the actual verification email (Outlook) | **Contains the real OTP code, sender IP address, and a timestamp; contains approximate geolocation metadata — not reproduced.** No values reproduced here. Sender: `notifications@tadweerah.com`; message was auto-filed to Junk by Outlook. | Text capture: email delivered correctly and contained a working code. Secondary finding: the verification email was auto-classified as **Junk/Spam by Outlook** — a deliverability signal worth the founder's attention (not a security issue, but affects real users' first-run experience) | **"Temporary local evidence — delete or redact before commit/sharing."** (highest-risk file — also exposes IP/geolocation); Low-Medium (deliverability finding) | WS4, WS6 |
| `step 6.1.png` | `/dashboard`, English | "Welcome, **Test recycler company** dammmam" — greeting uses company name (not personal name); city shown as raw "dammmam" (typo visible in production UI, not just the form) | Confirms Hypothesis #5 (no personal name) **and** shows the Hypothesis #4 typo now live on the actual dashboard, in English | **Medium-High** | WS4, WS5 |
| `step 6.2.png` | `/dashboard`, **after switching UI language to Arabic** | Interface labels/buttons now fully Arabic ("أهلاً بك", "ملخص نشاطك", etc.) — **but "Test recycler company" and "dammmam" remain untranslated in English**, sitting inside an otherwise-Arabic page | **This is the clearest, most direct evidence in the entire dataset for Hypothesis #1**: company data entered in one language does not adapt to the viewer's selected UI language — it displays exactly as typed, regardless of which language the user is currently viewing the platform in | **High** | WS4, WS5 |

---

## Cross-Cutting Findings Against the Seven Founder Hypotheses

| # | Hypothesis | Status | Key Evidence |
|---|---|---|---|
| 1 | Company data entered in only one language may not adapt to viewer's selected language | ✅ **Confirmed, directly** | `receiver-en/step 6.2.png` — English company name/city persist unchanged inside an Arabic-language dashboard view |
| 2 | Company roles may be duplicated/inconsistent (generator/receiver/transporter vs. seller/buyer/processor/transporter) | ✅ **Confirmed, directly** | `receiver-en/step 2.png` and `step 4.png` — one company selected 3 of 4 "Activities" and 2 of 3 "Roles" simultaneously; both taxonomies coexist on the same screen with unclear relationship |
| 3 | MWAN license may be requested even from waste generators | ✅ **Confirmed (field present), mitigated (optional)** | `generator-ar/step 3.png` — MWAN license field shown to a Generator-only account. It is optional and was left blank without issue, so this is a UX-clarity finding, not a hard blocker |
| 4 | City entered as free text instead of a bilingual Saudi cities master table | ✅ **Confirmed, directly** | `receiver-en/step 1.3.png`, `step 4.png`, `step 6.1.png` — the typo "dammmam" was accepted at entry and persisted unchanged all the way to the live dashboard |
| 5 | Registration captures email only, not full personal name, blocking personalized greetings | ✅ **Confirmed, directly** | `generator-ar/step 5.png` + `step 7.png`, `receiver-en/step 5.1.png` + `step 6.1.png` — no name field exists anywhere in either flow; both dashboards greet by company name |
| 6 | Homepage visual design may be inconsistent with the rest of the platform | ⚠️ **Partially assessed — needs dedicated design review** | `step 0.png` in both folders shows the homepage is content-equivalent and structurally mirrored (RTL/LTR) between languages; a deeper design-consistency audit (typography, spacing, componentry vs. the app itself) was not performed in this pass — **mark as "Needs visual review" for WS4** |
| 7 | Sign-up/sign-in/onboarding screens should be evaluated for design, clarity, data requirements, brand consistency | ⚠️ **Partially assessed** | Positive: clear step-by-step wizard with a progress indicator, consistent branding, working field-level validation (email-uniqueness, required-field messaging). Negative: free-text fields with no format validation (city, CR number, license number all accept arbitrary strings), and the optional-MWAN-license screen offers no guidance on which roles actually need it. **Recommend a full WS4 pass** for a systematic clarity/consistency review beyond what this evidence-driven pass covered |

### Additional findings not on the founder's list

- **Email and company-naming discrepancy — confirmed exactly as shown in evidence, documented (not a blocker):**
  - **Generator Co:** email actually used = **`mmuaibed+seller2@outlook.com`** (planned: `mmuaibed+generator@outlook.com`). Company name actually entered = **"شركة تجريبية (١)"** (Arabic, translates to "Test Company (1)") — **does not carry the `[PHASE0-AUDIT]` naming-convention prefix.**
  - **Receiver Co:** email actually used = **`mmuaibed+buyer3@outlook.com`** (an earlier attempt with `+buyer2` failed with "email already taken"; planned: `mmuaibed+receiver@outlook.com`). Company name actually entered = **"Test recycler company"** — **also does not carry the `[PHASE0-AUDIT]` prefix.**
  - **Roles are correct** for both (Generator Co = generator/seller role; Receiver Co = generator+receiver/buyer+seller+process roles, consistent with a receiver/processor-leaning test account per the role-duplication finding above).
  - Per founder instruction, this is **documented, not treated as a WS2 blocker** — but flagging clearly since neither the email aliases nor the company names match the originally-planned identifiers, which matters for anyone later trying to find/clean up these test records by searching for "PHASE0-AUDIT" or the planned email pattern.
- **Verification email landed in Junk/Spam** (Outlook) for the Receiver Co signup — a deliverability issue worth a founder/engineering look, separate from this audit's scope to fix. (Sensitive-screenshot handling for `step 5.4.png`/`step 5.5.png` is covered once, at the top of this document — see the Security Note.)

---

## Task 4 — Recommendation

See the updated `docs/PHASE_0_WS2_ACCOUNT_PROVISIONING_EXECUTION_LOG.md` for the formal status update. Summary: **WS2 can close for Generator/Receiver core journeys only** — these two accounts are sufficient to exercise the central marketplace → offer → deal → payment → shipment → receipt → sustainability-allocation flow, since that flow structurally needs exactly one selling side and one buying side, both of which now exist. **Transporter Co, Team Admin, and Team Member remain deferred** — they are only needed for transport-specific and team-permission-specific sub-journeys respectively, and can be created later, closer to when those specific WS3 sub-journeys are actually run, rather than blocking WS2 closure now.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules. This document is a read-only visual analysis of pre-existing screenshots. No new browser actions, no accounts created, no forms submitted, no code/DB/Clerk changes, and no secret values (OTP codes, IP/geolocation) were reproduced.*
