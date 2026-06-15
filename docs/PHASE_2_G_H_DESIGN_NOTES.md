# Tadweerah Hub — Design Notes (Phase 2-G & 2-H)
> Status: Design & Documentation Only (No Implementation Yet)

This document serves as the official design record for Phase 2-G and Phase 2-H, establishing the operational and technical direction before any code is written.

---

## Phase 2-G — Billing & Tadweerah Fee Design Note

### Objective
Design a clear billing model and Tadweerah fee structure for deals and contracts, ensuring transparency for buyers and safeguarding seller revenues.

### Core Principles & Terminology
- **Terminology:** The platform issues a **"Payment Request" (مطالبة سداد)**, not a "Tax Invoice" (فاتورة ضريبية), at this stage. Official tax invoices will be generated via an external accounting system (e.g., ZATCA-compliant QuickBooks/Xero) after financial review.
- **Independence:** The seller's amount is completely independent of Tadweerah's fee.
- **Buyer Responsibility:** Tadweerah's fee is added to the buyer's cost and is **never** deducted from the seller's revenue.

### 1. Deals / Auctions Model
- **Pre-commitment Transparency:** Tadweerah's fee must be clearly displayed to the buyer as an additional cost *before* they submit an offer or commit to a deal.
- **Payment Requests:** Upon deal acceptance, two distinct payment requests are generated for the buyer:
  1. **Seller Amount Payment Request** (قيمة الصفقة + VAT).
  2. **Tadweerah Fee Payment Request** (رسوم تدويرة + VAT).
- **Payment Workflow (MVP):**
  - The buyer uploads two separate proofs of payment.
  - The seller confirms receipt of the deal amount.
  - The platform admin confirms receipt of the Tadweerah fee.
  - **Strict Constraint:** The deal status cannot transition to `dispatched` (shipping) until **both** payments are confirmed.

### 2. Operational Contracts Model (e.g., Al Qaryan)
- **Workflow Continuity:** Daily operations and shipments must not be blocked or delayed by billing processes.
- **Periodic Aggregated Billing:** Rather than billing per shipment, Tadweerah will use a monthly aggregated billing model.
- **Mechanism:** Billing is calculated based exclusively on **closed shipments and approved final weights** over a specific period.
- **Execution:** The platform will generate a detailed monthly report (via Phase 2-H), which will be used as a supporting document attached to the external Tax Invoice sent to the client.

### Out of Scope for MVP
- Generating official ZATCA-compliant Tax Invoices directly from the platform.
- Deep API integration with QuickBooks, Xero, or ZATCA.
- Complex deferred payment systems (credit limits) within the platform.
- Automated collection workflows for contracts.
- Replacing or modifying the current `ADMIN_API_KEY` protection mechanism.

---

## Phase 2-H — Admin Reports & Periodic Metrics Design Note

### Objective
Transform the admin reports from static, all-time indicators into dynamic, period-based management reports that can be exported, printed, and used for operational billing.

### 1. Dynamic Filters
The reports dashboard will be upgraded to support dynamic filtering:
- **Period Filter:** Today, This Week, This Month, This Quarter, This Year, Custom Range (From/To).
- **Date Reference Filter:**
  - **Creation Date:** For measuring new activity (e.g., deals created).
  - **Closed/Approved Date:** Critical for financial reporting and contract billing (e.g., shipments closed and weighed).
- **Company/Client Filter:** Ability to filter the entire report for a specific company (crucial for Al Qaryan's monthly billing).
- **Report Type/Path Filter:** Comprehensive Dashboard, Deals, Contracts, Shipments, Transport Requests, Companies, Financials.

### 2. Tadweerah Identity & Export
- **Print Layout:** Printed reports must strictly adhere to Tadweerah's brand identity.
  - Elements: Logo, Brand Colors, Explicit Report Title, Selected Period, Issue Date.
  - Footer: "تدويرة | كل قيمة تستحق أن تعود".
- **Export Formats (MVP):** Print View (for PDF via browser) and an improved CSV export.
- **Next Phase:** Native XLSX/Excel export (highly requested by management and corporate clients).
- **Deferred:** Server-side PDF generation.

### 3. Data Accuracy & Constraints
- Metrics depend entirely on the timely and accurate data entry by users.
- Unclosed shipments are strictly excluded from approved weight totals.
- Tadweerah fees will not appear in financial reports until Phase 2-G is fully implemented.
- Issue reports/support tickets currently bypass the database (email-only) and will not be included in these reports yet.

### 4. Integration with Contract Billing (Al Qaryan Use-Case)
The monthly billing for major contracts relies directly on this reporting engine:
- **Setup:** Filter by Company = "Al Qaryan", Period = "This Month", Date Reference = "Closed/Approved Date".
- **Output:** The report summarizes the **Total Approved Final Tons** and provides a detailed table of all included shipments.
- **Usage:** This report is printed and attached to the monthly financial claim to justify the Tadweerah fees without interrupting their logistics.
