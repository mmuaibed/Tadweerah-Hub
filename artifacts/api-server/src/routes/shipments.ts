import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  contractsTable,
  contractMaterialsTable,
  contractShipmentsTable,
  type ContractShipment,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";
import { logAudit } from "../lib/audit";
import { nextShipmentReference } from "../lib/contract-ref";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeShipment(s: ContractShipment) {
  return {
    id: s.id,
    reference: s.reference,
    contract_id: s.contract_id,
    material_line_id: s.material_line_id,
    status: s.status,
    source_weight: s.source_weight != null ? Number(s.source_weight) : null,
    destination_weight:
      s.destination_weight != null ? Number(s.destination_weight) : null,
    final_weight: s.final_weight != null ? Number(s.final_weight) : null,
    final_value: s.final_value != null ? Number(s.final_value) : null,
    notes: s.notes ?? null,
    planned_at: s.planned_at.toISOString(),
    dispatched_at: s.dispatched_at?.toISOString() ?? null,
    received_at: s.received_at?.toISOString() ?? null,
    closed_at: s.closed_at?.toISOString() ?? null,
    cancelled_at: s.cancelled_at?.toISOString() ?? null,
    created_at: s.created_at.toISOString(),
    updated_at: s.updated_at.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchShipmentForParty(shipmentId: string, companyId: string) {
  const [shipment] = await db
    .select()
    .from(contractShipmentsTable)
    .where(eq(contractShipmentsTable.id, shipmentId))
    .limit(1);

  if (!shipment) throw new HttpError(404, "NotFound", "Shipment not found");

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.id, shipment.contract_id))
    .limit(1);

  if (!contract) throw new HttpError(500, "InternalError", "Contract not found for shipment");

  const isSeller = contract.seller_company_id === companyId;
  const isBuyer = contract.buyer_company_id === companyId;
  if (!isSeller && !isBuyer) {
    throw new HttpError(403, "Forbidden", "Not a party to this shipment's contract");
  }

  return { shipment, contract, isSeller, isBuyer };
}

/**
 * Computes final_weight from weight_policy and recorded weights.
 * Returns null if required weights are missing.
 */
