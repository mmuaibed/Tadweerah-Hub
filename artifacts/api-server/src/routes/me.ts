import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import {
  db,
  companiesTable,
  companyMembersTable,
  companyRolesTable,
  companyInvitationsTable,
} from "@workspace/db";
import { and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { computeCompanyLicenseValidity } from "../lib/license-validity";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  let email: string | undefined;
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;
    if (clerkUserId) {
      const user = await clerkClient.users.getUser(clerkUserId);
      // Prefer primary email address, fallback to first available
      email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
        user.emailAddresses[0]?.emailAddress;
        
      if (email) {
        req.log.info({ userId, email }, "resolved primary email for auto-claim check");
      } else {
        req.log.warn({ userId }, "no email address found on clerk user profile");
      }
    }
  } catch (err) {
    req.log.warn({ err: err instanceof Error ? err.message : String(err), userId }, "failed to fetch clerk user email");
  }

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    // Attempt auto-claim if they have a pending invite and no active membership
    const [existingMembership] = await db
      .select({ id: companyMembersTable.company_id })
      .from(companyMembersTable)
      .where(eq(companyMembersTable.user_id, userId))
      .limit(1);

    if (!existingMembership) {
      // Find a pending invitation
      const [invite] = await db
        .select({ id: companyInvitationsTable.id, company_id: companyInvitationsTable.company_id, role: companyInvitationsTable.role })
        .from(companyInvitationsTable)
        .where(
          and(
            eq(companyInvitationsTable.email, normalizedEmail),
            eq(companyInvitationsTable.status, "pending")
          )
        )
        .limit(1);

      if (invite) {
        req.log.info(
          { userId, email: normalizedEmail, invitationId: invite.id, companyId: invite.company_id },
          "pending invitation found, attempting auto-claim"
        );
        try {
          await db.transaction(async (tx) => {
            await tx.insert(companyMembersTable).values({
              company_id: invite.company_id,
              user_id: userId,
              role: invite.role,
            });
            await tx
              .update(companyInvitationsTable)
              .set({ status: "accepted", accepted_at: new Date() })
              .where(eq(companyInvitationsTable.id, invite.id));
          });
          req.log.info({ userId, companyId: invite.company_id, invitationId: invite.id }, "auto-claim transaction successful");
        } catch (err) {
          req.log.error(
            { err: err instanceof Error ? err.message : String(err), userId, invitationId: invite.id },
            "failed to auto-claim invitation transaction"
          );
        }
      } else {
        req.log.info({ userId, email: normalizedEmail }, "no pending invitation found for email");
      }
    } else {
      req.log.info({ userId }, "user already has a company membership, skipping auto-claim check");
    }
  }

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
      licenses_json: companiesTable.licenses_json,
      company_category_id: companiesTable.company_category_id,
      accepted_terms_at: companiesTable.accepted_terms_at,
      createdAt: companiesTable.createdAt,
      role: companyMembersTable.role,
    })
    .from(companyMembersTable)
    .innerJoin(companiesTable, eq(companiesTable.id, companyMembersTable.company_id))
    .where(eq(companyMembersTable.user_id, userId))
    .limit(1);

  let company = null;
  if (membership) {
    // Fetch multi-roles from junction table
    const roleRows = await db
      .select({ role: companyRolesTable.role })
      .from(companyRolesTable)
      .where(eq(companyRolesTable.company_id, membership.id));

    // Derive roles: prefer junction table (MWAN values); fall back to legacy type
    const LEGACY_TO_MWAN: Record<string, string> = {
      producer: "generator",
      buyer: "receiver",
      carrier: "transporter",
    };
    const roles: string[] = roleRows.length > 0
      ? roleRows.map((r) => r.role)
      : membership.type
        ? [LEGACY_TO_MWAN[membership.type] ?? membership.type]
        : [];

    company = {
      id: membership.id,
      name: membership.name,
      type: membership.type ?? undefined,
      roles,
      city: membership.city,
      commercialRegistration: membership.commercialRegistration ?? undefined,
      contactPhone: membership.contactPhone,
      license_number: membership.license_number ?? undefined,
      license_status: membership.license_status ?? undefined,
      license_validity: computeCompanyLicenseValidity(membership.licenses_json),
      company_category_id: membership.company_category_id ?? undefined,
      accepted_terms_at: membership.accepted_terms_at?.toISOString() ?? undefined,
      role: membership.role,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  res.json({ userId, email, company });
});

export default router;
