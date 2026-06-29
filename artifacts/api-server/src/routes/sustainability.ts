import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  sustainabilityReceivedLinesTable,
  sustainabilityAllocationsTable,
  sustainabilityAllocationLinesTable,
  sustainabilityPathwaysTable,
  sustainabilityCorrectionRequestsTable,
  dealsTable,
  contractShipmentsTable,
  contractMaterialsTable,
  contractsTable
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";
import { resolveSustainabilityPhysicalWeight } from "../services/sustainability-physical-weight";
import { validateAllocationDraft } from "../services/sustainability-validation";
import { logAudit } from "../lib/audit";
import { notifyAdminCorrectionRequested } from "../lib/admin-notify";
import { notifyCorrectionApproved, notifyCorrectionRejected } from "../lib/notify";
import { wasteListingsTable } from "@workspace/db";

async function enrichReceivedLineQty(receivedLine: any, allocationStatus?: string) {
  if (receivedLine.parent_entity_type === "deal" && receivedLine.parent_entity_id) {
    const [deal] = await db
      .select({
        actual_quantity: dealsTable.actual_quantity,
        listing_quantity: wasteListingsTable.quantity,
        is_processed_output: wasteListingsTable.is_processed_output,
        material_subcategory_id: wasteListingsTable.material_subcategory_id,
        created_at: dealsTable.created_at
      })
      .from(dealsTable)
      .leftJoin(wasteListingsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
      .where(eq(dealsTable.id, receivedLine.parent_entity_id))
      .limit(1);

    if (deal) {
      if (deal.actual_quantity) {
        receivedLine.final_received_qty = deal.actual_quantity;
      } else if (deal.listing_quantity) {
        receivedLine.final_received_qty = deal.listing_quantity;
      }

      if (receivedLine.ineligibility_reason === "processed_output_or_unclassified") {
        if (deal.is_processed_output === true) {
          receivedLine.ineligibility_reason = "processed_output";
        } else {
          const hasQty = Number(receivedLine.final_received_qty) > 0;
          const hasCat = Boolean(receivedLine.material_category_id) || Boolean(deal.material_subcategory_id);
          
          if (hasQty && hasCat) {
            receivedLine.is_eligible = true;
            receivedLine.ineligibility_reason = null;
          } else if (deal.is_processed_output === null) {
            receivedLine.ineligibility_reason = "unclassified";
          }
        }
      }

      if (deal.material_subcategory_id) {
        receivedLine.material_category_id = deal.material_subcategory_id;
      }

      const year = deal.created_at ? new Date(deal.created_at).getFullYear() : new Date().getFullYear();
      receivedLine.parent_reference = `TDW-${year}-${receivedLine.parent_entity_id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    }
  } else if (receivedLine.parent_entity_type === "contract_shipment" && receivedLine.parent_entity_id) {
    const [shipment] = await db
      .select({ 
        destination_weight: contractShipmentsTable.destination_weight,
        source_weight: contractShipmentsTable.source_weight,
        reference: contractShipmentsTable.reference,
        material_category_id: contractMaterialsTable.material_category_id,
        material_label: contractMaterialsTable.material_label,
        unit_label: contractMaterialsTable.unit_label,
        weight_policy: contractsTable.weight_policy,
      })
      .from(contractShipmentsTable)
      .leftJoin(contractMaterialsTable, eq(contractShipmentsTable.material_line_id, contractMaterialsTable.id))
      .leftJoin(contractsTable, eq(contractShipmentsTable.contract_id, contractsTable.id))
      .where(eq(contractShipmentsTable.id, receivedLine.parent_entity_id))
      .limit(1);
    
    if (shipment) {
      if (allocationStatus !== "finalized") {
        let finalQty: string | null = resolveSustainabilityPhysicalWeight(shipment.source_weight, shipment.destination_weight);
        let errorReason: string | null = null;

        if (!finalQty) {
          errorReason = "missing_physical_quantity";
        }

        if (finalQty) {
          receivedLine.final_received_qty = finalQty;
          
          if (receivedLine.ineligibility_reason === "non_positive_quantity" || receivedLine.ineligibility_reason === "missing_buyer_quantity") {
            const hasCat = Boolean(receivedLine.material_category_id) || Boolean(shipment.material_category_id) || Boolean(shipment.material_label);
            if (!hasCat) {
              receivedLine.is_eligible = false;
              receivedLine.ineligibility_reason = "unclassified";
            } else {
              receivedLine.is_eligible = true;
              receivedLine.ineligibility_reason = null;
            }
          }
        } else {
          receivedLine.final_received_qty = "0";
          receivedLine.is_eligible = false;
          receivedLine.ineligibility_reason = errorReason;
        }
      } else {
        let expectedQty: string | null = resolveSustainabilityPhysicalWeight(shipment.source_weight, shipment.destination_weight);

        if (expectedQty && expectedQty !== receivedLine.final_received_qty) {
          receivedLine.mismatch_warning = `Finalized quantity (${receivedLine.final_received_qty}) mismatches derived weight (${expectedQty}).`;
        }
      }
      if (shipment.reference) {
        receivedLine.parent_reference = shipment.reference;
      }
      if (shipment.material_label) {
        receivedLine.material_label = shipment.material_label;
      }
      if (shipment.unit_label) {
        let u = shipment.unit_label.toLowerCase().trim();
        if (u === "طن" || u === "ton") u = "ton";
        else if (u === "كجم" || u === "kg") u = "kg";
        receivedLine.final_received_unit = u;
      }
      if (shipment.material_category_id) {
        receivedLine.material_category_id = shipment.material_category_id;
      }
      
      if (receivedLine.ineligibility_reason === "processed_output_or_unclassified") {
        const hasCat = Boolean(shipment.material_category_id) || Boolean(shipment.material_label);
        if (!hasCat) {
          receivedLine.ineligibility_reason = "unclassified";
        } else {
          receivedLine.is_eligible = true;
          receivedLine.ineligibility_reason = null;
        }
      }
    }
  }
}

async function resolveEditableAllocationForReceivedLine(lineId: string, companyId: string, dbOrTx: any = db) {
  const [receivedLine] = await dbOrTx
    .select()
    .from(sustainabilityReceivedLinesTable)
    .where(
      and(
        eq(sustainabilityReceivedLinesTable.id, lineId),
        eq(sustainabilityReceivedLinesTable.buyer_company_id, companyId)
      )
    )
    .limit(1);

  if (!receivedLine) return { receivedLine: null, allocation: null };

  const [allocation] = await dbOrTx
    .select()
    .from(sustainabilityAllocationsTable)
    .where(eq(sustainabilityAllocationsTable.received_line_id, lineId))
    .orderBy(desc(sustainabilityAllocationsTable.version))
    .limit(1);

  return { receivedLine, allocation };
}

const router = Router();

/**
 * GET /sustainability/received-lines
 * Lists all received lines (eligible and ineligible) for the authenticated company.
 */
router.get("/sustainability/received-lines", requireAuth, requireCompany(), async (req, res) => {
  const { company } = req as AuthedCompanyRequest;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select({
      received_line: sustainabilityReceivedLinesTable,
      allocation_id: sustainabilityAllocationsTable.id,
      allocation_status: sustainabilityAllocationsTable.status,
      deal_created_at: dealsTable.created_at,
      deal_actual_quantity: dealsTable.actual_quantity,
      listing_quantity: wasteListingsTable.quantity,
      listing_is_processed_output: wasteListingsTable.is_processed_output,
      listing_subcategory_id: wasteListingsTable.material_subcategory_id,
      shipment_reference: contractShipmentsTable.reference,
      shipment_destination_weight: contractShipmentsTable.destination_weight,
      shipment_source_weight: contractShipmentsTable.source_weight,
      shipment_weight_policy: contractsTable.weight_policy,
      shipment_material_id: contractShipmentsTable.material_line_id,
      shipment_contract_id: contractShipmentsTable.contract_id,
      shipment_material_category_id: contractMaterialsTable.material_category_id,
      shipment_material_label: contractMaterialsTable.material_label,
      shipment_unit_label: contractMaterialsTable.unit_label,
    })
    .from(sustainabilityReceivedLinesTable)
    .leftJoin(
      sustainabilityAllocationsTable,
      eq(sustainabilityReceivedLinesTable.id, sustainabilityAllocationsTable.received_line_id)
    )
    .leftJoin(
      dealsTable,
      and(
        eq(sustainabilityReceivedLinesTable.parent_entity_type, "deal"),
        eq(sustainabilityReceivedLinesTable.parent_entity_id, dealsTable.id)
      )
    )
    .leftJoin(
      wasteListingsTable,
      eq(dealsTable.listing_id, wasteListingsTable.id)
    )
    .leftJoin(
      contractShipmentsTable,
      and(
        eq(sustainabilityReceivedLinesTable.parent_entity_type, "contract_shipment"),
        eq(sustainabilityReceivedLinesTable.parent_entity_id, contractShipmentsTable.id)
      )
    )
    .leftJoin(
      contractMaterialsTable,
      eq(contractShipmentsTable.material_line_id, contractMaterialsTable.id)
    )
    .leftJoin(
      contractsTable,
      eq(contractShipmentsTable.contract_id, contractsTable.id)
    )
    .where(eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id))
    .orderBy(desc(sustainabilityReceivedLinesTable.created_at))
    .limit(limit)
    .offset(offset);

  const formattedRows = rows.map((r) => {
    let parent_reference = "مرجع غير متاح";
    let parent_entity_contract_id: string | null = null;
    let derived_qty = r.received_line.final_received_qty;
    let derived_unit = r.received_line.final_received_unit;
    let derived_reason = r.received_line.ineligibility_reason;
    let derived_cat = r.received_line.material_category_id;
    let derived_is_eligible = r.received_line.is_eligible;
    let derived_material_label = r.received_line.material_label;
    
    if (r.received_line.parent_entity_type === "deal" && r.received_line.parent_entity_id) {
      const id = r.received_line.parent_entity_id;
      const year = r.deal_created_at ? new Date(r.deal_created_at).getFullYear() : new Date().getFullYear();
      parent_reference = `TDW-${year}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

      if (r.deal_actual_quantity) {
        derived_qty = r.deal_actual_quantity;
      } else if (r.listing_quantity) {
        derived_qty = r.listing_quantity;
      }

      if (r.listing_subcategory_id) {
        derived_cat = r.listing_subcategory_id;
      }

      if (derived_reason === "processed_output_or_unclassified") {
        if (r.listing_is_processed_output === true) {
          derived_reason = "processed_output";
        } else {
          const hasQty = Number(derived_qty) > 0;
          const hasCat = Boolean(derived_cat);
          
          if (hasQty && hasCat) {
            derived_is_eligible = true;
            derived_reason = null;
          } else if (r.listing_is_processed_output === null) {
            derived_reason = "unclassified";
          }
        }
      }

    } else if (r.received_line.parent_entity_type === "contract_shipment" && r.shipment_reference) {
      parent_reference = r.shipment_reference;
      if (r.shipment_contract_id) {
        parent_entity_contract_id = r.shipment_contract_id;
      }
      
      if (r.allocation_status !== "finalized") {
        let expectedQty: string | null = resolveSustainabilityPhysicalWeight(r.shipment_source_weight, r.shipment_destination_weight);
        let errorReason: string | null = null;

        if (!expectedQty) {
          errorReason = "missing_physical_quantity";
        }

        if (expectedQty) {
          derived_qty = expectedQty;
          
          if (derived_reason === "non_positive_quantity" || derived_reason === "missing_buyer_quantity") {
            const hasCat = Boolean(r.shipment_material_category_id) || Boolean(r.shipment_material_label);
            if (!hasCat) {
              derived_reason = "unclassified";
              derived_is_eligible = false;
            } else {
              derived_is_eligible = true;
              derived_reason = null;
            }
          }
        } else {
          derived_qty = "0";
          derived_is_eligible = false;
          derived_reason = errorReason;
        }
      }
      
      if (r.shipment_material_label) {
        derived_material_label = r.shipment_material_label;
      }
      
      if (r.shipment_unit_label) {
        let u = r.shipment_unit_label.toLowerCase().trim();
        if (u === "طن" || u === "ton") u = "ton";
        else if (u === "كجم" || u === "kg") u = "kg";
        derived_unit = u;
      }

      if (r.shipment_material_category_id) {
        derived_cat = r.shipment_material_category_id;
      }

      if (derived_reason === "processed_output_or_unclassified") {
        const hasCat = Boolean(r.shipment_material_category_id) || Boolean(r.shipment_material_label);
        if (!hasCat) {
          derived_reason = "unclassified";
        } else {
          derived_is_eligible = true;
          derived_reason = null;
        }
      }
    }

    return {
      received_line: {
        ...r.received_line,
        parent_reference,
        parent_entity_contract_id,
        final_received_qty: derived_qty,
        final_received_unit: derived_unit,
        material_label: derived_material_label,
        ineligibility_reason: derived_reason,
        material_category_id: derived_cat,
        is_eligible: derived_is_eligible,
      },
      allocation_id: r.allocation_id,
      allocation_status: r.allocation_status
    };
  });

  res.json(formattedRows);
});

