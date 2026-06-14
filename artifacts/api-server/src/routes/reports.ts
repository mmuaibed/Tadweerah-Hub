/**
 * Company-facing report routes (authenticated, company-scoped).
 *
 * GET /reports/deals
 *   Query params:
 *     role      "all" | "seller" | "buyer"  (default: "all")
 *     date_from ISO date string  e.g. 2024-01-01
 *     date_to   ISO date string  e.g. 2024-12-31
 *     status    deal_status value (active | payment_submitted | … | completed | expired | cancelled)
 *     city      listing city — case-insensitive partial match
 *     format    "json" | "csv"  (default: "json")
 *     limit     number (default 500, max 1000)
 *     offset    number (default 0)
 *
 * Security: only deals where the authenticated company is producer OR buyer
 * are ever returned.  Cross-company leakage is structurally impossible.
 */
import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  db,
  dealsTable,
  wasteListingsTable,
  materialCategoriesTable,
  transportRequestsTable,
  contractsTable,
  contractShipmentsTable,
  contractMaterialsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";
import { buildCsv } from "../lib/csv";

const router: IRouter = Router();

/* ── CSV column headers ─────────────────────────────────────────────────── */

const CSV_HEADERS = [
  "Date",
  "Deal ID",
  "My Role",
  "Seller / Producer",
  "Buyer",
  "Material",
  "Subcategory",
  "Qty",
  "Unit",
  "City",
  "Status",
  "Amount (Before VAT)",
  "VAT Amount",
  "Total (with VAT)",
  "Transport",
];

/* ── GET /reports/deals ─────────────────────────────────────────────────── */

