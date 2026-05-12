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
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
  db,
  companiesTable,
  issueReportsTable,
  auditLogTable,
  dealsTable,
  contractsTable,
  contractShipmentsTable,
  transportRequestsTable,
  wasteListingsTable,
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
      actorRole: "admin",
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
    actorRole: "admin",
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
    actorRole: "admin",
    statusBefore: req.body?.prev_status ?? null,
    statusAfter: status,
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
    actorRole: "admin",
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

  if (!["active", "payment_submitted", "payment_confirmed"].includes(deal.status)) {
    res.status(409).json({
      error: "InvalidState",
      message: `Deal cannot be cancelled from status '${deal.status}'. Only active, payment_submitted, or payment_confirmed deals can be admin-cancelled.`,
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
    actorRole: "admin",
    statusBefore: deal.status,
    statusAfter: "cancelled",
    details: { reason: reason ?? null },
    severity: "warn",
  });

  res.json(updated);
});

/**
 * POST /admin/deals/:id/force-complete
 * Force a deal into 'completed' status regardless of lifecycle state.
 * Skips transport and receipt confirmation checks.
 * Only blocked if the deal is already in a terminal state.
 * Body: { reason?: string }
 */
router.post("/admin/deals/:id/force-complete", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);
  const { reason } = (req.body ?? {}) as { reason?: string };

  const [deal] = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.id, id))
    .limit(1);

  if (!deal) {
    res.status(404).json({ error: "NotFound", message: "Deal not found" });
    return;
  }

  if (["completed", "cancelled"].includes(deal.status)) {
    res.status(409).json({
      error: "AlreadyTerminal",
      message: `Deal is already in terminal status: ${deal.status}`,
    });
    return;
  }

  const now = new Date();

  const [updated] = await db
    .update(dealsTable)
    .set({
      status: "completed",
      received_at: deal.received_at ?? now,
      updated_at: now,
    })
    .where(eq(dealsTable.id, id))
    .returning();

  void logAudit({
    action: "deal.force_completed_by_admin",
    entityType: "deal",
    entityId: id,
    actorRole: "admin",
    statusBefore: deal.status,
    statusAfter: "completed",
    details: { reason: reason ?? null },
    severity: "warn",
  });

  res.json(updated);
});

/* -------------------------------------------------------------------------- */
/* Contracts (admin)                                                           */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/contracts
 * Query params: status, seller_company_id, buyer_company_id, limit (max 200), offset
 */
router.get("/admin/contracts", requireAdminKey, async (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
  const sellerFilter = typeof req.query.seller_company_id === "string" ? req.query.seller_company_id : null;
  const buyerFilter = typeof req.query.buyer_company_id === "string" ? req.query.buyer_company_id : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (statusFilter) conditions.push(eq(contractsTable.status, statusFilter as typeof contractsTable.$inferSelect["status"]));
  if (sellerFilter) conditions.push(eq(contractsTable.seller_company_id, sellerFilter));
  if (buyerFilter) conditions.push(eq(contractsTable.buyer_company_id, buyerFilter));

  const rows = await db
    .select({
      contract: contractsTable,
      seller_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.seller_company_id})`,
      buyer_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.buyer_company_id})`,
    })
    .from(contractsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(contractsTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json(
    rows.map((r) => ({
      ...r.contract,
      seller_name: r.seller_name,
      buyer_name: r.buyer_name,
    })),
  );
});

/**
 * POST /admin/contracts/:id/cancel
 * Force-cancel any non-terminal contract, regardless of open shipments.
 * Body: { reason?: string }
 */
router.post("/admin/contracts/:id/cancel", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);
  const { reason } = req.body as { reason?: string };

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.id, id))
    .limit(1);

  if (!contract) {
    res.status(404).json({ error: "NotFound", message: "Contract not found" });
    return;
  }

  if (contract.status === "cancelled" || contract.status === "completed") {
    res.status(409).json({
      error: "AlreadyTerminal",
      message: `Contract is already in terminal status: ${contract.status}`,
    });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(contractsTable)
    .set({ status: "cancelled", cancelled_at: now, updated_at: now })
    .where(eq(contractsTable.id, id))
    .returning();

  void logAudit({
    action: "contract.cancelled_by_admin",
    entityType: "contract",
    entityId: id,
    actorRole: "admin",
    statusBefore: contract.status,
    statusAfter: "cancelled",
    details: { reason: reason ?? null },
    severity: "warn",
  });

  res.json(updated);
});

