/**
 * GET /lookup/company-categories
 * GET /lookup/unit-options
 * GET /lookup/material-categories
 *
 * Public read-only endpoints returning admin-managed classification data.
 * Any authenticated company user can read. Only admins can write (out of scope for MVP).
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  companyCategoriesTable,
  unitOptionsTable,
  materialCategoriesTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany } from "../middlewares/requireCompany";

const router = Router();

router.get(
  "/lookup/company-categories",
  requireAuth,
  requireCompany(),
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

export default router;
