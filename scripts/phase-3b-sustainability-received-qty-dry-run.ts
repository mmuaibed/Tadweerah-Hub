import { 
  sustainabilityReceivedLinesTable, 
  contractShipmentsTable, 
  contractsTable,
  sustainabilityAllocationLinesTable,
  sustainabilityAllocationsTable
} from "../lib/db/src/schema/index";
import { eq } from "../lib/db/node_modules/drizzle-orm/index.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Resolves the physical weight according to the owner-approved hierarchy.
 */
function resolvePhysicalWeight(sourceWeight: string | null, destWeight: string | null): string | null {
  const d = Number(destWeight);
  const isDestValid = !isNaN(d) && d > 0;
  
  const s = Number(sourceWeight);
  const isSrcValid = !isNaN(s) && s > 0;
  
  if (isDestValid) return String(d);
  if (isSrcValid) return String(s);
  return null;
}

function runPreflight() {
  const requiredFiles = [
    "lib/db/src/index.ts",
    "lib/db/src/schema/index.ts",
    "lib/db/node_modules/drizzle-orm/index.js",
  ];

  const missing = requiredFiles.filter((filePath) => !fs.existsSync(path.join(process.cwd(), filePath)));
  if (missing.length > 0) {
    console.error("Preflight failed. Missing local files:");
    for (const filePath of missing) console.error(`- ${filePath}`);
    process.exit(1);
  }

  console.log("Preflight OK: local imports/files resolved. No database connection attempted.");
  process.exit(0);
}

