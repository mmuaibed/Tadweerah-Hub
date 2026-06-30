# Phase 3-B Numeric Source-of-Truth Inventory

## Objective
Identify and classify all numeric and calculated fields across the platform to eliminate the risk of active stale stored-derived numbers. This audit covers all user roles, journeys, frontend screens, backend routes, admin portals, and export paths to ensure holistic data integrity.

## 1. Comprehensive Numeric Inventory Matrix

| Area | Table / Field | Numeric Type | Current Meaning / Source | Classification & Risk | Recommended Action | Roles Affected | Journey / Path Affected | Frontend Screens | Backend Routes | Admin Screens | Print / Export / Email |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Financials** | `contract_shipments.source_weight` | numeric | Supplier measured weight (Canonical) | `canonical_input` (Critical) | Keep as canonical | Seller, Buyer, Transporter, Admin | Shipment, Financial | Shipment Details | `/shipments` | Admin Shipments | Waybills |
| **Financials** | `contract_shipments.destination_weight` | numeric | Buyer measured weight (Canonical) | `canonical_input` (Critical) | Keep as canonical | Seller, Buyer, Transporter, Admin | Shipment, Financial | Shipment Details | `/shipments` | Admin Shipments | Waybills |
| **Financials** | `contract_shipments.final_weight` | numeric | Commercial Approved Weight (Derived from policy) | `derived_cached_active_risk` (Critical) | Derive at read time | Seller, Buyer, Admin | Financial / Payment | Financial Summaries | `/shipments`, `/deals` | Admin Financials | Invoices, Payment Requests |
| **Financials** | `contract_shipments.final_value` | numeric | Buyer Payable / Seller Entitlement (`final_weight` * `price`) | `derived_cached_active_risk` (Critical) | Derive at read time | Seller, Buyer, Admin | Financial / Payment | Financial Summaries | `/shipments`, `/deals` | Admin Financials | Invoices, Payment Requests |
| **Financials** | `contract_materials.price_per_unit` | numeric | Unit price for material (Canonical) | `canonical_input` (High) | Keep as canonical | Seller, Buyer, Admin | Contract / Deal | Contract Details | `/contracts` | Admin Contracts | Contract PDFs |
| **Sustain.** | `sustainability_received_lines.final_received_qty` | numeric | Actual Sustainability Received Weight (Derived from weights) | `derived_cached_active_risk` (Critical) | Deprecate/derive live | Seller, Buyer, Admin | Sustainability, Certificate | Allocation List | `/sustainability/received-lines` | Admin Sust. Overview | None (Read dynamically) |
| **Sustain.** | `sustainability_allocations.allocation_total_qty` | numeric | Total qty allocated for line (SUM of lines) | `derived_cached_active_risk` (High) | Derive at read time | Buyer, Admin | Sustainability | Allocation Details | `/allocations` | Admin Allocations | Reports |
| **Sustain.** | `sustainability_allocations.allocation_gap_qty` | numeric | Unallocated qty remaining (`final_received_qty` - `total`) | `derived_cached_active_risk` (High) | Derive at read time | Buyer, Admin | Sustainability | Allocation Details | `/allocations` | Admin Allocations | Reports |
| **Sustain.** | `sustainability_allocation_lines.quantity` | numeric | Amount allocated to a pathway (Canonical) | `canonical_input` (Critical) | Keep as canonical | Buyer, Admin | Sustainability | Allocation Details | `/allocations` | Admin Allocations | Certificates, Reports |
| **Sustain.** | `sustainability_allocation_lines.percentage` | numeric | Percentage of received qty (`quantity` / `received`) | `derived_cached_active_risk` (High) | Derive at read time | Buyer, Admin | Sustainability | Allocation Details | `/allocations` | Admin Allocations | Certificates, Reports |
| **Sustain.** | `sustainability_reports.report_data_snapshot` | JSONB | Immutable snapshot of report | `derived_snapshot_allowed` (Low) | Keep immutable snapshot | Seller, Buyer, Admin | Print / Certificate | Report View | `/reports` | Admin Reports | PDF Generation |
| **Marketplace**| `deals.actual_quantity` | numeric | Actual fulfilled quantity (Canonical) | `canonical_input` (High) | Keep as canonical | Seller, Buyer, Admin | Marketplace / Deal | Deal Details | `/deals` | Admin Deals | Deal Summaries |
| **Marketplace**| `deals.final_amount` | numeric | Total subtotal of deal (`qty` * `price`) | `derived_cached_active_risk` (High) | Derive at read time | Seller, Buyer, Admin | Marketplace / Financial | Deal Summaries | `/deals` | Admin Deals | Invoices |
| **Marketplace**| `deals.total_amount` | numeric | Final amount incl. VAT (`final_amount` + `vat`) | `derived_cached_active_risk` (High) | Derive at read time | Seller, Buyer, Admin | Marketplace / Financial | Deal Summaries | `/deals` | Admin Deals | Invoices |
| **Marketplace**| `listing_offers.offer_subtotal` | numeric | Offer total amount (`qty` * `price`) | `derived_cached_active_risk` (Medium) | Derive at read time | Seller, Buyer | Public / Marketplace | Offer Details | `/offers` | Admin Offers | None |

