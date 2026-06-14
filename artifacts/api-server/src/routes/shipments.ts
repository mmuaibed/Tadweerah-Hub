import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
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
import {
  notifyContractShipmentCreated,
  notifyContractShipmentDispatched,
  notifyContractShipmentReceived,
  notifyContractShipmentFinalized,
  notifyContractShipmentCancelled,
} from "../lib/notify";

import multer from "multer";
import { Storage } from "@google-cloud/storage";
import path from "path";

const storageClient = new Storage();
const BUCKET_NAME = process.env.GCS_CONTRACT_DOCS_BUCKET || "tadweerah-staging-contract-docs";
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF, JPEG, PNG, and WebP files are allowed"));
    }
    cb(null, true);
  },
});

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
    source_ticket_url: s.source_ticket_url ?? null,
    source_ticket_uploaded_by_company_id: s.source_ticket_uploaded_by_company_id ?? null,
    destination_weight:
      s.destination_weight != null ? Number(s.destination_weight) : null,
    destination_ticket_url: s.destination_ticket_url ?? null,
    destination_ticket_uploaded_by_company_id: s.destination_ticket_uploaded_by_company_id ?? null,
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

      const counterpartyId =
        contract.seller_company_id === company.id
          ? contract.buyer_company_id
          : contract.seller_company_id;
      void notifyContractShipmentCreated(counterpartyId, shipment.id, contract.id, shipment.reference || contract.reference).catch((err) =>
        console.error("[notify] Shipment create error:", err),
      );

      res.status(201).json(serializeShipment(shipment));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /shipments/:id/evidence — upload scale ticket or evidence
// ---------------------------------------------------------------------------

router.post(
  "/shipments/:id/evidence",
  requireAuth,
  requireCompany(),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new HttpError(400, "ValidationError", "No file uploaded");
      }

      const { type } = req.body as Record<string, unknown>;
      if (type !== "source" && type !== "destination") {
        throw new HttpError(400, "ValidationError", "Evidence type must be 'source' or 'destination'");
      }

      const company = (req as AuthedCompanyRequest).company;
      const shipmentId = assertUuid(req.params.id, "id");

      const { shipment, contract } = await fetchShipmentForParty(shipmentId, company.id);

      // Verify the uploader is allowed based on the type
      // Role checking removed to allow either party to upload evidence, as the parent
      // contract auth guarantees they are a party to the shipment.

      const ext = path.extname(req.file.originalname) || "";
      const timestamp = Date.now();
      const fileName = `contract-shipments/${shipment.id}/${type}/${timestamp}${ext}`;
      const blob = storageClient.bucket(BUCKET_NAME).file(fileName);

      await new Promise<void>((resolve, reject) => {
        const blobStream = blob.createWriteStream({
          resumable: false,
          contentType: req.file!.mimetype,
        });
        blobStream.on("error", (err) => reject(err));
        blobStream.on("finish", () => resolve());
        blobStream.end(req.file!.buffer);
      });

      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

      res.status(201).json({ url: publicUrl });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /shipments/pending — get pending shipment actions for the current company
// MUST be registered before /shipments/:id
// ---------------------------------------------------------------------------

