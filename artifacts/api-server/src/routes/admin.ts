/**
 * Admin-only routes protected by X-Admin-Key header.
 *
 * GET    /admin/companies?q=&licenseStatus=&limit=50&offset=0
 * PATCH  /admin/companies/:id/license
 * GET    /admin/issue-reports?status=open&limit=50&offset=0
 * PATCH  /admin/issue-reports/:id
 * GET    /admin/audit-log?entityType=&entityId=&action=&limit=100&offset=0
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import {
  db,
  companiesTable,
  issueReportsTable,
  auditLogTable,
  dealsTable,
} from "@workspace/db";
import { logAudit } from "../lib/audit";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Admin key guard                                                              */
/* -------------------------------------------------------------------------- */
function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "AdminNotConfigured", message: "Admin API key is not configured" });
    return;
  }
  if (req.headers["x-admin-key"] !== adminKey) {
    void logAudit({
      action: "admin.unauthorized_attempt",
      details: {
        path: req.path,
        ip: req.ip,
        method: req.method,
      },
    });
    res.status(401).json({ error: "Unauthorized", message: "Invalid or missing X-Admin-Key header" });
    return;
  }
  next();
}

/* -------------------------------------------------------------------------- */
/* Companies                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/companies
 * Query params: q (name search), licenseStatus, limit (default 50), offset (default 0)
 */
router.get("/admin/companies", requireAdminKey, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : null;
  const licenseStatus = typeof req.query.licenseStatus === "string" ? req.query.licenseStatus : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (q) {
    conditions.push(ilike(companiesTable.name, `%${q}%`));
  }
  if (licenseStatus) {
    if (licenseStatus === "null") {
      conditions.push(isNull(companiesTable.license_status));
    } else {
      conditions.push(
        eq(
          companiesTable.license_status,
          licenseStatus as "pending" | "approved" | "rejected" | "expired",
        ),
      );
    }
  }

  const rows = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      city: companiesTable.city,
      contactPhone: companiesTable.contactPhone,
      license_number: companiesTable.license_number,
      license_status: companiesTable.license_status,
      createdAt: companiesTable.createdAt,
    })
    .from(companiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(companiesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/**
 * PATCH /admin/companies/:id/license
 * Body: { license_status: "approved" | "rejected" | "expired", reason?: string }
 */
router.patch("/admin/companies/:id/license", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);
  const { license_status, reason } = req.body ?? {};

  const VALID = ["pending", "approved", "rejected", "expired"];
  if (!license_status || !VALID.includes(license_status)) {
    res.status(400).json({
      error: "ValidationError",
      message: `license_status must be one of: ${VALID.join(", ")}`,
    });
    return;
  }

  const [updated] = await db
    .update(companiesTable)
    .set({ license_status })
    .where(eq(companiesTable.id, id))
    .returning({
      id: companiesTable.id,
      name: companiesTable.name,
      license_number: companiesTable.license_number,
      license_status: companiesTable.license_status,
    });

  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Company not found" });
    return;
  }

  void logAudit({
    action: "company.license_updated",
    entityType: "company",
    entityId: id,
    details: { license_status, reason: reason ?? null },
  });

  res.json(updated);
});

/* -------------------------------------------------------------------------- */
/* Issue reports                                                               */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/issue-reports
 * Query params: status (open|resolved), limit, offset
 */
router.get("/admin/issue-reports", requireAdminKey, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (status) conditions.push(eq(issueReportsTable.status, status));

  const rows = await db
    .select()
    .from(issueReportsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(issueReportsTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/**
 * PATCH /admin/issue-reports/:id
 * Body: { status: "open" | "resolved" }
 */
router.patch("/admin/issue-reports/:id", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);
  const { status } = req.body ?? {};

  if (!status || !["open", "resolved"].includes(status)) {
    res.status(400).json({
      error: "ValidationError",
      message: "status must be 'open' or 'resolved'",
    });
    return;
  }

  const [updated] = await db
    .update(issueReportsTable)
    .set({ status })
    .where(eq(issueReportsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Issue report not found" });
    return;
  }

  void logAudit({
    action: "issue_report.status_updated",
    entityType: "issue_report",
    entityId: id,
    details: { status },
  });

  res.json(updated);
});

/**
 * PATCH /admin/companies/:id/unblock-offers
 * Clears offer_submission_blocked and resets receipt_failures_count for the company.
 * Used when admin manually reviews and reinstates a blocked buyer.
 */
router.patch("/admin/companies/:id/unblock-offers", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);

  const [updated] = await db
    .update(companiesTable)
    .set({
      offer_submission_blocked: false,
      receipt_failures_count: 0,
    })
    .where(eq(companiesTable.id, id))
    .returning({
      id: companiesTable.id,
      name: companiesTable.name,
      offer_submission_blocked: companiesTable.offer_submission_blocked,
      receipt_failures_count: companiesTable.receipt_failures_count,
    });

  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Company not found" });
    return;
  }

  void logAudit({
    action: "company.offer_submission_unblocked",
    entityType: "company",
    entityId: id,
    details: { unblocked_by: "admin" },
    severity: "warn",
  });

  res.json(updated);
});

/* -------------------------------------------------------------------------- */
/* Deals (admin)                                                               */
/* -------------------------------------------------------------------------- */

/**
 * POST /admin/deals/:id/cancel
 * Admin can cancel any deal that has not yet been dispatched, completed, or already cancelled.
 * Body: { reason?: string }
 */
router.post("/admin/deals/:id/cancel", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);
  const { reason } = req.body ?? {};

  const [deal] = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.id, id))
    .limit(1);

  if (!deal) {
    res.status(404).json({ error: "NotFound", message: "Deal not found" });
    return;
  }

  if (!["active", "payment_confirmed"].includes(deal.status)) {
    res.status(409).json({
      error: "InvalidState",
      message: `Deal cannot be cancelled from status '${deal.status}'. Only active or payment_confirmed deals can be admin-cancelled.`,
    });
    return;
  }

  const now = new Date();

  const [updated] = await db
    .update(dealsTable)
    .set({ status: "cancelled", cancelled_at: now, updated_at: now })
    .where(eq(dealsTable.id, id))
    .returning();

  void logAudit({
    action: "deal.cancelled_by_admin",
    entityType: "deal",
    entityId: id,
    details: { reason: reason ?? null, cancelled_from_status: deal.status },
    severity: "warn",
  });

  res.json(updated);
});

/* -------------------------------------------------------------------------- */
/* Audit log                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/audit-log
 * Query params: entityType, entityId, action, limit (default 100, max 500), offset
 */
router.get("/admin/audit-log", requireAdminKey, async (req, res) => {
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : null;
  const entityId = typeof req.query.entityId === "string" ? req.query.entityId : null;
  const action = typeof req.query.action === "string" ? req.query.action : null;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (entityType) conditions.push(eq(auditLogTable.entity_type, entityType));
  if (entityId) conditions.push(eq(auditLogTable.entity_id, entityId));
  if (action) conditions.push(ilike(auditLogTable.action, `%${action}%`));

  const rows = await db
    .select()
    .from(auditLogTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

export default router;
