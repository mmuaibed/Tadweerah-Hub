import { Router, type IRouter } from "express";
import { eq, and, ne, ilike, asc } from "drizzle-orm";
import {
  db,
  companiesTable,
  capabilitiesTable,
  companyCapabilitiesTable,
  companyActionsTable,
  companyActionSelectionsTable,
  companyMembersTable,
} from "@workspace/db";
import { CreateCompanyBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.post("/companies", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  // Use only the subset of fields that are still required
  const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const cityRaw = typeof req.body?.city === "string" ? req.body.city.trim() : "";
  const phoneRaw = typeof req.body?.contactPhone === "string" ? req.body.contactPhone.trim() : "";

  if (!nameRaw || nameRaw.length < 2 || nameRaw.length > 120) {
    res.status(400).json({ error: "ValidationError", message: "name must be 2–120 characters" });
    return;
  }
  if (!cityRaw || cityRaw.length < 2 || cityRaw.length > 80) {
    res.status(400).json({ error: "ValidationError", message: "city must be 2–80 characters" });
    return;
  }
  if (!phoneRaw || phoneRaw.length < 6 || phoneRaw.length > 20) {
    res.status(400).json({ error: "ValidationError", message: "contactPhone must be 6–20 characters" });
    return;
  }

  // Check via company_members — a user can only belong to one company
  const existing = await db
    .select({ company_id: companyMembersTable.company_id })
    .from(companyMembersTable)
    .where(eq(companyMembersTable.user_id, userId))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "User already has a company" });
    return;
  }

  const licenseNumber =
    typeof req.body?.license_number === "string" && req.body.license_number.trim()
      ? req.body.license_number.trim()
      : null;

  const companyCategoryId =
    typeof req.body?.company_category_id === "string" && req.body.company_category_id.trim()
      ? req.body.company_category_id.trim()
      : null;

  const commercialRegistration =
    typeof req.body?.commercialRegistration === "string" && req.body.commercialRegistration.trim()
      ? req.body.commercialRegistration.trim()
      : null;

  const acceptedTerms = req.body?.accepted_terms === true || req.body?.accepted_terms === "true";

  // action_ids: array of company_actions UUIDs (user intent, not eligibility)
  const actionIds: string[] = Array.isArray(req.body?.action_ids)
    ? (req.body.action_ids as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  const [created] = await db
    .insert(companiesTable)
    .values({
      ownerUserId: userId,
      name: nameRaw,
      city: cityRaw,
      contactPhone: phoneRaw,
      commercialRegistration,
      license_number: licenseNumber,
      company_category_id: companyCategoryId,
      license_status: licenseNumber ? "pending" : null,
      accepted_terms_at: acceptedTerms ? new Date() : null,
    })
    .returning();

  // Add the creating user as the company owner in company_members
  await db.insert(companyMembersTable).values({
    company_id: created.id,
    user_id: userId,
    role: "owner",
  }).onConflictDoNothing();

  // Insert selected actions
  if (actionIds.length > 0) {
    await db.insert(companyActionSelectionsTable).values(
      actionIds.map((aid) => ({ company_id: created.id, action_id: aid })),
    ).onConflictDoNothing();
  }

  void logAudit({
    userId,
    companyId: created.id,
    action: "company.created",
    entityType: "company",
    entityId: created.id,
    details: { action_ids: actionIds },
  });

  res.status(201).json({
    id: created.id,
    name: created.name,
    city: created.city,
    commercialRegistration: created.commercialRegistration ?? undefined,
    contactPhone: created.contactPhone,
    license_number: created.license_number ?? undefined,
    license_status: created.license_status ?? undefined,
    accepted_terms_at: created.accepted_terms_at?.toISOString() ?? undefined,
    createdAt: created.createdAt.toISOString(),
  });
});

/* -------------------------------------------------------------------------- */
/* Company capabilities                                                        */
/* -------------------------------------------------------------------------- */

/**
 * GET /companies/mine/capabilities
 * Returns the current company's declared capabilities (key + id).
 */
router.get(
  "/companies/mine/capabilities",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const rows = await db
      .select({
        capability_id: companyCapabilitiesTable.capability_id,
        key: capabilitiesTable.key,
        name_ar: capabilitiesTable.name_ar,
        name_en: capabilitiesTable.name_en,
        sort_order: capabilitiesTable.sort_order,
      })
      .from(companyCapabilitiesTable)
      .innerJoin(
        capabilitiesTable,
        eq(companyCapabilitiesTable.capability_id, capabilitiesTable.id),
      )
      .where(
        and(
          eq(companyCapabilitiesTable.company_id, company.id),
          eq(capabilitiesTable.is_active, true),
        ),
      );
    res.json(rows);
  },
);

/**
 * PUT /companies/mine/capabilities
 * Body: { capability_ids: string[] }
 * Replaces the company's capability list atomically.
 */
router.put(
  "/companies/mine/capabilities",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const ids: unknown = req.body?.capability_ids;
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
      res.status(400).json({
        error: "ValidationError",
        message: "capability_ids must be an array of strings",
      });
      return;
    }
    const capabilityIds = ids as string[];

    await db.transaction(async (tx) => {
      await tx
        .delete(companyCapabilitiesTable)
        .where(eq(companyCapabilitiesTable.company_id, company.id));
      if (capabilityIds.length > 0) {
        await tx.insert(companyCapabilitiesTable).values(
          capabilityIds.map((cid) => ({
            company_id: company.id,
            capability_id: cid,
          })),
        );
      }
    });

    const rows = await db
      .select({
        capability_id: companyCapabilitiesTable.capability_id,
        key: capabilitiesTable.key,
        name_ar: capabilitiesTable.name_ar,
        name_en: capabilitiesTable.name_en,
        sort_order: capabilitiesTable.sort_order,
      })
      .from(companyCapabilitiesTable)
      .innerJoin(
        capabilitiesTable,
        eq(companyCapabilitiesTable.capability_id, capabilitiesTable.id),
      )
      .where(
        and(
          eq(companyCapabilitiesTable.company_id, company.id),
          eq(capabilitiesTable.is_active, true),
        ),
      );
    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "company.capabilities_updated",
      entityType: "company",
      entityId: company.id,
      details: { capability_ids: capabilityIds },
    });

    res.json(rows);
  },
);

// GET /companies/search?q= — search companies by name for direct-sale targeting UI.
// Returns up to 10 companies matching the query, excluding the viewer's own company.
router.get(
  "/companies/search",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q || q.length < 2) {
      res.json([]);
      return;
    }
    const { company } = req as AuthedCompanyRequest;
    const rows = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        city: companiesTable.city,
      })
      .from(companiesTable)
      .where(
        and(
          ne(companiesTable.id, company.id),
          ilike(companiesTable.name, `%${q}%`),
        ),
      )
      .orderBy(asc(companiesTable.name))
      .limit(10);
    res.json(rows);
  },
);

export default router;
