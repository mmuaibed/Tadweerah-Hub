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
  companyCategoriesTable,
  companyRolesTable,
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

  // roles: array of platform roles (producer/buyer/carrier) — multi-role support
  const VALID_ROLES = ["producer", "buyer", "carrier"] as const;
  type ValidRole = (typeof VALID_ROLES)[number];
  const rolesRaw: ValidRole[] = Array.isArray(req.body?.roles)
    ? (req.body.roles as unknown[]).filter((v): v is ValidRole =>
        typeof v === "string" && (VALID_ROLES as readonly string[]).includes(v)
      )
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
      // Set primary type from first role (backward compat)
      ...(rolesRaw.length > 0 ? { type: rolesRaw[0] } : {}),
    })
    .returning();

  // Add the creating user as the company owner in company_members
  await db.insert(companyMembersTable).values({
    company_id: created.id,
    user_id: userId,
    role: "owner",
  }).onConflictDoNothing();

  // Insert roles into company_roles junction
  if (rolesRaw.length > 0) {
    await db.insert(companyRolesTable).values(
      rolesRaw.map((r) => ({ company_id: created.id, role: r })),
    ).onConflictDoNothing();
  }

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

/* -------------------------------------------------------------------------- */
/* Company profile (GET + PUT /companies/mine)                                */
/* -------------------------------------------------------------------------- */

/**
 * GET /companies/mine
 * Returns the authenticated user's company profile including category and
 * license information.
 */
router.get(
  "/companies/mine",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    const rows = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        type: companiesTable.type,
        city: companiesTable.city,
        contactPhone: companiesTable.contactPhone,
        commercialRegistration: companiesTable.commercialRegistration,
        license_number: companiesTable.license_number,
        license_status: companiesTable.license_status,
        company_category_id: companiesTable.company_category_id,
        accepted_terms_at: companiesTable.accepted_terms_at,
        createdAt: companiesTable.createdAt,
        category_name_ar: companyCategoriesTable.name_ar,
        category_name_en: companyCategoriesTable.name_en,
      })
      .from(companiesTable)
      .leftJoin(
        companyCategoriesTable,
        eq(companiesTable.company_category_id, companyCategoriesTable.id),
      )
      .where(eq(companiesTable.id, company.id))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "NotFound", message: "Company not found" });
      return;
    }
    const r = rows[0];

    // Fetch multi-roles
    const roleRows = await db
      .select({ role: companyRolesTable.role })
      .from(companyRolesTable)
      .where(eq(companyRolesTable.company_id, r.id));

    // Fall back to legacy type field if no junction roles set
    const roles: string[] = roleRows.length > 0
      ? roleRows.map((rr) => rr.role)
      : r.type
        ? [r.type]
        : [];

    res.json({
      id: r.id,
      name: r.name,
      city: r.city,
      contactPhone: r.contactPhone,
      commercialRegistration: r.commercialRegistration ?? undefined,
      license_number: r.license_number ?? undefined,
      license_status: r.license_status ?? undefined,
      company_category_id: r.company_category_id ?? undefined,
      category_name_ar: r.category_name_ar ?? undefined,
      category_name_en: r.category_name_en ?? undefined,
      accepted_terms_at: r.accepted_terms_at?.toISOString() ?? undefined,
      roles,
      createdAt: r.createdAt.toISOString(),
    });
  },
);

/**
 * PUT /companies/mine/roles
 * Body: { roles: ("producer" | "buyer" | "carrier")[] }
 * Atomically replaces the company's role list.
 * Also syncs the legacy `type` field to the first role for backward compat.
 */
router.put(
  "/companies/mine/roles",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    const VALID_ROLES = ["producer", "buyer", "carrier"] as const;
    type ValidRole = (typeof VALID_ROLES)[number];
    const ids: unknown = req.body?.roles;
    if (!Array.isArray(ids) || ids.some((x) => !VALID_ROLES.includes(x as ValidRole))) {
      res.status(400).json({
        error: "ValidationError",
        message: 'roles must be an array of "producer", "buyer", and/or "carrier"',
      });
      return;
    }
    if (ids.length === 0) {
      res.status(400).json({
        error: "ValidationError",
        message: "At least one role is required",
      });
      return;
    }
    const roles = ids as ValidRole[];

    await db.transaction(async (tx) => {
      await tx.delete(companyRolesTable).where(eq(companyRolesTable.company_id, company.id));
      await tx.insert(companyRolesTable).values(
        roles.map((r) => ({ company_id: company.id, role: r })),
      ).onConflictDoNothing();
      // Keep legacy type in sync
      await tx
        .update(companiesTable)
        .set({ type: roles[0] })
        .where(eq(companiesTable.id, company.id));
    });

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "company.roles_updated",
      entityType: "company",
      entityId: company.id,
      details: { roles },
    });

    res.json({ roles });
  },
);

/**
 * PUT /companies/mine
 * Updates mutable company fields: name, city, contactPhone,
 * commercialRegistration, license_number, company_category_id.
 * license_status is NEVER changed here — admin only.
 */
router.put(
  "/companies/mine",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : null;
    const cityRaw = typeof req.body?.city === "string" ? req.body.city.trim() : null;
    const phoneRaw = typeof req.body?.contactPhone === "string" ? req.body.contactPhone.trim() : null;

    if (nameRaw !== null && (nameRaw.length < 2 || nameRaw.length > 120)) {
      res.status(400).json({ error: "ValidationError", message: "name must be 2–120 characters" });
      return;
    }
    if (cityRaw !== null && (cityRaw.length < 2 || cityRaw.length > 80)) {
      res.status(400).json({ error: "ValidationError", message: "city must be 2–80 characters" });
      return;
    }
    if (phoneRaw !== null && (phoneRaw.length < 6 || phoneRaw.length > 20)) {
      res.status(400).json({ error: "ValidationError", message: "contactPhone must be 6–20 characters" });
      return;
    }

    const crRaw =
      typeof req.body?.commercialRegistration === "string"
        ? req.body.commercialRegistration.trim() || null
        : undefined;
    const licenseRaw =
      typeof req.body?.license_number === "string"
        ? req.body.license_number.trim() || null
        : undefined;
    const categoryIdRaw =
      typeof req.body?.company_category_id === "string"
        ? req.body.company_category_id.trim() || null
        : undefined;

    const patch: Partial<typeof companiesTable.$inferInsert> = {};
    if (nameRaw !== null) patch.name = nameRaw;
    if (cityRaw !== null) patch.city = cityRaw;
    if (phoneRaw !== null) patch.contactPhone = phoneRaw;
    if (crRaw !== undefined) patch.commercialRegistration = crRaw;
    if (licenseRaw !== undefined) {
      patch.license_number = licenseRaw;
      if (licenseRaw && !company.license_status) {
        patch.license_status = "pending";
      }
    }
    if (categoryIdRaw !== undefined) patch.company_category_id = categoryIdRaw;

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No fields to update" });
      return;
    }

    const [updated] = await db
      .update(companiesTable)
      .set(patch)
      .where(eq(companiesTable.id, company.id))
      .returning();

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "company.profile_updated",
      entityType: "company",
      entityId: company.id,
      details: { fields: Object.keys(patch) },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      city: updated.city,
      contactPhone: updated.contactPhone,
      commercialRegistration: updated.commercialRegistration ?? undefined,
      license_number: updated.license_number ?? undefined,
      license_status: updated.license_status ?? undefined,
      company_category_id: updated.company_category_id ?? undefined,
      createdAt: updated.createdAt.toISOString(),
    });
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