/**
 * GET /sustainability/received-lines/:id/allocation
 * Gets the allocation draft/finalized state and its lines.
 */
router.get("/sustainability/received-lines/:id/allocation", requireAuth, requireCompany(), async (req, res) => {
  const { company } = req as AuthedCompanyRequest;
  const lineId = String(req.params.id);

  const { receivedLine, allocation } = await resolveEditableAllocationForReceivedLine(lineId, company.id, db);

  if (!receivedLine) {
    res.status(404).json({ error: "NotFound", message: "Received line not found." });
    return;
  }

  await enrichReceivedLineQty(receivedLine, allocation?.status);

  const activePathways = await db.select().from(sustainabilityPathwaysTable).where(eq(sustainabilityPathwaysTable.is_active, true));

  if (!allocation) {
    res.json({
      received_line: receivedLine,
      allocation: null,
      lines: [],
      pathways: activePathways,
      validation: {
        totalAllocated: 0,
        gap: Number(receivedLine.final_received_qty),
        allocatedPercentage: 0,
        gapPercentage: Number(receivedLine.final_received_qty) > 0 ? 100 : 0,
        isFullyAllocated: false
      }
    });
    return;
  }

  const lines = await db
    .select({
      line: sustainabilityAllocationLinesTable,
      pathway: sustainabilityPathwaysTable
    })
    .from(sustainabilityAllocationLinesTable)
    .innerJoin(
      sustainabilityPathwaysTable,
      eq(sustainabilityPathwaysTable.id, sustainabilityAllocationLinesTable.pathway_id)
    )
    .where(eq(sustainabilityAllocationLinesTable.allocation_id, allocation.id));

  const validation = validateAllocationDraft(receivedLine, lines.map(l => l.line), 0);

  res.json({
    received_line: receivedLine,
    allocation,
    lines: lines.map(l => ({ ...l.line, pathway: l.pathway })),
    pathways: activePathways,
    validation
  });
});

