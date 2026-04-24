import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { CreateCompanyBody } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

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

  // Extract optional new fields from body (not in generated schema yet)
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

export default router;