## 2. Stale-Value Risk Scenarios by Role

### A. Financial Settlement Risk (`contract_shipments.final_weight` / `final_value`)
- **Buyer Role Risk:** If the buyer correctly adjusts the destination weighbridge ticket downward (e.g., due to contamination) but the DB cached `final_value` is not recalculated, the buyer will see an artificially high payable amount in their dashboard and will be overcharged.
- **Seller Role Risk:** The seller's dashboard will show an inflated entitlement. They will issue a payment request based on the stale number, causing a dispute.
- **Admin Role Risk:** Admin financial audits will show total platform transacted value out of sync with the underlying physical weighbridge records.
- **Print/Export Risk:** Automated invoices will be generated and emailed with incorrect stale totals. **This is a critical cross-path failure if not derived dynamically.**

### B. Sustainability Reporting Risk (`final_received_qty`, `allocation_total_qty`, `percentage`)
- **Buyer Role Risk:** The processor attempts to allocate material based on a stale `final_received_qty` cache that doesn't reflect a recently corrected weighbridge ticket. They may inadvertently overallocate the material (breaking mass balance) or underallocate it.
- **Seller Role Risk:** The seller receives a PVR Certificate (PDF) containing misaligned physical quantities and percentages, violating audit standards.
- **Admin Role Risk:** Admin locks a sustainability report that is mathematically inconsistent with the physical `destination_weight` of the shipment.
- **Print/Export Risk:** The PDF generation script outputs incorrect allocation percentages. **If the frontend derives it correctly but the PDF generator reads the DB cache, the issue is not closed.**

### C. Marketplace / Deals Risk (`deals.final_amount`, `deals.total_amount`)
- **Buyer/Seller Role Risk:** Negotiating or settling a deal based on a stale `total_amount` after `actual_quantity` was corrected.
- **Notification/Email Risk:** Deal completion emails send the wrong final transaction value.

## 3. Findings & Rule Application
**Conclusion:** The platform must adopt a "Pure Read-Time Derivation" strategy for all mathematical derivatives of physical metrics, financial prices, and percentages. 
1. **Holistic Closure Rule:** We cannot fix just the API or the frontend. The backend routes serving the API, the backend routes serving the Admin portal, and the backend scripts generating PDFs/Emails must all converge on a shared service (e.g., `resolveSustainabilityPhysicalWeight()`, `calculateCommercialValue()`) rather than querying the DB columns.
2. **Current State & Codex FAIL Verdict:** The initial assumption that the sustainability issue was partially closed via `enrichReceivedLineQty()` in `sustainability.ts` was **FALSE**. The Codex review returned a **FAIL** verdict because `final_received_qty` is still directly read in active paths like `/reports.ts`, `/admin.ts`, and `sustainability-print.tsx`. The financial paths (which use `final_value`) are also fundamentally exposed.
3. **Requirement:** Batch A and Batch B (Shared Resolver & Print Semantics) are strictly required before any data correction (like S010) is allowed to proceed.

## 4. Minimal Safe Implementation Batches
**Batch 1B (Financial & Deal Derived Read-Time Migration):**
- Migrate `/shipments`, `/deals`, `/offers` (Buyer, Seller, Admin APIs) to calculate `final_weight`, `final_value`, and `total_amount` live.
- Migrate invoice/export generators to use the same live derivation.

**Batch 1C (Sustainability Totals Read-Time Migration):**
- Ensure PDF generators and reporting APIs calculate `allocation_gap_qty` and `percentage` live, ignoring DB caches.

**Batch 1D (Cleanup):**
- Drop deprecated DB columns to enforce the rule permanently.

## 5. Role/Path Closure Matrix
The following matrix evaluates each High-Risk/Critical stored derived field against all platform consumption paths to track completion of the holistic closure rule. No field can be marked functionally closed until all applicable roles are safe.

| Critical/High-Risk Field | Seller | Buyer | Transporter | Admin | Reports | Print/Cert | Email/Notif | API | Closure Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `contract_shipments.final_weight` | stale risk | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |
| `contract_shipments.final_value` | stale risk | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |
| `deals.final_amount` | stale risk | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |
| `deals.total_amount` | stale risk | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |
| `sustainability_received_lines.final_received_qty` | reads derived live | reads derived live | not applicable | reads derived live | reads derived live | reads derived live | not applicable | reads derived live | **SAFE** (All active impact reads are now explicit derived fields. `final_received_qty` remains only as legacy/audit context) |
| `sustainability_allocations.allocation_total_qty` | not applicable | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |
| `sustainability_allocations.allocation_gap_qty` | not applicable | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |
| `sustainability_allocation_lines.percentage` | stale risk | stale risk | not applicable | stale risk | stale risk | stale risk | stale risk | stale risk | **OPEN RISK** |

*(Key: `safe`, `reads derived live`, `reads stored snapshot intentionally`, `stale risk`, `not applicable`)*
