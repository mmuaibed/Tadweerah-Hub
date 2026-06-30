# Phase 3-B Status and Next Steps

## 1. Current Status Summary
Phase 3-B has successfully progressed through historical data correction on staging (Batch 1A-R), source-of-truth governance validation (Batch 1A-S), and the deployment of foundational backend guardrails (Batch 1B). The platform is currently operating in a stable state on staging with enhanced safety mechanisms to prevent invalid sustainability allocations.

## 2. Completed Work
- **Phase 3-B Batch 1A-R (Historical Sustainability Correction on Staging):**
  - Completed and applied on staging successfully.
  - Target data aligned via `audit_log` with no commercial side-effects.
  - Convergence dry-run verified.
  - Closure commit: `76f038b docs: close phase 3b historical staging correction`

- **Phase 3-B Batch 1A-S (Financial + Sustainability Source-of-Truth Governance UAT):**
  - Completed and documented, proving the separation between physical and commercial weights.
  - UAT evidence commit: `77950fc docs: add phase 3b source-of-truth governance UAT`

- **Phase 3-B Batch 1B (Received-vs-Allocated Guardrail):**
  - Backend implemented and deployed to staging (Cloud Run revision `tadweerah-api-00174-zs8`).
  - Raw risk fields (`raw_remaining_qty`, `over_allocated_qty`, `coverage_raw_pct`, `remaining_qty_data_risk`) exposed in the API.
  - Service-level guard validated to reject invalid states.
  - Plan commit: `0a8596c`
  - Implementation commit: `20296cb`
  - Closure commit: `aee301e docs: close phase 3b guardrail staging validation`

## 3. Environment Clarification
The current operating environment serves `tadweerah.com` directly using the staging infrastructure:
- **Frontend:** Firebase project `tadweerah-staging`
- **Backend:** Cloud Run service `tadweerah-api`
- **Database:** Cloud SQL `tadweerah-pilot-db`
- **Note:** This represents the real-domain staging environment. There is no separate production DB environment for corrections at this time.

## 4. Current Source-of-Truth Rules
- **Sustainability:** Derives quantity strictly from physical operational fields. Prioritizes `destination_weight` first, falling back to `source_weight` if unavailable.
- **Financial/Commercial:** Derives quantity from commercial fields, specifically `final_weight` and `final_value`.

## 5. Guardrails Now Active
- **Received-vs-Allocated Physical Guardrail:** The system rejects updates to a shipment's received quantity if the proposed new quantity is strictly less than the currently finalized allocated quantity (`proposed_received_qty < active_finalized_allocated_qty`). Returns 409 Conflict with code `AllocationExceedsReceivedQuantity`.

## 6. Owner Governance Decision
The project owner has made key product governance decisions for materially wrong completed/allocated shipment lines:
- **Waived Test:** The route-level owner-authenticated validation for the 1B guardrail is deferred/waived given confidence in the service-level tests, Codex review, and the new strategic direction.
- **No Direct Post-Facto Edits:** The platform will move away from silent, direct post-allocation weight edits.
- **Formal Void/Cancellation:** Users must submit a formal cancellation/void request backed by a documented reason and evidence.
- **Admin Review:** These requests require admin review and approval.
- **Audit Trail & Recreation:** If approved, the line is voided/cancelled leaving a clear historical audit record. The user must then create a new shipment/line to correct the operation.

## 7. Remaining Items
- **Frontend Warning UI:** The UI does not yet expose visual warnings when `remaining_qty_data_risk` is triggered.
- **Route-Level Test:** Authenticated manual test of the 1B guardrail (deferred by owner).
- **Void/Recreate Workflow Design:** Requires formal design and architecture before implementation.
- **Batch 1C:** Not approved or started.

## 8. Recommended Next Step
1. **Option 1 (Recommended): Phase 3-B Design Note — Void/Recreate Governance Workflow.**
   - *Purpose:* Design the cancellation/void request workflow architecture before proceeding with implementation, aligning with the new owner governance decision.
2. **Option 2: Frontend warning UI for `remaining_qty_data_risk`.**
   - *Purpose:* Expose warnings to users/admins when raw risk fields indicate over-allocation.
3. **Option 3: Production DB Apply.**
   - *Purpose:* Only needed if a true separate production DB environment is introduced and requires correction.
4. **Option 4: Batch 1C (Deferred).**
   - *Purpose:* Extend historical correction scripts. Not approved.

## 9. Next Session Opening Charter Draft
**Permanent Protocol:** Strict compliance with established boundaries. No unsupervised mutations or deployments. Let background tasks run naturally without wait loops.
**Repo Path:** `C:\Users\user\Documents\Tadweerah-Hub\Tadweerah-Hub`
**Environment:** Staging (`tadweerah-staging` Firebase, `tadweerah-api` Cloud Run, `tadweerah-pilot-db`).
**Current Completed Status:** Phase 3-B Batch 1A-R, 1A-S, and 1B are completed. Staging backend guardrails are active and raw fields exposed. Owner waived the route-level test.
**Exact Next Focus:** `Phase 3-B Design Note — Void/Recreate Governance Workflow`
**Boundaries:** Design docs only. Do not implement the Void/Recreate workflow yet. Do not write code. Do not touch DB.
**Files to Read First:**
- `docs/PROJECT_MAP.md`
- `docs/READINESS_FINDINGS_AND_RISKS.md`
- `docs/phase-3b-source-of-truth-audit/21_PHASE_3B_STATUS_AND_NEXT_STEPS.md`
**What Not To Do:** Do not execute migrations, deploy to staging, run correction scripts, or implement frontend warnings without explicit approval.
**Expected Deliverable:** A formal design note mapping out the end-to-end Void/Recreate workflow.

## 10. Out of Scope
- Implementation of the Void/Recreate workflow.
- Execution of Batch 1C.
- Production DB corrections or deployments.
- Exposing secrets in logs or chats.
