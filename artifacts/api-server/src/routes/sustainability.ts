import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  sustainabilityReceivedLinesTable,
  sustainabilityAllocationsTable,
  sustainabilityAllocationLinesTable,
  sustainabilityPathwaysTable,
  dealsTable,
  contractShipmentsTable
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
        listing_quantity: wasteListingsTable.quantity
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
    }
  } else if (receivedLine.parent_entity_type === "contract_shipment" && receivedLine.parent_entity_id) {
    const [shipment] = await db
      .select({ final_weight: contractShipmentsTable.final_weight })
      .from(contractShipmentsTable)
      .where(eq(contractShipmentsTable.id, receivedLine.parent_entity_id))
      .limit(1);
    
    if (shipment && shipment.final_weight) {
      receivedLine.final_received_qty = shipment.final_weight;
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
      shipment_reference: contractShipmentsTable.reference,
      shipment_final_weight: contractShipmentsTable.final_weight,
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
    .where(eq(sustainabilityReceivedLinesTable.buyer_company_id, company.id))
    .orderBy(desc(sustainabilityReceivedLinesTable.created_at))
    .limit(limit)
    .offset(offset);

  const formattedRows = rows.map((r) => {
    let parent_reference = "مرجع غير متاح";
    let derived_qty = r.received_line.final_received_qty;
    
    if (r.received_line.parent_entity_type === "deal" && r.received_line.parent_entity_id) {
      const id = r.received_line.parent_entity_id;
      const year = r.deal_created_at ? new Date(r.deal_created_at).getFullYear() : new Date().getFullYear();
      parent_reference = `TDW-${year}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

      if (r.deal_actual_quantity) {
        derived_qty = r.deal_actual_quantity;
      } else if (r.listing_quantity) {
        derived_qty = r.listing_quantity;
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
        final_received_qty: derived_qty
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

export default router;