/* -------------------------------------------------------------------------- */
/* Audit log                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/audit-log
 * Query params:
 *   entityType   — filter by entity_type
 *   entityId     — filter by entity_id (exact UUID)
 *   action       — partial match on action key
 *   actorRole    — filter by actor_role (exact)
 *   statusBefore — filter by status_before (exact)
 *   statusAfter  — filter by status_after (exact)
 *   dateFrom     — ISO timestamp lower bound (inclusive)
 *   dateTo       — ISO timestamp upper bound (inclusive)
 *   limit        — default 100, max 500
 *   offset       — default 0
 */
router.get("/admin/audit-log", requireAdminKey, async (req, res) => {
  const entityType   = typeof req.query.entityType   === "string" ? req.query.entityType   : null;
  const entityId     = typeof req.query.entityId     === "string" ? req.query.entityId     : null;
  const action       = typeof req.query.action       === "string" ? req.query.action       : null;
  const actorRole    = typeof req.query.actorRole    === "string" ? req.query.actorRole    : null;
  const statusBefore = typeof req.query.statusBefore === "string" ? req.query.statusBefore : null;
  const statusAfter  = typeof req.query.statusAfter  === "string" ? req.query.statusAfter  : null;
  const dateFrom     = typeof req.query.dateFrom     === "string" ? req.query.dateFrom     : null;
  const dateTo       = typeof req.query.dateTo       === "string" ? req.query.dateTo       : null;
  const limit  = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (entityType)   conditions.push(eq(auditLogTable.entity_type, entityType));
  if (entityId)     conditions.push(eq(auditLogTable.entity_id, entityId));
  if (action)       conditions.push(ilike(auditLogTable.action, `%${action}%`));
  if (actorRole)    conditions.push(eq(auditLogTable.actor_role, actorRole));
  if (statusBefore) conditions.push(eq(auditLogTable.status_before, statusBefore));
  if (statusAfter)  conditions.push(eq(auditLogTable.status_after, statusAfter));
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from.getTime())) conditions.push(sql`${auditLogTable.created_at} >= ${from.toISOString()}`);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to.getTime())) conditions.push(sql`${auditLogTable.created_at} <= ${to.toISOString()}`);
  }

  const rows = await db
    .select()
    .from(auditLogTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

/* -------------------------------------------------------------------------- */
/* Deals (admin pilot view)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/deals
 * Returns all deals with manifest_ref, MWAN readiness score, and missing item count.
 * Query params: status, limit (max 200), offset
 */
router.get("/admin/deals", requireAdminKey, async (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select({
      deal: {
        id: dealsTable.id,
        status: dealsTable.status,
        settlement_type: dealsTable.settlement_type,
        actual_quantity: dealsTable.actual_quantity,
        payment_confirmed_at: dealsTable.payment_confirmed_at,
        created_at: dealsTable.created_at,
        listing_id: dealsTable.listing_id,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
      },
      tr_id: transportRequestsTable.id,
      manifest_ref: transportRequestsTable.manifest_ref,
      vehicle_plate: transportRequestsTable.vehicle_plate,
      pickup_city: transportRequestsTable.pickup_city,
      delivery_city: transportRequestsTable.delivery_city,
      waste_description: transportRequestsTable.waste_description,
      transporter_name: transportRequestsTable.transporter_name,
      transporter_company_id: transportRequestsTable.transporter_company_id,
      transport_mode: transportRequestsTable.transport_mode,
      listing_id_check: wasteListingsTable.id,
      gen_cr: sql<string | null>`gen.commercial_registration`,
      gen_license: sql<string | null>`gen.license_number`,
      gen_city: sql<string | null>`gen.city`,
      recv_cr: sql<string | null>`recv.commercial_registration`,
      recv_license: sql<string | null>`recv.license_number`,
      recv_city: sql<string | null>`recv.city`,
    })
    .from(dealsTable)
    .leftJoin(transportRequestsTable, eq(transportRequestsTable.deal_id, dealsTable.id))
    .leftJoin(wasteListingsTable, eq(wasteListingsTable.id, dealsTable.listing_id))
    .leftJoin(
      sql`companies gen`,
      sql`gen.id = ${dealsTable.producer_company_id}`,
    )
    .leftJoin(
      sql`companies recv`,
      sql`recv.id = ${dealsTable.buyer_company_id}`,
    )
    .where(statusFilter ? eq(dealsTable.status, statusFilter as typeof dealsTable.$inferSelect["status"]) : undefined)
    .orderBy(desc(dealsTable.created_at))
    .limit(limit)
    .offset(offset);

  const result = rows.map((r) => {
    const checks: Record<string, boolean> = {
      generator_cr: !!(r.gen_cr),
      generator_license: !!(r.gen_license),
      generator_city: !!(r.gen_city),
      receiver_cr: !!(r.recv_cr),
      receiver_license: !!(r.recv_license),
      receiver_city: !!(r.recv_city),
      waste_defined: !!(r.listing_id_check),
      quantity_confirmed: r.deal.settlement_type === "fixed" ? true : r.deal.actual_quantity != null,
      payment_confirmed: r.deal.payment_confirmed_at != null,
      transport_request_created: !!(r.tr_id),
      transporter_assigned: r.tr_id
        ? (r.transport_mode === "self_managed" ? !!(r.transporter_name?.trim()) : !!(r.transporter_company_id))
        : false,
      vehicle_plate_set: !!(r.vehicle_plate?.trim()),
      pickup_city_set: !!(r.pickup_city),
      delivery_city_set: !!(r.delivery_city),
      waste_description_set: !!(r.waste_description),
    };
    const readyCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;
    return {
      deal_id: r.deal.id,
      status: r.deal.status,
      manifest_ref: r.manifest_ref ?? null,
      mwan_score: `${readyCount}/${totalCount}`,
      missing_count: totalCount - readyCount,
      is_mwan_ready: readyCount === totalCount,
      created_at: r.deal.created_at.toISOString(),
    };
  });

  res.json(result);
});

// ── GET /admin/transport-requests/pending ─────────────────────────────────────
// Returns platform-managed transport requests (ops_assigned_to = "platform-ops")
// that are still pending (no transporter assigned, status = pending).
// Query params: limit (default 50), offset (default 0)

router.get("/admin/transport-requests/pending", requireAdminKey, async (req, res) => {
  const limit  = Math.min(Number(req.query.limit)  || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select({
      id:                    transportRequestsTable.id,
      manifest_ref:          transportRequestsTable.manifest_ref,
      status:                transportRequestsTable.status,
      transport_mode:        transportRequestsTable.transport_mode,
      ops_assigned_to:       transportRequestsTable.ops_assigned_to,
      pickup_city:           transportRequestsTable.pickup_city,
      delivery_city:         transportRequestsTable.delivery_city,
      waste_description:     transportRequestsTable.waste_description,
      planned_pickup_at:     transportRequestsTable.planned_pickup_at,
      notes:                 transportRequestsTable.notes,
      created_at:            transportRequestsTable.created_at,
      deal_id:               transportRequestsTable.deal_id,
      created_by_company_id: transportRequestsTable.created_by_company_id,
      company_name:          companiesTable.name,
    })
    .from(transportRequestsTable)
    .leftJoin(companiesTable, eq(transportRequestsTable.created_by_company_id, companiesTable.id))
    .where(
      and(
        eq(transportRequestsTable.ops_assigned_to, "platform-ops"),
        eq(transportRequestsTable.status, "pending"),
      ),
    )
    .orderBy(desc(transportRequestsTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json({
    data: rows.map((r) => ({
      ...r,
      planned_pickup_at: r.planned_pickup_at?.toISOString() ?? null,
      created_at: r.created_at.toISOString(),
    })),
    limit,
    offset,
    count: rows.length,
  });
});

export default router;
