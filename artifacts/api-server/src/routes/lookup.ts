/**
 * GET  /lookup/company-categories
 * GET  /lookup/unit-options
 * GET  /lookup/material-categories
 * GET  /lookup/capabilities
 *
 * Public read-only endpoints for authenticated company users.
 *
 * Admin write endpoints (protected by X-Admin-Key header):
 * POST   /admin/lookup/company-categories
 * PUT    /admin/lookup/company-categories/:id
 * PATCH  /admin/lookup/company-categories/:id
 * DELETE /admin/lookup/company-categories/:id   (sets is_active=false)
 * POST   /admin/lookup/unit-options
 * PUT    /admin/lookup/unit-options/:id
 * PATCH  /admin/lookup/unit-options/:id
 * DELETE /admin/lookup/unit-options/:id
 * POST   /admin/lookup/material-categories
 * PUT    /admin/lookup/material-categories/:id
 * PATCH  /admin/lookup/material-categories/:id
 * DELETE /admin/lookup/material-categories/:id
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  companyCategoriesTable,
  companyActionsTable,
  unitOptionsTable,
  materialCategoriesTable,
  capabilitiesTable,
  companiesTable,
  wasteListingsTable,
} from "@workspace/db";
import { eq, asc, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany } from "../middlewares/requireCompany";
import { logAudit } from "../lib/audit";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Admin key middleware                                                         */
/* -------------------------------------------------------------------------- */
function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "AdminNotConfigured", message: "Admin API key is not configured" });
    return;
  }
  if (req.headers["x-admin-key"] !== adminKey) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or missing X-Admin-Key header" });
    return;
  }
  next();
}

