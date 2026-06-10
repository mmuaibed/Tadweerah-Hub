# Al Qaryan Contract Lite — Supervised UAT Script & Checklist
> **Date:** June 10, 2026 | **Version:** 1.0.0 (Phase 1B)  
> **Status:** Operational Draft | **Target Environment:** Staging  
> **Verified Deployed Commit:** `9c9506c` (F1 Fix: Shipment Cancel Hardening)

---

## 1. Executive Purpose

### What this UAT Proves
* **Happy Path Verification:** Proves that Contract Lite can be negotiated, confirmed, dispatched, received, and closed under the `dual_source_final` weight policy.
* **F1 Hardening:** Verifies that the shipment cancellation mismatch is resolved (cancellation action is restricted only to `planned` and `dispatched` states, and hidden once a shipment is `received`).
* **Operational Readiness:** Confirms the UI and API flows are robust enough for supervised demo sessions.

### What this UAT Does NOT Prove
* **Unsupervised Production Readiness:** This is not a test of unsupervised automated systems. 
* **Dispute Resolution:** Does not cover handling of weight discrepancies or corrections.
* **Notification Delivery:** Transactional emails/SMS alerts are intentionally out of scope for this phase.

### Supervised Run Principle
This UAT is a **supervised walkthrough** on staging. A Tadweerah observer will guide the participants. Do not deviate from the happy-path flow outlined below.

---

## 2. Roles & Participants

* **Tadweerah Admin/Founder Observer:** Directs the test script, monitors browser network/console actions, and documents user experience feedback.
* **Al Qaryan Operator (Seller):** Accesses the platform to draft, configure, submit, and dispatch shipments.
* **Buyer Operator (Counterparty):** Accesses the platform to confirm the contract, record receipt weights, and close shipments.
* **Note-Taker (Optional):** Logs UX friction points, bugs, and timing notes.

---

## 3. Preconditions & Setup

Before starting the UAT session, the Observer must verify the following:

1. **Company Onboarding:** Both the Seller (Al Qaryan) and Buyer companies must be fully onboarded and set to `approved` status in the staging database.
2. **User Credentials:** Both operators must have active, verified logins and be able to access the staging URL (`https://tadweerah-staging.web.app`).
3. **Visibility Check:** Both parties must have navigation access to the **Contracts** section in the sidebar/menu.
4. **Fix Verification:** Verify that the frontend bundle containing commit `9c9506c` is deployed to Firebase Hosting.
5. **Configured Policy:** The contract will be set to use `dual_source_final` as the recommended weight policy.

> [!CAUTION]
> **Precondition Stop-Block:** If the buyer/counterparty cannot see or access the contract after creation, or if logins fail, **do not proceed** with the UAT flow. Resolve authentication/setup issues first.

---

## 4. Founder Visual Spot-Check (Phase 1A Verification)

Prior to running the interactive UAT script, the Founder/Observer should run a quick spot-check on staging to verify the visibility of the shipment **Cancel** action across all possible shipment states. 

| Shipment State | Expected Cancel Button State | Visual Confirmation (Pass/Fail) |
|---|---|---|
| **Planned** | **Visible** (Border-red-200 outline button) | |
| **Dispatched** | **Visible** (Border-red-200 outline button) | |
| **Received** | **Hidden** (Cancel button is completely removed) | |
| **Closed** | **Hidden** (Cancel button is completely removed) | |
| **Cancelled** | **Hidden** (Cancel button is completely removed) | |

---

## 5. Main UAT Step-by-Step Flow

### Step 1: Contract Draft Creation
* **Actor:** Al Qaryan (Seller)
* **Action:** Navigate to `Contracts` ➔ click `Create Contract` ➔ select Buyer Company ➔ Select `dual_source_final` Weight Policy.
* **Expected UI Status:** Contract state moves to `draft`.
* **Action/Button Visibility:** `Save Draft` and `Submit` buttons are visible to Seller.
* **Operational Meaning:** Contract terms are initialized locally.

