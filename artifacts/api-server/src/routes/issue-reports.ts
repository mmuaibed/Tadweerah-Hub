import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  issueReportsTable,
  companyMembersTable,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";
import { sendSupportNotification } from "../lib/email";

const router: IRouter = Router();

/**
 * POST /issue-reports
 * Auth required; company membership is resolved automatically (best-effort).
 * Body: { message: string }
 */
router.post(
  "/issue-reports",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).userId;

    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";

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

    const [report] = await db
      .insert(issueReportsTable)
      .values({ user_id: userId, company_id: companyId, message })
      .returning({ id: issueReportsTable.id, status: issueReportsTable.status });

    // Fire-and-forget support notification email
    void sendSupportNotification({
      reportId: report.id,
      userId,
      companyId,
      message,
    });

    res.status(201).json({ id: report.id, status: report.status });
  },
);

export default router;