router.get(
  "/shipments/pending",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const { company } = req as AuthedCompanyRequest;

      // 1. Seller shipments (status: planned)
      const sellerShipments = await db
        .select({
          shipment: contractShipmentsTable,
          contract: contractsTable,
          material: contractMaterialsTable,
        })
        .from(contractShipmentsTable)
        .innerJoin(contractsTable, eq(contractsTable.id, contractShipmentsTable.contract_id))
        .innerJoin(contractMaterialsTable, eq(contractMaterialsTable.id, contractShipmentsTable.material_line_id))
        .where(
          and(
            eq(contractsTable.seller_company_id, company.id),
            eq(contractShipmentsTable.status, "planned"),
            eq(contractsTable.status, "active"),
          ),
        );

      // 2. Buyer shipments (status: dispatched)
      const buyerShipments = await db
        .select({
          shipment: contractShipmentsTable,
          contract: contractsTable,
          material: contractMaterialsTable,
        })
        .from(contractShipmentsTable)
        .innerJoin(contractsTable, eq(contractsTable.id, contractShipmentsTable.contract_id))
        .innerJoin(contractMaterialsTable, eq(contractMaterialsTable.id, contractShipmentsTable.material_line_id))
        .where(
          and(
            eq(contractsTable.buyer_company_id, company.id),
            eq(contractShipmentsTable.status, "dispatched"),
            eq(contractsTable.status, "active"),
          ),
        );

      const allItems = [...sellerShipments, ...buyerShipments];

      // Fetch company names
      const companyIds = new Set<string>();
      for (const item of allItems) {
        companyIds.add(item.contract.seller_company_id);
        companyIds.add(item.contract.buyer_company_id);
      }

      const companies =
        companyIds.size > 0
          ? await db
              .select({ id: companiesTable.id, name: companiesTable.name })
              .from(companiesTable)
              .where(
                companyIds.size === 1
                  ? eq(companiesTable.id, Array.from(companyIds)[0])
                  : sql`${companiesTable.id} = ANY(${sql.raw(`ARRAY[${Array.from(companyIds).map((id) => `'${id}'`).join(",")}]::uuid[]`)})`,
              )
          : [];
      const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

      const results = allItems
        .map((item) => {
          const isSeller = item.contract.seller_company_id === company.id;
          const role = isSeller ? "seller" : "buyer";
          const action = isSeller ? "dispatch_shipment" : "receive_shipment";

          return {
            id: item.shipment.id,
            reference: item.shipment.reference,
            status: item.shipment.status,
            contract_id: item.contract.id,
            contract_reference: item.contract.reference,
            seller_name: companyMap[item.contract.seller_company_id] ?? "",
            buyer_name: companyMap[item.contract.buyer_company_id] ?? "",
            material_label: item.material.material_label,
            unit_label: item.material.unit_label,
            planned_at: item.shipment.planned_at.toISOString(),
            dispatched_at: item.shipment.dispatched_at?.toISOString() ?? null,
            received_at: item.shipment.received_at?.toISOString() ?? null,
            role,
            action_needed: action,
            updated_at: item.shipment.updated_at.toISOString(),
          };
        })
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at));

      res.json({ shipments: results });
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

      const { source_weight, notes, source_ticket_url } = req.body as Record<string, unknown>;

      const sourceWeightRequired = [
        "source_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ].includes(contract.weight_policy);

      let sourceWeightVal: string | null = shipment.source_weight;
      if (source_weight != null) {
        const n = Number(source_weight);
        if (isNaN(n) || n <= 0) throw new HttpError(400, "ValidationError", "source_weight must be strictly greater than zero");
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
      if (typeof source_ticket_url === "string") {
        const url = source_ticket_url.trim();
        if (!url.startsWith(`https://storage.googleapis.com/${BUCKET_NAME}/contract-shipments/${shipment.id}/`)) {
          throw new HttpError(400, "ValidationError", "Invalid source ticket URL");
        }
        updates.source_ticket_url = url;
        updates.source_ticket_uploaded_by_company_id = company.id;
      }

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

      const counterpartyId =
        contract.seller_company_id === company.id
          ? contract.buyer_company_id
          : contract.seller_company_id;
      void notifyContractShipmentDispatched(counterpartyId, shipment.id, contract.id, shipment.reference || contract.reference).catch((err) =>
        console.error("[notify] Shipment dispatch error:", err),
      );

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

      const { destination_weight, notes, destination_ticket_url } = req.body as Record<string, unknown>;

      const destWeightRequired = [
        "destination_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ].includes(contract.weight_policy);

      let destWeightVal: string | null = shipment.destination_weight;
      if (destination_weight != null) {
        const n = Number(destination_weight);
        if (isNaN(n) || n <= 0) throw new HttpError(400, "ValidationError", "destination_weight must be strictly greater than zero");
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
      if (typeof destination_ticket_url === "string") {
        const url = destination_ticket_url.trim();
        if (!url.startsWith(`https://storage.googleapis.com/${BUCKET_NAME}/contract-shipments/${shipment.id}/`)) {
          throw new HttpError(400, "ValidationError", "Invalid destination ticket URL");
        }
        updates.destination_ticket_url = url;
        updates.destination_ticket_uploaded_by_company_id = company.id;
      }

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

      const counterpartyId =
        contract.seller_company_id === company.id
          ? contract.buyer_company_id
          : contract.seller_company_id;
      void notifyContractShipmentReceived(counterpartyId, shipment.id, contract.id, shipment.reference || contract.reference).catch((err) =>
        console.error("[notify] Shipment receive error:", err),
      );

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

      if (finalWeight == null || finalWeight <= 0) {
        throw new HttpError(
          409,
          "MissingWeightData",
          `Cannot compute a valid final_weight greater than zero for policy ${contract.weight_policy}`,
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

      const counterpartyId =
        contract.seller_company_id === company.id
          ? contract.buyer_company_id
          : contract.seller_company_id;
      void notifyContractShipmentFinalized(counterpartyId, shipment.id, contract.id, shipment.reference || contract.reference).catch((err) =>
        console.error("[notify] Shipment finalize error:", err),
      );

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

      const counterpartyId =
        contract.seller_company_id === company.id
          ? contract.buyer_company_id
          : contract.seller_company_id;
      void notifyContractShipmentCancelled(counterpartyId, shipment.id, contract.id, shipment.reference || contract.reference).catch((err) =>
        console.error("[notify] Shipment cancel error:", err),
      );

      res.json(serializeShipment(updated));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
