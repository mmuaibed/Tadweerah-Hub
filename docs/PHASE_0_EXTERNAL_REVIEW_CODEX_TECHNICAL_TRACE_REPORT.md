# PHASE_0_EXTERNAL_REVIEW_CODEX_TECHNICAL_TRACE_REPORT

**Normalization note:** Codex originally created this report at the repository root (`PHASE_0_EXTERNAL_REVIEW_CODEX_TECHNICAL_TRACE_REPORT.md`). Per founder instruction, this is a **copy** placed at the approved `docs/` path for consistency with all other Phase 0 evidence. **The original root-level file was not deleted or modified** (standing no-document-deletion rule) — it remains at `C:\Users\user\Documents\Tadweerah-Hub\Tadweerah-Hub\PHASE_0_EXTERNAL_REVIEW_CODEX_TECHNICAL_TRACE_REPORT.md` as a duplicate copy. This docs/ copy is the one referenced by all Phase 0 reconciliation records going forward.

---

## Summary

This read-only technical trace found that `deal_status = "dispatched"` and `shipment_status = "dispatched"` are separate enum values in separate lifecycle machines, not one shared status source. Deal dispatch is set by the deal producer after payment confirmation and changes the buyer-facing deal action to receipt confirmation. Shipment dispatch is set on a contract shipment after planning and changes shipment actions to receive/cancel in the contract shipment UI. The shared English value can create reconciliation ambiguity because both are user-facing, but their code paths and next actions are distinct.

For the Arabic unit-label leak, the already-rejected i18n dictionary explanation remains unsupported: the unit translation entries are present and normal listing components call them. The observed root cause is inconsistent rendering and source-of-truth usage: several report/admin/pending/sustainability paths concatenate raw stored unit values or fall back to raw values when translation keys are missing. New listings also map `unit_options` back into a legacy `unit` field limited to `kg`/`ton`, so downstream views can display legacy Latin keys instead of localized labels. For payment proof, the client labels the receipt upload as optional, but both the button disabled expression and the click-handler guard require `paymentProofDataUrl`, making reference-only submission unreachable through the normal UI. The frontend sends JSON containing `payment_reference` and conditionally `payment_proof_url`, where `payment_proof_url` is a FileReader data URL; the backend independently rejects missing proof.

