# Antigravity Founder Terminology Ratification Brief

## 1. Executive Summary
This brief is provided as decision-support for the Tadweerah Founder. It synthesizes findings from the Antigravity Specialist Review concerning terminology inconsistencies, UX wording collisions, and clarity gaps across the platform. The primary focus is on unifying role names (Generator/Receiver), resolving a critical word collision for the "Verified" trust badge, and clarifying transactional wording. This document is strictly advisory; no terms proposed here are official, final, or ratified. Any terminology related to MWAN, ZATCA, Saudi commercial law, or market-fit must pass human domain-expert validation before implementation.

## 2. Decision Table

| Decision Item | Current Term(s) | Option A | Option B | Option C | Recommended Option | Why | Risk | Needs Human Validation? | Founder Decision Needed |
|---|---|---|---|---|---|---|---|---|---|
| 1. Verified badge wording | Verified / موثّقة | Verified Company / تم التحقق من الشركة | Officially Trusted / موثوقة رسمياً | Approved Account / حساب معتمد | Option A | Clears collision with generic marketing adjectives ("وثّق"). Unambiguous state. | May sound overly literal; needs Saudi business-fit check. | Yes (Saudi B2B) | Yes |
| 2. Generator terminology | Generator / Producer / Seller (مولّد / منتج / بائع) | Generator / مولّد | Producer / منتج | Seller / بائع | Option A | Strongest alignment with MWAN regulatory language. | Might sound too technical for top-of-funnel marketing. | Yes (Saudi B2B/MWAN) | Yes |
| 3. Receiver terminology | Receiver / Processor / Buyer (مستلم / معالج / مشتري) | Receiver / مستلم (with "Buyer" in transactions) | Buyer / مشتري (everywhere) | Processor / معالج | Option A | Retains regulatory accuracy while allowing "Buyer" where money changes hands. | Context-switching could still cause minor UX friction. | Yes (Saudi B2B/MWAN) | Yes |
| 4. Receive offers wording | receive offers / استقبال عروض | Open for offers / استقبال عروض تنافسية | Request quotes / طلب تسعيرة | Allow bidding / السماح بالمزايدة | Option A | Contrasts clearly with fixed-price deals during listing creation. | Slightly longer UI text length. | No | Yes |
| 5. Transfer Proof wording | Payment Proof (Optional) / إثبات (اختياري) | Transfer Proof (Required) / إثبات التحويل (مطلوب) | Upload Receipt / رفع إيصال الدفع | Bank Transfer Copy / نسخة الحوالة البنكية | Option A | Fixes the functional mismatch (it's required) and avoids generic "proof". | Very low risk; safer legally. | Yes (Payment/Legal) | Yes |

## 3. Option Analysis Per Term

### Verified Badge Wording
- **Current Issue:** The Arabic word "موثّقة" is heavily used as a generic marketing term (e.g., "documented process", "trusted offer") across the platform, diluting its specific meaning as a hard-earned trust badge for a company.
- **Analysis:** We must choose a term that is exclusive to the verification state. "تم التحقق من الشركة" (Company Verified) explicitly refers to the action of verifying an entity, while "موثوقة رسمياً" implies an official trust status. "حساب معتمد" is clear but overlaps slightly with the "Approved" (معتمد) MWAN license state.

### Generator Terminology
- **Current Issue:** The same user role is called Generator in onboarding, Producer in marketing, and Seller in the marketplace.
- **Analysis:** "Generator" (مولّد) anchors the platform's terminology in official MWAN phrasing, prioritizing compliance clarity over marketing variation. "Seller" is functionally true but obscures the regulatory origin of the waste. Standardizing on Generator builds a stronger enterprise B2B brand. 

### Receiver Terminology
- **Current Issue:** Referred to as Receiver in onboarding, Processor in marketing, and Buyer when submitting an offer.
- **Analysis:** "Receiver" (مستلم) mirrors the MWAN terminology. However, in the strict context of a marketplace deal where financial obligations occur, "Buyer" (مشتري) is the most universally understood term. The recommendation is to use Receiver globally, with Buyer permitted *only* on the transactional checkout and offer screens.

### Receive Offers Wording
- **Current Issue:** The current wording "receive offers" (استقبال عروض) works, but lacks contrast when placed next to fixed-price alternatives in a listing wizard.
- **Analysis:** "Open for offers" (استقبال عروض تنافسية) explicitly signals that the listing is meant to invite competitive pricing, making the seller's choice much clearer during listing creation.

### Transfer Proof Wording
- **Current Issue:** Currently labeled "Payment Proof (Optional)" but functions as a hard requirement in the UI. 
- **Analysis:** Correcting the "(Optional)" flag to "(Required)" is critical. Switching the noun from "Payment Proof" to "Transfer Proof" (إثبات التحويل) aligns better with the reality of standard B2B wire transfers, providing clear instruction to the user.

## 4. Recommended Founder Decision Per Item
1. **Verified badge wording:** Adopt "تم التحقق من الشركة" as the primary badge text, pending validation of Saudi B2B norms.
2. **Generator terminology:** Adopt "Generator / مولّد" as the single canonical term across marketing and product.
3. **Receiver terminology:** Adopt "Receiver / مستلم", retaining "Buyer / مشتري" only for strict transactional/payment contexts.
4. **Receive offers wording:** Adopt "Open for offers / استقبال عروض تنافسية" to improve listing wizard clarity.
5. **Transfer Proof wording:** Adopt "Transfer Proof (Required) / إثبات التحويل (مطلوب)" to immediately resolve the blocking UX bug and clarify payment expectations.

## 5. Terms Requiring Human/Domain/Legal Validation
- **Verified badge translations:** Requires validation for Saudi B2B marketplace norms.
- **Generator / Receiver:** Requires domain validation to ensure strict alignment with current MWAN/regulatory definitions.
- **Transfer Proof:** Requires legal/financial validation to ensure it doesn't inadvertently imply full platform liability for clearing funds.

## 6. Terms Safe for Founder Product Decision
- **Receive offers / Open for offers:** This is purely a UX clarity decision to help non-technical users understand how their listing will behave. It carries no regulatory weight and can be decided by the Founder directly.

## 7. What Should NOT Be Finalized Yet
- No decision here should be treated as finalizing the underlying system architecture or database schemas.
- Do not finalize any invoice, tax-invoice, or platform fee wording (e.g. ZATCA compliance terms) based on this document; those remain fully quarantined pending WS8/legal review.
- Do not consider these terminology choices ratified in the official Phase 0 evidence pack until they pass human validation and Claude Code's integration process.

## 8. Boundary Confirmation
- I confirm that no code, configuration, or official Phase 0 documents were edited.
- No database access, admin actions, or live site interactions were performed.
- No commits or deployments were triggered.
- No mockups or additional files were created.
- No legal, regulatory, MWAN, or ZATCA validation is claimed; this is solely a terminology review proposal.