router.get(
  "/reports/deals",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const cid = company.id;

    const role = (req.query.role as string | undefined) ?? "all";
    const dateFromRaw = typeof req.query.date_from === "string" ? req.query.date_from : null;
    const dateToRaw = typeof req.query.date_to === "string" ? req.query.date_to : null;
    const statusFilter = typeof req.query.status === "string" && req.query.status ? req.query.status : null;
    const cityFilter = typeof req.query.city === "string" && req.query.city ? req.query.city : null;
    const format = typeof req.query.format === "string" ? req.query.format : "json";
    const limit = Math.min(Number(req.query.limit) || 500, 1000);
    const offset = Number(req.query.offset) || 0;

    const dateFrom = dateFromRaw ? new Date(dateFromRaw + "T00:00:00.000Z") : null;
    const dateTo = dateToRaw ? new Date(dateToRaw + "T23:59:59.999Z") : null;

    /* ── Build WHERE conditions ── */
    const conditions = [];

    if (role === "seller") {
      conditions.push(eq(dealsTable.producer_company_id, cid));
    } else if (role === "buyer") {
      conditions.push(eq(dealsTable.buyer_company_id, cid));
    } else {
      conditions.push(
        or(
          eq(dealsTable.producer_company_id, cid),
          eq(dealsTable.buyer_company_id, cid),
        ),
      );
    }

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

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    /* ── Summary query (no limit) ── */
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

    /* ── Row query (paginated) ── */
    const rows = await db
      .select({
        deal_id: dealsTable.id,
        listing_id: dealsTable.listing_id,
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
        producer_company_id: dealsTable.producer_company_id,
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
      listing_id: r.listing_id,
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
      my_role: r.producer_company_id === cid ? "seller" : "buyer",
    }));

    /* ── CSV response ── */
    if (format === "csv") {
      const csvRows = serialized.map((r) => [
        new Date(r.created_at).toLocaleDateString("en-GB"),
        r.tr_manifest_ref ?? r.deal_id.slice(0, 8),
        r.my_role,
        r.seller_name,
        r.buyer_name,
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

      const csv = buildCsv(CSV_HEADERS, csvRows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="my-deals-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(csv);
      return;
    }

    /* ── JSON response ── */
    res.json({ summary, rows: serialized, count: serialized.length });
  },
);

/* ── GET /reports/contract-shipments ────────────────────────────────────── */

const CONTRACT_CSV_HEADERS = [
  "Closed Date",
  "Contract Ref",
  "Shipment Ref",
  "My Role",
  "Seller",
  "Buyer",
  "Material",
  "Unit",
  "Weight Policy",
  "Source Weight",
  "Destination Weight",
  "Weight Variance",
  "Final Weight",
  "Unit Price (Excl VAT)",
  "Value (Excl VAT)",
  "VAT Amount (15%)",
  "Total (Incl VAT)",
  "Status"
];

const VAT_RATE = 0.15;

router.get(
  "/reports/contract-shipments",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const cid = company.id;

    const dateFromRaw = typeof req.query.date_from === "string" ? req.query.date_from : null;
    const dateToRaw = typeof req.query.date_to === "string" ? req.query.date_to : null;
    const contractId = typeof req.query.contract_id === "string" && req.query.contract_id ? req.query.contract_id : null;
    const statusFilter = typeof req.query.status === "string" && req.query.status ? req.query.status : null;
    const format = typeof req.query.format === "string" ? req.query.format : "json";

    // We do not paginate CSV for operational reports, but we respect limit for UI
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;

    const dateFrom = dateFromRaw ? new Date(dateFromRaw + "T00:00:00.000Z") : null;
    const dateTo = dateToRaw ? new Date(dateToRaw + "T23:59:59.999Z") : null;

    /* ── Build WHERE conditions ── */
    const conditions = [];

    // Role scope
    conditions.push(
      or(
        eq(contractsTable.seller_company_id, cid),
        eq(contractsTable.buyer_company_id, cid)
      )
    );

    if (contractId) {
      if (contractId.toUpperCase().startsWith("TDW-CTR-")) {
        conditions.push(eq(contractsTable.reference, contractId.toUpperCase()));
      } else {
        conditions.push(eq(contractShipmentsTable.contract_id, contractId));
      }
    }
    if (statusFilter) conditions.push(eq(contractShipmentsTable.status, statusFilter as any));
    if (dateFrom) conditions.push(gte(contractShipmentsTable.closed_at, dateFrom));
    if (dateTo) conditions.push(lte(contractShipmentsTable.closed_at, dateTo));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        shipment_id: contractShipmentsTable.id,
        shipment_ref: contractShipmentsTable.reference,
        status: contractShipmentsTable.status,
        closed_at: contractShipmentsTable.closed_at,
        source_weight: contractShipmentsTable.source_weight,
        destination_weight: contractShipmentsTable.destination_weight,
        final_weight: contractShipmentsTable.final_weight,
        final_value: contractShipmentsTable.final_value,

        contract_id: contractsTable.id,
        contract_ref: contractsTable.reference,
        weight_policy: contractsTable.weight_policy,
        seller_id: contractsTable.seller_company_id,
        buyer_id: contractsTable.buyer_company_id,

        material_label: contractMaterialsTable.material_label,
        unit_label: contractMaterialsTable.unit_label,
        price_per_unit: contractMaterialsTable.price_per_unit,

        seller_name: sql<string | null>`seller.name`,
        buyer_name: sql<string | null>`buyer.name`,
      })
      .from(contractShipmentsTable)
      .innerJoin(contractsTable, eq(contractsTable.id, contractShipmentsTable.contract_id))
      .innerJoin(contractMaterialsTable, eq(contractMaterialsTable.id, contractShipmentsTable.material_line_id))
      .leftJoin(sql`companies seller`, sql`seller.id = ${contractsTable.seller_company_id}`)
      .leftJoin(sql`companies buyer`, sql`buyer.id = ${contractsTable.buyer_company_id}`)
      .where(where)
      .orderBy(desc(contractShipmentsTable.closed_at), desc(contractShipmentsTable.created_at))
      .limit(format === "csv" ? 5000 : limit)
      .offset(format === "csv" ? 0 : offset);

    let total_final_weight = 0;
    let total_value_excluding_vat = 0;

    const serialized = rows.map((r) => {
      const sw = r.source_weight ? Number(r.source_weight) : 0;
      const dw = r.destination_weight ? Number(r.destination_weight) : 0;
      const fw = r.final_weight ? Number(r.final_weight) : 0;
      const fv = r.final_value ? Number(r.final_value) : 0;

      const variance = Math.abs(sw - dw);
      const vat_amount = fv * VAT_RATE;
      const total_including_vat = fv + vat_amount;

      if (r.status === "closed") {
        total_final_weight += fw;
        total_value_excluding_vat += fv;
      }

      return {
        contract_ref: r.contract_ref,
        shipment_ref: r.shipment_ref,
        status: r.status,
        closed_at: r.closed_at ? r.closed_at.toISOString() : null,
        my_role: r.seller_id === cid ? "seller" : "buyer",
        seller_name: r.seller_name,
        buyer_name: r.buyer_name,
        material: r.material_label,
        unit: r.unit_label,
        weight_policy: r.weight_policy,
        source_weight: sw.toFixed(3),
        destination_weight: dw.toFixed(3),
        variance: variance.toFixed(3),
        final_weight: fw.toFixed(3),
        price_per_unit: Number(r.price_per_unit).toFixed(3),
        value_excluding_vat: fv.toFixed(3),
        vat_amount: vat_amount.toFixed(3),
        total_including_vat: total_including_vat.toFixed(3),
      };
    });

    const summary = {
      total_final_weight: total_final_weight.toFixed(3),
      total_value_excluding_vat: total_value_excluding_vat.toFixed(3),
      total_vat_amount: (total_value_excluding_vat * VAT_RATE).toFixed(3),
      grand_total_including_vat: (total_value_excluding_vat * (1 + VAT_RATE)).toFixed(3),
      number_of_shipments: serialized.length
    };

    if (format === "csv") {
      const csvRows = serialized.map((r) => [
        r.closed_at ? new Date(r.closed_at).toLocaleDateString("en-GB") : "",
        r.contract_ref,
        r.shipment_ref,
        r.my_role,
        r.seller_name || "",
        r.buyer_name || "",
        r.material,
        r.unit,
        r.weight_policy,
        r.source_weight,
        r.destination_weight,
        r.variance,
        r.final_weight,
        r.price_per_unit,
        r.value_excluding_vat,
        r.vat_amount,
        r.total_including_vat,
        r.status
      ]);

      const csv = buildCsv(CONTRACT_CSV_HEADERS, csvRows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");

      const df = dateFromRaw || "all";
      const dt = dateToRaw || "all";
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contract-shipments-report-${df}-${dt}.csv"`
      );
      res.send(csv);
      return;
    }

    res.json({ summary, rows: serialized, count: serialized.length });
  }
);

export default router;
