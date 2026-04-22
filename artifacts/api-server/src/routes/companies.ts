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

  const [created] = await db
    .insert(companiesTable)
    .values({
      ownerUserId: userId,
      name: parsed.data.name,
      type: parsed.data.type,
      city: parsed.data.city,
      commercialRegistration: parsed.data.commercialRegistration ?? null,
      contactPhone: parsed.data.contactPhone,
    })
    .returning();

  res.status(201).json({
    id: created.id,
    name: created.name,
    type: created.type,
    city: created.city,
    commercialRegistration: created.commercialRegistration ?? undefined,
    contactPhone: created.contactPhone,
    createdAt: created.createdAt.toISOString(),
  });
});

export default router;