/**
 * POST /sustainability/received-lines/:id/allocation
 * Create or update draft allocation. Replaces all lines.
 */
router.post("/sustainability/received-lines/:id/allocation", requireAuth, requireCompany(), async (req, res) => {
  const { company } = req as AuthedCompanyRequest;
  const lineId = String(req.params.id);
  const { lines } = (req.body ?? {}) as { lines?: { pathway_id: string; quantity: number | string; explanation_text?: string }[] };

  if (!Array.isArray(lines)) {
    res.status(400).json({ error: "ValidationError", message: "lines array is required" });
    return;
  }

  const { receivedLine, allocation } = await resolveEditableAllocationForReceivedLine(lineId, company.id, db);

  if (!receivedLine) {
    res.status(404).json({ error: "NotFound", message: "Received line not found." });
    return;
  }

  await enrichReceivedLineQty(receivedLine, allocation?.status);

  if (!receivedLine.is_eligible) {
    res.status(400).json({
      error: "Ineligible",
      message: "This received line is not eligible for sustainability reporting.",
      ineligibility_reason: receivedLine.ineligibility_reason
    });
    return;
  }

  // Pre-fetch pathways to validate active and explanation
  const pathwayIds = lines.map(l => l.pathway_id).filter(Boolean);
  const activePathways = pathwayIds.length > 0
    ? await db.select().from(sustainabilityPathwaysTable).where(and(inArray(sustainabilityPathwaysTable.id, pathwayIds), eq(sustainabilityPathwaysTable.is_active, true)))
    : [];
  
  const pathwayMap = new Map(activePathways.map(p => [p.id, p]));

  // Validate request lines
  const seenPathways = new Set<string>();
  for (const l of lines) {
    if (seenPathways.has(l.pathway_id)) {
      res.status(400).json({ error: "ValidationError", message: `Duplicate pathway_id in request: ${l.pathway_id}` });
      return;
    }
    seenPathways.add(l.pathway_id);

    const qty = Number(l.quantity);
    if (isNaN(qty) || qty < 0) {
      res.status(400).json({ error: "ValidationError", message: "Invalid quantity in lines. Must be a non-negative number." });
      return;
    }
    const pathway = pathwayMap.get(l.pathway_id);
    if (!pathway) {
      res.status(400).json({ error: "ValidationError", message: `Invalid or inactive pathway_id: ${l.pathway_id}` });
      return;
    }
    if (pathway.requires_explanation && (!l.explanation_text || !l.explanation_text.trim())) {
      res.status(400).json({ error: "ValidationError", message: `Explanation text is required for the '${pathway.name_en}' pathway.` });
      return;
    }
  }

  // Validate over-allocation
  const validation = validateAllocationDraft(receivedLine, lines, 0); // tolerance doesn't matter for over-allocation check
  if (validation.gap < 0) {
    res.status(400).json({ error: "ValidationError", message: "Allocated quantity cannot exceed final received quantity. Silent balancing is not allowed." });
    return;
  }

  const finalReceived = Number(receivedLine.final_received_qty);

  try {
    const result = await db.transaction(async (tx) => {
      let { allocation } = await resolveEditableAllocationForReceivedLine(lineId, company.id, tx);

      if (!allocation) {
        try {
          [allocation] = await tx
            .insert(sustainabilityAllocationsTable)
            .values({
              received_line_id: lineId,
              status: "draft",
              version: 1
            })
            .returning();
        } catch (insertErr: any) {
          // Catch duplicate key violation (23505) and refetch
          if (insertErr.code === "23505") {
            const existing = await tx
              .select()
              .from(sustainabilityAllocationsTable)
              .where(eq(sustainabilityAllocationsTable.received_line_id, lineId))
              .limit(1);
            if (existing[0]) allocation = existing[0];
            else throw insertErr;
          } else {
            throw insertErr;
          }
        }
      }

      if (allocation.status !== "draft") {
        throw new Error("Only draft allocations can be updated. This allocation is already finalized or in review.");
      }
      
      await tx
        .delete(sustainabilityAllocationLinesTable)
        .where(eq(sustainabilityAllocationLinesTable.allocation_id, allocation.id));

      if (lines.length > 0) {
        const inserts = lines.map(l => {
          const qtyNum = Number(l.quantity);
          const pct = finalReceived > 0 ? (qtyNum / finalReceived) * 100 : 0;
          return {
            allocation_id: allocation.id,
            pathway_id: l.pathway_id,
            quantity: String(qtyNum),
            percentage: pct.toFixed(2),
            explanation_text: (l.explanation_text && l.explanation_text.trim()) ? l.explanation_text.trim() : null
          };
        });
        await tx.insert(sustainabilityAllocationLinesTable).values(inserts);
      }

      const now = new Date();
      await tx
        .update(sustainabilityAllocationsTable)
        .set({ updated_at: now })
        .where(eq(sustainabilityAllocationsTable.id, allocation.id));

      return allocation;
    });

    void logAudit({
      action: "sustainability.allocation_draft_saved",
      entityType: "sustainability_allocation",
      entityId: result.id,
      actorRole: "user",
      details: { line_count: lines.length }
    });

    res.json({ success: true, allocation_id: result.id });
  } catch (err: any) {
    if (err.message?.includes("Only draft allocations can be updated")) {
      res.status(409).json({ error: "InvalidState", message: err.message });
      return;
    }
    throw err;
  }
});

