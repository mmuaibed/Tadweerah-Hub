import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import { db, companiesTable, companyMembersTable } from "@workspace/db";
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

  // Look up company via company_members (works for both owners and invited members).
  const [membership] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      type: companiesTable.type,
      city: companiesTable.city,
      commercialRegistration: companiesTable.commercialRegistration,
      contactPhone: companiesTable.contactPhone,
      license_number: companiesTable.license_number,
      license_status: companiesTable.license_status,
      company_category_id: companiesTable.company_category_id,
      accepted_terms_at: companiesTable.accepted_terms_at,
      createdAt: companiesTable.createdAt,
      role: companyMembersTable.role,
    })
    .from(companyMembersTable)
    .innerJoin(companiesTable, eq(companiesTable.id, companyMembersTable.company_id))
    .where(eq(companyMembersTable.user_id, userId))
    .limit(1);

  const company = membership
    ? {
        id: membership.id,
        name: membership.name,
        type: membership.type ?? undefined,
        city: membership.city,
        commercialRegistration: membership.commercialRegistration ?? undefined,
        contactPhone: membership.contactPhone,
        license_number: membership.license_number ?? undefined,
        license_status: membership.license_status ?? undefined,
        company_category_id: membership.company_category_id ?? undefined,
        accepted_terms_at: membership.accepted_terms_at?.toISOString() ?? undefined,
        role: membership.role,
        createdAt: membership.createdAt.toISOString(),
      }
    : null;

  res.json({ userId, email, company });
});

export default router;
