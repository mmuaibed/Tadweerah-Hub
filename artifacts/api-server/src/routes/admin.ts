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
import { and, count, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql, aliasedTable, inArray, lt } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  db,
  companiesTable,
  companyRolesTable,
  companyCapabilitiesTable,
  companyMembersTable,
  companyInvitationsTable,
  issueReportsTable,
  auditLogTable,
  dealsTable,
  contractsTable,
  contractShipmentsTable,
  contractMaterialsTable,
  transportRequestsTable,
  transportQuotesTable,
  wasteListingsTable,
  materialCategoriesTable,
  listingOffersTable,
} from "@workspace/db";
import { buildCsv } from "../lib/csv";
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
 * GET /admin/stats
 * Returns lightweight platform counts for admin dashboard.
 */
router.get("/admin/stats", requireAdminKey, async (req, res) => {
  const [{ totalCompanies }] = await db.select({ totalCompanies: count() }).from(companiesTable);
  const [{ totalMembers }] = await db.select({ totalMembers: count() }).from(companyMembersTable);
  const [{ totalInvites }] = await db.select({ totalInvites: count() }).from(companyInvitationsTable);
  const [{ totalListings }] = await db.select({ totalListings: count() }).from(wasteListingsTable);
  const [{ activeListings }] = await db.select({ activeListings: count() }).from(wasteListingsTable).where(eq(wasteListingsTable.status, "open"));
  const [{ totalOffers }] = await db.select({ totalOffers: count() }).from(listingOffersTable);
  const [{ totalDeals }] = await db.select({ totalDeals: count() }).from(dealsTable);
  const [{ totalTRs }] = await db.select({ totalTRs: count() }).from(transportRequestsTable);
  
  const statusCounts = await db
    .select({ status: companiesTable.license_status, c: count() })
    .from(companiesTable)
    .groupBy(companiesTable.license_status);

  const dealStatusCounts = await db
    .select({ status: dealsTable.status, c: count() })
    .from(dealsTable)
    .groupBy(dealsTable.status);

  const trStatusCounts = await db
    .select({ status: transportRequestsTable.status, c: count() })
    .from(transportRequestsTable)
    .groupBy(transportRequestsTable.status);

  res.json({
    totalCompanies,
    totalMembers,
    totalInvites,
    totalListings,
    activeListings,
    totalOffers,
    totalDeals,
    totalTRs,
    companiesByStatus: statusCounts.reduce((acc, row) => ({ ...acc, [row.status || "null"]: Number(row.c) }), {} as Record<string, number>),
    dealsByStatus: dealStatusCounts.reduce((acc, row) => ({ ...acc, [row.status || "null"]: Number(row.c) }), {} as Record<string, number>),
    transportReqsByStatus: trStatusCounts.reduce((acc, row) => ({ ...acc, [row.status || "null"]: Number(row.c) }), {} as Record<string, number>),
  });
});

/**
 * GET /admin/companies/:id/details
 * On-demand detailed view of a company including Clerk-enriched emails and relations.
 */