/**
 * POST /sustainability/received-lines/:lineId/allocation/finalize
 * Finalizes a completely allocated draft. Locks it from future edits.
 */
router.post("/sustainability/received-lines/:lineId/allocation/finalize", requireAuth, requireCompany(), async (req, res) => {
  const lineId = req.params.lineId as string;
  const { company, userId } = req as AuthedCompanyRequest;

  // 1. Load and check received line
  const { receivedLine, allocation } = await resolveEditableAllocationForReceivedLine(lineId, company.id, db);

  if (!receivedLine) {
    res.status(404).json({ error: "NotFound", message: "Received line not found." });
    return;
  }

  await enrichReceivedLineQty(receivedLine, allocation?.status);

  if (!receivedLine.is_eligible) {
    res.status(400).json({ error: "Ineligible", message: "This received line is not eligible." });
    return;
  }

  const finalReceived = Number(receivedLine.final_received_qty);
  if (!Number.isFinite(finalReceived) || finalReceived <= 0) {
    res.status(400).json({ error: "ValidationError", message: "Trusted operational quantity must be greater than zero." });
    return;
  }

  // 2. Load allocation (already loaded above)

  if (!allocation) {
    res.status(404).json({ error: "NotFound", message: "No allocation found." });
    return;
  }

  if (allocation.status !== "draft") {
    res.status(409).json({ error: "InvalidState", message: "Allocation is already finalized or locked." });
    return;
  }

  // 3. Load lines and pathways
  const lines = await db
    .select()
    .from(sustainabilityAllocationLinesTable)
    .where(eq(sustainabilityAllocationLinesTable.allocation_id, allocation.id));

  if (lines.length === 0) {
    res.status(400).json({ error: "ValidationError", message: "Cannot finalize an empty allocation." });
    return;
  }

  const pathwayIds = lines.map(l => l.pathway_id);
  const activePathways = await db
    .select()
    .from(sustainabilityPathwaysTable)
    .where(and(inArray(sustainabilityPathwaysTable.id, pathwayIds), eq(sustainabilityPathwaysTable.is_active, true)));
  
  const pathwayMap = new Map(activePathways.map(p => [p.id, p]));

  // 4. Validate 100% allocation and line rules
  let sum = 0;
  const seenPathways = new Set<string>();

  for (const l of lines) {
    if (seenPathways.has(l.pathway_id)) {
      res.status(400).json({ error: "ValidationError", message: "Duplicate pathway found." });
      return;
    }
    seenPathways.add(l.pathway_id);

    const qty = Number(l.quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ error: "ValidationError", message: "All allocation lines must have a quantity > 0." });
      return;
    }
    sum += qty;

    const pw = pathwayMap.get(l.pathway_id);
    if (!pw) {
      res.status(400).json({ error: "ValidationError", message: "Invalid or inactive pathway found in allocation." });
      return;
    }
    if (pw.requires_explanation && (!l.explanation_text || !l.explanation_text.trim())) {
      res.status(400).json({ error: "ValidationError", message: "Missing required explanation." });
      return;
    }
  }

  // Strict numeric tolerance for precision drift (0.001)
  const TOLERANCE_DRIFT = 0.001;
  const diff = finalReceived - sum;

  if (Math.abs(diff) > TOLERANCE_DRIFT) {
    res.status(400).json({ 
      error: "ValidationError", 
      message: `Total allocated quantity must exactly equal the received quantity. Remaining/Excess: ${diff.toFixed(3)}` 
    });
    return;
  }

  // 5. Finalize
  const now = new Date();
  const updateResult = await db
    .update(sustainabilityAllocationsTable)
    .set({
      status: "finalized",
      finalized_by: userId,
      finalized_at: now,
      updated_at: now
    })
    .where(
      and(
        eq(sustainabilityAllocationsTable.id, allocation.id),
        eq(sustainabilityAllocationsTable.status, "draft")
      )
    )
    .returning({ id: sustainabilityAllocationsTable.id });

  if (updateResult.length === 0) {
    res.status(409).json({ error: "InvalidState", message: "Allocation was already finalized or locked concurrently." });
    return;
  }

  void logAudit({
    action: "sustainability.allocation_finalized",
    entityType: "sustainability_allocation",
    entityId: allocation.id,
    actorRole: "user"
  });

  // SIR-2D: If this is a correction draft, supersede the source allocation
  if (allocation.source_allocation_id) {
    try {
      await db
        .update(sustainabilityAllocationsTable)
        .set({
          status: "superseded",
          superseded_by_allocation_id: allocation.id,
          superseded_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(sustainabilityAllocationsTable.id, allocation.source_allocation_id),
            eq(sustainabilityAllocationsTable.status, "finalized")
          )
        );

      void logAudit({
        action: "sustainability.allocation_superseded",
        entityType: "sustainability_allocation",
        entityId: allocation.source_allocation_id,
        actorRole: "system",
        statusBefore: "finalized",
        statusAfter: "superseded",
        details: {
          superseded_by_allocation_id: allocation.id,
          version: allocation.version,
        },
      });
    } catch (err) {
      // Log but do not roll back — finalization already succeeded
      console.error("[sustainability] Failed to supersede source allocation", {
        source_allocation_id: allocation.source_allocation_id,
        err,
      });
    }
  }

  res.json({ success: true, allocation_id: allocation.id, finalized_at: now });
});