## Findings

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-001 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | A |
| Artifact Reviewed | `lib\db\src\schema\deals.ts`; `artifacts\api-server\src\routes\deals.ts`; `artifacts\tadweerah\src\components\deal-panel.tsx` |
| Finding | Deal `dispatched` is a deal lifecycle state reached after producer-confirmed dispatch from `payment_confirmed`; it then enables buyer receipt confirmation behavior. |
| Evidence | `lib\db\src\schema\deals.ts:22-31` defines `deal_status` including `dispatched`; `artifacts\api-server\src\routes\deals.ts:472-580` documents and sets `status: "dispatched"` in `POST /deals/:deal_id/confirm-dispatch`; `artifacts\api-server\src\routes\deals.ts:666-700` requires `dispatched` for receipt confirmation and then sets `completed`; `artifacts\tadweerah\src\components\deal-panel.tsx:1589-1593` marks buyer `dispatched` as "my turn"; `artifacts\tadweerah\src\components\deal-panel.tsx:2172-2181` shows the buyer confirm-receipt action only when `deal.status === "dispatched"`. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_WS5C_ADDENDUM_GOVERNANCE_PATTERN_TERMINOLOGY_VALUE_UX_ASSURANCE.md` rows 22-24 |
| Mechanism Claim | Deal `dispatched` is set by the deal route after payment confirmation and gates buyer receipt confirmation. |
| Source-of-Truth Impact | Medium |
| User-Facing Impact | Medium |
| Recommended Action | human review |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | Yes |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-002 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | A |
| Artifact Reviewed | `lib\db\src\schema\contract-shipments.ts`; `artifacts\api-server\src\routes\shipments.ts`; `artifacts\tadweerah\src\pages\contract-detail.tsx` |
| Finding | Shipment `dispatched` is a contract-shipment lifecycle state reached from `planned`; it then enables receive and cancel actions for that shipment. |
| Evidence | `lib\db\src\schema\contract-shipments.ts:15-27` documents `planned -> dispatched -> received -> closed \| cancelled`; `artifacts\api-server\src\routes\shipments.ts:478-537` documents and sets `status: "dispatched"` in `POST /shipments/:id/dispatch`; `artifacts\api-server\src\routes\shipments.ts:585-643` requires `dispatched` before setting `received`; `artifacts\tadweerah\src\pages\contract-detail.tsx:1151-1154` derives `canDispatch`, `canReceive`, `canClose`, and `canCancel`; `artifacts\tadweerah\src\pages\contract-detail.tsx:1272-1294` renders shipment action buttons from those gates. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_WS5C_ADDENDUM_GOVERNANCE_PATTERN_TERMINOLOGY_VALUE_UX_ASSURANCE.md` rows 21-24 |
| Mechanism Claim | Shipment `dispatched` is set by the shipment route after planning and gates shipment receive/cancel behavior. |
| Source-of-Truth Impact | Medium |
| User-Facing Impact | Medium |
| Recommended Action | human review |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | Yes |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-003 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | A |
| Artifact Reviewed | `artifacts\tadweerah\src\i18n\index.tsx`; `artifacts\tadweerah\src\pages\reports.tsx`; `artifacts\tadweerah\src\pages\contract-detail.tsx` |
| Finding | The same English word is user-facing in both deal and shipment contexts, while the underlying code paths and next actions differ, creating plausible ambiguity during deal/contract reconciliation. |
| Evidence | `artifacts\tadweerah\src\i18n\index.tsx:768-770` labels deal `dispatched` as "Goods in Transit"; `artifacts\tadweerah\src\i18n\index.tsx:1574-1581` labels shipment/contract shipment `dispatched` as "Dispatched"; `artifacts\tadweerah\src\pages\reports.tsx:146-155` includes deal statuses with `dispatched`; `artifacts\tadweerah\src\pages\reports.tsx:762-764` includes shipment statuses with `dispatched`; `artifacts\tadweerah\src\pages\contract-detail.tsx:848-870` shows shipment timeline labels and current-state checks distinct from the deal panel. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_WS5C_ADDENDUM_GOVERNANCE_PATTERN_TERMINOLOGY_VALUE_UX_ASSURANCE.md` row 22 |
| Mechanism Claim | Two distinct state machines expose the same English status value/label in UI surfaces. |
| Source-of-Truth Impact | Medium |
| User-Facing Impact | Medium |
| Recommended Action | human review |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | Yes |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-004 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | B |
| Artifact Reviewed | `artifacts\tadweerah\src\i18n\index.tsx`; `artifacts\tadweerah\src\components\listing-card.tsx` |
| Finding | The i18n dictionary itself is not the root cause for standard `kg`/`ton` listing labels; Arabic translations exist and listing cards call `t("unit.<key>")`. |
| Evidence | `artifacts\tadweerah\src\i18n\index.tsx:466-474` defines Arabic and English entries for `unit.kg`, `unit.ton`, and other units; `artifacts\tadweerah\src\components\listing-card.tsx:72-82` builds price-per-unit text through `t(\`unit.${listing.unit}\`)`; `artifacts\tadweerah\src\components\listing-card.tsx:161-165` renders quantity and unit through `t(\`unit.${listing.unit}\`)`; `artifacts\tadweerah\src\components\listing-card.tsx:233-237` renders price hint through the same translation key. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_OPEN_VALIDATION_ITEMS_REGISTER.md` `PH0-OPEN-UNIT-LABEL-001` |
| Mechanism Claim | Observed normal listing-card mechanism uses existing i18n unit keys; dictionary incompleteness was not observed for these keys. |
| Source-of-Truth Impact | Low |
| User-Facing Impact | Low |
| Recommended Action | accept |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-005 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | B |
| Artifact Reviewed | `artifacts\tadweerah\src\pages\pending-actions.tsx`; `artifacts\tadweerah\src\pages\reports.tsx`; `artifacts\tadweerah\src\pages\admin.tsx` |
| Finding | Multiple quantity+unit renderers bypass i18n and concatenate raw stored `unit` values, which can leak `kg`/`ton` Latin labels inside Arabic UI. |
| Evidence | `artifacts\tadweerah\src\pages\pending-actions.tsx:375-377` builds `qtyDisplay` as `${fmtNumber(deal.quantity)} ${deal.unit}`; `artifacts\tadweerah\src\pages\reports.tsx:696` renders `${fmtNumber(row.quantity)} ${row.unit}`; `artifacts\tadweerah\src\pages\admin.tsx:2141-2142` renders transport material quantity as `{tr.quantity} {tr.unit}`; `artifacts\tadweerah\src\pages\admin.tsx:2557-2558` renders report quantity as `${row.quantity} ${row.unit}`. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_OPEN_VALIDATION_ITEMS_REGISTER.md:28-32` `PH0-OPEN-UNIT-LABEL-001` |
| Mechanism Claim | Raw unit values are printed directly instead of localized through i18n or lookup labels. |
| Source-of-Truth Impact | Medium |
| User-Facing Impact | Medium |
| Recommended Action | investigate |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-006 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | B |
| Artifact Reviewed | `lib\db\src\schema\unit-options.ts`; `artifacts\tadweerah\src\pages\listing-new.tsx`; `artifacts\api-server\src\routes\listings.ts` |
| Finding | `unit_options` is a master-data source, but listing creation still sends a legacy `unit` key and maps non-legacy units back to `kg`, creating inconsistent downstream unit sources. |
| Evidence | `lib\db\src\schema\unit-options.ts:14-23` defines `unit_options` with `key`, `name_ar`, `name_en`, and `symbol`; `artifacts\tadweerah\src\pages\listing-new.tsx:37-45` limits legacy unit keys to `kg` and `ton` and maps all other unit keys to `kg`; `artifacts\tadweerah\src\pages\listing-new.tsx:232-282` submits both `unit: legacyUnit` and `unit_option_id`; `artifacts\api-server\src\routes\listings.ts:766-787` can read `unitOptionsTable` localized names for notification text, but many frontend views cited in EXT-CODEX-005 read the legacy `unit` field. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_OPEN_VALIDATION_ITEMS_REGISTER.md` `PH0-OPEN-UNIT-LABEL-001` |
| Mechanism Claim | Master-data labels exist, but the legacy `unit` field remains a separate display source and can diverge from localized unit-option labels. |
| Source-of-Truth Impact | High |
| User-Facing Impact | Medium |
| Recommended Action | investigate |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-007 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | B |
| Artifact Reviewed | `artifacts\tadweerah\src\pages\sustainability-allocations.tsx`; `artifacts\tadweerah\src\pages\sustainability-allocation-detail.tsx`; `artifacts\tadweerah\src\pages\sustainability-print.tsx`; `artifacts\tadweerah\src\pages\reports.tsx` |
| Finding | Sustainability/reporting paths contain fallback logic that intentionally displays raw unit values when a unit is not exactly translated, so variants such as `tons`, `kgs`, or arbitrary stored units can leak Latin labels in Arabic. |
| Evidence | `artifacts\tadweerah\src\pages\sustainability-allocations.tsx:246-251` renders `rl.final_received_unit` raw if `t(\`unit.${rl.final_received_unit}\`)` returns the key; `artifacts\tadweerah\src\pages\sustainability-allocation-detail.tsx:401-413` uses the same raw fallback; `artifacts\tadweerah\src\pages\sustainability-allocation-detail.tsx:547-548` shows the same fallback in the allocation input suffix; `artifacts\tadweerah\src\pages\sustainability-print.tsx:185-195` only localizes exact `ton`/`kg` and otherwise prints `row.unit`; `artifacts\tadweerah\src\pages\reports.tsx:1022-1071` similarly maps exact `ton`/`kg` and otherwise uses `row.unit`. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_OPEN_VALIDATION_ITEMS_REGISTER.md:28-32` `PH0-OPEN-UNIT-LABEL-001` |
| Mechanism Claim | Missing/variant unit translation fallback is raw-value display, not an absent base dictionary entry. |
| Source-of-Truth Impact | Medium |
| User-Facing Impact | Medium |
| Recommended Action | investigate |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-008 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | C |
| Artifact Reviewed | `artifacts\tadweerah\src\i18n\index.tsx`; `artifacts\tadweerah\src\components\deal-panel.tsx` |
| Finding | The payment-proof upload is labeled optional in i18n/UI, but the submit button requires both a non-empty payment reference and `paymentProofDataUrl`. |
| Evidence | `artifacts\tadweerah\src\i18n\index.tsx:907` labels the upload "Payment Proof / Transfer Receipt (Optional)"; `artifacts\tadweerah\src\components\deal-panel.tsx:1977-1981` renders that upload label; `artifacts\tadweerah\src\components\deal-panel.tsx:2060-2065` disables submit when `loading || paymentProofProcessing || !paymentRef.trim() || !paymentProofDataUrl`; `artifacts\tadweerah\src\components\deal-panel.tsx:1499-1510` also returns with an error if `paymentProofDataUrl` is absent. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_WS4A_EXPANDED_UX_TERMINOLOGY_DEAL_TRUST_REVIEW.md:83-84`; `docs/PHASE_0_WS8_CYBERSECURITY_COMPLIANCE_ENTERPRISE_READINESS_REVIEW.md:56-61` |
| Mechanism Claim | Client-side requiredness is implemented as a disabled-button condition plus an imperative handler guard. |
| Source-of-Truth Impact | Low |
| User-Facing Impact | High |
| Recommended Action | accept |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-009 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | C |
| Artifact Reviewed | `artifacts\tadweerah\src\components\deal-panel.tsx`; `artifacts\api-server\src\routes\deals.ts` |
| Finding | Reference-only payment submission is not technically reachable through the normal frontend path; the backend also rejects missing `payment_proof_url`. |
| Evidence | `artifacts\tadweerah\src\components\deal-panel.tsx:1358-1388` converts the selected file to a data URL and stores it in `paymentProofDataUrl`; `artifacts\tadweerah\src\components\deal-panel.tsx:1532-1541` builds the submit body with `payment_reference` and only adds `payment_proof_url` if `paymentProofDataUrl` exists; `artifacts\tadweerah\src\components\deal-panel.tsx:176-189` sends that body as JSON to `/api/deals/:dealId/submit-payment`; `artifacts\api-server\src\routes\deals.ts:300-318` rejects missing `payment_reference` and missing `payment_proof_url`; `artifacts\api-server\src\routes\deals.ts:340-349` stores both fields when accepted. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_WS4A_EXPANDED_UX_TERMINOLOGY_DEAL_TRUST_REVIEW.md:83-84`; `docs/PHASE_0_WS8_CYBERSECURITY_COMPLIANCE_ENTERPRISE_READINESS_REVIEW.md:56-61` |
| Mechanism Claim | Client path requires a FileReader-produced data URL before JSON submission; server independently requires non-empty proof. |
| Source-of-Truth Impact | Low |
| User-Facing Impact | High |
| Recommended Action | accept |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |

| Field | Required Content |
|---|---|
| External Review ID | EXT-CODEX-010 |
| Source Tool | Codex |
| Date | 2026-07-03 |
| Technical Scope | Read-only technical trace |
| Investigation Question | C |
| Artifact Reviewed | `artifacts\tadweerah\src\components\deal-panel.tsx` |
| Finding | No separate client validation schema was observed for payment proof; validation is local component state and imperative checks. |
| Evidence | `artifacts\tadweerah\src\components\deal-panel.tsx:1304-1309` stores payment reference/proof state locally; `artifacts\tadweerah\src\components\deal-panel.tsx:1358-1388` validates file type/size in `handleFileSelect`; `artifacts\tadweerah\src\components\deal-panel.tsx:1499-1510` imperatively validates processing/reference/proof before opening the confirm dialog; `artifacts\tadweerah\src\components\deal-panel.tsx:2060-2065` duplicates requiredness in the button disabled condition. No `useForm`, `zod`, or dedicated schema usage was observed in this component during the bounded trace. |
| Confidence | High |
| Related Phase 0 Finding | `docs/PHASE_0_WS4A_EXPANDED_UX_TERMINOLOGY_DEAL_TRUST_REVIEW.md:83-84` |
| Mechanism Claim | Observed mechanism is imperative React state validation, not a schema-based client validator. |
| Source-of-Truth Impact | None |
| User-Facing Impact | Medium |
| Recommended Action | accept |
| Needs Claude Reconciliation? | Yes |
| Needs Human Validation? | No |
| Boundary Confirmation | no code/config/DB/admin/live actions performed; only this approved report file generated |
