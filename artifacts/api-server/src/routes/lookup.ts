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
 * DELETE /admin/lookup/company-categories/:id   (sets is_active=false)
 * POST   /admin/lookup/unit-options
 * PUT    /admin/lookup/unit-options/:id
 * DELETE /admin/lookup/unit-options/:id
 * POST   /admin/lookup/material-categories
 * PUT    /admin/lookup/material-categories/:id
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
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany } from "../middlewares/requireCompany";

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
/* Admin write — company categories                                            */
/* -------------------------------------------------------------------------- */

router.post(
  "/admin/lookup/company-categories",
  requireAdminKey,
  async (req, res) => {
    const { key, name_ar, name_en, sort_order } = req.body ?? {};
    if (!key || !name_ar || !name_en) {
      res.status(400).json({ error: "ValidationError", message: "key, name_ar, name_en are required" });
      return;
    }
    const [created] = await db
      .insert(companyCategoriesTable)
      .values({
        key,
        name_ar,
        name_en,
        sort_order: typeof sort_order === "number" ? sort_order : 99,
        is_active: true,
      })
      .returning();
    res.status(201).json(created);
  },
);

router.put(
  "/admin/lookup/company-categories/:id",
  requireAdminKey,
  async (req, res) => {
    const id = String(req.params["id"]);
    const { key, name_ar, name_en, sort_order, is_active } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (key !== undefined) updates.key = key;
    if (name_ar !== undefined) updates.name_ar = name_ar;
    if (name_en !== undefined) updates.name_en = name_en;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(companyCategoriesTable)
      .set(updates)
      .where(eq(companyCategoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(updated);
  },
);

router.delete(
  "/admin/lookup/company-categories/:id",
  requireAdminKey,
  async (req, res) => {
    const id = String(req.params["id"]);
    const [updated] = await db
      .update(companyCategoriesTable)
      .set({ is_active: false })
      .where(eq(companyCategoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json({ success: true, id: updated.id });
  },
);

/* -------------------------------------------------------------------------- */
/* Admin write — unit options                                                   */
/* -------------------------------------------------------------------------- */

router.post(
  "/admin/lookup/unit-options",
  requireAdminKey,
  async (req, res) => {
    const { key, name_ar, name_en, symbol, sort_order } = req.body ?? {};
    if (!key || !name_ar || !name_en || !symbol) {
      res.status(400).json({ error: "ValidationError", message: "key, name_ar, name_en, symbol are required" });
      return;
    }
    const [created] = await db
      .insert(unitOptionsTable)
      .values({
        key,
        name_ar,
        name_en,
        symbol,
        sort_order: typeof sort_order === "number" ? sort_order : 99,
        is_active: true,
      })
      .returning();
    res.status(201).json(created);
  },
);

router.put(
  "/admin/lookup/unit-options/:id",
  requireAdminKey,
  async (req, res) => {
    const id = String(req.params["id"]);
    const { key, name_ar, name_en, symbol, sort_order, is_active } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (key !== undefined) updates.key = key;
    if (name_ar !== undefined) updates.name_ar = name_ar;
    if (name_en !== undefined) updates.name_en = name_en;
    if (symbol !== undefined) updates.symbol = symbol;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(unitOptionsTable)
      .set(updates)
      .where(eq(unitOptionsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(updated);
  },
);

router.delete(
  "/admin/lookup/unit-options/:id",
  requireAdminKey,
  async (req, res) => {
    const id = String(req.params["id"]);
    const [updated] = await db
      .update(unitOptionsTable)
      .set({ is_active: false })
      .where(eq(unitOptionsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json({ success: true, id: updated.id });
  },
);

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
    if (!key || !name_ar || !name_en) {
      res.status(400).json({ error: "ValidationError", message: "key, name_ar, name_en are required" });
      return;
    }
    const [created] = await db
      .insert(materialCategoriesTable)
      .values({
        key,
        name_ar,
        name_en,
        parent_id: parent_id ?? null,
        sort_order: typeof sort_order === "number" ? sort_order : 99,
        is_active: true,
        regulatory_code: regulatory_code ?? null,
        hazard_level: hazard_level ?? null,
        physical_state: physical_state ?? null,
      })
      .returning();
    res.status(201).json(created);
  },
);

router.put(
  "/admin/lookup/material-categories/:id",
  requireAdminKey,
  async (req, res) => {
    const id = String(req.params["id"]);
    const {
      key, name_ar, name_en, parent_id, sort_order, is_active,
      regulatory_code, hazard_level, physical_state,
    } = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if (key !== undefined) updates.key = key;
    if (name_ar !== undefined) updates.name_ar = name_ar;
    if (name_en !== undefined) updates.name_en = name_en;
    if (parent_id !== undefined) updates.parent_id = parent_id;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;
    if (regulatory_code !== undefined) updates.regulatory_code = regulatory_code;
    if (hazard_level !== undefined) updates.hazard_level = hazard_level;
    if (physical_state !== undefined) updates.physical_state = physical_state;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(materialCategoriesTable)
      .set(updates)
      .where(eq(materialCategoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(updated);
  },
);

router.delete(
  "/admin/lookup/material-categories/:id",
  requireAdminKey,
  async (req, res) => {
    const id = String(req.params["id"]);
    const [updated] = await db
      .update(materialCategoriesTable)
      .set({ is_active: false })
      .where(eq(materialCategoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json({ success: true, id: updated.id });
  },
);

export default router;