### Step 2: Configure Material Line & Pricing
* **Actor:** Al Qaryan (Seller)
* **Action:** In the draft contract, add a material line (e.g., "Mixed Iron scrap"), input quantity (e.g., 50 tonnes), unit, and price per unit (e.g., 800 SAR/tonne). Save the material.
* **Expected UI Status:** Material line shows up in the contract detail table.
* **Action/Button Visibility:** Edit/Delete icons visible next to the material line.
* **Operational Meaning:** Core financial and volume parameters of the agreement are defined.

### Step 3: Submit Contract for Confirmation
* **Actor:** Al Qaryan (Seller)
* **Action:** Click `Submit for Confirmation`.
* **Expected UI Status:** Contract status updates to `pending_confirmation`.
* **Action/Button Visibility:** Action buttons disabled for Seller (view-only). Counterparty actions become active for Buyer.
* **Operational Meaning:** Draft locks; terms are proposed to the counterparty.

### Step 4: Review and Confirm Contract
* **Actor:** Buyer
* **Action:** Log in as Buyer ➔ Navigate to `Contracts` ➔ open the submitted contract reference ➔ Click `Confirm Contract`.
* **Expected UI Status:** Contract status updates to `active`.
* **Action/Button Visibility:** `Create Shipment` button becomes visible.
* **Operational Meaning:** Contract is legally accepted; logistics execution can begin.

### Step 5: Create Planned Shipment
* **Actor:** Al Qaryan (Seller) or Buyer
* **Action:** Click `Create Shipment` ➔ select material ➔ set quantity ➔ Save.
* **Expected UI Status:** A new shipment card appears under the contract with status `planned`.
* **Action/Button Visibility:** `Dispatch` and `Cancel` buttons are visible on the shipment row.
* **Operational Meaning:** A shipment is scheduled for dispatch.
* **F1 Check:** Confirm `Cancel` button is visible.

### Step 6: Dispatch Shipment
* **Actor:** Al Qaryan (Seller)
* **Action:** Click `Dispatch` ➔ input Source Weight (e.g., 10.0 tonnes) ➔ Click `Submit Dispatch`.
* **Expected UI Status:** Shipment status updates to `dispatched`.
* **Action/Button Visibility:** `Receive` and `Cancel` buttons are visible on the shipment row.
* **Operational Meaning:** Material has left Seller's site. Source weight is locked.
* **F1 Check:** Confirm `Cancel` button is visible.

### Step 7: Receive Shipment
* **Actor:** Buyer
* **Action:** Click `Receive` ➔ input Destination Weight (e.g., 9.8 tonnes) ➔ Click `Submit Receipt`.
* **Expected UI Status:** Shipment status updates to `received`.
* **Action/Button Visibility:** `Close` button is visible. `Cancel` button is hidden.
* **Operational Meaning:** Material is received at Buyer's site. Destination weight is locked.
* **F1 Check:** Confirm `Cancel` button is **hidden** (fixes F1 409 transition error).

### Step 8: Close Shipment
* **Actor:** Buyer or Seller
* **Action:** Click `Close` ➔ confirm transaction.
* **Expected UI Status:** Shipment status updates to `closed`.
* **Action/Button Visibility:** No actions remain on the shipment row.
* **Operational Meaning:** Shipment is finalized. Verify that the **Final Weight** matches the **Source Weight** (10.0 tonnes) in the UI as dictated by the `dual_source_final` policy.
* **F1 Check:** Confirm `Cancel` button is **hidden**.

### Step 9: Shipment Cancellation Test
* **Actor:** Al Qaryan (Seller)
* **Action:** Click `Create Shipment` again to schedule a second shipment. Once created in `planned` state, click `Cancel` on this new shipment ➔ confirm action.
* **Expected UI Status:** Shipment status updates to `cancelled`.
* **Action/Button Visibility:** All action buttons are removed from the cancelled shipment.
* **Operational Meaning:** Shipment is discarded from active tracking.
* **F1 Check:** Confirm `Cancel` button is **hidden**.

### Step 10: Complete Contract
* **Actor:** Al Qaryan (Seller)
* **Action:** Once all shipments are in terminal states (`closed` or `cancelled`), click `Complete Contract` at the top.
* **Expected UI Status:** Contract status updates to `completed`.
* **Action/Button Visibility:** No further edit/shipment action buttons are visible to either party.
* **Operational Meaning:** The overall contract agreement is archived as fully executed.

