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

  return { contract, isSeller, isBuyer };
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

/**
 * Asserts the contract is in draft status, allowing material line mutations.
 * Material lines are immutable once the contract leaves draft.
 */
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
// POST /contracts — create contract (seller)
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
        buyer_company_id,
        start_date,
        end_date,
        weight_policy,
        external_reference,
        attachment_url,
        notes,
      } = req.body as Record<string, string | undefined>;

      if (!buyer_company_id) throw new HttpError(400, "ValidationError", "buyer_company_id is required");
      assertUuid(buyer_company_id, "buyer_company_id");
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

      if (buyer_company_id === company.id) {
        throw new HttpError(400, "ValidationError", "Seller and buyer cannot be the same company");
      }

      const [buyer] = await db
        .select({ id: companiesTable.id, name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, buyer_company_id))
        .limit(1);

      if (!buyer) throw new HttpError(404, "NotFound", "Buyer company not found");

      const reference = await nextContractReference();

      const [contract] = await db
        .insert(contractsTable)
        .values({
          reference,
          external_reference: external_reference ?? null,
          seller_company_id: company.id,
          buyer_company_id,
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
        details: { reference, buyer_company_id },
      });

      res.status(201).json(
        serializeContract(contract, {
          seller: { name: company.name },
          buyer: { name: buyer.name },
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
// PATCH /contracts/:id — update contract fields (draft only, seller only)
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

      const { contract, isSeller } = await fetchContractForParty(contractId, company.id);

      if (!isSeller) {
        throw new HttpError(403, "Forbidden", "Only the seller can edit contract details");
      }
      assertContractEditable(contract);

      const allowed = [
        "external_reference",
        "start_date",
        "end_date",
        "weight_policy",
        "attachment_url",
        "notes",
      ] as const;

      const validPolicies = [
        "source_weight_only",
        "destination_weight_only",
        "dual_source_final",
        "dual_destination_final",
        "dual_higher_final",
      ];

      const updates: Partial<typeof contractsTable.$inferInsert> = {};
      for (const key of allowed) {
        if (key in req.body) {
          if (key === "weight_policy" && !validPolicies.includes(req.body[key])) {
            throw new HttpError(400, "ValidationError", `weight_policy must be one of: ${validPolicies.join(", ")}`);
          }
          (updates as Record<string, unknown>)[key] = req.body[key] ?? null;
        }
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
// POST /contracts/:id/submit — draft → pending_confirmation (seller only)
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

      const { contract, isSeller } = await fetchContractForParty(contractId, company.id);

      if (!isSeller) {
        throw new HttpError(403, "Forbidden", "Only the seller can submit a contract for confirmation");
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
// POST /contracts/:id/confirm — pending_confirmation → active (buyer only)
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

      const { contract, isBuyer } = await fetchContractForParty(contractId, company.id);

      if (!isBuyer) {
        throw new HttpError(403, "Forbidden", "Only the buyer can confirm a contract");
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
// POST /contracts/:id/complete — active → completed (seller only; all shipments terminal)
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

      const { contract, isSeller } = await fetchContractForParty(contractId, company.id);

      if (!isSeller) {
        throw new HttpError(403, "Forbidden", "Only the seller can complete a contract");
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
// POST /contracts/:id/materials — add material line (draft only)
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

      const { contract, isSeller } = await fetchContractForParty(contractId, company.id);

      if (!isSeller) {
        throw new HttpError(403, "Forbidden", "Only the seller can manage material lines");
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

      if (material_category_id != null) assertUuid(material_category_id as string, "material_category_id");
      if (unit_option_id != null) assertUuid(unit_option_id as string, "unit_option_id");

      const sellerPctNum = seller_pct != null ? Number(seller_pct) : null;
      const buyerPctNum = buyer_pct != null ? Number(buyer_pct) : null;

      if (
        sellerPctNum != null &&
        buyerPctNum != null &&
        Math.abs(sellerPctNum + buyerPctNum - 100) > 0.01
      ) {
        res.setHeader("X-Revenue-Share-Warning", "seller_pct + buyer_pct does not equal 100");
      }

      const [material] = await db
        .insert(contractMaterialsTable)
        .values({
          contract_id: contract.id,
          material_category_id: (material_category_id as string) ?? null,
          material_label: material_label.trim(),
          unit_option_id: (unit_option_id as string) ?? null,
          unit_label: (unit_label as string).trim(),
          price_per_unit: String(priceNum),
          seller_pct: sellerPctNum != null ? String(sellerPctNum) : null,
          buyer_pct: buyerPctNum != null ? String(buyerPctNum) : null,
          sort_order: sort_order != null ? Number(sort_order) : 0,
        })
        .returning();

      await db
        .update(contractsTable)
        .set({ updated_at: new Date() })
        .where(eq(contractsTable.id, contract.id));

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.material.added",
        entityType: "contract_material",
        entityId: material.id,
        details: { contract_id: contract.id, material_label },
      });

      res.status(201).json(serializeMaterial(material));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /contracts/:id/materials/:mid — update material line (draft only)
// ---------------------------------------------------------------------------

router.put(
  "/contracts/:id/materials/:mid",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");
      const materialId = assertUuid(req.params.mid, "mid");

      const { contract, isSeller } = await fetchContractForParty(contractId, company.id);

      if (!isSeller) {
        throw new HttpError(403, "Forbidden", "Only the seller can manage material lines");
      }
      assertContractEditable(contract);

      const [existing] = await db
        .select()
        .from(contractMaterialsTable)
        .where(
          and(
            eq(contractMaterialsTable.id, materialId),
            eq(contractMaterialsTable.contract_id, contract.id),
          ),
        )
        .limit(1);

      if (!existing) throw new HttpError(404, "NotFound", "Material line not found");

      const updates: Partial<typeof contractMaterialsTable.$inferInsert> = {};
      const body = req.body as Record<string, unknown>;

      if ("material_label" in body) {
        if (!body.material_label || typeof body.material_label !== "string") {
          throw new HttpError(400, "ValidationError", "material_label cannot be empty");
        }
        updates.material_label = (body.material_label as string).trim();
      }
      if ("unit_label" in body) {
        if (!body.unit_label || typeof body.unit_label !== "string") {
          throw new HttpError(400, "ValidationError", "unit_label cannot be empty");
        }
        updates.unit_label = (body.unit_label as string).trim();
      }
      if ("price_per_unit" in body) {
        const p = Number(body.price_per_unit);
        if (isNaN(p) || p < 0) throw new HttpError(400, "ValidationError", "price_per_unit must be a non-negative number");
        updates.price_per_unit = String(p);
      }
      if ("material_category_id" in body) {
        if (body.material_category_id != null) assertUuid(body.material_category_id as string, "material_category_id");
        updates.material_category_id = (body.material_category_id as string) ?? null;
      }
      if ("unit_option_id" in body) {
        if (body.unit_option_id != null) assertUuid(body.unit_option_id as string, "unit_option_id");
        updates.unit_option_id = (body.unit_option_id as string) ?? null;
      }
      if ("seller_pct" in body) {
        updates.seller_pct = body.seller_pct != null ? String(Number(body.seller_pct)) : null;
      }
      if ("buyer_pct" in body) {
        updates.buyer_pct = body.buyer_pct != null ? String(Number(body.buyer_pct)) : null;
      }
      if ("sort_order" in body) {
        updates.sort_order = Number(body.sort_order);
      }

      if (Object.keys(updates).length === 0) {
        throw new HttpError(400, "ValidationError", "No updatable fields provided");
      }

      const finalSeller = updates.seller_pct ?? existing.seller_pct;
      const finalBuyer = updates.buyer_pct ?? existing.buyer_pct;
      if (
        finalSeller != null &&
        finalBuyer != null &&
        Math.abs(Number(finalSeller) + Number(finalBuyer) - 100) > 0.01
      ) {
        res.setHeader("X-Revenue-Share-Warning", "seller_pct + buyer_pct does not equal 100");
      }

      const [updated] = await db
        .update(contractMaterialsTable)
        .set(updates)
        .where(eq(contractMaterialsTable.id, existing.id))
        .returning();

      await db
        .update(contractsTable)
        .set({ updated_at: new Date() })
        .where(eq(contractsTable.id, contract.id));

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.material.updated",
        entityType: "contract_material",
        entityId: existing.id,
        details: { contract_id: contract.id },
      });

      res.json(serializeMaterial(updated));
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /contracts/:id/materials/:mid — remove material line (draft only)
// ---------------------------------------------------------------------------

router.delete(
  "/contracts/:id/materials/:mid",
  requireAuth,
  requireCompany(),
  async (req, res, next) => {
    try {
      const company = (req as AuthedCompanyRequest).company;
      const userId = (req as AuthedCompanyRequest).userId;
      const contractId = assertUuid(req.params.id, "id");
      const materialId = assertUuid(req.params.mid, "mid");

      const { contract, isSeller } = await fetchContractForParty(contractId, company.id);

      if (!isSeller) {
        throw new HttpError(403, "Forbidden", "Only the seller can manage material lines");
      }
      assertContractEditable(contract);

      const [existing] = await db
        .select({ id: contractMaterialsTable.id })
        .from(contractMaterialsTable)
        .where(
          and(
            eq(contractMaterialsTable.id, materialId),
            eq(contractMaterialsTable.contract_id, contract.id),
          ),
        )
        .limit(1);

      if (!existing) throw new HttpError(404, "NotFound", "Material line not found");

      await db
        .delete(contractMaterialsTable)
        .where(eq(contractMaterialsTable.id, existing.id));

      await db
        .update(contractsTable)
        .set({ updated_at: new Date() })
        .where(eq(contractsTable.id, contract.id));

      await logAudit({
        userId,
        companyId: company.id,
        action: "contract.material.deleted",
        entityType: "contract_material",
        entityId: existing.id,
        details: { contract_id: contract.id },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
