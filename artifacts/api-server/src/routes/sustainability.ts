import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  sustainabilityReceivedLinesTable,
  sustainabilityAllocationsTable,
  sustainabilityAllocationLinesTable,
  sustainabilityPathwaysTable,
  dealsTable,
  contractShipmentsTable,
  contractMaterialsTable
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";
import { validateAllocationDraft } from "../services/sustainability-validation";
import { logAudit } from "../lib/audit";
import { wasteListingsTable } from "@workspace/db";

async function enrichReceivedLineQty(receivedLine: any) {
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
        final_weight: contractShipmentsTable.final_weight,
        reference: contractShipmentsTable.reference
      })
      .from(contractShipmentsTable)
      .where(eq(contractShipmentsTable.id, receivedLine.parent_entity_id))
      .limit(1);
    
    if (shipment) {
      if (shipment.final_weight) {
        receivedLine.final_received_qty = shipment.final_weight;
      }
      if (shipment.reference) {
        receivedLine.parent_reference = shipment.reference;
      }
    }
  }
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
      shipment_final_weight: contractShipmentsTable.final_weight,
      shipment_material_id: contractShipmentsTable.material_line_id,
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
    .where(eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id))
    .orderBy(desc(sustainabilityReceivedLinesTable.created_at))
    .limit(limit)
    .offset(offset);

  const formattedRows = rows.map((r) => {
    let parent_reference = "مرجع غير متاح";
    let derived_qty = r.received_line.final_received_qty;
    let derived_reason = r.received_line.ineligibility_reason;
    let derived_cat = r.received_line.material_category_id;
    let derived_is_eligible = r.received_line.is_eligible;
    
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
      
      if (r.shipment_final_weight) {
        derived_qty = r.shipment_final_weight;
      }
    }

    return {
      received_line: {
        ...r.received_line,
        parent_reference,
        final_received_qty: derived_qty,
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

  const [receivedLine] = await db
    .select()
    .from(sustainabilityReceivedLinesTable)
    .where(
      and(
        eq(sustainabilityReceivedLinesTable.id, lineId),
        eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id)
      )
    )
    .limit(1);

  if (!receivedLine) {
    res.status(404).json({ error: "NotFound", message: "Received line not found." });
    return;
  }

  await enrichReceivedLineQty(receivedLine);

  const activePathways = await db.select().from(sustainabilityPathwaysTable).where(eq(sustainabilityPathwaysTable.is_active, true));

  const [allocation] = await db
    .select()
    .from(sustainabilityAllocationsTable)
    .where(eq(sustainabilityAllocationsTable.received_line_id, lineId))
    .limit(1);

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

  const [receivedLine] = await db
    .select()
    .from(sustainabilityReceivedLinesTable)
    .where(
      and(
        eq(sustainabilityReceivedLinesTable.id, lineId),
        eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id)
      )
    )
    .limit(1);

  if (!receivedLine) {
    res.status(404).json({ error: "NotFound", message: "Received line not found." });
    return;
  }

  await enrichReceivedLineQty(receivedLine);

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
      let [allocation] = await tx
        .select()
        .from(sustainabilityAllocationsTable)
        .where(eq(sustainabilityAllocationsTable.received_line_id, lineId))
        .limit(1);

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
  const [receivedLine] = await db
    .select()
    .from(sustainabilityReceivedLinesTable)
    .where(
      and(
        eq(sustainabilityReceivedLinesTable.id, lineId),
        eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id)
      )
    )
    .limit(1);

  if (!receivedLine) {
    res.status(404).json({ error: "NotFound", message: "Received line not found." });
    return;
  }

  await enrichReceivedLineQty(receivedLine);

  if (!receivedLine.is_eligible) {
    res.status(400).json({ error: "Ineligible", message: "This received line is not eligible." });
    return;
  }

  const finalReceived = Number(receivedLine.final_received_qty);
  if (!Number.isFinite(finalReceived) || finalReceived <= 0) {
    res.status(400).json({ error: "ValidationError", message: "Trusted operational quantity must be greater than zero." });
    return;
  }

  // 2. Load allocation
  const [allocation] = await db
    .select()
    .from(sustainabilityAllocationsTable)
    .where(eq(sustainabilityAllocationsTable.received_line_id, lineId))
    .limit(1);

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

  res.json({ success: true, allocation_id: allocation.id, finalized_at: now });
});

export default router;