---

## 6. Out-of-Scope / Do-Not-Test List

Do **NOT** test the following flows during the supervised walkthrough:
1. **Dispute / Weight Correction:** Do not try to modify weights after dispatch/receive or test dispute buttons. There is no automated recovery path in the current build.
2. **Post-Close Edits:** Do not attempt to adjust values on closed shipments.
3. **Async Workflow Testing:** Do not log out and assume emails or notifications will alert the other party of pending actions. Use real-time verbal coordination.
4. **Admin Panel Overrides:** Do not trigger admin overrides (`force-complete` or `force-cancel`) in front of the customer.
5. **Attachment Uploads:** Do not attempt to upload actual files. The contract attachment field expects a text URL string, not a binary file upload.

---

## 7. Internal Known Limitations (Observer Cheat Sheet)

Observers should keep these backend/UX gaps in mind and proactively redirect users if they arise:
* **Silent Transitions:** No in-app or external notifications are fired upon contract submission, confirmation, dispatch, or closure. Hand-offs must be coordinated manually.
* **Admin Controls:** There is no administrative UI view for contracts/shipments yet. Any manual interventions must be performed directly in the database.
* **UI Tooltips:** The description of how `dual_source_final` operates is not dynamically explained in the UI. Ensure you explain it verbally to the user.
* **Reporting:** The contract/shipment reports and CSV exports are not implemented yet.

---

## 8. Customer-Facing Talking Points (Al Qaryan)

When demoing Contract Lite, use the following framing to align customer expectations:
* **Controlled Pilot Workspace:** *"This staging environment is a sandbox designed to test the step-by-step operational handshakes before we activate production transactions."*
* **Digitized B2B Agreements:** *"Contract Lite is designed to digitize and track recurring, high-volume B2B agreements, replacing paper files and scattered spreadsheets with structured, shared audit trails."*
* **Weight Reconciliation:** *"Our weight policies, like `dual_source_final`, ensure transparent tracking of weights from origin scales to destination scales, keeping both parties aligned on what was sent versus received."*
* **Compliance Ready:** *"By capturing these events chronologically, we create a stronger operational foundation for future MWAN-aligned reporting and integration, subject to the applicable regulatory and technical requirements."*

---

## 9. UAT Issue Log Template

Use this table to record any unexpected issues during the supervised walkthrough:

| Step # | Description of Issue / Friction | Severity (H/M/L) | Browser Console/Network Log | Owner | Decision (Fix Now / Defer / Not Issue) |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

---

## 10. Go/No-Go Decision Criteria

### 🔴 NO-GO Thresholds
* Counterparty (Buyer) is unable to see or confirm the contract after submission.
* Role-based permissions are mixed (e.g., Seller can see Buyer buttons or vice-versa).
* Any required state transition fails to execute or crashes the page (Submit, Confirm, Dispatch, Receive, Close, Complete).
* The F1 mismatch persists (Cancel button is visible/clickable on a `received` shipment).

### 🟡 CONDITIONAL GO Thresholds
* Minor styling, language alignment, or layout overlap issues that do not block transactional progression.
* Delay in UI updates that is resolved with a manual page refresh.

### 🟢 GO Thresholds
* Happy path from contract creation to closure completes without errors.
* F1 spot-checks pass exactly as described.
* Final weight calculates correctly according to the `dual_source_final` policy.

---

## 11. UAT Sign-off Report Template

* **UAT Walkthrough Date:**  
* **Environment:** Staging (`https://tadweerah-staging.web.app`)  
* **Seller Company & User:**  
* **Buyer Company & User:**  
* **Contract Reference:**  
* **Shipment References:**  
* **F1 Spot-Check (Pass/Fail):**  
* **Happy Path (Pass/Fail):**  
* **Open Risks / Deferred Gaps:**  
* **Founder Decision:** [ ] GO  [ ] CONDITIONAL GO  [ ] NO-GO  
* **Next Action Items:**  
