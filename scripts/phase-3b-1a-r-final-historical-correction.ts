import fs from "fs";
import path from "path";
// No top-level DB imports to allow safe environment preflight

const TARGET_ROWS = [
  { ref: "TDW-CTR-2026-0005-S001", expectedLegacy: "40.000", proposed: "50.000", safe: true },
  { ref: "TDW-CTR-2026-0005-S003", expectedLegacy: "15.000", proposed: "20.000", safe: true },
  { ref: "TDW-CTR-2026-0006-S006", expectedLegacy: "30.000", proposed: "25.000", safe: true },
  { ref: "TDW-CTR-2026-0006-S010", expectedLegacy: "40.000", proposed: "35.000", safe: false } // Dependency check required
];

function formatDecimal(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "0.000";
  const parsed = Number(val);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value: ${val}`);
  }
  return parsed.toFixed(3);
}

function formatDisplayNumber(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "0";
  const parsed = Number(val);
  if (Number.isNaN(parsed)) return "0";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(parsed);
}

async function run() {
  const isApply = process.argv.includes("--apply");
  const isConfirm = process.argv.includes("--confirm-phase-3b-1a-r");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Running preflight only.");
    console.log("Preflight complete. Safely exiting.");
    process.exit(1);
  }

  if (isApply && !isConfirm) {
    console.error("ERROR: --apply was passed but --confirm-phase-3b-1a-r is missing.");
    process.exit(1);
  }

  console.log(isApply ? "RUNNING IN APPLY (WRITE) MODE..." : "DRY RUN - NO DATA MODIFIED");

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  const results: any[] = [];
  let allGuardsPassed = true;

  for (const target of TARGET_ROWS) {
    const rawResult = await db.execute(sql`
      SELECT 
        srl.id as received_line_id,
        srl.parent_entity_id,
        srl.final_received_qty,
        cs.id as row_id,
        cs.reference,
        cs.final_weight as commercial_final_weight,
        c.weight_policy as weight_policy,
        cs.final_value as final_value,
        (
          SELECT json_build_object(
            'status', sa.status,
            'total_allocated', (SELECT COALESCE(SUM(quantity), 0) FROM sustainability_allocation_lines WHERE allocation_id = sa.id)
          )
          FROM sustainability_allocations sa
          WHERE sa.received_line_id = srl.id
            AND sa.status != 'superseded'
          ORDER BY CASE WHEN sa.status = 'finalized' THEN 1 ELSE 2 END ASC, sa.version DESC
          LIMIT 1
        ) as active_allocation,
        (
          SELECT COALESCE(json_agg(json_build_object('status', sa2.status)), '[]'::json)
          FROM sustainability_allocations sa2
          WHERE sa2.received_line_id = srl.id
        ) as all_allocations
      FROM sustainability_received_lines srl
      JOIN contract_shipments cs ON srl.parent_entity_id = cs.id
      JOIN contracts c ON cs.contract_id = c.id
      WHERE srl.parent_entity_type = 'contract_shipment'
        AND cs.reference = ${target.ref}
    `);

    const rows = Array.isArray(rawResult) ? rawResult : (rawResult as any).rows;

    if (!rows || rows.length === 0) {
      console.error(`ERROR: Could not find ${target.ref}`);
      allGuardsPassed = false;
      continue;
    }

    const row = rows[0] as any;
    const currentLegacy = formatDecimal(row.final_received_qty);
    const expectedLegacy = formatDecimal(target.expectedLegacy);
    
    let abortReason = null;
    let safeToUpdate = true;

    if (currentLegacy !== expectedLegacy) {
      abortReason = `Expected ${expectedLegacy} but got ${currentLegacy}`;
      safeToUpdate = false;
      allGuardsPassed = false;
    }

    const alloc = row.active_allocation;
    const allAllocations = row.all_allocations || [];
    const hasSuperseded = allAllocations.some((a: any) => a.status === 'superseded');
    const hasNonDraft = allAllocations.some((a: any) => a.status !== 'draft');

    const activeAllocSum = alloc ? formatDecimal(alloc.total_allocated) : "0.000";
    const postCoverageNum = alloc ? (Number(activeAllocSum) / Number(target.proposed)) * 100 : 0;
    const postCoverage = formatDisplayNumber(postCoverageNum) + "%";
    const allocatedLteProposed = Number(activeAllocSum) <= Number(target.proposed);

    if (!allocatedLteProposed) {
      abortReason = `blocked: allocated sum (${activeAllocSum}) > proposed received (${formatDecimal(target.proposed)})`;
      safeToUpdate = false;
      allGuardsPassed = false;
    } else if (!target.safe) {
      const commercialFinalWeight = formatDecimal(row.commercial_final_weight);
      if (commercialFinalWeight !== "40.000") {
         abortReason = `Commercial final_weight expected 40.000 but got ${commercialFinalWeight}`;
         safeToUpdate = false;
         allGuardsPassed = false;
      } else if (!alloc || alloc.status !== 'finalized') {
        abortReason = "Expected finalized allocation but none found";
        safeToUpdate = false;
        allGuardsPassed = false;
      } else if (activeAllocSum !== formatDecimal(target.proposed)) {
        abortReason = `Allocation sum (${activeAllocSum}) does not match proposed (${formatDecimal(target.proposed)})`;
        safeToUpdate = false;
        allGuardsPassed = false;
      }
    } else {
      if (hasSuperseded) {
        abortReason = "blocked: superseded allocation dependency exists";
        safeToUpdate = false;
        allGuardsPassed = false;
      } else if (hasNonDraft) {
        abortReason = `blocked: non-draft allocation dependency exists`;
        safeToUpdate = false;
        allGuardsPassed = false;
      }
    }

    results.push({
      shipment_reference: target.ref,
      row_id: row.row_id,
      received_line_id: row.received_line_id,
      parent_entity_id: row.parent_entity_id,
      current_legacy_qty: currentLegacy,
      proposed_qty: formatDecimal(target.proposed),
      delta: formatDecimal(Number(target.proposed) - Number(currentLegacy)),
      active_allocation_status: alloc ? alloc.status : "none",
      active_allocation_sum: activeAllocSum,
      all_allocation_statuses: allAllocations.map((a: any) => a.status).join(", ") || "none",
      has_superseded_allocation: hasSuperseded,
      post_correction_coverage: postCoverage,
      allocated_lte_proposed: allocatedLteProposed,
      commercial_final_weight: formatDecimal(row.commercial_final_weight),
      weight_policy: row.weight_policy || "N/A",
      final_value: row.final_value !== null ? formatDecimal(row.final_value) : "null",
      is_safe: target.safe,
      would_update: safeToUpdate,
      abort_reason: abortReason || "None"
    });
  }

  // Preflight output
  console.table(results.map(r => ({
    ref: r.shipment_reference,
    curr_qty: formatDisplayNumber(r.current_legacy_qty),
    prop_qty: formatDisplayNumber(r.proposed_qty),
    alloc_status: r.active_allocation_status,
    alloc_sum: formatDisplayNumber(r.active_allocation_sum),
    all_allocs: r.all_allocation_statuses,
    has_super: r.has_superseded_allocation,
    post_cov: r.post_correction_coverage,
    alloc_lte_prop: r.allocated_lte_proposed,
    abort_reason: r.abort_reason
  })));

  if (isApply) {
    if (!allGuardsPassed) {
      console.error("ABORT: Not all guards passed in pre-flight. No data modified.");
      process.exit(1);
    }

    console.log("Applying transaction...");
    try {
      await db.transaction(async (tx: any) => {
        for (const res of results) {
          
          const txCheckRaw = await tx.execute(sql`
            SELECT srl.id, srl.parent_entity_id, srl.final_received_qty, cs.reference, cs.final_weight as commercial_final_weight, c.weight_policy, cs.final_value,
            (
              SELECT json_build_object('status', sa.status, 'total_allocated', (SELECT COALESCE(SUM(quantity), 0) FROM sustainability_allocation_lines WHERE allocation_id = sa.id))
              FROM sustainability_allocations sa WHERE sa.received_line_id = srl.id AND sa.status != 'superseded' ORDER BY CASE WHEN sa.status = 'finalized' THEN 1 ELSE 2 END ASC, sa.version DESC LIMIT 1
            ) as active_allocation,
            (
              SELECT COALESCE(json_agg(json_build_object('status', sa2.status)), '[]'::json)
              FROM sustainability_allocations sa2
              WHERE sa2.received_line_id = srl.id
            ) as all_allocations
            FROM sustainability_received_lines srl
            JOIN contract_shipments cs ON srl.parent_entity_id = cs.id
            JOIN contracts c ON cs.contract_id = c.id
            WHERE srl.id = ${res.received_line_id} FOR UPDATE
          `);
          
          const txRows = Array.isArray(txCheckRaw) ? txCheckRaw : (txCheckRaw as any).rows;
          if (!txRows || txRows.length !== 1) {
             throw new Error(`Tx Guard Failed: Row not found or multiple rows for ${res.shipment_reference}`);
          }
          
          const txRow = txRows[0];
          if (txRow.reference !== res.shipment_reference) {
             throw new Error(`Tx Guard Failed: Reference mismatch for ${res.shipment_reference}`);
          }
          if (txRow.parent_entity_id !== res.parent_entity_id) {
             throw new Error(`Tx Guard Failed: Parent entity ID mismatch for ${res.shipment_reference}`);
          }
          if (formatDecimal(txRow.final_received_qty) !== formatDecimal(res.current_legacy_qty)) {
             throw new Error(`Tx Guard Failed: final_received_qty changed for ${res.shipment_reference}`);
          }
          
          const allocSum = txRow.active_allocation ? Number(txRow.active_allocation.total_allocated) : 0;
          const allocSumDec = formatDecimal(allocSum);
          if (Number(allocSumDec) > Number(res.proposed_qty)) {
            throw new Error(`Tx Guard Failed: Invariant violation: allocated (${allocSumDec}) > proposed received (${res.proposed_qty}) for ${res.shipment_reference}`);
          }

          if (!res.is_safe) {
             if (formatDecimal(txRow.commercial_final_weight) !== "40.000") {
               throw new Error(`Tx Guard Failed: Commercial final_weight changed for ${res.shipment_reference}`);
             }
             const alloc = txRow.active_allocation;
             if (!alloc || alloc.status !== 'finalized' || formatDecimal(alloc.total_allocated) !== formatDecimal(res.proposed_qty)) {
                throw new Error(`Tx Guard Failed: Allocation state invalid for ${res.shipment_reference}`);
             }
          } else {
             const allAllocations = txRow.all_allocations || [];
             const hasSuperseded = allAllocations.some((a: any) => a.status === 'superseded');
             const hasNonDraft = allAllocations.some((a: any) => a.status !== 'draft');
             if (hasSuperseded || hasNonDraft) {
               throw new Error(`Tx Guard Failed: Safe row has unexpected allocation states for ${res.shipment_reference}`);
             }
          }

          const updateResultRaw = await tx.execute(sql`
            UPDATE sustainability_received_lines
            SET final_received_qty = ${res.proposed_qty}
            WHERE id = ${res.received_line_id}
            RETURNING id
          `);
          const updateResult = Array.isArray(updateResultRaw) ? updateResultRaw : (updateResultRaw as any).rows;
          if (updateResult.length !== 1) {
            throw new Error(`Tx Guard Failed: Affected rows != 1 for ${res.shipment_reference}`);
          }

          await tx.execute(sql`
            INSERT INTO audit_log (id, action, entity_type, entity_id, actor_role, details, created_at)
            VALUES (
              gen_random_uuid(),
              'historical_sustainability_received_qty_cache_correction',
              'sustainability_received_line',
              ${res.received_line_id},
              'system',
              ${JSON.stringify({ 
                phase: "Phase 3-B Batch 1A-R",
                shipment_reference: res.shipment_reference,
                received_line_id: res.received_line_id,
                old_legacy_final_received_qty: res.current_legacy_qty, 
                new_legacy_final_received_qty: res.proposed_qty,
                commercial_reference: {
                  final_weight: res.commercial_final_weight,
                  weight_policy: res.weight_policy,
                  final_value: res.final_value,
                  commercial_fields_modified: false
                },
                reason: "Phase 3B Batch 1A-R historical correction"
              })},
              NOW()
            )
          `);
        }
      });
      console.log("SUCCESS: Data modified and audited.");

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dirPath = path.join(process.cwd(), "docs", "phase-3b-source-of-truth-audit", "generated");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const reportPath = path.join(dirPath, `phase-3b-1a-r-final-historical-correction-apply-${timestamp}.md`);
      let report = `# Execution Report (Phase 3-B Batch 1A-R)\n\n`;
      report += `**Idempotency & Re-run Status:** Re-running this script after apply will report expected-current-value mismatch aborts (no-op) because legacy quantities will have already converged.\n\n`;
      
      results.forEach(r => {
        report += `## ${r.shipment_reference}\n`;
        report += `- **Row ID:** ${r.row_id}\n`;
        report += `- **Received Line ID:** ${r.received_line_id}\n`;
        report += `- **Old Legacy Qty:** ${formatDisplayNumber(r.current_legacy_qty)} (raw: ${r.current_legacy_qty})\n`;
        report += `- **New Legacy Qty:** ${formatDisplayNumber(r.proposed_qty)} (raw: ${r.proposed_qty})\n`;
        report += `- **Active Allocation:** ${r.active_allocation_status} (Sum: ${formatDisplayNumber(r.active_allocation_sum)})\n`;
        report += `- **All Allocations:** ${r.all_allocation_statuses}\n`;
        report += `- **Superseded Present:** ${r.has_superseded_allocation}\n`;
        report += `- **Post-Correction Coverage:** ${r.post_correction_coverage}\n`;
        report += `- **Allocated <= Proposed:** ${r.allocated_lte_proposed}\n`;
        report += `- **Commercial Context (Unchanged):** final_weight=${formatDisplayNumber(r.commercial_final_weight)}, policy=${r.weight_policy}, final_value=${r.final_value === "null" ? "null" : formatDisplayNumber(r.final_value)}, commercial_fields_modified=false\n\n`;
        report += `*Manual rollback payload (if needed): UPDATE sustainability_received_lines SET final_received_qty = '${r.current_legacy_qty}' WHERE id = '${r.received_line_id}';*\n\n`;
      });

      fs.writeFileSync(reportPath, report);
      console.log("Report generated at " + reportPath);

    } catch (e) {
      console.error("TRANSACTION ABORTED:", e);
      process.exit(1);
    }
  } else {
    console.log("DRY RUN - NO DATA MODIFIED");
    if (!allGuardsPassed) {
      console.log("WARNING: Dry run encountered guard failures.");
      process.exitCode = 1;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dirPath = path.join(process.cwd(), "docs", "phase-3b-source-of-truth-audit", "generated");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const reportPath = path.join(dirPath, `phase-3b-1a-r-final-historical-correction-dry-run-${timestamp}.md`);
    let report = `# Dry Run Report (Phase 3-B Batch 1A-R)\n\n`;
    report += `**Idempotency & Re-run Status:** Re-running this script after apply will report expected-current-value mismatch aborts (no-op) because legacy quantities will have already converged.\n\n`;
    
    results.forEach(r => {
      report += `## ${r.shipment_reference}\n`;
      report += `- **Row ID:** ${r.row_id}\n`;
      report += `- **Received Line ID:** ${r.received_line_id}\n`;
      report += `- **Old Legacy Qty:** ${formatDisplayNumber(r.current_legacy_qty)} (raw: ${r.current_legacy_qty})\n`;
      report += `- **Proposed Qty:** ${formatDisplayNumber(r.proposed_qty)} (raw: ${r.proposed_qty})\n`;
      report += `- **Active Allocation:** ${r.active_allocation_status} (Sum: ${formatDisplayNumber(r.active_allocation_sum)})\n`;
      report += `- **All Allocations:** ${r.all_allocation_statuses}\n`;
      report += `- **Superseded Present:** ${r.has_superseded_allocation}\n`;
      report += `- **Post-Correction Coverage:** ${r.post_correction_coverage}\n`;
      report += `- **Allocated <= Proposed:** ${r.allocated_lte_proposed}\n`;
      report += `- **Commercial Context (Unchanged):** final_weight=${formatDisplayNumber(r.commercial_final_weight)}, policy=${r.weight_policy}, final_value=${r.final_value === "null" ? "null" : formatDisplayNumber(r.final_value)}, commercial_fields_modified=false\n\n`;
      report += `*Manual rollback payload (if needed): UPDATE sustainability_received_lines SET final_received_qty = '${r.current_legacy_qty}' WHERE id = '${r.received_line_id}';*\n\n`;
    });

    fs.writeFileSync(reportPath, report);
    console.log("Dry run report generated at " + reportPath);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
