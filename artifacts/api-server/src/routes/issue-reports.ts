import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  issueReportsTable,
  companyMembersTable,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { sendSupportNotification } from "../lib/email";
import { clerkClient } from "@clerk/express";
import type { Request, Response } from "express";

const router: IRouter = Router();

/**
 * POST /issue-reports
 * Auth required; company membership and user info are resolved automatically (best-effort).
 * Body: { message: string, subject?: string, phone?: string }
 */
router.post(
  "/issue-reports",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).userId;

    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const subject =
      typeof req.body?.subject === "string" ? req.body.subject.trim() : null;
    const phone =
      typeof req.body?.phone === "string" ? req.body.phone.trim() || null : null;

    if (!message || message.length < 5) {
      res.status(400).json({
        error: "ValidationError",
        message: "message must be at least 5 characters",
      });
      return;
    }
    if (message.length > 2000) {
      res.status(400).json({
        error: "ValidationError",
        message: "message must not exceed 2000 characters",
      });
      return;
    }

    // Best-effort: resolve reporter's company
    let companyId: string | null = null;
    try {
      const [membership] = await db
        .select({ company_id: companyMembersTable.company_id })
        .from(companyMembersTable)
        .where(eq(companyMembersTable.user_id, userId))
        .limit(1);
      companyId = membership?.company_id ?? null;
    } catch {
      // proceed without company_id
    }

    // Best-effort: resolve user display name and email from Clerk
    let userName: string | null = null;
    let userEmail: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      userName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null;
      userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? null;
    } catch {
      // proceed without user details
    }

    const [report] = await db
      .insert(issueReportsTable)
      .values({
        user_id: userId,
        company_id: companyId,
        message,
        subject: subject || null,
        phone,
        user_name: userName,
        user_email: userEmail,
      })
      .returning({ id: issueReportsTable.id, status: issueReportsTable.status });

    // Await support notification email
    const success = await sendSupportNotification({
      reportId: report.id,
      userId,
      companyId,
      message,
      subject: subject || null,
      phone,
      userName,
      userEmail,
    });

    if (!success) {
      res.status(500).json({ error: "EmailDeliveryFailed", message: "Failed to send support email" });
      return;
    }

    res.status(201).json({ id: report.id, status: report.status });
  },
);

export default router;
