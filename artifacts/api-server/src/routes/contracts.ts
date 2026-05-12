import { Router, type IRouter } from "express";
import { and, eq, or, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  contractsTable,
  contractMaterialsTable,
  contractShipmentsTable,
  type Contract,
  type ContractMaterial,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";
import { logAudit } from "../lib/audit";
import { nextContractReference } from "../lib/contract-ref";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

function serializeContract(
  contract: Contract,
  extras: {
    seller: { name: string };
    buyer: { name: string };
    materials?: ContractMaterial[];
    shipmentSummary?: { total: number; open: number; closed: number; cancelled: number };
  },
) {
  return {
    id: contract.id,
    reference: contract.reference,
    external_reference: contract.external_reference ?? null,
    seller_company_id: contract.seller_company_id,
    buyer_company_id: contract.buyer_company_id,
    created_by_company_id: contract.created_by_company_id ?? null,
    seller_name: extras.seller.name,
    buyer_name: extras.buyer.name,
    start_date: contract.start_date,
    end_date: contract.end_date ?? null,
    status: contract.status,
    weight_policy: contract.weight_policy,
    attachment_url: contract.attachment_url ?? null,
    notes: contract.notes ?? null,
    confirmed_at: contract.confirmed_at?.toISOString() ?? null,
    completed_at: contract.completed_at?.toISOString() ?? null,
    cancelled_at: contract.cancelled_at?.toISOString() ?? null,
    created_at: contract.created_at.toISOString(),
    updated_at: contract.updated_at.toISOString(),
    materials: extras.materials ? extras.materials.map(serializeMaterial) : undefined,
    shipment_summary: extras.shipmentSummary ?? undefined,
  };
}

function serializeMaterial(m: ContractMaterial) {
  return {
    id: m.id,
    contract_id: m.contract_id,
    material_category_id: m.material_category_id ?? null,
    material_label: m.material_label,
    unit_option_id: m.unit_option_id ?? null,
    unit_label: m.unit_label,
    price_per_unit: Number(m.price_per_unit),
    seller_pct: m.seller_pct != null ? Number(m.seller_pct) : null,
    buyer_pct: m.buyer_pct != null ? Number(m.buyer_pct) : null,
    sort_order: m.sort_order,
    created_at: m.created_at.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchContractForParty(contractId: string, companyId: string) {
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

  // Determine creator / counterparty.
  // created_by_company_id is null for contracts created before this field was added —
  // fall back to legacy behaviour where seller is always the creator.
  const isCreator =
    contract.created_by_company_id != null
      ? contract.created_by_company_id === companyId
      : isSeller;

  return { contract, isSeller, isBuyer, isCreator };
}

async function fetchPartyNames(sellerId: string, buyerId: string) {
  const companies = await db
    .select({ id: companiesTable.id, name: companiesTable.name })
    .from(companiesTable)
    .where(or(eq(companiesTable.id, sellerId), eq(companiesTable.id, buyerId)));

  const seller = companies.find((c) => c.id === sellerId);
  const buyer = companies.find((c) => c.id === buyerId);
  if (!seller || !buyer) throw new HttpError(500, "InternalError", "Party company not found");
  return { seller, buyer };
}

async function fetchShipmentSummary(contractId: string) {
  const shipments = await db
    .select({ status: contractShipmentsTable.status })
    .from(contractShipmentsTable)
    .where(eq(contractShipmentsTable.contract_id, contractId));

  const total = shipments.length;
  const closed = shipments.filter((s) => s.status === "closed").length;
  const cancelled = shipments.filter((s) => s.status === "cancelled").length;
  const open = total - closed - cancelled;
  return { total, open, closed, cancelled };
}

function assertContractEditable(contract: Contract) {
  if (contract.status !== "draft") {
    throw new HttpError(
      409,
      "ContractNotEditable",
      "Material lines can only be modified while the contract is in draft status",
    );
  }
}

// ---------------------------------------------------------------------------
// GET /contracts — list contracts where caller is seller or buyer
// ---------------------------------------------------------------------------

router.get(
  "/contracts",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const companyId = (req as AuthedCompanyRequest).company.id;

      const rows = await db
        .select({
          contract: contractsTable,
          seller: { name: companiesTable.name },
        })
        .from(contractsTable)
        .innerJoin(companiesTable, eq(companiesTable.id, contractsTable.seller_company_id))
        .where(
          or(
            eq(contractsTable.seller_company_id, companyId),
            eq(contractsTable.buyer_company_id, companyId),
          ),
        )
        .orderBy(sql`${contractsTable.created_at} DESC`);

      const buyerIds = [...new Set(rows.map((r) => r.contract.buyer_company_id))];
      const buyerNames =
        buyerIds.length > 0
          ? await db
              .select({ id: companiesTable.id, name: companiesTable.name })
              .from(companiesTable)
              .where(
                buyerIds.length === 1
                  ? eq(companiesTable.id, buyerIds[0])
                  : sql`${companiesTable.id} = ANY(${sql.raw(`ARRAY[${buyerIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`,
              )
          : [];

      const buyerMap = Object.fromEntries(buyerNames.map((b) => [b.id, b.name]));

      const payload = rows.map((r) =>
        serializeContract(r.contract, {
          seller: r.seller,
          buyer: { name: buyerMap[r.contract.buyer_company_id] ?? "" },
        }),
      );

      res.json(payload);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts — create contract (either party)
//
// Body:
//   my_role: "seller" | "buyer"   — creator's role in the contract
//   counterparty_company_id: UUID — the other party
//   start_date, weight_policy, end_date?, external_reference?, attachment_url?, notes?
// ---------------------------------------------------------------------------

router.post(
  "/contracts",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const {
        my_role,
        counterparty_company_id,
        // Legacy support: accept buyer_company_id (old frontend)
        buyer_company_id,
        start_date,
        end_date,
        weight_policy,
        external_reference,
        attachment_url,
        notes,
      } = req.body as Record<string, string | undefined>;

      if (!start_date) throw new HttpError(400, "ValidationError", "start_date is required");
      if (!weight_policy) throw new HttpError(400, "ValidationError", "weight_policy is required");

      const validPolicies = [
        "source_weight_only",
        "destination_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ];
      if (!validPolicies.includes(weight_policy)) {
        throw new HttpError(400, "ValidationError", `weight_policy must be one of: ${validPolicies.join(", ")}`);
      }

      // Determine seller/buyer based on role
      let sellerCompanyId: string;
      let buyerCompanyId: string;
      const role = my_role ?? "seller";

      if (role === "buyer") {
        // Creator is the buyer; counterparty is the seller
        const cpId = counterparty_company_id;
        if (!cpId) throw new HttpError(400, "ValidationError", "counterparty_company_id is required");
        assertUuid(cpId, "counterparty_company_id");
        sellerCompanyId = cpId;
        buyerCompanyId = company.id;
      } else {
        // Creator is the seller; counterparty is the buyer (legacy behavior)
        const cpId = counterparty_company_id ?? buyer_company_id;
        if (!cpId) throw new HttpError(400, "ValidationError", "counterparty_company_id is required");
        assertUuid(cpId, "counterparty_company_id");
        sellerCompanyId = company.id;
        buyerCompanyId = cpId;
      }

      if (sellerCompanyId === buyerCompanyId) {
        throw new HttpError(400, "ValidationError", "Seller and buyer cannot be the same company");
      }

      const [counterparty] = await db
        .select({ id: companiesTable.id, name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, role === "buyer" ? sellerCompanyId : buyerCompanyId))
        .limit(1);

      if (!counterparty) throw new HttpError(404, "NotFound", "Counterparty company not found");

      const reference = await nextContractReference();

      const [contract] = await db
        .insert(contractsTable)
        .values({
          reference,
          external_reference: external_reference ?? null,
          seller_company_id: sellerCompanyId,
          buyer_company_id: buyerCompanyId,
          created_by_company_id: company.id,
          start_date,
          end_date: end_date ?? null,
          weight_policy: weight_policy as typeof contractsTable.$inferInsert["weight_policy"],
          attachment_url: attachment_url ?? null,
          notes: notes ?? null,
          status: "draft",
        })
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.created",
        entityType: "contract",
        entityId: contract.id,
        actorRole: role,
        statusAfter: "draft",
        details: { reference, my_role: role, seller_company_id: sellerCompanyId, buyer_company_id: buyerCompanyId },
      });

      const sellerName = role === "seller" ? company.name : counterparty.name;
      const buyerName = role === "buyer" ? company.name : counterparty.name;

      res.status(201).json(
        serializeContract(contract, {
          seller: { name: sellerName },
          buyer: { name: buyerName },
          materials: [],
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /contracts/:id — contract detail with materials and shipment summary
// ---------------------------------------------------------------------------

router.get(
  "/contracts/:id",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const companyId = (req as AuthedCompanyRequest).company.id;
      const contractId = assertUuid(req.params.id, "id");

      const { contract } = await fetchContractForParty(contractId, companyId);
      const { seller, buyer } = await fetchPartyNames(
        contract.seller_company_id,
        contract.buyer_company_id,
      );

      const materials = await db
        .select()
        .from(contractMaterialsTable)
        .where(eq(contractMaterialsTable.contract_id, contract.id))
        .orderBy(contractMaterialsTable.sort_order, contractMaterialsTable.created_at);

      const summary = await fetchShipmentSummary(contract.id);

      res.json(
        serializeContract(contract, {
          seller,
          buyer,
          materials,
          shipmentSummary: summary,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /contracts/:id — update contract fields (draft only, either party for attachment)
// ---------------------------------------------------------------------------

router.patch(
  "/contracts/:id",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const { contract, isCreator } = await fetchContractForParty(contractId, company.id);
      assertContractEditable(contract);

      const validPolicies = [
        "source_weight_only",
        "destination_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ];

      const updates: Partial<typeof contractsTable.$inferInsert> = {};

      // Fields only the creator can change
      const creatorOnlyFields = [
        "external_reference",
        "start_date",
        "end_date",
        "weight_policy",
        "notes",
      ] as const;

      for (const key of creatorOnlyFields) {
        if (key in req.body) {
          if (!isCreator) {
            throw new HttpError(403, "Forbidden", `Only the contract creator can update '${key}'`);
          }
          if (key === "weight_policy" && !validPolicies.includes(req.body[key])) {
            throw new HttpError(400, "ValidationError", `weight_policy must be one of: ${validPolicies.join(", ")}`);
          }
          (updates as Record<string, unknown>)[key] = req.body[key] ?? null;
        }
      }

      // attachment_url: either party can update
      if ("attachment_url" in req.body) {
        updates.attachment_url = req.body.attachment_url ?? null;
      }

      if (Object.keys(updates).length === 0) {
        throw new HttpError(400, "ValidationError", "No updatable fields provided");
      }

      updates.updated_at = new Date();

      const [updated] = await db
        .update(contractsTable)
        .set(updates)
        .where(eq(contractsTable.id, contract.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.updated",
        entityType: "contract",
        entityId: contract.id,
        details: { fields: Object.keys(updates) },
      });

      const { seller, buyer } = await fetchPartyNames(
        updated.seller_company_id,
        updated.buyer_company_id,
      );

      res.json(serializeContract(updated, { seller, buyer }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts/:id/submit — draft → pending_confirmation
// Creator (either seller or buyer) can submit; counterparty then confirms.
// ---------------------------------------------------------------------------

router.post(
  "/contracts/:id/submit",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const { contract, isCreator } = await fetchContractForParty(contractId, company.id);

      if (!isCreator) {
        throw new HttpError(403, "Forbidden", "Only the contract creator can submit it for confirmation");
      }
      if (contract.status !== "draft") {
        throw new HttpError(409, "InvalidTransition", `Cannot submit a contract with status: ${contract.status}`);
      }

      const materials = await db
        .select({ id: contractMaterialsTable.id })
        .from(contractMaterialsTable)
        .where(eq(contractMaterialsTable.contract_id, contract.id))
        .limit(1);

      if (materials.length === 0) {
        throw new HttpError(
          409,
          "NoMaterialLines",
          "Contract must have at least one material line before submitting",
        );
      }

      const [updated] = await db
        .update(contractsTable)
        .set({ status: "pending_confirmation", updated_at: new Date() })
        .where(eq(contractsTable.id, contract.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.submitted",
        entityType: "contract",
        entityId: contract.id,
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusBefore: "draft",
        statusAfter: "pending_confirmation",
      });

      const { seller, buyer } = await fetchPartyNames(
        updated.seller_company_id,
        updated.buyer_company_id,
      );
      res.json(serializeContract(updated, { seller, buyer }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts/:id/confirm — pending_confirmation → active
// Counterparty (non-creator party) confirms.
// ---------------------------------------------------------------------------

router.post(
  "/contracts/:id/confirm",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const { contract, isCreator, isSeller, isBuyer } = await fetchContractForParty(contractId, company.id);

      // Counterparty = party who did NOT create the contract
      const isCounterparty = !isCreator && (isSeller || isBuyer);
      if (!isCounterparty) {
        throw new HttpError(403, "Forbidden", "Only the counterparty (non-creator) can confirm a contract");
      }
      if (contract.status !== "pending_confirmation") {
        throw new HttpError(409, "InvalidTransition", `Cannot confirm a contract with status: ${contract.status}`);
      }

      const now = new Date();
      const [updated] = await db
        .update(contractsTable)
        .set({ status: "active", confirmed_at: now, updated_at: now })
        .where(eq(contractsTable.id, contract.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.confirmed",
        entityType: "contract",
        entityId: contract.id,
        actorRole: isSeller ? "seller" : "buyer",
        statusBefore: "pending_confirmation",
        statusAfter: "active",
      });

      const { seller, buyer } = await fetchPartyNames(
        updated.seller_company_id,
        updated.buyer_company_id,
      );
      res.json(serializeContract(updated, { seller, buyer }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts/:id/complete — active → completed (creator only; all shipments terminal)
// ---------------------------------------------------------------------------

router.post(
  "/contracts/:id/complete",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const { contract, isCreator } = await fetchContractForParty(contractId, company.id);

      if (!isCreator) {
        throw new HttpError(403, "Forbidden", "Only the contract creator can complete a contract");
      }
      if (contract.status !== "active") {
        throw new HttpError(409, "InvalidTransition", `Cannot complete a contract with status: ${contract.status}`);
      }

      const openShipments = await db
        .select({ id: contractShipmentsTable.id, status: contractShipmentsTable.status })
        .from(contractShipmentsTable)
        .where(
          and(
            eq(contractShipmentsTable.contract_id, contract.id),
            sql`${contractShipmentsTable.status} NOT IN ('closed', 'cancelled')`,
          ),
        );

      if (openShipments.length > 0) {
        throw new HttpError(
          409,
          "OpenShipmentsExist",
          `Cannot complete contract: ${openShipments.length} shipment(s) are not yet in a terminal state`,
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(contractsTable)
        .set({ status: "completed", completed_at: now, updated_at: now })
        .where(eq(contractsTable.id, contract.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.completed",
        entityType: "contract",
        entityId: contract.id,
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusBefore: "active",
        statusAfter: "completed",
      });

      const { seller, buyer } = await fetchPartyNames(
        updated.seller_company_id,
        updated.buyer_company_id,
      );
      res.json(serializeContract(updated, { seller, buyer }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts/:id/cancel — cancel contract (either party; blocked if open shipments)
// ---------------------------------------------------------------------------

router.post(
  "/contracts/:id/cancel",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const { contract } = await fetchContractForParty(contractId, company.id);

      const cancellableStatuses = ["draft", "pending_confirmation", "active"];
      if (!cancellableStatuses.includes(contract.status)) {
        throw new HttpError(
          409,
          "InvalidTransition",
          `Cannot cancel a contract with status: ${contract.status}`,
        );
      }

      const openShipments = await db
        .select({ id: contractShipmentsTable.id })
        .from(contractShipmentsTable)
        .where(
          and(
            eq(contractShipmentsTable.contract_id, contract.id),
            sql`${contractShipmentsTable.status} NOT IN ('closed', 'cancelled')`,
          ),
        );

      if (openShipments.length > 0) {
        throw new HttpError(
          409,
          "OpenShipmentsExist",
          `Cannot cancel contract: ${openShipments.length} shipment(s) must be closed or cancelled first`,
        );
      }

      const now = new Date();
      const [updated] = await db
        .update(contractsTable)
        .set({ status: "cancelled", cancelled_at: now, updated_at: now })
        .where(eq(contractsTable.id, contract.id))
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.cancelled",
        entityType: "contract",
        entityId: contract.id,
        actorRole: contract.seller_company_id === company.id ? "seller" : "buyer",
        statusBefore: contract.status,
        statusAfter: "cancelled",
      });

      const { seller, buyer } = await fetchPartyNames(
        updated.seller_company_id,
        updated.buyer_company_id,
      );
      res.json(serializeContract(updated, { seller, buyer }));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /contracts/:id/materials — add material line (draft only, creator only)
// ---------------------------------------------------------------------------

router.post(
  "/contracts/:id/materials",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");

      const { contract, isCreator } = await fetchContractForParty(contractId, company.id);

      if (!isCreator) {
        throw new HttpError(403, "Forbidden", "Only the contract creator can manage material lines");
      }
      assertContractEditable(contract);

      const {
        material_category_id,
        material_label,
        unit_option_id,
        unit_label,
        price_per_unit,
        seller_pct,
        buyer_pct,
        sort_order,
      } = req.body as Record<string, unknown>;

      if (!material_label || typeof material_label !== "string") {
        throw new HttpError(400, "ValidationError", "material_label is required");
      }
      if (!unit_label || typeof unit_label !== "string") {
        throw new HttpError(400, "ValidationError", "unit_label is required");
      }
      if (price_per_unit == null) {
        throw new HttpError(400, "ValidationError", "price_per_unit is required");
      }
      const priceNum = Number(price_per_unit);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new HttpError(400, "ValidationError", "price_per_unit must be a non-negative number");
      }

      const [currentCount] = await db
        .select({ count: sql<string>`count(*)::text` })
        .from(contractMaterialsTable)
        .where(eq(contractMaterialsTable.contract_id, contract.id));

      const nextSortOrder = (sort_order != null ? Number(sort_order) : null) ?? (Number(currentCount.count) + 1);

      const [material] = await db
        .insert(contractMaterialsTable)
        .values({
          contract_id: contract.id,
          material_category_id:
            typeof material_category_id === "string" ? material_category_id : null,
          material_label: material_label.trim(),
          unit_option_id:
            typeof unit_option_id === "string" ? unit_option_id : null,
          unit_label: (unit_label as string).trim(),
          price_per_unit: String(priceNum),
          seller_pct: seller_pct != null ? String(Number(seller_pct)) : null,
          buyer_pct: buyer_pct != null ? String(Number(buyer_pct)) : null,
          sort_order: nextSortOrder,
        })
        .returning();

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.material.added",
        entityType: "contract",
        entityId: contract.id,
        details: { material_label, unit_label, price_per_unit: priceNum },
      });

      res.status(201).json(serializeMaterial(material));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /contracts/:id/materials/:materialId — remove material line (draft, creator only)
// ---------------------------------------------------------------------------

router.delete(
  "/contracts/:id/materials/:materialId",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");
      const materialId = assertUuid(req.params.materialId, "materialId");

      const { contract, isCreator } = await fetchContractForParty(contractId, company.id);

      if (!isCreator) {
        throw new HttpError(403, "Forbidden", "Only the contract creator can manage material lines");
      }
      assertContractEditable(contract);

      const [deleted] = await db
        .delete(contractMaterialsTable)
        .where(
          and(
            eq(contractMaterialsTable.id, materialId),
            eq(contractMaterialsTable.contract_id, contract.id),
          ),
        )
        .returning({ id: contractMaterialsTable.id });

      if (!deleted) throw new HttpError(404, "NotFound", "Material line not found");

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.material.removed",
        entityType: "contract",
        entityId: contract.id,
        details: { material_id: materialId },
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