/* -------------------------------------------------------------------------- */
/* Validation helpers                                                         */
/* -------------------------------------------------------------------------- */
function validateKey(key: any): string | null {
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  if (!/^[a-z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

function validateName(name: any): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed === "") return null;
  return trimmed;
}

/* -------------------------------------------------------------------------- */
/* Read endpoints                                                              */
/* company-categories + company-actions: public (used during onboarding)      */
/* unit-options, material-categories, capabilities: requireAuth + requireCo   */
/* -------------------------------------------------------------------------- */

router.get(
  "/lookup/company-categories",
  async (_req, res) => {
    const rows = await db
      .select()
      .from(companyCategoriesTable)
      .where(eq(companyCategoriesTable.is_active, true))
      .orderBy(asc(companyCategoriesTable.sort_order), asc(companyCategoriesTable.name_en));
    res.json(rows);
  },
);

router.get(
  "/lookup/company-actions",
  async (_req, res) => {
    const rows = await db
      .select()
      .from(companyActionsTable)
      .where(eq(companyActionsTable.is_active, true))
      .orderBy(asc(companyActionsTable.sort_order), asc(companyActionsTable.name_en));
    res.json(rows);
  },
);

router.get(
  "/lookup/unit-options",
  requireAuth,
  requireCompany(),
  async (_req, res) => {
    const rows = await db
      .select()
      .from(unitOptionsTable)
      .where(eq(unitOptionsTable.is_active, true))
      .orderBy(asc(unitOptionsTable.sort_order), asc(unitOptionsTable.name_en));
    res.json(rows);
  },
);

router.get(
  "/lookup/material-categories",
  requireAuth,
  requireCompany(),
  async (_req, res) => {
    const rows = await db
      .select()
      .from(materialCategoriesTable)
      .where(eq(materialCategoriesTable.is_active, true))
      .orderBy(
        asc(materialCategoriesTable.sort_order),
        asc(materialCategoriesTable.name_en),
      );
    res.json(rows);
  },
);

router.get(
  "/lookup/capabilities",
  requireAuth,
  requireCompany(),
  async (_req, res) => {
    const rows = await db
      .select()
      .from(capabilitiesTable)
      .where(eq(capabilitiesTable.is_active, true))
      .orderBy(asc(capabilitiesTable.sort_order), asc(capabilitiesTable.name_en));
    res.json(rows);
  },
);

/* -------------------------------------------------------------------------- */
/* Admin read endpoints (returns active + inactive)                            */
/* -------------------------------------------------------------------------- */

router.get(
  "/admin/lookup/company-categories",
  requireAdminKey,
  async (_req, res) => {
    const rows = await db
      .select()
      .from(companyCategoriesTable)
      .orderBy(asc(companyCategoriesTable.sort_order), asc(companyCategoriesTable.name_en));
    res.json(rows);
  },
);

router.get(
  "/admin/lookup/unit-options",
  requireAdminKey,
  async (_req, res) => {
    const rows = await db
      .select()
      .from(unitOptionsTable)
      .orderBy(asc(unitOptionsTable.sort_order), asc(unitOptionsTable.name_en));
    res.json(rows);
  },
);

router.get(
  "/admin/lookup/material-categories",
  requireAdminKey,
  async (_req, res) => {
    const rows = await db
      .select()
      .from(materialCategoriesTable)
      .orderBy(
        asc(materialCategoriesTable.sort_order),
        asc(materialCategoriesTable.name_en),
      );
    res.json(rows);
  },
);

router.get(
  "/admin/lookup/capabilities",
  requireAdminKey,
  async (_req, res) => {
    const rows = await db
      .select()
      .from(capabilitiesTable)
      .orderBy(asc(capabilitiesTable.sort_order), asc(capabilitiesTable.name_en));
    res.json(rows);
  },
);

/* -------------------------------------------------------------------------- */
/* Admin write — company categories                                            */
/* -------------------------------------------------------------------------- */

router.post(
  "/admin/lookup/company-categories",
  requireAdminKey,
  async (req, res) => {
    const { key, name_ar, name_en, sort_order } = req.body ?? {};
    const safeKey = validateKey(key);
    if (!safeKey) {
      res.status(400).json({ error: "ValidationError", message: "key is required and must be lowercase, alphanumeric, snake_case without spaces" });
      return;
    }
    const safeNameAr = validateName(name_ar);
    const safeNameEn = validateName(name_en);
    if (!safeNameAr || !safeNameEn) {
      res.status(400).json({ error: "ValidationError", message: "name_ar and name_en are required and cannot be empty" });
      return;
    }

    try {
      const [created] = await db
        .insert(companyCategoriesTable)
        .values({
          key: safeKey,
          name_ar: safeNameAr,
          name_en: safeNameEn,
          sort_order: typeof sort_order === "number" ? sort_order : 99,
          is_active: true,
        })
        .returning();

      void logAudit({
        action: "master_data.created",
        entityType: "master_data",
        entityId: created.id,
        actorRole: "admin",
        details: { list_type: "company_categories", key: safeKey, new_values: created }
      });
      res.status(201).json(created);
    } catch (err: any) {
      if (err.code === "23505") { // unique violation
        res.status(409).json({ error: "Conflict", message: "key must be unique" });
        return;
      }
      res.status(500).json({ error: "InternalError", message: err.message });
    }
  },
);

async function updateCompanyCategory(req: Request, res: Response, forceDeactivate = false) {
  const id = String(req.params["id"]);
  const { name_ar, name_en, sort_order, is_active } = req.body ?? {};

  const [existing] = await db.select().from(companyCategoriesTable).where(eq(companyCategoriesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "NotFound" }); return; }

  const targetIsActive = forceDeactivate ? false : (typeof is_active === "boolean" ? is_active : existing.is_active);

  if (targetIsActive === false && existing.is_active === true) {
    const [ref] = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.company_category_id, id)).limit(1);
    if (ref) {
      res.status(409).json({ error: "CannotDeactivateReferencedOption", message: "Option is referenced by active companies" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (!forceDeactivate) {
    if (name_ar !== undefined) {
      const safeAr = validateName(name_ar);
      if (!safeAr) { res.status(400).json({ error: "ValidationError", message: "name_ar cannot be empty" }); return; }
      updates.name_ar = safeAr;
    }
    if (name_en !== undefined) {
      const safeEn = validateName(name_en);
      if (!safeEn) { res.status(400).json({ error: "ValidationError", message: "name_en cannot be empty" }); return; }
      updates.name_en = safeEn;
    }
    if (typeof sort_order === "number") updates.sort_order = sort_order;
    if (typeof is_active === "boolean") updates.is_active = is_active;
  } else {
    updates.is_active = false;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "ValidationError", message: "No safe fields to update" });
    return;
  }

  const [updated] = await db
    .update(companyCategoriesTable)
    .set(updates)
    .where(eq(companyCategoriesTable.id, id))
    .returning();

  const actionType = (targetIsActive === false && existing.is_active === true) ? "master_data.deactivated" : "master_data.updated";

  void logAudit({
    action: actionType,
    entityType: "master_data",
    entityId: id,
    actorRole: "admin",
    details: { list_type: "company_categories", key: existing.key, previous_values: existing, new_values: updated }
  });

  res.json(updated);
}

