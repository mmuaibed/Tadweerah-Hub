# WS8 — Cybersecurity, Compliance & Enterprise Readiness Review

**Date:** 2026-07-03
**Prepared under:** CLAUDE.md — Phase 0 (Read-Only Platform Audit), CR-001 / Plan Addendum v1.1
**Method:** Synthesis of WS1-WS5 findings plus targeted read-only source inspection (`artifacts/api-server/src/routes/{admin,deals,companies,listings}.ts`, `artifacts/api-server/src/middlewares/*`). **This is not penetration testing, not a security certification, and does not claim the platform is secure.** No attacks, scans, brute-force tests, stress tests, or intrusive checks were performed. No new live UI actions, no admin use, no DB access, no code/config changes, no commits, no deploys, no permission changes, no document deletion. No secret values are reproduced anywhere in this document.

---

## 1. Executive Summary

Tadweerah's **company-level** authorization is genuinely solid — `requireCompany()` is a single, well-documented, consistently-applied gate (confirmed across listings, offers, and deals in WS5-A/B/C). The **admin-level** authorization is the opposite: a single shared secret (`ADMIN_API_KEY`, compared via a raw header check) gates a very large surface — company approval, license status changes, deal cancel/force-complete/reopen, shipment cancel/restore, transport-quote decisions, and the audit log itself — with no per-admin identity, no role granularity, and no session-based accounting of *which human* performed a given admin action. This is the single most important structural finding in this review. Alongside it: the payment-proof value is accepted by the backend as a plain string with only a non-empty check — no evidence was found of server-side validation that it is a real, reachable file. Both findings are code-confirmed observations, not exploited vulnerabilities — no attack was attempted. Everything else (environment separation, data exposure, terminology/compliance risk) is a continuation of findings already tracked in WS1-WS5, now consolidated into one enterprise-readiness picture.

## 2. Security-Readiness Register

| Finding | Class | Status |
|---|---|---|
| Single shared-secret admin authorization, no per-user identity | Authorization design gap | Code-confirmed |
| Payment-proof value accepted as unvalidated string | Data-integrity gap | Code-confirmed |
| `requireCompany()` consistent company-level gate | **Positive finding** | Code-confirmed (WS5-A/B/C) |
| Transport-responsibility data-propagation bug (TDW-TRANS-001) | Data-integrity / authorization-adjacent | Confirmed (WS3/WS5-A) |
| `tadweerah-staging.web.app` Clerk `origin_invalid` | Environment-separation gap | Confirmed (WS2) |
| No visible approval/verification audit trail on company profile UI | Trust/auditability gap | Confirmed (WS5-B) |
| Admin audit log exists (`/admin/audit-log`) | **Positive finding** | Code-confirmed |
| No invoice/tax-invoice language present today | **Positive finding (correct current state)** | Code-confirmed (WS5-C) |
| City/location free text, no master data | Data-quality / trust gap | Confirmed (WS2/WS3/WS5-B/C) |
| Bilingual company data — single-column schema | Data-model gap | Confirmed (WS5-B) |

## 3. Authorization and Role-Gating Findings

- **Company-level gate (`requireCompany()`):** a single, well-documented function applied consistently to listings, offers, and deal routes (WS5-B §4). Default behavior blocks `rejected`/`null`/`pending` companies from all mutating requests unless a route explicitly opts in (`allowUnapproved`, used only for profile-update routes). **This is a genuine strength** — one shared primitive, not duplicated or inconsistently reimplemented per route.
- **Generator/Seller and Receiver/Buyer permissions:** both roles pass through the identical `requireCompany()` gate; no evidence of role-specific privilege escalation risks within the non-admin surface.
- **Offer/listing approval gate:** confirmed to use `license_status`, not a separate approval flag — consistent, single source of truth (WS5-A/B).
- **Deal access:** gated the same way; no anonymous or cross-company deal access path found in this pass.
- **Payment proof:** the *submission* path is properly gated by company membership/approval; the *value itself* is weakly validated (see §6).
- **Seller payment confirmation:** gated consistently with the rest of the deal-mutation surface.
- **Transport action exposure:** the transport-responsibility bug (TDW-TRANS-001) is a data-correctness defect, not an authorization bypass — a user sees the wrong *information*, not another company's *data*. Still worth tracking here because a wrong responsibility display could lead a user to attempt (or skip) a transport action they shouldn't.
- **Admin-related assumptions:** the non-admin authorization model does not rely on or reference the admin model at all — they are architecturally separate, which is good hygiene, but means the admin model's weaknesses (§4) aren't mitigated by anything on the company side.

