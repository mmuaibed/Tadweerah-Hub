/**
 * Company members management routes.
 *
 * All routes require an authenticated user who belongs to a company.
 * Only the owner can invite or remove members.
 *
 * Phase 1 constraints:
 * - A user can belong to exactly one company (UNIQUE on user_id in company_members).
 * - Members have the same operational access as owners.
 * - No route-level restrictions beyond owner-only for write operations here.
 */
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, companyMembersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

/**
 * GET /companies/members — list all members of the caller's company.
 */
router.get(
  "/companies/members",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    const rows = await db
      .select({
        user_id: companyMembersTable.user_id,
        role: companyMembersTable.role,
        created_at: companyMembersTable.created_at,
      })
      .from(companyMembersTable)
      .where(eq(companyMembersTable.company_id, company.id))
      .orderBy(companyMembersTable.created_at);

    res.json(rows.map((r) => ({
      user_id: r.user_id,
      role: r.role,
      created_at: r.created_at.toISOString(),
    })));
  },
);

/**
 * POST /companies/members — invite a user to join the caller's company.
 * Body: { user_id: string }  (Clerk user ID of the invitee)
 *
 * Restrictions:
 * - Only the owner can invite.
 * - The invitee must not already belong to any company.
 */
router.post(
  "/companies/members",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company, memberRole } = req as AuthedCompanyRequest;

    if (memberRole !== "owner") {
      throw new HttpError(403, "Forbidden", "Only the company owner can invite members");
    }

    const inviteeUserId =
      typeof req.body?.user_id === "string" ? req.body.user_id.trim() : "";

    if (!inviteeUserId) {
      throw new HttpError(400, "ValidationError", "user_id is required");
    }

    // Check the invitee is not already in a company
    const [existing] = await db
      .select({ company_id: companyMembersTable.company_id })
      .from(companyMembersTable)
      .where(eq(companyMembersTable.user_id, inviteeUserId))
      .limit(1);

    if (existing) {
      throw new HttpError(
        409,
        "AlreadyMember",
        "This user already belongs to a company",
      );
    }

    const [created] = await db
      .insert(companyMembersTable)
      .values({
        company_id: company.id,
        user_id: inviteeUserId,
        role: "member",
      })
      .returning();

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "company.member.invited",
      entityType: "company",
      entityId: company.id,
      details: { invitee_user_id: inviteeUserId },
    });

    res.status(201).json({
      user_id: created.user_id,
      role: created.role,
      created_at: created.created_at.toISOString(),
    });
  },
);

/**
 * DELETE /companies/members/:user_id — remove a member from the caller's company.
 *
 * Restrictions:
 * - Only the owner can remove members.
 * - The owner cannot remove themselves (use company deletion for that).
 */
router.delete(
  "/companies/members/:user_id",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company, memberRole, userId } = req as AuthedCompanyRequest;

    if (memberRole !== "owner") {
      throw new HttpError(403, "Forbidden", "Only the company owner can remove members");
    }

    const targetUserId = String(req.params["user_id"]).trim();

    if (targetUserId === userId) {
      throw new HttpError(
        400,
        "CannotRemoveSelf",
        "The owner cannot remove themselves from the company",
      );
    }

    // Check the target is actually a member of this company
    const [found] = await db
      .select({ role: companyMembersTable.role })
      .from(companyMembersTable)
      .where(
        and(
          eq(companyMembersTable.company_id, company.id),
          eq(companyMembersTable.user_id, targetUserId),
        ),
      )
      .limit(1);

    if (!found) {
      throw new HttpError(404, "NotFound", "Member not found in this company");
    }

    await db
      .delete(companyMembersTable)
      .where(
        and(
          eq(companyMembersTable.company_id, company.id),
          eq(companyMembersTable.user_id, targetUserId),
        ),
      );

    void logAudit({
      userId,
      companyId: company.id,
      action: "company.member.removed",
      entityType: "company",
      entityId: company.id,
      details: { removed_user_id: targetUserId },
    });

    res.json({ success: true });
  },
);

export default router;