router.patch("/admin/lookup/company-categories/:id", requireAdminKey, (req, res) => updateCompanyCategory(req, res));
router.put("/admin/lookup/company-categories/:id", requireAdminKey, (req, res) => updateCompanyCategory(req, res));
router.delete("/admin/lookup/company-categories/:id", requireAdminKey, (req, res) => updateCompanyCategory(req, res, true));

/* -------------------------------------------------------------------------- */
/* Admin write — unit options                                                   */
/* -------------------------------------------------------------------------- */

router.post(
  "/admin/lookup/unit-options",
  requireAdminKey,
  async (req, res) => {
    const { key, name_ar, name_en, symbol, sort_order } = req.body ?? {};
    const safeKey = validateKey(key);
    if (!safeKey) {
      res.status(400).json({ error: "ValidationError", message: "key is required and must be lowercase, alphanumeric, snake_case without spaces" });
      return;
    }
    const safeNameAr = validateName(name_ar);
    const safeNameEn = validateName(name_en);
    if (!safeNameAr || !safeNameEn) {
      res.status(400).json({ error: "ValidationError", message: "name_ar and name_en are required and cannot be empty" });
      return;
    }
    if (!symbol) {
      res.status(400).json({ error: "ValidationError", message: "symbol is required" });
      return;
    }

    try {
      const [created] = await db
        .insert(unitOptionsTable)
        .values({
          key: safeKey,
          name_ar: safeNameAr,
          name_en: safeNameEn,
          symbol,
          sort_order: typeof sort_order === "number" ? sort_order : 99,
          is_active: true,
        })
        .returning();

      void logAudit({
        action: "master_data.created",
        entityType: "master_data",
        entityId: created.id,
        actorRole: "admin",
        details: { list_type: "unit_options", key: safeKey, new_values: created }
      });
      res.status(201).json(created);
    } catch (err: any) {
      if (err.code === "23505") {
        res.status(409).json({ error: "Conflict", message: "key must be unique" });
        return;
      }
      res.status(500).json({ error: "InternalError", message: err.message });
    }
  },
);

