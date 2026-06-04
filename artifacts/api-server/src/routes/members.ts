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
import { clerkClient } from "@clerk/express";
import { db, companyMembersTable, companyInvitationsTable, companiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { HttpError, assertUuid } from "../middlewares/errorHandler";
import { logAudit } from "../lib/audit";
import { sendEmail } from "../lib/email";

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

    const members = await db
      .select({
        user_id: companyMembersTable.user_id,
        role: companyMembersTable.role,
        created_at: companyMembersTable.created_at,
      })
      .from(companyMembersTable)
      .where(eq(companyMembersTable.company_id, company.id))
      .orderBy(companyMembersTable.created_at);

    const invites = await db
      .select({
        id: companyInvitationsTable.id,
        email: companyInvitationsTable.email,
        role: companyInvitationsTable.role,
        status: companyInvitationsTable.status,
        created_at: companyInvitationsTable.created_at,
      })
      .from(companyInvitationsTable)
      .where(
        and(
          eq(companyInvitationsTable.company_id, company.id),
          eq(companyInvitationsTable.status, "pending")
        )
      )
      .orderBy(companyInvitationsTable.created_at);

    const userIds = members.map((m) => m.user_id);
    const emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ userId: userIds });
        for (const u of clerkUsers.data) {
          const email =
            u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ||
            u.emailAddresses[0]?.emailAddress;
          if (email) {
            emailMap.set(u.id, email);
          }
        }
      } catch (err) {
        req.log.error({ err }, "Failed to fetch user emails from Clerk");
      }
    }

    const result = [
      ...members.map((r) => ({
        user_id: r.user_id,
        email: emailMap.get(r.user_id),
        role: r.role,
        is_pending: false,
        created_at: r.created_at.toISOString(),
      })),
      ...invites.map((r) => ({
        user_id: undefined,
        invitation_id: r.id,
        email: r.email,
        role: r.role,
        is_pending: true,
        created_at: r.created_at.toISOString(),
      })),
    ];

    res.json(result);
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

    const inviteeEmail =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!inviteeEmail) {
      throw new HttpError(400, "ValidationError", "email is required");
    }

    // Look up the user in Clerk by email to see if they already exist
    const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [inviteeEmail] });
    if (clerkUsers.data.length > 0) {
      const targetUserId = clerkUsers.data[0].id;
      
      // Prevent owner from inviting themselves implicitly by this check
      const [existingMember] = await db
        .select({ company_id: companyMembersTable.company_id })
        .from(companyMembersTable)
        .where(eq(companyMembersTable.user_id, targetUserId))
        .limit(1);

      if (existingMember) {
        throw new HttpError(
          409,
          "AlreadyMember",
          "This user already belongs to a company"
        );
      }
    }

    // Check if there is already a pending invitation for this exact email in this company
    const [existingInvite] = await db
      .select({ id: companyInvitationsTable.id })
      .from(companyInvitationsTable)
      .where(
        and(
          eq(companyInvitationsTable.company_id, company.id),
          eq(companyInvitationsTable.email, inviteeEmail),
          eq(companyInvitationsTable.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite) {
      throw new HttpError(
        409,
        "AlreadyInvited",
        "There is already a pending invitation for this email"
      );
    }

    // NOTE: Ideally we check `company_members` to see if they are already a member, 
    // but `company_members` uses `user_id`, not email. The auto-claim will fail safely if they are already in a company.
    
    const [created] = await db
      .insert(companyInvitationsTable)
      .values({
        company_id: company.id,
        email: inviteeEmail,
        role: "member",
        invited_by: (req as AuthedCompanyRequest).userId,
      })
      .returning();

    void logAudit({
      userId: (req as AuthedCompanyRequest).userId,
      companyId: company.id,
      action: "company.member.invited",
      entityType: "company",
      entityId: company.id,
      details: { invitee_email: inviteeEmail, invitation_id: created.id },
    });

    // Send invitation email using existing Resend utility
    void sendEmail({
      to: inviteeEmail,
      title_ar: `دعوة للانضمام إلى ${company.name}`,
      title_en: `Invitation to join ${company.name}`,
      body_ar: `لقد تمت دعوتك للانضمام إلى شركة "${company.name}" في منصة تدويرة. قم بإنشاء حسابك أو تسجيل الدخول لقبول الدعوة.`,
      body_en: `You have been invited to join "${company.name}" on Tadweerah. Create an account or sign in to accept the invitation.`,
      actionUrl: "https://staging.tadweerah.com/sign-up?invited=1",
      actionText_ar: "قبول الدعوة",
      actionText_en: "Accept Invitation",
    }).catch(err => {
      req.log.warn({ err, email: inviteeEmail }, "failed to send invitation email");
    });

    res.status(201).json({
      invitation_id: created.id,
      email: created.email,
      role: created.role,
      is_pending: true,
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

    // Is it an invitation cancellation? UUID check
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);
    if (isUuid) {
      const [invite] = await db
        .select({ id: companyInvitationsTable.id })
        .from(companyInvitationsTable)
        .where(
          and(
            eq(companyInvitationsTable.id, targetUserId),
            eq(companyInvitationsTable.company_id, company.id),
            eq(companyInvitationsTable.status, "pending")
          )
        )
        .limit(1);
      
      if (invite) {
        await db
          .update(companyInvitationsTable)
          .set({ status: "cancelled", cancelled_at: new Date() })
          .where(eq(companyInvitationsTable.id, targetUserId));
          
        res.json({ success: true, cancelled: true });
        return;
      }
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
      throw new HttpError(404, "NotFound", "Member or invitation not found");
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

/**
 * GET /invitations/:id — public endpoint to fetch basic invitation details.
 * Used by the invite landing page to show company name and invited email.
 */
router.get("/invitations/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, "InvalidId", "Invalid invitation ID format");
  }

  const [invite] = await db
    .select({
      id: companyInvitationsTable.id,
      email: companyInvitationsTable.email,
      status: companyInvitationsTable.status,
      companyName: companiesTable.name,
    })
    .from(companyInvitationsTable)
    .innerJoin(companiesTable, eq(companyInvitationsTable.company_id, companiesTable.id))
    .where(eq(companyInvitationsTable.id, id))
    .limit(1);

  if (!invite || invite.status !== "pending") {
    throw new HttpError(404, "NotFound", "Invitation not found or no longer pending");
  }

  res.json({
    id: invite.id,
    email: invite.email,
    status: invite.status,
    companyName: invite.companyName,
  });
});

export default router;
