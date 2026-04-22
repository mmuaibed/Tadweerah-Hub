import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  companiesTable,
  wasteListingsTable,
  type WasteListing,
} from "@workspace/db";
import { CreateWasteListingBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";

const router: IRouter = Router();

type Row = WasteListing & { company_name: string };

function serialize(row: Row) {
  return {
    id: row.id,
    company_id: row.company_id,
    company_name: row.company_name,
    material: row.material,
    quantity: Number(row.quantity),
    unit: row.unit,
    city: row.city,
    description: row.description ?? undefined,
    price_hint: row.price_hint != null ? Number(row.price_hint) : undefined,
    status: row.status,
    created_at: row.created_at.toISOString(),
  };
}

const baseSelect = {
  id: wasteListingsTable.id,
  company_id: wasteListingsTable.company_id,
  material: wasteListingsTable.material,
  quantity: wasteListingsTable.quantity,
  unit: wasteListingsTable.unit,
  city: wasteListingsTable.city,
  description: wasteListingsTable.description,
  price_hint: wasteListingsTable.price_hint,
  status: wasteListingsTable.status,
  created_at: wasteListingsTable.created_at,
  company_name: companiesTable.name,
} as const;

/**
 * GET /listings — public marketplace (buyers only).
 * Producers and carriers should not browse the buyer marketplace.
 */
router.get(
  "/listings",
  requireAuth,
  requireCompany(["buyer"]),
  async (req, res) => {
    const material = typeof req.query.material === "string" ? req.query.material : undefined;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;

    const conditions = [eq(wasteListingsTable.status, "open")];
    if (material) {
      conditions.push(eq(wasteListingsTable.material, material as WasteListing["material"]));
    }
    if (city) {
      conditions.push(eq(wasteListingsTable.city, city));
    }

    const rows = await db
      .select(baseSelect)
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .where(and(...conditions))
      .orderBy(desc(wasteListingsTable.created_at))
      .limit(200);

    res.json(rows.map(serialize));
  },
);

/**
 * GET /listings/mine — current producer's own listings.
 */
router.get(
  "/listings/mine",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const rows = await db
      .select(baseSelect)
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .where(eq(wasteListingsTable.company_id, company.id))
      .orderBy(desc(wasteListingsTable.created_at));

    res.json(rows.map(serialize));
  },
);

/**
 * POST /listings — producer creates a new waste listing.
 */
router.post(
  "/listings",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const parsed = CreateWasteListingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ValidationError", details: parsed.error.issues });
      return;
    }
    const { company } = req as AuthedCompanyRequest;
    const data = parsed.data;

    const [created] = await db
      .insert(wasteListingsTable)
      .values({
        company_id: company.id,
        material: data.material,
        quantity: String(data.quantity),
        unit: data.unit,
        city: data.city,
        description: data.description ?? null,
        price_hint: data.price_hint != null ? String(data.price_hint) : null,
      })
      .returning();

    res.status(201).json(
      serialize({ ...created, company_name: company.name }),
    );
  },
);

/**
 * GET /listings/:waste_listing_id — single listing detail.
 * Any authenticated user with a company can view.
 */
router.get(
  "/listings/:waste_listing_id",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const id = String(req.params.waste_listing_id);
    const rows = await db
      .select(baseSelect)
      .from(wasteListingsTable)
      .innerJoin(companiesTable, eq(companiesTable.id, wasteListingsTable.company_id))
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(serialize(rows[0]));
  },
);

/**
 * POST /listings/:waste_listing_id/close — owner producer closes a listing.
 */
router.post(
  "/listings/:waste_listing_id/close",
  requireAuth,
  requireCompany(["producer"]),
  async (req, res) => {
    const id = String(req.params.waste_listing_id);
    const { company } = req as AuthedCompanyRequest;

    const [existing] = await db
      .select()
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (existing.company_id !== company.id) {
      res.status(403).json({ error: "Not the owner of this listing" });
      return;
    }

    const [updated] = await db
      .update(wasteListingsTable)
      .set({ status: "closed" })
      .where(eq(wasteListingsTable.id, id))
      .returning();

    res.json(serialize({ ...updated, company_name: company.name }));
  },
);

export default router;