async function updateUnitOption(req: Request, res: Response, forceDeactivate = false) {
  const id = String(req.params["id"]);
  const { name_ar, name_en, symbol, sort_order, is_active } = req.body ?? {};

  const [existing] = await db.select().from(unitOptionsTable).where(eq(unitOptionsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "NotFound" }); return; }

  const targetIsActive = forceDeactivate ? false : (typeof is_active === "boolean" ? is_active : existing.is_active);

  if (targetIsActive === false && existing.is_active === true) {
    const [ref] = await db.select({ id: wasteListingsTable.id }).from(wasteListingsTable).where(eq(wasteListingsTable.unit_option_id, id)).limit(1);
    if (ref) {
      res.status(409).json({ error: "CannotDeactivateReferencedOption", message: "Option is referenced by active listings" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (!forceDeactivate) {
    if (name_ar !== undefined) {
      const safeAr = validateName(name_ar);
      if (!safeAr) { res.status(400).json({ error: "ValidationError", message: "name_ar cannot be empty" }); return; }
      updates.name_ar = safeAr;
    }
    if (name_en !== undefined) {
      const safeEn = validateName(name_en);
      if (!safeEn) { res.status(400).json({ error: "ValidationError", message: "name_en cannot be empty" }); return; }
      updates.name_en = safeEn;
    }
    if (symbol !== undefined) updates.symbol = symbol;
    if (typeof sort_order === "number") updates.sort_order = sort_order;
    if (typeof is_active === "boolean") updates.is_active = is_active;
  } else {
    updates.is_active = false;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "ValidationError", message: "No safe fields to update" });
    return;
  }

  const [updated] = await db
    .update(unitOptionsTable)
    .set(updates)
    .where(eq(unitOptionsTable.id, id))
    .returning();

  const actionType = (targetIsActive === false && existing.is_active === true) ? "master_data.deactivated" : "master_data.updated";

  void logAudit({
    action: actionType,
    entityType: "master_data",
    entityId: id,
    actorRole: "admin",
    details: { list_type: "unit_options", key: existing.key, previous_values: existing, new_values: updated }
  });

  res.json(updated);
}

router.patch("/admin/lookup/unit-options/:id", requireAdminKey, (req, res) => updateUnitOption(req, res));
router.put("/admin/lookup/unit-options/:id", requireAdminKey, (req, res) => updateUnitOption(req, res));
router.delete("/admin/lookup/unit-options/:id", requireAdminKey, (req, res) => updateUnitOption(req, res, true));

/* -------------------------------------------------------------------------- */
/* Admin write — material categories                                           */
/* -------------------------------------------------------------------------- */

router.post(
  "/admin/lookup/material-categories",
  requireAdminKey,
  async (req, res) => {
    const {
      key, name_ar, name_en, parent_id, sort_order,
      regulatory_code, hazard_level, physical_state,
    } = req.body ?? {};
    
    const safeKey = validateKey(key);
    if (!safeKey) {
      res.status(400).json({ error: "ValidationError", message: "key is required and must be lowercase, alphanumeric, snake_case without spaces" });
      return;
    }
    const safeNameAr = validateName(name_ar);
    const safeNameEn = validateName(name_en);
    if (!safeNameAr || !safeNameEn) {
      res.status(400).json({ error: "ValidationError", message: "name_ar and name_en are required and cannot be empty" });
      return;
    }

    try {
      const [created] = await db
        .insert(materialCategoriesTable)
        .values({
          key: safeKey,
          name_ar: safeNameAr,
          name_en: safeNameEn,
          parent_id: parent_id ?? null,
          sort_order: typeof sort_order === "number" ? sort_order : 99,
          is_active: true,
          regulatory_code: regulatory_code ?? null,
          hazard_level: hazard_level ?? null,
          physical_state: physical_state ?? null,
        })
        .returning();

      void logAudit({
        action: "master_data.created",
        entityType: "master_data",
        entityId: created.id,
        actorRole: "admin",
        details: { list_type: "material_categories", key: safeKey, new_values: created }
      });
      res.status(201).json(created);
    } catch (err: any) {
      if (err.code === "23505") {
        res.status(409).json({ error: "Conflict", message: "key must be unique" });
        return;
      }
      res.status(500).json({ error: "InternalError", message: err.message });
    }
  },
);

async function updateMaterialCategory(req: Request, res: Response, forceDeactivate = false) {
  const id = String(req.params["id"]);
  const {
    name_ar, name_en, parent_id, sort_order, is_active,
    regulatory_code, hazard_level, physical_state
  } = req.body ?? {};

  const [existing] = await db.select().from(materialCategoriesTable).where(eq(materialCategoriesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "NotFound" }); return; }

  const targetIsActive = forceDeactivate ? false : (typeof is_active === "boolean" ? is_active : existing.is_active);

  if (targetIsActive === false && existing.is_active === true) {
    const [ref] = await db.select({ id: wasteListingsTable.id })
      .from(wasteListingsTable)
      .where(
        or(
          eq(wasteListingsTable.material_category_id, id),
          eq(wasteListingsTable.material_subcategory_id, id)
        )
      ).limit(1);
    if (ref) {
      res.status(409).json({ error: "CannotDeactivateReferencedOption", message: "Option is referenced by active listings" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (!forceDeactivate) {
    if (name_ar !== undefined) {
      const safeAr = validateName(name_ar);
      if (!safeAr) { res.status(400).json({ error: "ValidationError", message: "name_ar cannot be empty" }); return; }
      updates.name_ar = safeAr;
    }
    if (name_en !== undefined) {
      const safeEn = validateName(name_en);
      if (!safeEn) { res.status(400).json({ error: "ValidationError", message: "name_en cannot be empty" }); return; }
      updates.name_en = safeEn;
    }
    if (parent_id !== undefined) updates.parent_id = parent_id;
    if (typeof sort_order === "number") updates.sort_order = sort_order;
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (regulatory_code !== undefined) updates.regulatory_code = regulatory_code;
    if (hazard_level !== undefined) updates.hazard_level = hazard_level;
    if (physical_state !== undefined) updates.physical_state = physical_state;
  } else {
    updates.is_active = false;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "ValidationError", message: "No safe fields to update" });
    return;
  }

  const [updated] = await db
    .update(materialCategoriesTable)
    .set(updates)
    .where(eq(materialCategoriesTable.id, id))
    .returning();

  const actionType = (targetIsActive === false && existing.is_active === true) ? "master_data.deactivated" : "master_data.updated";

  void logAudit({
    action: actionType,
    entityType: "master_data",
    entityId: id,
    actorRole: "admin",
    details: { list_type: "material_categories", key: existing.key, previous_values: existing, new_values: updated }
  });

  res.json(updated);
}

router.patch("/admin/lookup/material-categories/:id", requireAdminKey, (req, res) => updateMaterialCategory(req, res));
router.put("/admin/lookup/material-categories/:id", requireAdminKey, (req, res) => updateMaterialCategory(req, res));
router.delete("/admin/lookup/material-categories/:id", requireAdminKey, (req, res) => updateMaterialCategory(req, res, true));

export default router;
