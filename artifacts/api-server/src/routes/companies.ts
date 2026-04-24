import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  companiesTable,
  capabilitiesTable,
  companyCapabilitiesTable,
} from "@workspace/db";
import { CreateCompanyBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";

const router: IRouter = Router();

router.post("/companies", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "ValidationError",
      details: parsed.error.issues,
    });
    return;
  }

  const existing = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.ownerUserId, userId))
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

  const acceptedTerms = req.body?.accepted_terms === true || req.body?.accepted_terms === "true";

  const [created] = await db
    .insert(companiesTable)
    .values({
      ownerUserId: userId,
      name: parsed.data.name,
      type: parsed.data.type,
      city: parsed.data.city,
      commercialRegistration: parsed.data.commercialRegistration ?? null,
      contactPhone: parsed.data.contactPhone,
      license_number: licenseNumber,
      company_category_id: companyCategoryId,
      license_status: licenseNumber ? "pending" : null,
      accepted_terms_at: acceptedTerms ? new Date() : null,
    })
    .returning();

  res.status(201).json({
    id: created.id,
    name: created.name,
    type: created.type,
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
    res.json(rows);
  },
);

export default router;