## 4. Admin Access and Governance Findings

**This is the most significant finding in this review.**

- The backend admin surface (`artifacts/api-server/src/routes/admin.ts`) — company approval/license changes, deal cancel/force-complete/reopen, payment-resubmission requests, shipment cancel/restore, transport-quote decisions, contract cancellation, and the audit log itself — is gated by a single function, `requireAdminKey`, which compares a request header against **one shared environment-variable secret**. No admin user accounts, no per-admin sessions, no role/permission granularity were found anywhere in this surface. (No secret value is reproduced here — this describes the mechanism only, per CLAUDE.md's secrets policy.)
- **Implication:** anyone holding that one key can perform *any* admin action across the entire platform — there is no way, from the code alone, to distinguish "this action was performed by admin A" vs. "admin B," and no way to scope a key to a subset of actions.
- **A positive counterpoint:** an `/admin/audit-log` endpoint exists, meaning *some* admin actions are logged — but since the actor identity behind the shared key isn't itself tracked at the authentication layer, the audit log's ability to attribute an action to a specific human depends entirely on whatever the log-writing code records at each call site, which this pass did not verify line-by-line.
- **Enterprise/regulatory implication:** a large-company or regulatory due-diligence reviewer would very likely ask "who has admin access, and can you show me who did what?" — the current architecture would struggle to answer the "who" part convincingly.
- **Recommendation:** this specific finding should receive a **human technical/security review** before any enterprise or regulatory due-diligence conversation — it is a design pattern common in early-stage platforms, but not one that scales to "enterprise-ready" without a real admin-identity model (individual admin accounts, role-based permissions, and action attribution tied to that identity rather than to a shared key).

## 5. Data Exposure and Privacy (PDPL-Adjacent) Concerns

- **Company data visibility:** counterparty data (name, contact phone, CR where applicable) is shown to the other party in an active deal — this is expected/necessary for a B2B transaction and not a defect, but it means the bilingual-display and free-text-city issues (WS5-B) are also, secondarily, data-quality issues affecting what one company sees about another.
- **Payment reference/proof file behavior:** see §6 — the weak validation of the payment-proof value is as much a privacy/integrity question as a security one, since a real payment reference or transfer receipt is sensitive financial evidence.
- **Test file handling in this audit:** confirmed safe — the one payment-proof file used in WS3 Batch B-1 was a deliberately-generated, clearly-labeled fake placeholder (`[PHASE0-AUDIT] TEST PAYMENT PROOF FILE — NOT A REAL RECEIPT`), consistent with the founder's approved naming convention; no real financial data was ever used.
- **PDPL-adjacent concerns (Saudi Personal Data Protection Law):** company contact details (phone, possibly personal names on invitations) are stored and displayed; this review did not find evidence of a documented data-retention policy, data-subject-access mechanism, or explicit PDPL compliance statement anywhere in the codebase or docs reviewed. **Flagged, not certified** — this needs a dedicated legal/compliance review, not an AI read-only pass.

## 6. File Upload / Payment Proof Exposure

- **New finding this pass:** the deal-payment-submission endpoint (`artifacts/api-server/src/routes/deals.ts`, the payment-submission handler) accepts `payment_proof_url` as a plain string in the request body, validated only for non-emptiness (`400 PaymentProofRequired` if missing) — **no server-side check was found that this value is a real, reachable file, of an expected content type, or actually uploaded through any validated upload path.**
- **By contrast**, company logo uploads and listing image uploads both go through `multer` (in-memory, size/type-filtered) plus a GCS upload helper — a properly validated path. **No equivalent dedicated upload route was found for payment-proof files** in this read-only pass; the exact client-side mechanism that produces the URL submitted to the deal endpoint was not traced further (would require deeper frontend code tracing, not performed in this pass).
- **Implication:** at the code level, nothing currently stops a client from submitting an arbitrary string (not necessarily even a real URL) as "proof" — the deal would still transition to `payment_submitted`. This is a **data-integrity and evidentiary-value risk**, not a data-breach risk — it doesn't expose anyone's data, but it means the "proof" on file may not be trustworthy without an out-of-band human check (which the seller's manual "confirm payment received" step does provide, per WS3 Batch B-2A — a human seller is expected to actually look at the proof before confirming).
- **Recommendation:** before any real payment flow launches, add server-side validation (file existence check, content-type check, size limit, and ideally a dedicated authenticated upload endpoint mirroring the pattern already used for logos/listing images) plus a retention policy and access controls on wherever these files end up stored.

## 7. Reports, Payment-Request, and Compliance Terminology Risks

*(Carried forward from WS5-D/WS10, restated here for the compliance register.)*

- Invoice/tax-invoice language is correctly absent today (CR-001 A6) — this must remain a standing rule, not a one-time check, as new features are added.
- "Payment request" / "platform fee request" / "fee statement" are the only acceptable terms until ZATCA status is confirmed (unchanged).
- VAT is calculated and displayed correctly today (WS3/WS4-A), but no evidence was found of a documented ZATCA e-invoicing (Fatoora) integration or compliance statement — **flagged as a gap to validate, not a confirmed violation**, since VAT display alone does not necessarily require e-invoicing compliance depending on the platform's actual invoicing role.
- The "Tadweerah Platform Fee" naming decision (WS5-D/WS10 §0) should be routed through legal review specifically for the "commission"/عمولة sensitivity already flagged there, before any external use.

## 8. Environment Separation Findings

- `tadweerah.com` is confirmed as the working, practical target environment (WS2).
- `tadweerah-staging.web.app` returns a Clerk `origin_invalid` error — **a genuine, currently-broken staging environment** (WS2 finding, unchanged).
- **Enterprise-readiness implication:** a broken staging environment means there is currently no safe, separate place to test changes before they reach the production-equivalent environment this audit has been using — this is a real gap for any organization claiming mature release practices to a due-diligence reviewer. **Recommend this be fixed as a standing engineering priority**, independent of any Phase 0 feature work.

## 9. Logging, Audit Trail, and Evidence Findings

- **What exists:** an `/admin/audit-log` endpoint (implying some audit logging mechanism is in place); timestamped fields on key deal events (`payment_submitted_at`, `payment_confirmed_at`, `dispatched_at`, `received_at` — confirmed directly in `deals.ts`).
- **What's missing or unverified:** whether the audit log captures *which admin* (not just *that* an action happened) given the shared-key admin model (§4); whether non-admin actions (company self-service edits, offer submissions) are similarly logged; any documented retention period for logs or uploaded files.
- **Enterprise/regulator implication:** the timestamped deal lifecycle is a genuine strength for trust/traceability on the marketplace side; the admin side's auditability is the weaker half of the same story.

## 10. Source-of-Truth Issues With Security/Enterprise Impact

| Issue | Security/enterprise angle |
|---|---|
| Transport-responsibility bug (TDW-TRANS-001) | Could cause a user to take or skip a physical-world action based on wrong information — an operational-trust risk, not a data-breach risk |
| Financial labels/fees not yet built | Must be named and governed correctly (WS5-D/WS10 §0) before launch, or risk buyer/seller disputes |
| City free-text | Data-quality risk that would surface in any due-diligence data-sample review |
| Bilingual company data | Professionalism/trust risk in front of a bilingual enterprise or regulatory reviewer |
| Terminology collisions ("Verified"/موثّق) | Actively weakens the platform's own trust signal — an enterprise reviewer specifically evaluating "verification" claims could be misled about what's actually been verified |
| Payment-proof weak validation (§6) | Evidentiary-value risk for any dispute resolution relying on the stored proof |

## 11. Human Technical/Security/Legal Validation Required List

- **Security/technical:** the admin shared-key authorization model (§4) — recommend a proper security engineer review before scaling admin usage or granting the key to more than a small, trusted set of people.
- **Security/technical:** the payment-proof upload/validation path (§6) — recommend tracing the actual client-side upload mechanism and adding server-side validation before any real payment flow.
- **Legal/compliance:** PDPL data-retention and data-subject-rights posture (§5).
- **Legal/compliance:** ZATCA e-invoicing (Fatoora) applicability, and the "commission"/عمولة terminology sensitivity (§7, WS5-D/WS10 §0).
- **Legal/compliance:** the legal enforceability of Contract Lite and Deal Details as evidentiary/contractual documents — not assessed in this or any prior workstream, and outside AI competence to judge.
- **Operational:** whether a documented incident-response plan, backup policy, and environment-separation remediation (§8) exist outside the codebase (this review only had access to the codebase and docs, not operational runbooks).

## 12. Enterprise Due-Diligence Readiness Matrix

| Due-diligence question a large company/regulator may ask | Current answer, based on this review |
|---|---|
| Who has admin access, and how is it controlled? | Weak — single shared key, no per-user accounts (§4) |
| Is there an audit trail of who did what? | Partial — an audit log exists; per-admin attribution under the shared-key model is unverified |
| Is customer/company data protected appropriately? | Not fully assessed — no PDPL documentation found; no evidence of a breach or exposure either |
| Are documents (deals, contracts) reliable evidence? | Mixed — deal financial math is correct and timestamped; payment-proof integrity is weakly validated (§6) |
| Is there a tested backup/disaster-recovery process? | Not assessed — outside this review's access |
| Is there a separate, working staging environment? | No — currently broken (§8) |
| Is access governance (roles, permissions) mature? | Mixed — company-level gating is strong; admin-level is weak |
| Are financial/compliance terms (fees, tax) handled correctly? | On track — invoice/tax language correctly absent today; naming decided (WS5-D/WS10); ZATCA status unconfirmed |
| Is there a security review or penetration test on record? | Not found, and explicitly out of scope for this Phase 0 review |
| Is there an incident-response plan? | Not assessed — outside this review's access |

## 13. Recommended Future Fixes/Backlog Items (Documented Only — Not Implemented)

1. Replace the shared-secret admin model with per-admin accounts and role-based permissions, with actions attributable to a specific human.
2. Add server-side validation (and ideally a dedicated upload endpoint) for payment-proof files, matching the pattern already used for logos/listing images.
3. Fix the broken staging environment (`tadweerah-staging.web.app` Clerk `origin_invalid`).
4. Document a PDPL-aligned data-retention and data-subject-rights policy.
5. Obtain a proper security review of the admin authorization model before scaling its use.
6. Confirm ZATCA e-invoicing applicability before any invoicing-adjacent feature is built.
7. All items already listed in WS5-D/WS10's fix-first list remain valid and are not repeated here.

**No fixes have been made. This is a documentation deliverable only.**

## 14. Recommendations

1. **Proceed to WS9 next.** WS8 does not surface anything that requires halting Phase 0 — its findings are inputs for WS9's backlog, not blockers to continuing the audit.
2. **The buyer-responsibility transport exception should remain deferred**, unchanged — nothing in this security review changes that recommendation; if anything, the weak payment-proof validation (§6) is one more reason to keep that test scoped to already-approved test companies and clearly-fake data only, exactly as the existing plan specifies.
3. **Urgent human security/legal review recommended before any partner-facing or real-money use** — specifically: (a) the admin shared-key model (§4), (b) the payment-proof validation gap (§6), and (c) the PDPL/ZATCA compliance questions (§7/§11). None of these block continuing Phase 0's read-only audit work, but all three should be resolved or at least formally risk-accepted before Tadweerah is used with real customers, real payments, or in front of a regulator.

---

*Prepared 2026-07-03 under CLAUDE.md Phase 0 rules and CR-001. This is a read-only security/compliance/enterprise-readiness review — not a penetration test, not a security certification, and does not claim the platform is secure. No attacks, scans, or intrusive checks were performed. No secret values are reproduced. No code/config/DB/admin/commit/deploy actions, no permission changes, no document deletion, no new live UI actions, no transport/shipment/receipt/completion action.*