async function run() {
  const { db } = await import("../lib/db/src/index");

  console.log("Starting Phase 3-B Batch 1A-R2 Dry-Run for Contract Shipments...");

  // Fetch all received lines for contract shipments
  const lines = await db
    .select({
      received_line_id: sustainabilityReceivedLinesTable.id,
      parent_entity_id: sustainabilityReceivedLinesTable.parent_entity_id,
      current_final_received_qty: sustainabilityReceivedLinesTable.final_received_qty,
      current_is_eligible: sustainabilityReceivedLinesTable.is_eligible,
      current_reason: sustainabilityReceivedLinesTable.ineligibility_reason,
      
      shipment_id: contractShipmentsTable.id,
      shipment_reference: contractShipmentsTable.reference,
      source_weight: contractShipmentsTable.source_weight,
      destination_weight: contractShipmentsTable.destination_weight,
      final_weight: contractShipmentsTable.final_weight,
      
      contract_reference: contractsTable.reference,
      weight_policy: contractsTable.weight_policy,
    })
    .from(sustainabilityReceivedLinesTable)
    .innerJoin(contractShipmentsTable, eq(sustainabilityReceivedLinesTable.parent_entity_id, contractShipmentsTable.id))
    .innerJoin(contractsTable, eq(contractShipmentsTable.contract_id, contractsTable.id))
    .where(eq(sustainabilityReceivedLinesTable.parent_entity_type, 'contract_shipment'));

  const reportData = [];

  for (const line of lines) {
    const proposedQty = resolvePhysicalWeight(line.source_weight, line.destination_weight);
    
    let classification = "unchanged";
    let delta = 0;
    let proposedIsEligible = line.current_is_eligible;
    let proposedReason = line.current_reason;

    if (!proposedQty) {
      if (Number(line.current_final_received_qty) !== 0 || line.current_is_eligible) {
        classification = "becomes_pending_unavailable";
        proposedIsEligible = false;
        proposedReason = "missing_physical_quantity";
        delta = 0 - Number(line.current_final_received_qty);
      }
    } else {
      // Use numeric comparison consistently
      if (Number(line.current_final_received_qty) !== Number(proposedQty)) {
        classification = "changed";
        delta = Number(proposedQty) - Number(line.current_final_received_qty);
      }
    }

    // Find related allocations
    const allocations = await db
      .select({
        alloc_id: sustainabilityAllocationsTable.id,
        alloc_status: sustainabilityAllocationsTable.status,
      })
      .from(sustainabilityAllocationsTable)
      .where(eq(sustainabilityAllocationsTable.received_line_id, line.received_line_id));

    let numAllocationLines = 0;
    let hasFinalizedAllocation = false;

    for (const alloc of allocations) {
      if (alloc.alloc_status === 'finalized' || alloc.alloc_status === 'approved') {
        hasFinalizedAllocation = true;
      }
      const allocLines = await db
        .select({ id: sustainabilityAllocationLinesTable.id })
        .from(sustainabilityAllocationLinesTable)
        .where(eq(sustainabilityAllocationLinesTable.allocation_id, alloc.alloc_id));
      numAllocationLines += allocLines.length;
    }

    const requiresOwnerDecision = classification !== "unchanged" && hasFinalizedAllocation;

    reportData.push({
      classification,
      received_line_id: line.received_line_id,
      parent_entity_id: line.parent_entity_id,
      shipment_id: line.shipment_id,
      shipment_reference: line.shipment_reference || "N/A",
      commercial_reference: line.shipment_reference || "N/A",
      contract_reference: line.contract_reference || "N/A",
      source_weight: line.source_weight,
      destination_weight: line.destination_weight,
      final_weight: line.final_weight,
      weight_policy: line.weight_policy,
      current_final_received_qty: line.current_final_received_qty,
      proposed_sustainability_qty: proposedQty || "0 (Pending)",
      delta,
      current_is_eligible: line.current_is_eligible,
      proposed_eligibility: proposedIsEligible,
      current_reason: line.current_reason || "None",
      proposed_reason: proposedReason || "None",
      related_allocation_lines_count: numAllocationLines,
      has_finalized_allocations: hasFinalizedAllocation,
      safe_to_correct: requiresOwnerDecision ? "NO - Requires SIR-2D/Owner Decision" : "YES"
    });
  }

  console.table(reportData);

  // Use process.cwd() instead of __dirname to avoid ESM issues
  const outDir = path.join(process.cwd(), "docs/phase-3b-source-of-truth-audit/dry-runs");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const now = new Date();
  const ts = now.getFullYear().toString() + 
    String(now.getMonth() + 1).padStart(2, '0') + 
    String(now.getDate()).padStart(2, '0') + "-" + 
    String(now.getHours()).padStart(2, '0') + 
    String(now.getMinutes()).padStart(2, '0');

  const outPath = path.join(outDir, `1a-r2-sustainability-received-qty-dry-run-${ts}.md`);
  
  let mdContent = "# Phase 3-B Batch 1A-R2 Dry-Run Results\n\n";
  mdContent += `Total Records Evaluated: ${lines.length}\n`;
  mdContent += `Records Requiring Change: ${reportData.filter(r => r.classification !== 'unchanged').length}\n\n`;
  
  if (reportData.length > 0) {
    mdContent += "| Classification | Received Line ID | Parent Entity ID | Shipment ID | Shipment Ref | Commercial Ref | Contract Ref | Source Wt | Dest Wt | Final Wt | Policy | Cur Qty | Prop Qty | Delta | Cur Elig | Prop Elig | Cur Reason | Prop Reason | Alloc Lines | Finalized Alloc? | Safe to Correct? |\n";
    mdContent += "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";
    reportData.forEach(r => {
      mdContent += `| ${r.classification} | ${r.received_line_id} | ${r.parent_entity_id} | ${r.shipment_id} | ${r.shipment_reference} | ${r.commercial_reference} | ${r.contract_reference} | ${r.source_weight} | ${r.destination_weight} | ${r.final_weight} | ${r.weight_policy} | ${r.current_final_received_qty} | ${r.proposed_sustainability_qty} | ${r.delta} | ${r.current_is_eligible} | ${r.proposed_eligibility} | ${r.current_reason} | ${r.proposed_reason} | ${r.related_allocation_lines_count} | ${r.has_finalized_allocations ? 'Yes' : 'No'} | ${r.safe_to_correct} |\n`;
    });
  } else {
    mdContent += "No records found in database.\n";
  }

  fs.writeFileSync(outPath, mdContent, "utf-8");
  console.log(`\nReport written to ${outPath}`);
  
  process.exit(0);
}

if (process.argv.includes("--preflight")) {
  runPreflight();
} else {
  run().catch(err => {
    console.error("Dry run script failed:", err);
    process.exit(1);
  });
}
