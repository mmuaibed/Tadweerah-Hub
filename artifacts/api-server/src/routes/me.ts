import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import { db, companiesTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  let email: string | undefined;
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    if (clerkUserId) {
      const user = await clerkClient.users.getUser(clerkUserId);
      email = user.emailAddresses[0]?.emailAddress;
    }
  } catch (err) {
    req.log.warn({ err }, "failed to fetch clerk user email");
  }

  const rows = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.ownerUserId, userId))
    .limit(1);

  const company = rows[0]
    ? {
        id: rows[0].id,
        name: rows[0].name,
        type: rows[0].type,
        city: rows[0].city,
        commercialRegistration: rows[0].commercialRegistration ?? undefined,
        contactPhone: rows[0].contactPhone,
        createdAt: rows[0].createdAt.toISOString(),
      }
    : null;

  res.json({ userId, email, company });
});

export default router;