// ── SIR-2D: Company correction request endpoints ─────────────────────────────

/**
 * POST /sustainability/correction-requests
 * Company submits a correction request for its own finalized allocation.
 * Body: { allocation_id, reason }
 */
router.post("/sustainability/correction-requests", requireAuth, requireCompany(), async (req, res) => {
  const { company, userId } = req as AuthedCompanyRequest;
  const { allocation_id, reason } = req.body as { allocation_id?: string; reason?: string };

  if (!allocation_id || !reason?.trim()) {
    res.status(400).json({ error: "ValidationError", message: "allocation_id and reason are required." });
    return;
  }

  // Load allocation — must be finalized and belong to this company
  const [allocation] = await db
    .select({
      id: sustainabilityAllocationsTable.id,
      status: sustainabilityAllocationsTable.status,
      received_line_id: sustainabilityAllocationsTable.received_line_id,
      version: sustainabilityAllocationsTable.version,
    })
    .from(sustainabilityAllocationsTable)
    .innerJoin(
      sustainabilityReceivedLinesTable,
      eq(sustainabilityReceivedLinesTable.id, sustainabilityAllocationsTable.received_line_id)
    )
    .where(
      and(
        eq(sustainabilityAllocationsTable.id, allocation_id),
        eq(sustainabilityAllocationsTable.status, "finalized"),
        eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id)
      )
    )
    .limit(1);

  if (!allocation) {
    res.status(404).json({ error: "NotFound", message: "Finalized allocation not found or not owned by your company." });
    return;
  }

  // Route-level duplicate check (DB partial unique index also enforces this)
  const [existingPending] = await db
    .select({ id: sustainabilityCorrectionRequestsTable.id })
    .from(sustainabilityCorrectionRequestsTable)
    .where(
      and(
        eq(sustainabilityCorrectionRequestsTable.allocation_id, allocation_id),
        eq(sustainabilityCorrectionRequestsTable.status, "pending")
      )
    )
    .limit(1);

  if (existingPending) {
    res.status(409).json({ error: "DuplicateRequest", message: "A pending correction request already exists for this allocation." });
    return;
  }

  const [newRequest] = await db
    .insert(sustainabilityCorrectionRequestsTable)
    .values({
      allocation_id,
      received_line_id: allocation.received_line_id,
      reason: reason.trim(),
      status: "pending",
      requested_by_user_id: userId,
      requested_by_company_id: company.id,
      requested_by_role: "company",
    })
    .returning({ id: sustainabilityCorrectionRequestsTable.id });

  void logAudit({
    action: "sustainability.correction_requested",
    entityType: "sustainability_allocation",
    entityId: allocation_id,
    actorRole: "buyer",
    companyId: company.id,
    userId,
    details: { reason, version: allocation.version },
  });

  // Notify admin (fire-and-forget; failure does not affect request)
  void notifyAdminCorrectionRequested({
    allocationId: allocation_id,
    receivedLineId: allocation.received_line_id,
    companyName: company.name,
    reason: reason.trim(),
    commercialRef: allocation_id.slice(0, 8).toUpperCase(),
  });

  res.status(201).json({ success: true, request_id: newRequest.id });
});

/**
 * GET /sustainability/correction-requests
 * Company views its own correction requests.
 */
router.get("/sustainability/correction-requests", requireAuth, requireCompany(), async (req, res) => {
  const { company } = req as AuthedCompanyRequest;

  const rows = await db
    .select()
    .from(sustainabilityCorrectionRequestsTable)
    .where(eq(sustainabilityCorrectionRequestsTable.requested_by_company_id, company.id))
    .orderBy(desc(sustainabilityCorrectionRequestsTable.created_at))
    .limit(100);

  res.json(rows);
});

export default router;

