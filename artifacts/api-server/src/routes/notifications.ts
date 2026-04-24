/**
 * Notification routes.
 *
 * GET  /notifications          — list company's notifications (newest first)
 * PATCH /notifications/:id/read — mark one notification as read
 * POST /notifications/read-all  — mark all company notifications as read
 */
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireCompany,
  type AuthedCompanyRequest,
} from "../middlewares/requireCompany";
import { assertUuid } from "../middlewares/errorHandler";

const router: IRouter = Router();

function serializeNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    company_id: n.company_id,
    type: n.type,
    title_ar: n.title_ar,
    title_en: n.title_en,
    body_ar: n.body_ar ?? undefined,
    body_en: n.body_en ?? undefined,
    is_read: n.is_read,
    related_entity_type: n.related_entity_type ?? undefined,
    related_entity_id: n.related_entity_id ?? undefined,
    created_at: n.created_at.toISOString(),
    read_at: n.read_at?.toISOString() ?? undefined,
  };
}

/**
 * GET /notifications
 * Returns the company's notifications, newest first.
 * Optional query: ?unread=true to filter to unread only.
 */
router.get(
  "/notifications",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const unreadOnly = req.query.unread === "true";

    const conditions = [eq(notificationsTable.company_id, company.id)];
    if (unreadOnly) {
      conditions.push(eq(notificationsTable.is_read, false));
    }

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.created_at))
      .limit(100);

    res.json(rows.map(serializeNotification));
  },
);

/**
 * PATCH /notifications/:notification_id/read
 * Marks a single notification as read.
 */
router.patch(
  "/notifications/:notification_id/read",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const notifId = assertUuid(req.params.notification_id, "notification_id");
    const { company } = req as AuthedCompanyRequest;

    const [notif] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notifId),
          eq(notificationsTable.company_id, company.id),
        ),
      )
      .limit(1);

    if (!notif) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notif.is_read) {
      return res.json(serializeNotification(notif));
    }

    const now = new Date();
    const [updated] = await db
      .update(notificationsTable)
      .set({ is_read: true, read_at: now })
      .where(eq(notificationsTable.id, notifId))
      .returning();

    return res.json(serializeNotification(updated));
  },
);

/**
 * POST /notifications/read-all
 * Marks all of the company's unread notifications as read.
 */
router.post(
  "/notifications/read-all",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const now = new Date();

    await db
      .update(notificationsTable)
      .set({ is_read: true, read_at: now })
      .where(
        and(
          eq(notificationsTable.company_id, company.id),
          eq(notificationsTable.is_read, false),
        ),
      );

    res.json({ ok: true });
  },
);

export default router;
