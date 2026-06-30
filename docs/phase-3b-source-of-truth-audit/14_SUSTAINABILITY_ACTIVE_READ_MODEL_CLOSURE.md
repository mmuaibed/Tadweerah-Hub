# 14. Sustainability Active Read Model Closure

## Executive Summary
This document confirms the final closure of the Sustainability Active Quantity Read Model.

All occurrences of sustainability_received_lines.final_received_qty being actively read as a source of truth have been completely removed or actively overridden via derived queries.

The platform now natively derives the actual physical weights safely from commercial boundaries and computes explicit impact metrics based strictly on current, non-superseded, finalized allocation states.

## Safe Semantics & Mappings

* **received_qty**: The dynamically derived Actual Sustainability Received Weight.
* **final_received_qty**: Maintained strictly in responses as an alias mapped dynamically to actual_sustainability_received_qty.
* **legacy_final_received_qty**: The exact persisted legacy DB column.
* **reportable_qty**: The sum of the current finalized, non-superseded allocation lines.
* **remaining_qty**: received_qty - reportable_qty.
* **coverage_pct**: (reportable_qty / received_qty) * 100.

## Safe Buyer & Admin Lists
Buyer allocation list routes now cleanly isolate the current display allocation by leveraging a LEFT JOIN subquery that strictly prioritizes status = 'finalized'.