router.get("/admin/companies/:id/details", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
  if (!company) { res.status(404).json({ error: "NotFound", message: "Company not found" }); return; }

  const rolesRows = await db.select().from(companyRolesTable).where(eq(companyRolesTable.company_id, id));
  const capsRows = await db.select().from(companyCapabilitiesTable).where(eq(companyCapabilitiesTable.company_id, id));
  const membersRows = await db.select().from(companyMembersTable).where(eq(companyMembersTable.company_id, id));
  const invitesRows = await db.select().from(companyInvitationsTable).where(eq(companyInvitationsTable.company_id, id));

  const clerkUserIds = [company.ownerUserId, ...membersRows.map(m => m.user_id)].filter(Boolean) as string[];
  const emailMap = new Map<string, string>();
  if (clerkUserIds.length > 0) {
    try {
      const clerkUsers = await clerkClient.users.getUserList({ userId: Array.from(new Set(clerkUserIds)) });
      for (const u of clerkUsers.data) {
        const email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress || u.emailAddresses[0]?.emailAddress;
        if (email) emailMap.set(u.id, email);
      }
    } catch (err) {
      req.log.error({ err }, "Failed to fetch admin company details clerk emails");
    }
  }

  res.json({
    ...company,
    owner_email: company.ownerUserId ? emailMap.get(company.ownerUserId) || null : null,
    roles: rolesRows.map(r => r.role),
    capabilities: capsRows.map(c => c.capability_id),
    members: membersRows.map(m => ({
      user_id: m.user_id,
      role: m.role,
      email: emailMap.get(m.user_id) || null,
      created_at: m.created_at,
    })),
    invitations: invitesRows.map(i => ({
      email: i.email,
      role: i.role,
      status: i.status,
      created_at: i.created_at,
    }))
  });
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
 * Body: { status: "open" | "in_review" | "closed" | "resolved", admin_note?: string }
 */
router.patch("/admin/issue-reports/:id", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);
  const { status, admin_note } = req.body ?? {};

  const allowedStatuses = ["open", "in_review", "closed", "resolved"];
  if (!status || !allowedStatuses.includes(status)) {
    res.status(400).json({
      error: "ValidationError",
      message: "status must be one of: open, in_review, closed, resolved",
    });
    return;
  }

  const updates: Record<string, unknown> = { status };
  if (typeof admin_note === "string") updates.admin_note = admin_note.trim() || null;
  if (status === "closed") updates.closed_at = new Date();

  const [updated] = await db
    .update(issueReportsTable)
    .set(updates)
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
    details: { status, admin_note: updates.admin_note ?? null },
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
 * PATCH /admin/deals/:id/request-payment-resubmission
 * Admin requests the buyer to resubmit payment proof.
 * Valid only for payment_submitted or active deals.
 */
router.patch("/admin/deals/:id/request-payment-resubmission", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);

  const [deal] = await db
    .select()
    .from(dealsTable)
    .where(eq(dealsTable.id, id))
    .limit(1);

  if (!deal) {
    res.status(404).json({ error: "NotFound", message: "Deal not found" });
    return;
  }

  if (!["active", "payment_submitted"].includes(deal.status)) {
    res.status(409).json({
      error: "InvalidState",
      message: `Cannot request payment resubmission from status '${deal.status}'.`,
    });
    return;
  }

  const now = new Date();

  const [updated] = await db
    .update(dealsTable)
    .set({
      status: "active",
      payment_reference: null,
      payment_proof_url: null,
      payment_submitted_at: null,
      payment_confirmed_at: null,
      updated_at: now,
    })
    .where(eq(dealsTable.id, id))
    .returning();

  void logAudit({
    action: "deal.payment_resubmission_requested",
    entityType: "deal",
    entityId: id,
    actorRole: "admin",
    statusBefore: deal.status,
    statusAfter: "active",
  });

  // We skip formal Resend email here for brevity, but we log the intent.
  // The frontend will show it as 'active' again, prompting the user.

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

/**
 * GET /admin/deals/:id/details
 * Fetch detailed information for a specific deal including buyer/seller names and payment proof status.
 */
router.get("/admin/deals/:id/details", requireAdminKey, async (req, res) => {
  const id = String(req.params["id"]);

  const [dealRow] = await db
    .select({
      deal: dealsTable,
      buyer_name: sql<string>`(SELECT name FROM companies WHERE id = ${dealsTable.buyer_company_id})`,
      seller_name: sql<string>`(SELECT name FROM companies WHERE id = ${dealsTable.producer_company_id})`,
    })
    .from(dealsTable)
    .where(eq(dealsTable.id, id))
    .limit(1);

  if (!dealRow) {
    res.status(404).json({ error: "NotFound", message: "Deal not found" });
    return;
  }

  res.json({
    ...dealRow.deal,
    buyer_name: dealRow.buyer_name,
    seller_name: dealRow.seller_name,
    has_payment_proof: !!dealRow.deal.payment_proof_url,
  });
});

// ── GET /admin/transport-requests/pending ─────────────────────────────────────
// Returns platform-managed transport requests (ops_assigned_to = "platform-ops")
// that are still pending (no transporter assigned, status = pending).
// Query params: limit (default 50), offset (default 0)

router.get("/admin/transport-requests/pending", requireAdminKey, async (req, res) => {
  const limit  = Math.min(Number(req.query.limit)  || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const producerCo = aliasedTable(companiesTable, "producer_co");
  const buyerCo = aliasedTable(companiesTable, "buyer_co");

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
      listing_id:            dealsTable.listing_id,
      buyer_company_name:    buyerCo.name,
      seller_company_name:   producerCo.name,
      buyer_contact_phone:   buyerCo.contactPhone,
      seller_contact_phone:  producerCo.contactPhone,
      material:              wasteListingsTable.material,
      quantity:              wasteListingsTable.quantity,
      unit:                  wasteListingsTable.unit,
      pickup_address:        wasteListingsTable.material_location_address,
      site_details:          wasteListingsTable.material_location_notes,
      google_maps_url:       wasteListingsTable.google_maps_url,
    })
    .from(transportRequestsTable)
    .leftJoin(companiesTable, eq(transportRequestsTable.created_by_company_id, companiesTable.id))
    .leftJoin(dealsTable, eq(transportRequestsTable.deal_id, dealsTable.id))
    .leftJoin(wasteListingsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
    .leftJoin(producerCo, eq(dealsTable.producer_company_id, producerCo.id))
    .leftJoin(buyerCo, eq(dealsTable.buyer_company_id, buyerCo.id))
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

// ── GET /admin/reports/deals ───────────────────────────────────────────────
// Platform-wide deal report. ADMIN_API_KEY protected. Read-only.
// Query params: date_from, date_to, status, city, company_id, format, limit, offset

const ADMIN_REPORT_CSV_HEADERS = [
  "Date",
  "Deal ID",
  "Seller / Producer",
  "Seller City",
  "Buyer",
  "Buyer City",
  "Material",
  "Subcategory",
  "Qty",
  "Unit",
  "Listing City",
  "Status",
  "Amount (Before VAT)",
  "VAT Amount",
  "Total (with VAT)",
  "Transport",
];

router.get("/admin/reports/deals", requireAdminKey, async (req, res) => {
  const dateFromRaw = typeof req.query.date_from === "string" ? req.query.date_from : null;
  const dateToRaw = typeof req.query.date_to === "string" ? req.query.date_to : null;
  const statusFilter = typeof req.query.status === "string" && req.query.status ? req.query.status : null;
  const cityFilter = typeof req.query.city === "string" && req.query.city ? req.query.city : null;
  const companyId = typeof req.query.company_id === "string" && req.query.company_id ? req.query.company_id : null;
  const format = typeof req.query.format === "string" ? req.query.format : "json";
  const limit = Math.min(Number(req.query.limit) || 500, 1000);
  const offset = Number(req.query.offset) || 0;

  const dateFrom = dateFromRaw ? new Date(dateFromRaw + "T00:00:00.000Z") : null;
  const dateTo = dateToRaw ? new Date(dateToRaw + "T23:59:59.999Z") : null;

  const conditions = [];
  if (dateFrom) conditions.push(gte(dealsTable.created_at, dateFrom));
  if (dateTo) conditions.push(lte(dealsTable.created_at, dateTo));
  if (statusFilter) {
    conditions.push(
      eq(dealsTable.status, statusFilter as typeof dealsTable.$inferSelect["status"]),
    );
  }
  if (cityFilter) {
    conditions.push(ilike(wasteListingsTable.city, `%${cityFilter}%`));
  }
  if (companyId) {
    conditions.push(
      or(
        eq(dealsTable.producer_company_id, companyId),
        eq(dealsTable.buyer_company_id, companyId),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  /* ── Summary query ── */
  const [summaryRow] = await db
    .select({
      total: count(),
      completed: sql<number>`COUNT(*) FILTER (WHERE ${dealsTable.status} = 'completed')`,
      active: sql<number>`COUNT(*) FILTER (WHERE ${dealsTable.status} NOT IN ('completed', 'expired', 'cancelled'))`,
      estimated_sum: sql<string | null>`SUM(${dealsTable.estimated_amount})`,
      vat_sum: sql<string | null>`SUM(${dealsTable.vat_amount})`,
      total_sum: sql<string | null>`SUM(${dealsTable.total_amount})`,
    })
    .from(dealsTable)
    .leftJoin(wasteListingsTable, eq(wasteListingsTable.id, dealsTable.listing_id))
    .where(where);

  const summary = {
    total: Number(summaryRow?.total ?? 0),
    completed: Number(summaryRow?.completed ?? 0),
    active: Number(summaryRow?.active ?? 0),
    estimated_amount_sum: summaryRow?.estimated_sum ?? "0",
    vat_amount_sum: summaryRow?.vat_sum ?? "0",
    total_amount_sum: summaryRow?.total_sum ?? "0",
  };

  /* ── Row query ── */
  const rows = await db
    .select({
      deal_id: dealsTable.id,
      created_at: dealsTable.created_at,
      status: dealsTable.status,
      settlement_type: dealsTable.settlement_type,
      price_per_unit: dealsTable.price_per_unit,
      estimated_amount: dealsTable.estimated_amount,
      final_amount: dealsTable.final_amount,
      vat_rate: dealsTable.vat_rate,
      vat_amount: dealsTable.vat_amount,
      total_amount: dealsTable.total_amount,
      transport_decision: dealsTable.transport_decision,
      seller_name: sql<string | null>`seller.name`,
      seller_city: sql<string | null>`seller.city`,
      buyer_name: sql<string | null>`buyer.name`,
      buyer_city: sql<string | null>`buyer.city`,
      material: wasteListingsTable.material,
      subcategory_ar: materialCategoriesTable.name_ar,
      subcategory_en: materialCategoriesTable.name_en,
      quantity: wasteListingsTable.quantity,
      unit: wasteListingsTable.unit,
      city: wasteListingsTable.city,
      tr_id: transportRequestsTable.id,
      tr_status: transportRequestsTable.status,
      tr_manifest_ref: transportRequestsTable.manifest_ref,
    })
    .from(dealsTable)
    .leftJoin(sql`companies seller`, sql`seller.id = ${dealsTable.producer_company_id}`)
    .leftJoin(sql`companies buyer`, sql`buyer.id = ${dealsTable.buyer_company_id}`)
    .leftJoin(wasteListingsTable, eq(wasteListingsTable.id, dealsTable.listing_id))
    .leftJoin(
      materialCategoriesTable,
      eq(materialCategoriesTable.id, wasteListingsTable.material_subcategory_id),
    )
    .leftJoin(transportRequestsTable, eq(transportRequestsTable.deal_id, dealsTable.id))
    .where(where)
    .orderBy(desc(dealsTable.created_at))
    .limit(limit)
    .offset(offset);

  const serialized = rows.map((r) => ({
    deal_id: r.deal_id,
    created_at: r.created_at.toISOString(),
    status: r.status,
    settlement_type: r.settlement_type,
    price_per_unit: r.price_per_unit,
    estimated_amount: r.estimated_amount,
    final_amount: r.final_amount,
    vat_rate: r.vat_rate,
    vat_amount: r.vat_amount,
    total_amount: r.total_amount,
    seller_name: r.seller_name,
    seller_city: r.seller_city,
    buyer_name: r.buyer_name,
    buyer_city: r.buyer_city,
    material: r.material,
    subcategory_ar: r.subcategory_ar ?? null,
    subcategory_en: r.subcategory_en ?? null,
    quantity: r.quantity,
    unit: r.unit,
    city: r.city,
    transport_decision: r.transport_decision,
    tr_id: r.tr_id,
    tr_status: r.tr_status ?? null,
    tr_manifest_ref: r.tr_manifest_ref ?? null,
  }));

  /* ── CSV response ── */
  if (format === "csv") {
    const csvRows = serialized.map((r) => [
      new Date(r.created_at).toLocaleDateString("en-GB"),
      r.tr_manifest_ref ?? r.deal_id.slice(0, 8),
      r.seller_name,
      r.seller_city,
      r.buyer_name,
      r.buyer_city,
      r.material,
      r.subcategory_en ?? r.subcategory_ar,
      r.quantity,
      r.unit,
      r.city,
      r.status,
      r.estimated_amount,
      r.vat_amount,
      r.total_amount,
      r.tr_status ?? r.transport_decision ?? "",
    ]);
    const csv = buildCsv(ADMIN_REPORT_CSV_HEADERS, csvRows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admin-deals-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
    return;
  }

  /* ── JSON response ── */
  res.json({ summary, rows: serialized, count: serialized.length });
});

// ── Transport Quotes (Admin) ──────────────────────────────────────────────────

// GET /admin/transport-quotes
// Returns all submitted transport quotes with TR and company details.
// Query params: status (filter by quote status), limit, offset

router.get("/admin/transport-quotes", requireAdminKey, async (req, res) => {
  const limit  = Math.min(Number(req.query.limit)  || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;

  const rows = await db
    .select({
      quote: transportQuotesTable,
      transporter_name: companiesTable.name,
      pickup_city:      transportRequestsTable.pickup_city,
      delivery_city:    transportRequestsTable.delivery_city,
      waste_description: transportRequestsTable.waste_description,
      tr_status:        transportRequestsTable.status,
      tr_manifest_ref:  transportRequestsTable.manifest_ref,
    })
    .from(transportQuotesTable)
    .innerJoin(companiesTable, eq(transportQuotesTable.transporter_company_id, companiesTable.id))
    .innerJoin(transportRequestsTable, eq(transportQuotesTable.transport_request_id, transportRequestsTable.id))
    .where(statusFilter ? eq(transportQuotesTable.status, statusFilter as "submitted" | "under_review" | "selected" | "rejected") : undefined)
    .orderBy(desc(transportQuotesTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json({
    data: rows.map(({ quote, transporter_name, pickup_city, delivery_city, waste_description, tr_status, tr_manifest_ref }) => ({
      id: quote.id,
      transport_request_id: quote.transport_request_id,
      transporter_company_id: quote.transporter_company_id,
      transporter_name,
      price_total: quote.price_total,
      truck_count: quote.truck_count,
      truck_type: quote.truck_type ?? null,
      notes: quote.notes ?? null,
      status: quote.status,
      created_at: quote.created_at.toISOString(),
      updated_at: quote.updated_at.toISOString(),
      pickup_city: pickup_city ?? null,
      delivery_city: delivery_city ?? null,
      waste_description: waste_description ?? null,
      tr_status,
      tr_manifest_ref: tr_manifest_ref ?? null,
    })),
    limit,
    offset,
    count: rows.length,
  });
});

// PATCH /admin/transport-quotes/:quoteId/select
// Marks a single quote as 'selected' (admin shortlist/preference only).
// Does NOT assign the transporter to the transport request.
// Does NOT auto-reject competing quotes.
// Transport request state machine is untouched.

router.patch("/admin/transport-quotes/:quoteId/select", requireAdminKey, async (req, res) => {
  const quoteId = req.params.quoteId as string;

  const [quote] = await db
    .select({ id: transportQuotesTable.id, status: transportQuotesTable.status })
    .from(transportQuotesTable)
    .where(eq(transportQuotesTable.id, quoteId))
    .limit(1);

  if (!quote) {
    res.status(404).json({ error: "NotFound", message: "Quote not found" });
    return;
  }

  const [updated] = await db
    .update(transportQuotesTable)
    .set({ status: "selected", updated_at: new Date() })
    .where(eq(transportQuotesTable.id, quoteId))
    .returning({ id: transportQuotesTable.id, status: transportQuotesTable.status });

  res.json(updated);
});

// PATCH /admin/transport-quotes/:quoteId/under_review
// Marks a quote as 'under_review'.

router.patch("/admin/transport-quotes/:quoteId/under_review", requireAdminKey, async (req, res) => {
  const quoteId = req.params.quoteId as string;

  const [quote] = await db
    .select({ id: transportQuotesTable.id })
    .from(transportQuotesTable)
    .where(eq(transportQuotesTable.id, quoteId))
    .limit(1);

  if (!quote) {
    res.status(404).json({ error: "NotFound", message: "Quote not found" });
    return;
  }

  const [updated] = await db
    .update(transportQuotesTable)
    .set({ status: "under_review", updated_at: new Date() })
    .where(eq(transportQuotesTable.id, quoteId))
    .returning({ id: transportQuotesTable.id, status: transportQuotesTable.status });

  res.json(updated);
});

// PATCH /admin/transport-quotes/:quoteId/reject
// Rejects a single quote without affecting others.

router.patch("/admin/transport-quotes/:quoteId/reject", requireAdminKey, async (req, res) => {
  const quoteId = req.params.quoteId as string;

  const [quote] = await db
    .select({ id: transportQuotesTable.id, status: transportQuotesTable.status })
    .from(transportQuotesTable)
    .where(eq(transportQuotesTable.id, quoteId))
    .limit(1);

  if (!quote) {
    res.status(404).json({ error: "NotFound", message: "Quote not found" });
    return;
  }

  const [updated] = await db
    .update(transportQuotesTable)
    .set({ status: "rejected", updated_at: new Date() })
    .where(eq(transportQuotesTable.id, quoteId))
    .returning({ id: transportQuotesTable.id, status: transportQuotesTable.status });

  res.json(updated);
});

/* -------------------------------------------------------------------------- */
/* Shipments (admin)                                                          */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/shipments
 * Returns all contract shipments with contract reference and buyer/seller names.
 * Query params: status, limit (max 200), offset
 */
router.get("/admin/shipments", requireAdminKey, async (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (statusFilter) {
    conditions.push(eq(contractShipmentsTable.status, statusFilter as any));
  }

  const rows = await db
    .select({
      id: contractShipmentsTable.id,
      reference: contractShipmentsTable.reference,
      status: contractShipmentsTable.status,
      source_weight: contractShipmentsTable.source_weight,
      destination_weight: contractShipmentsTable.destination_weight,
      final_weight: contractShipmentsTable.final_weight,
      final_value: contractShipmentsTable.final_value,
      notes: contractShipmentsTable.notes,
      planned_at: contractShipmentsTable.planned_at,
      dispatched_at: contractShipmentsTable.dispatched_at,
      received_at: contractShipmentsTable.received_at,
      closed_at: contractShipmentsTable.closed_at,
      cancelled_at: contractShipmentsTable.cancelled_at,
      created_at: contractShipmentsTable.created_at,
      contract_id: contractsTable.id,
      contract_reference: contractsTable.reference,
      seller_company_id: contractsTable.seller_company_id,
      buyer_company_id: contractsTable.buyer_company_id,
      seller_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.seller_company_id})`,
      buyer_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.buyer_company_id})`,
      material_label: contractMaterialsTable.material_label,
      unit_label: contractMaterialsTable.unit_label,
    })
    .from(contractShipmentsTable)
    .innerJoin(contractsTable, eq(contractShipmentsTable.contract_id, contractsTable.id))
    .innerJoin(contractMaterialsTable, eq(contractShipmentsTable.material_line_id, contractMaterialsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(contractShipmentsTable.created_at))
    .limit(limit)
    .offset(offset);

  res.json(
    rows.map((r) => ({
      ...r,
      source_weight: r.source_weight != null ? Number(r.source_weight) : null,
      destination_weight: r.destination_weight != null ? Number(r.destination_weight) : null,
      final_weight: r.final_weight != null ? Number(r.final_weight) : null,
      final_value: r.final_value != null ? Number(r.final_value) : null,
      planned_at: r.planned_at.toISOString(),
      dispatched_at: r.dispatched_at?.toISOString() ?? null,
      received_at: r.received_at?.toISOString() ?? null,
      closed_at: r.closed_at?.toISOString() ?? null,
      cancelled_at: r.cancelled_at?.toISOString() ?? null,
      created_at: r.created_at.toISOString(),
    }))
  );
});

/* -------------------------------------------------------------------------- */
/* Overdue operations (admin)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * GET /admin/overdue-operations
 * Returns overdue deals, shipments, and contracts that need admin follow-up.
 */
router.get("/admin/overdue-operations", requireAdminKey, async (req, res) => {
  const now = new Date();

  // Deal threshold limits
  const MS = {
    active: 31 * 24 * 60 * 60 * 1000,
    payment_confirmed: 8 * 24 * 60 * 60 * 1000,
    dispatched: 72 * 60 * 60 * 1000,
  };
  const RECEIPT_PENDING_MS = 48 * 60 * 60 * 1000;

  const activeThreshold = new Date(now.getTime() - MS.active);
  const paymentThreshold = new Date(now.getTime() - MS.payment_confirmed);
  const dispatchThreshold = new Date(now.getTime() - MS.dispatched);
  const receiptPendingThreshold = new Date(now.getTime() - RECEIPT_PENDING_MS);

  // 1. Fetch overdue deals
  const overdueDeals = await db
    .select({
      id: dealsTable.id,
      status: dealsTable.status,
      created_at: dealsTable.created_at,
      payment_confirmed_at: dealsTable.payment_confirmed_at,
      dispatched_at: dealsTable.dispatched_at,
      receipt_pending_since: dealsTable.receipt_pending_since,
      extended_until: dealsTable.extended_until,
      seller_name: sql<string>`(SELECT name FROM companies WHERE id = ${dealsTable.producer_company_id})`,
      buyer_name: sql<string>`(SELECT name FROM companies WHERE id = ${dealsTable.buyer_company_id})`,
    })
    .from(dealsTable)
    .where(
      and(
        inArray(dealsTable.status, ["active", "payment_submitted", "payment_confirmed", "dispatched", "receipt_pending"]),
        or(
          and(
            inArray(dealsTable.status, ["active", "payment_submitted"]),
            isNull(dealsTable.extended_until),
            lt(dealsTable.created_at, activeThreshold)
          ),
          and(
            inArray(dealsTable.status, ["active", "payment_submitted"]),
            isNotNull(dealsTable.extended_until),
            sql`${dealsTable.extended_until} < ${now.toISOString()}`
          ),
          and(
            eq(dealsTable.status, "payment_confirmed"),
            isNull(dealsTable.extended_until),
            sql`${dealsTable.payment_confirmed_at} IS NOT NULL AND ${dealsTable.payment_confirmed_at} < ${paymentThreshold.toISOString()}`
          ),
          and(
            eq(dealsTable.status, "payment_confirmed"),
            isNotNull(dealsTable.extended_until),
            sql`${dealsTable.extended_until} < ${now.toISOString()}`
          ),
          and(
            eq(dealsTable.status, "dispatched"),
            sql`${dealsTable.dispatched_at} IS NOT NULL AND ${dealsTable.dispatched_at} < ${dispatchThreshold.toISOString()}`
          ),
          and(
            eq(dealsTable.status, "receipt_pending"),
            sql`${dealsTable.receipt_pending_since} IS NOT NULL AND ${dealsTable.receipt_pending_since} < ${receiptPendingThreshold.toISOString()}`
          )
        )
      )
    )
    .orderBy(desc(dealsTable.created_at));

  // Helper to compute reason & deadline
  const formattedDeals = overdueDeals.map((d) => {
    let deadline: Date | null = null;
    let overdueReason = "";
    if (["active", "payment_submitted"].includes(d.status)) {
      deadline = d.extended_until ? new Date(d.extended_until) : new Date(d.created_at.getTime() + MS.active);
      overdueReason = "تجاوز مهلة تعميد الصفقة (31 يوم)";
    } else if (d.status === "payment_confirmed") {
      deadline = d.extended_until ? new Date(d.extended_until) : (d.payment_confirmed_at ? new Date(d.payment_confirmed_at.getTime() + MS.payment_confirmed) : null);
      overdueReason = "تجاوز مهلة شحن البضاعة (8 أيام)";
    } else if (d.status === "dispatched") {
      deadline = d.dispatched_at ? new Date(d.dispatched_at.getTime() + MS.dispatched) : null;
      overdueReason = "تجاوز مهلة تأكيد استلام الشحنة (72 ساعة)";
    } else if (d.status === "receipt_pending") {
      deadline = d.receipt_pending_since ? new Date(d.receipt_pending_since.getTime() + RECEIPT_PENDING_MS) : null;
      overdueReason = "معلق في انتظار إتمام الصفقة (48 ساعة)";
    }

    return {
      id: d.id,
      status: d.status,
      seller_name: d.seller_name,
      buyer_name: d.buyer_name,
      created_at: d.created_at.toISOString(),
      deadline: deadline?.toISOString() ?? null,
      overdue_reason: overdueReason,
    };
  });

  // 2. Fetch overdue shipments
  const shipmentDispatchThreshold = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours

  const overdueShipments = await db
    .select({
      id: contractShipmentsTable.id,
      reference: contractShipmentsTable.reference,
      status: contractShipmentsTable.status,
      planned_at: contractShipmentsTable.planned_at,
      dispatched_at: contractShipmentsTable.dispatched_at,
      contract_reference: contractsTable.reference,
      seller_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.seller_company_id})`,
      buyer_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.buyer_company_id})`,
      material_label: contractMaterialsTable.material_label,
      unit_label: contractMaterialsTable.unit_label,
    })
    .from(contractShipmentsTable)
    .innerJoin(contractsTable, eq(contractShipmentsTable.contract_id, contractsTable.id))
    .innerJoin(contractMaterialsTable, eq(contractShipmentsTable.material_line_id, contractMaterialsTable.id))
    .where(
      and(
        inArray(contractShipmentsTable.status, ["planned", "dispatched"]),
        or(
          and(
            eq(contractShipmentsTable.status, "planned"),
            lt(contractShipmentsTable.planned_at, now)
          ),
          and(
            eq(contractShipmentsTable.status, "dispatched"),
            sql`${contractShipmentsTable.dispatched_at} IS NOT NULL AND ${contractShipmentsTable.dispatched_at} < ${shipmentDispatchThreshold.toISOString()}`
          )
        )
      )
    )
    .orderBy(desc(contractShipmentsTable.created_at));

  const formattedShipments = overdueShipments.map((s) => {
    const isPlanned = s.status === "planned";
    const overdueReason = isPlanned ? "تجاوز تاريخ الشحن المخطط" : "تجاوز مهلة التوصيل المتوقعة (72 ساعة)";
    const referenceTime = isPlanned ? s.planned_at : s.dispatched_at;

    return {
      id: s.id,
      reference: s.reference,
      status: s.status,
      contract_reference: s.contract_reference,
      seller_name: s.seller_name,
      buyer_name: s.buyer_name,
      material_label: s.material_label,
      unit_label: s.unit_label,
      overdue_reason: overdueReason,
      reference_time: referenceTime?.toISOString() ?? null,
    };
  });

  // 3. Fetch overdue contracts (past end_date)
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const overdueContracts = await db
    .select({
      id: contractsTable.id,
      reference: contractsTable.reference,
      status: contractsTable.status,
      end_date: contractsTable.end_date,
      seller_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.seller_company_id})`,
      buyer_name: sql<string>`(SELECT name FROM companies WHERE id = ${contractsTable.buyer_company_id})`,
    })
    .from(contractsTable)
    .where(
      and(
        eq(contractsTable.status, "active"),
        isNotNull(contractsTable.end_date),
        sql`${contractsTable.end_date} < ${todayStr}`
      )
    )
    .orderBy(desc(contractsTable.created_at));

  const formattedContracts = overdueContracts.map((c) => ({
    id: c.id,
    reference: c.reference,
    status: c.status,
    end_date: c.end_date,
    seller_name: c.seller_name,
    buyer_name: c.buyer_name,
    overdue_reason: "تجاوز تاريخ النهاية الإرشادي",
  }));

  res.json({
    deals: formattedDeals,
    shipments: formattedShipments,
    contracts: formattedContracts,
  });
});

export default router;