function computeFinalWeight(
  policy: string,
  sourceWeight: string | null,
  destWeight: string | null,
): number | null {
  const src = sourceWeight != null ? Number(sourceWeight) : null;
  const dst = destWeight != null ? Number(destWeight) : null;

  switch (policy) {
    case "source_weight_only":
      return src;
    case "destination_weight_only":
      return dst;
    case "dual_source_final":
      return src;
    case "dual_destination_final":
      return dst;
    case "dual_higher_final":
      if (src == null || dst == null) return null;
      return Math.max(src, dst);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// GET /contracts/:id/shipments — list shipments for a contract
// ---------------------------------------------------------------------------

router.get(
  "/contracts/:id/shipments",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const companyId = (req as AuthedCompanyRequest).company.id;
      const contractId = assertUuid(req.params.id, "id");

      const [contract] = await db
        .select()
        .from(contractsTable)
        .where(eq(contractsTable.id, contractId))
        .limit(1);

      if (!contract) throw new HttpError(404, "NotFound", "Contract not found");

      const isSeller = contract.seller_company_id === companyId;
      const isBuyer = contract.buyer_company_id === companyId;
      if (!isSeller && !isBuyer) {
        throw new HttpError(403, "Forbidden", "Not a party to this contract");
      }

      const shipments = await db
        .select()
        .from(contractShipmentsTable)
        .where(eq(contractShipmentsTable.contract_id, contract.id))
        .orderBy(contractShipmentsTable.planned_at);

      res.json(shipments.map(serializeShipment));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts/:id/shipments — create shipment (active contract only)
// ---------------------------------------------------------------------------

router.post(
  "/contracts/:id/shipments",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const [contract] = await db
        .select()
        .from(contractsTable)
        .where(eq(contractsTable.id, contractId))
        .limit(1);

      if (!contract) throw new HttpError(404, "NotFound", "Contract not found");

      const isSeller = contract.seller_company_id === company.id;
      const isBuyer = contract.buyer_company_id === company.id;
      if (!isSeller && !isBuyer) {
        throw new HttpError(403, "Forbidden", "Not a party to this contract");
      }

      if (contract.status !== "active") {
        throw new HttpError(
          409,
          "ContractNotActive",
          "Shipments can only be created for active contracts",
        );
      }

      const { material_line_id, planned_at, notes } = req.body as Record<string, unknown>;

      if (!material_line_id || typeof material_line_id !== "string") {
        throw new HttpError(400, "ValidationError", "material_line_id is required");
      }
      assertUuid(material_line_id, "material_line_id");

      // Parse planned_at: accept ISO date string (YYYY-MM-DD) or datetime string.
      // Falls back to now() if omitted.
      let plannedAtDate: Date | undefined;
      if (typeof planned_at === "string" && planned_at.trim()) {
        const parsed = new Date(planned_at.trim());
        if (!isNaN(parsed.getTime())) {
          plannedAtDate = parsed;
        } else {
          throw new HttpError(400, "ValidationError", "planned_at must be a valid date");
        }
      }

      const [material] = await db
        .select()
        .from(contractMaterialsTable)
        .where(
          and(
            eq(contractMaterialsTable.id, material_line_id),
            eq(contractMaterialsTable.contract_id, contract.id),
          ),
        )
        .limit(1);

      if (!material) {
        throw new HttpError(
          404,
          "NotFound",
          "Material line not found in this contract",
        );
      }

      const shipment = await db.transaction(async (tx) => {
        const reference = await nextShipmentReference(tx, contract.id, contract.reference);

        const [s] = await tx
          .insert(contractShipmentsTable)
          .values({
            reference,
            contract_id: contract.id,
            material_line_id,
            status: "planned",
            planned_at: plannedAtDate ?? new Date(),
            notes: typeof notes === "string" ? notes.trim() : null,
          })
          .returning();

        return s;
      });

      await logAudit({
        userId,
        companyId: company.id,
        action: "shipment.created",
        entityType: "contract_shipment",
        entityId: shipment.id,
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusAfter: "planned",
        details: { contract_id: contract.id, reference: shipment.reference },
      });

      res.status(201).json(serializeShipment(shipment));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /shipments/:id — get shipment detail
// ---------------------------------------------------------------------------

router.get(
  "/shipments/:id",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const companyId = (req as AuthedCompanyRequest).company.id;
      const shipmentId = assertUuid(req.params.id, "id");

      const { shipment } = await fetchShipmentForParty(shipmentId, companyId);
      res.json(serializeShipment(shipment));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /shipments/:id/dispatch — planned → dispatched
// Records source_weight when policy requires it.
// ---------------------------------------------------------------------------

router.post(
  "/shipments/:id/dispatch",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const shipmentId = assertUuid(req.params.id, "id");

      const { shipment, contract } = await fetchShipmentForParty(shipmentId, company.id);

      if (shipment.status !== "planned") {
        throw new HttpError(
          409,
          "InvalidTransition",
          `Cannot dispatch a shipment with status: ${shipment.status}`,
        );
      }

      const { source_weight, notes } = req.body as Record<string, unknown>;

      const sourceWeightRequired = [
        "source_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ].includes(contract.weight_policy);

      let sourceWeightVal: string | null = shipment.source_weight;
      if (source_weight != null) {
        const n = Number(source_weight);
        if (isNaN(n) || n < 0) throw new HttpError(400, "ValidationError", "source_weight must be a non-negative number");
        sourceWeightVal = String(n);
      } else if (sourceWeightRequired && shipment.source_weight == null) {
        throw new HttpError(
          400,
          "ValidationError",
          `source_weight is required for weight policy: ${contract.weight_policy}`,
        );
      }

      const updates: Partial<typeof contractShipmentsTable.$inferInsert> = {
        status: "dispatched",
        dispatched_at: new Date(),
        updated_at: new Date(),
      };
      if (sourceWeightVal != null) updates.source_weight = sourceWeightVal;
      if (typeof notes === "string") updates.notes = notes.trim();

      const [updated] = await db
        .update(contractShipmentsTable)
        .set(updates)
        .where(eq(contractShipmentsTable.id, shipment.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "shipment.dispatched",
        entityType: "contract_shipment",
        entityId: shipment.id,
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusBefore: "planned",
        statusAfter: "dispatched",
        details: { source_weight: sourceWeightVal },
      });

      res.json(serializeShipment(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /shipments/:id/receive — dispatched → received
// Records destination_weight when policy requires it.
// ---------------------------------------------------------------------------

router.post(
  "/shipments/:id/receive",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const shipmentId = assertUuid(req.params.id, "id");

      const { shipment, contract } = await fetchShipmentForParty(shipmentId, company.id);

      if (shipment.status !== "dispatched") {
        throw new HttpError(
          409,
          "InvalidTransition",
          `Cannot mark received for a shipment with status: ${shipment.status}`,
        );
      }

      const { destination_weight, notes } = req.body as Record<string, unknown>;

      const destWeightRequired = [
        "destination_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ].includes(contract.weight_policy);

      let destWeightVal: string | null = shipment.destination_weight;
      if (destination_weight != null) {
        const n = Number(destination_weight);
        if (isNaN(n) || n < 0) throw new HttpError(400, "ValidationError", "destination_weight must be a non-negative number");
        destWeightVal = String(n);
      } else if (destWeightRequired && shipment.destination_weight == null) {
        throw new HttpError(
          400,
          "ValidationError",
          `destination_weight is required for weight policy: ${contract.weight_policy}`,
        );
      }

      const updates: Partial<typeof contractShipmentsTable.$inferInsert> = {
        status: "received",
        received_at: new Date(),
        updated_at: new Date(),
      };
      if (destWeightVal != null) updates.destination_weight = destWeightVal;
      if (typeof notes === "string") updates.notes = notes.trim();

      const [updated] = await db
        .update(contractShipmentsTable)
        .set(updates)
        .where(eq(contractShipmentsTable.id, shipment.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "shipment.received",
        entityType: "contract_shipment",
        entityId: shipment.id,
        actorRole: contract.buyer_company_id === company.id ? "buyer" : "seller",
        statusBefore: "dispatched",
        statusAfter: "received",
        details: { destination_weight: destWeightVal },
      });

      res.json(serializeShipment(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /shipments/:id/close — received → closed
// Computes final_weight from weight_policy. Computes final_value from material
// line price. Shipment becomes immutable after this point.
// ---------------------------------------------------------------------------

router.post(
  "/shipments/:id/close",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const shipmentId = assertUuid(req.params.id, "id");

      const { shipment, contract } = await fetchShipmentForParty(shipmentId, company.id);

      if (shipment.status !== "received") {
        throw new HttpError(
          409,
          "InvalidTransition",
          `Cannot close a shipment with status: ${shipment.status}`,
        );
      }

      const finalWeight = computeFinalWeight(
        contract.weight_policy,
        shipment.source_weight,
        shipment.destination_weight,
      );

      if (finalWeight == null) {
        throw new HttpError(
          409,
          "MissingWeightData",
          `Cannot compute final_weight: required weights are missing for policy ${contract.weight_policy}`,
        );
      }

      const [material] = await db
        .select({ price_per_unit: contractMaterialsTable.price_per_unit })
        .from(contractMaterialsTable)
        .where(eq(contractMaterialsTable.id, shipment.material_line_id))
        .limit(1);

      if (!material) throw new HttpError(500, "InternalError", "Material line not found");

      const finalValue = finalWeight * Number(material.price_per_unit);

      const now = new Date();
      const [updated] = await db
        .update(contractShipmentsTable)
        .set({
          status: "closed",
          final_weight: String(finalWeight),
          final_value: String(finalValue),
          closed_at: now,
          updated_at: now,
        })
        .where(eq(contractShipmentsTable.id, shipment.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "shipment.closed",
        entityType: "contract_shipment",
        entityId: shipment.id,
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusBefore: "received",
        statusAfter: "closed",
        details: {
          weight_policy: contract.weight_policy,
          final_weight: finalWeight,
          final_value: finalValue,
        },
      });

      res.json(serializeShipment(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /shipments/:id/cancel — planned|dispatched → cancelled
// ---------------------------------------------------------------------------

router.post(
  "/shipments/:id/cancel",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const shipmentId = assertUuid(req.params.id, "id");

      const { shipment, contract } = await fetchShipmentForParty(shipmentId, company.id);

      const cancellable = ["planned", "dispatched"];
      if (!cancellable.includes(shipment.status)) {
        throw new HttpError(
          409,
          "InvalidTransition",
          `Cannot cancel a shipment with status: ${shipment.status}`,
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(contractShipmentsTable)
        .set({ status: "cancelled", cancelled_at: now, updated_at: now })
        .where(eq(contractShipmentsTable.id, shipment.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "shipment.cancelled",
        entityType: "contract_shipment",
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusBefore: shipment.status,
        statusAfter: "cancelled",
        entityId: shipment.id,
      });

      res.json(serializeShipment(updated));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
