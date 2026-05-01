import { Router, type IRouter } from "express";
import { and, eq, or, inArray, desc, count } from "drizzle-orm";
import PDFDocument from "pdfkit";
import {
  db,
  dealsTable,
  transportRequestsTable,
  companiesTable,
  wasteListingsTable,
  materialCategoriesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";
import { sendTransportRequestNotification } from "../lib/email";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function serializeTR(tr: typeof transportRequestsTable.$inferSelect) {
  return {
    id: tr.id,
    deal_id: tr.deal_id,
    created_by_company_id: tr.created_by_company_id,
    transport_mode: tr.transport_mode,
    transporter_company_id: tr.transporter_company_id ?? undefined,
    transporter_name: tr.transporter_name ?? undefined,
    status: tr.status,
    manifest_ref: tr.manifest_ref ?? undefined,
    pickup_facility_name: tr.pickup_facility_name ?? undefined,
    delivery_facility_name: tr.delivery_facility_name ?? undefined,
    pickup_city: tr.pickup_city ?? undefined,
    delivery_city: tr.delivery_city ?? undefined,
    waste_description: tr.waste_description ?? undefined,
    vehicle_plate: tr.vehicle_plate ?? undefined,
    notes: tr.notes ?? undefined,
    planned_pickup_at: tr.planned_pickup_at?.toISOString() ?? undefined,
    actual_pickup_at: tr.actual_pickup_at?.toISOString() ?? undefined,
    delivered_at: tr.delivered_at?.toISOString() ?? undefined,
    closed_at: tr.closed_at?.toISOString() ?? undefined,
    cancelled_at: tr.cancelled_at?.toISOString() ?? undefined,
    created_at: tr.created_at.toISOString(),
    updated_at: tr.updated_at.toISOString(),
  };
}

/** Generate TDW-{YYYY}-{000001} style manifest reference. */
async function generateManifestRef(): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await db.select({ total: count() }).from(transportRequestsTable);
  const seq = ((row?.total ?? 0) + 1);
  return `TDW-${year}-${String(seq).padStart(6, "0")}`;
}

// ── POST /deals/:dealId/transport-request ─────────────────────────────────────
// Create a transport request from a confirmed deal.

router.post(
  "/deals/:dealId/transport-request",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const dealId = req.params.dealId as string;

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) {
      res.status(404).json({ error: "NotFound", message: "Deal not found" });
      return;
    }

    const isParty =
      deal.producer_company_id === company.id || deal.buyer_company_id === company.id;
    if (!isParty) {
      res.status(403).json({ error: "Forbidden", message: "Not a party to this deal" });
      return;
    }

    if (!["payment_confirmed", "dispatched", "completed"].includes(deal.status)) {
      res.status(422).json({
        error: "UnprocessableEntity",
        message: "Transport request can only be created after payment is confirmed",
      });
      return;
    }

    // Block if the deal party already decided transport is not required
    if (deal.transport_decision === "not_required") {
      res.status(409).json({
        error: "Conflict",
        message: "Transport has already been marked as not required for this deal",
      });
      return;
    }

    // Check if a transport request already exists for this deal
    const [existing] = await db
      .select({ id: transportRequestsTable.id })
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.deal_id, dealId))
      .limit(1);

    if (existing) {
      res.status(409).json({
        error: "Conflict",
        message: "A transport request already exists for this deal",
        transport_request_id: existing.id,
      });
      return;
    }

    // transport_mode: 'platform' (default) or 'self_managed'
    const rawMode = req.body?.transport_mode;
    const transportMode: "platform" | "self_managed" =
      rawMode === "self_managed" ? "self_managed" : "platform";

    const transporterName =
      typeof req.body?.transporter_name === "string"
        ? req.body.transporter_name.trim() || null
        : null;

    const pickupCity =
      typeof req.body?.pickup_city === "string" ? req.body.pickup_city.trim() || null : null;
    const deliveryCity =
      typeof req.body?.delivery_city === "string" ? req.body.delivery_city.trim() || null : null;
    const wasteDescription =
      typeof req.body?.waste_description === "string"
        ? req.body.waste_description.trim() || null
        : null;
    const vehiclePlate =
      typeof req.body?.vehicle_plate === "string"
        ? req.body.vehicle_plate.trim() || null
        : null;
    const notes =
      typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null;
    const plannedPickupAt =
      typeof req.body?.planned_pickup_at === "string" && req.body.planned_pickup_at
        ? new Date(req.body.planned_pickup_at as string)
        : null;
    const wasteCategoryId =
      typeof req.body?.waste_category_id === "string" ? req.body.waste_category_id || null : null;
    const wasteSubcategoryId =
      typeof req.body?.waste_subcategory_id === "string" ? req.body.waste_subcategory_id || null : null;
    const pickupFacilityName =
      typeof req.body?.pickup_facility_name === "string" ? req.body.pickup_facility_name.trim() || null : null;
    const deliveryFacilityName =
      typeof req.body?.delivery_facility_name === "string" ? req.body.delivery_facility_name.trim() || null : null;

    const manifestRef = await generateManifestRef();

    const [created] = await db
      .insert(transportRequestsTable)
      .values({
        deal_id: dealId,
        created_by_company_id: company.id,
        transport_mode: transportMode,
        transporter_name: transporterName,
        pickup_city: pickupCity,
        delivery_city: deliveryCity,
        waste_description: wasteDescription,
        vehicle_plate: vehiclePlate,
        notes,
        planned_pickup_at: plannedPickupAt,
        waste_category_id: wasteCategoryId,
        waste_subcategory_id: wasteSubcategoryId,
        manifest_ref: manifestRef,
        pickup_facility_name: pickupFacilityName,
        delivery_facility_name: deliveryFacilityName,
        ops_assigned_to: transportMode === "platform" ? "platform-ops" : null,
      })
      .returning();

    res.status(201).json(serializeTR(created));

    // ── Fire-and-forget ops email notification (platform mode only) ──────────
    // Runs after response is sent. Any failure is logged but never affects the TR.
    if (transportMode === "platform") {
      void (async () => {
        try {
          const [listing, producerCo, buyerCo] = await Promise.all([
            db
              .select({
                material: wasteListingsTable.material,
                quantity: wasteListingsTable.quantity,
                city: wasteListingsTable.city,
              })
              .from(wasteListingsTable)
              .where(eq(wasteListingsTable.id, deal.listing_id))
              .limit(1)
              .then((rows) => rows[0] ?? null),
            db
              .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
              .from(companiesTable)
              .where(eq(companiesTable.id, deal.producer_company_id))
              .limit(1)
              .then((rows) => rows[0] ?? null),
            db
              .select({ name: companiesTable.name, contactPhone: companiesTable.contactPhone })
              .from(companiesTable)
              .where(eq(companiesTable.id, deal.buyer_company_id))
              .limit(1)
              .then((rows) => rows[0] ?? null),
          ]);

          await sendTransportRequestNotification({
            dealId: created.deal_id,
            manifestRef: created.manifest_ref ?? null,
            pickupCity: created.pickup_city ?? null,
            deliveryCity: created.delivery_city ?? null,
            wasteDescription: created.waste_description ?? null,
            quantity: listing?.quantity ?? null,
            material: listing?.material ?? null,
            requestedAt: created.created_at.toISOString(),
            producerName: producerCo?.name ?? "—",
            producerPhone: producerCo?.contactPhone ?? "—",
            buyerName: buyerCo?.name ?? "—",
            buyerPhone: buyerCo?.contactPhone ?? "—",
          });
        } catch (err) {
          console.error("[transport-request] ops email dispatch error for deal:", created.deal_id, err);
        }
      })();
    }
  },
);

// ── PATCH /deals/:dealId/transport-decision ───────────────────────────────────
// Record the deal party's transport Smart-Assist decision (not_required).
// Body: { decision: "not_required" }

router.patch(
  "/deals/:dealId/transport-decision",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const dealId = req.params.dealId as string;
    const decision = req.body?.decision as string | undefined;

    if (decision !== "not_required") {
      res.status(400).json({ error: "BadRequest", message: "decision must be 'not_required'" });
      return;
    }

    const [deal] = await db
      .select({
        id: dealsTable.id,
        status: dealsTable.status,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
        transport_decision: dealsTable.transport_decision,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) {
      res.status(404).json({ error: "NotFound", message: "Deal not found" });
      return;
    }

    const isParty =
      deal.producer_company_id === company.id || deal.buyer_company_id === company.id;
    if (!isParty) {
      res.status(403).json({ error: "Forbidden", message: "Not a party to this deal" });
      return;
    }

    const allowedStatuses = ["payment_confirmed", "dispatched", "completed"];
    if (!allowedStatuses.includes(deal.status)) {
      res.status(422).json({
        error: "UnprocessableEntity",
        message: "Transport decision can only be set after payment is confirmed",
      });
      return;
    }

    // Check for existing transport request — can't opt out if one already exists
    const [existingTr] = await db
      .select({ id: transportRequestsTable.id })
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.deal_id, dealId))
      .limit(1);

    if (existingTr) {
      res.status(409).json({
        error: "Conflict",
        message: "A transport request already exists for this deal",
      });
      return;
    }

    const [updated] = await db
      .update(dealsTable)
      .set({ transport_decision: "not_required", updated_at: new Date() })
      .where(eq(dealsTable.id, dealId))
      .returning({ id: dealsTable.id, transport_decision: dealsTable.transport_decision });

    res.json({ deal_id: updated.id, transport_decision: updated.transport_decision });
  },
);

// ── GET /transport-requests/mine ──────────────────────────────────────────────
// Returns all transport requests where this company is creator, transporter,
// producer of the deal, or buyer of the deal.

router.get(
  "/transport-requests/mine",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    // Get deals where company is a party
    const relatedDeals = await db
      .select({ id: dealsTable.id })
      .from(dealsTable)
      .where(
        or(
          eq(dealsTable.producer_company_id, company.id),
          eq(dealsTable.buyer_company_id, company.id),
        ),
      );

    const dealIds = relatedDeals.map((d) => d.id);

    // Get all transport requests where company is directly involved OR deal is related
    const rows = await db
      .select({
        tr: transportRequestsTable,
        transporter_name: companiesTable.name,
      })
      .from(transportRequestsTable)
      .leftJoin(
        companiesTable,
        eq(transportRequestsTable.transporter_company_id, companiesTable.id),
      )
      .where(
        or(
          eq(transportRequestsTable.created_by_company_id, company.id),
          eq(transportRequestsTable.transporter_company_id, company.id),
          // Include TRs for deals this company is a party to
          ...(dealIds.length > 0 ? [inArray(transportRequestsTable.deal_id, dealIds)] : []),
        ),
      )
      .orderBy(desc(transportRequestsTable.created_at));

    // Deduplicate by id (OR conditions can produce duplicates in some drivers)
    const seen = new Set<string>();
    const unique = rows.filter(({ tr }) => {
      if (seen.has(tr.id)) return false;
      seen.add(tr.id);
      return true;
    });

    res.json(
      unique.map(({ tr, transporter_name }) => ({
        ...serializeTR(tr),
        transporter_name: transporter_name ?? undefined,
      })),
    );
  },
);

// ── GET /transport-requests/available ─────────────────────────────────────────
// Returns pending transport requests available for carrier companies to accept.

router.get(
  "/transport-requests/available",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const rows = await db
      .select()
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.status, "pending"))
      .orderBy(desc(transportRequestsTable.created_at));

    res.json(rows.map(serializeTR));
  },
);

// ── GET /transport-requests/:id ───────────────────────────────────────────────

router.get(
  "/transport-requests/:id",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const id = req.params.id as string;

    const [row] = await db
      .select()
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "NotFound", message: "Transport request not found" });
      return;
    }

    // Authorization: must be creator, transporter, or deal party
    const [deal] = await db
      .select({ producer_company_id: dealsTable.producer_company_id, buyer_company_id: dealsTable.buyer_company_id })
      .from(dealsTable)
      .where(eq(dealsTable.id, row.deal_id))
      .limit(1);

    const isParty = deal && (
      deal.producer_company_id === company.id || deal.buyer_company_id === company.id
    );
    const isDirectParty =
      row.created_by_company_id === company.id ||
      row.transporter_company_id === company.id;

    if (!isParty && !isDirectParty) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(serializeTR(row));
  },
);

// ── PATCH /transport-requests/:id/:action ─────────────────────────────────────
// Status transitions: accept | pickup | deliver | close | cancel

const ALLOWED_TRANSITIONS: Record<string, { from: string[]; to: string; timestampField: keyof typeof transportRequestsTable.$inferSelect }> = {
  accept:  { from: ["pending"],   to: "accepted",       timestampField: "updated_at" },
  pickup:  { from: ["accepted", "manifest_ready"], to: "in_transit", timestampField: "actual_pickup_at" },
  deliver: { from: ["in_transit"],                 to: "delivered",  timestampField: "delivered_at" },
  close:   { from: ["delivered"],                  to: "closed",     timestampField: "closed_at" },
  cancel:  { from: ["pending", "accepted", "manifest_ready"], to: "cancelled", timestampField: "cancelled_at" },
  manifest_ready: { from: ["accepted"], to: "manifest_ready", timestampField: "updated_at" },
};

router.patch(
  "/transport-requests/:id/:action",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const id = req.params.id as string;
    const action = req.params.action as string;

    const transition = ALLOWED_TRANSITIONS[action];
    if (!transition) {
      res.status(400).json({ error: "BadRequest", message: `Unknown action: ${action}` });
      return;
    }

    const [row] = await db
      .select()
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "NotFound", message: "Transport request not found" });
      return;
    }

    // Auth: accept requires carrier (any authenticated company for MVP), others require party
    const [deal] = await db
      .select({ producer_company_id: dealsTable.producer_company_id, buyer_company_id: dealsTable.buyer_company_id })
      .from(dealsTable)
      .where(eq(dealsTable.id, row.deal_id))
      .limit(1);

    const isDealParty = deal && (
      deal.producer_company_id === company.id || deal.buyer_company_id === company.id
    );
    const isTransporter = row.transporter_company_id === company.id;
    const isCreator = row.created_by_company_id === company.id;

    if (!isDealParty && !isTransporter && !isCreator) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!transition.from.includes(row.status)) {
      res.status(422).json({
        error: "UnprocessableEntity",
        message: `Cannot ${action} a transport request in status: ${row.status}`,
      });
      return;
    }

    const now = new Date();
    const updates: Partial<typeof transportRequestsTable.$inferInsert> = {
      status: transition.to as typeof row.status,
      updated_at: now,
    };

    // Set specific timestamp fields
    if (action === "pickup") updates.actual_pickup_at = now;
    if (action === "deliver") updates.delivered_at = now;
    if (action === "close")   updates.closed_at = now;
    if (action === "cancel")  updates.cancelled_at = now;

    // When accepting, assign transporter
    if (action === "accept") {
      updates.transporter_company_id = company.id;
    }

    // vehicle_plate can be set/updated on any transition
    if (typeof req.body?.vehicle_plate === "string") {
      updates.vehicle_plate = (req.body.vehicle_plate as string).trim() || null;
    }

    // transporter_name can be set/updated on any transition (self_managed mode)
    if (typeof req.body?.transporter_name === "string") {
      updates.transporter_name = req.body.transporter_name.trim() || null;
    }

    // pickup requires vehicle_plate to be present (on the row or provided now)
    if (action === "pickup") {
      const effectivePlate = updates.vehicle_plate ?? row.vehicle_plate;
      if (!effectivePlate) {
        res.status(422).json({
          error: "VehiclePlateRequired",
          message: "vehicle_plate is required before marking pickup / in-transit",
        });
        return;
      }
    }

    // Allow partial update of optional fields during any transition
    if (typeof req.body?.transporter_company_id === "string" && action === "accept") {
      updates.transporter_company_id = company.id;
    }
    if (typeof req.body?.notes === "string") {
      updates.notes = req.body.notes as string;
    }

    const [updated] = await db
      .update(transportRequestsTable)
      .set(updates)
      .where(eq(transportRequestsTable.id, id))
      .returning();

    res.json(serializeTR(updated));
  },
);

// ── GET /deals/:dealId/mwan-summary ───────────────────────────────────────────
// Returns a structured MWAN-ready summary of a deal: generator, receiver,
// transporter, waste details, quantities, locations, and readiness checklist.

router.get(
  "/deals/:dealId/mwan-summary",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const dealId = req.params.dealId as string;

    const [deal] = await db
      .select({
        id: dealsTable.id,
        status: dealsTable.status,
        settlement_type: dealsTable.settlement_type,
        price_per_unit: dealsTable.price_per_unit,
        estimated_amount: dealsTable.estimated_amount,
        actual_quantity: dealsTable.actual_quantity,
        final_amount: dealsTable.final_amount,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
        payment_confirmed_at: dealsTable.payment_confirmed_at,
        created_at: dealsTable.created_at,
        listing_id: dealsTable.listing_id,
        transport_decision: dealsTable.transport_decision,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) {
      res.status(404).json({ error: "NotFound", message: "Deal not found" });
      return;
    }

    const isParty =
      deal.producer_company_id === company.id || deal.buyer_company_id === company.id;
    if (!isParty) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Fetch generator (producer) and receiver (buyer) company details
    const [generator, receiver] = await Promise.all([
      db
        .select({
          id: companiesTable.id,
          name: companiesTable.name,
          city: companiesTable.city,
          commercialRegistration: companiesTable.commercialRegistration,
          license_number: companiesTable.license_number,
          license_status: companiesTable.license_status,
        })
        .from(companiesTable)
        .where(eq(companiesTable.id, deal.producer_company_id))
        .limit(1)
        .then((r) => r[0] ?? null),

      db
        .select({
          id: companiesTable.id,
          name: companiesTable.name,
          city: companiesTable.city,
          commercialRegistration: companiesTable.commercialRegistration,
          license_number: companiesTable.license_number,
          license_status: companiesTable.license_status,
        })
        .from(companiesTable)
        .where(eq(companiesTable.id, deal.buyer_company_id))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

    // Fetch listing for waste details (including taxonomy FK refs)
    const [listing] = await db
      .select({
        id: wasteListingsTable.id,
        material: wasteListingsTable.material,
        quantity: wasteListingsTable.quantity,
        unit: wasteListingsTable.unit,
        description: wasteListingsTable.description,
        city: wasteListingsTable.city,
        material_category_id: wasteListingsTable.material_category_id,
        material_subcategory_id: wasteListingsTable.material_subcategory_id,
      })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, deal.listing_id))
      .limit(1);

    // Fetch taxonomy details for category and subcategory (if set)
    const categoryIds = [
      listing?.material_category_id,
      listing?.material_subcategory_id,
    ].filter((id): id is string => typeof id === "string");

    const taxonomyRows = categoryIds.length > 0
      ? await db
          .select({
            id: materialCategoriesTable.id,
            key: materialCategoriesTable.key,
            name_ar: materialCategoriesTable.name_ar,
            name_en: materialCategoriesTable.name_en,
            parent_id: materialCategoriesTable.parent_id,
            regulatory_code: materialCategoriesTable.regulatory_code,
            hazard_level: materialCategoriesTable.hazard_level,
            physical_state: materialCategoriesTable.physical_state,
          })
          .from(materialCategoriesTable)
          .where(inArray(materialCategoriesTable.id, categoryIds))
      : [];

    const catMap = Object.fromEntries(taxonomyRows.map((r) => [r.id, r]));
    const category = listing?.material_category_id
      ? (catMap[listing.material_category_id] ?? null)
      : null;
    const subcategory = listing?.material_subcategory_id
      ? (catMap[listing.material_subcategory_id] ?? null)
      : null;

    // Fetch associated transport request if any
    const [tr] = await db
      .select({
        id: transportRequestsTable.id,
        status: transportRequestsTable.status,
        transport_mode: transportRequestsTable.transport_mode,
        transporter_company_id: transportRequestsTable.transporter_company_id,
        transporter_name: transportRequestsTable.transporter_name,
        vehicle_plate: transportRequestsTable.vehicle_plate,
        pickup_city: transportRequestsTable.pickup_city,
        delivery_city: transportRequestsTable.delivery_city,
        waste_description: transportRequestsTable.waste_description,
        manifest_ref: transportRequestsTable.manifest_ref,
        pickup_facility_name: transportRequestsTable.pickup_facility_name,
        delivery_facility_name: transportRequestsTable.delivery_facility_name,
        planned_pickup_at: transportRequestsTable.planned_pickup_at,
        actual_pickup_at: transportRequestsTable.actual_pickup_at,
        delivered_at: transportRequestsTable.delivered_at,
      })
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.deal_id, dealId))
      .limit(1);

    // For platform mode: fetch registered carrier company details
    let transporterCompany = null;
    if (tr?.transport_mode === "platform" && tr.transporter_company_id) {
      const [tc] = await db
        .select({
          id: companiesTable.id,
          name: companiesTable.name,
          city: companiesTable.city,
          license_number: companiesTable.license_number,
        })
        .from(companiesTable)
        .where(eq(companiesTable.id, tr.transporter_company_id))
        .limit(1);
      transporterCompany = tc ?? null;
    }

    // transporter_assigned: for platform mode — a carrier accepted the job;
    //                        for self_managed mode — transporter_name is filled
    const transporterAssigned = tr
      ? tr.transport_mode === "self_managed"
        ? !!(tr.transporter_name?.trim())
        : !!transporterCompany
      : false;

    // ── MWAN Readiness Checklist ──────────────────────────────────────────────
    // Each field required for a valid MWAN eManifest entry.
    const checks = {
      generator_cr: !!generator?.commercialRegistration,
      generator_license: !!generator?.license_number,
      generator_city: !!generator?.city,
      receiver_cr: !!receiver?.commercialRegistration,
      receiver_license: !!receiver?.license_number,
      receiver_city: !!receiver?.city,
      waste_defined: !!listing,
      // Fixed deals have a known quantity from the listing — always confirmed.
      // By-weight deals are confirmed only when actual_quantity is set at dispatch.
      quantity_confirmed:
        deal.settlement_type === "fixed" ? true : deal.actual_quantity != null,
      payment_confirmed: deal.payment_confirmed_at != null,
      transport_request_created: !!tr,
      transporter_assigned: transporterAssigned,
      vehicle_plate_set: !!(tr?.vehicle_plate?.trim()),
      pickup_city_set: !!(tr?.pickup_city),
      delivery_city_set: !!(tr?.delivery_city),
      waste_description_set: !!(tr?.waste_description),
    };

    const readyCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;
    const isManifestReady = readyCount === totalCount;

    res.json({
      deal_id: dealId,
      deal_status: deal.status,
      is_manifest_ready: isManifestReady,
      readiness_score: `${readyCount}/${totalCount}`,
      transport_decision: deal.transport_decision ?? null,
      checks,
      generator: generator
        ? {
            id: generator.id,
            name: generator.name,
            city: generator.city,
            commercial_registration: generator.commercialRegistration ?? undefined,
            license_number: generator.license_number ?? undefined,
            license_status: generator.license_status ?? undefined,
          }
        : null,
      receiver: receiver
        ? {
            id: receiver.id,
            name: receiver.name,
            city: receiver.city,
            commercial_registration: receiver.commercialRegistration ?? undefined,
            license_number: receiver.license_number ?? undefined,
            license_status: receiver.license_status ?? undefined,
          }
        : null,
      transporter: tr?.transport_mode === "self_managed"
        ? (tr.transporter_name ? { name: tr.transporter_name, mode: "self_managed" } : null)
        : transporterCompany
          ? {
              id: transporterCompany.id,
              name: transporterCompany.name,
              city: transporterCompany.city,
              license_number: transporterCompany.license_number ?? undefined,
              mode: "platform",
            }
          : null,
      waste: listing
        ? {
            material: listing.material,
            quantity: listing.quantity,
            unit: listing.unit,
            description: listing.description ?? undefined,
            origin_city: listing.city,
          }
        : null,
      waste_taxonomy: {
        category: category
          ? {
              id: category.id,
              key: category.key,
              name_ar: category.name_ar,
              name_en: category.name_en,
              regulatory_code: category.regulatory_code ?? null,
              hazard_level: category.hazard_level ?? null,
              physical_state: category.physical_state ?? null,
            }
          : null,
        subcategory: subcategory
          ? {
              id: subcategory.id,
              key: subcategory.key,
              name_ar: subcategory.name_ar,
              name_en: subcategory.name_en,
              regulatory_code: subcategory.regulatory_code ?? null,
              hazard_level: subcategory.hazard_level ?? null,
              physical_state: subcategory.physical_state ?? null,
            }
          : null,
      },
      financials: {
        settlement_type: deal.settlement_type,
        price_per_unit: deal.price_per_unit,
        estimated_amount: deal.estimated_amount,
        actual_quantity: deal.actual_quantity ?? undefined,
        final_amount: deal.final_amount ?? undefined,
      },
      transport: tr
        ? {
            id: tr.id,
            status: tr.status,
            transport_mode: tr.transport_mode,
            manifest_ref: tr.manifest_ref ?? undefined,
            pickup_facility_name: tr.pickup_facility_name ?? undefined,
            delivery_facility_name: tr.delivery_facility_name ?? undefined,
            transporter_name: tr.transporter_name ?? undefined,
            vehicle_plate: tr.vehicle_plate ?? undefined,
            pickup_city: tr.pickup_city ?? undefined,
            delivery_city: tr.delivery_city ?? undefined,
            waste_description: tr.waste_description ?? undefined,
            planned_pickup_at: tr.planned_pickup_at?.toISOString() ?? undefined,
            actual_pickup_at: tr.actual_pickup_at?.toISOString() ?? undefined,
            delivered_at: tr.delivered_at?.toISOString() ?? undefined,
          }
        : null,
    });
  },
);

// ── GET /deals/:dealId/transport-requests/:tid/summary.pdf ───────────────────
// Generates a printable single-page PDF movement summary.

router.get(
  "/deals/:dealId/transport-requests/:tid/summary.pdf",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const dealId = req.params.dealId as string;
    const tid    = req.params.tid    as string;

    // Fetch deal (auth check + party IDs)
    const [deal] = await db
      .select({
        id: dealsTable.id,
        status: dealsTable.status,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
        listing_id: dealsTable.listing_id,
        settlement_type: dealsTable.settlement_type,
        estimated_amount: dealsTable.estimated_amount,
        actual_quantity: dealsTable.actual_quantity,
        final_amount: dealsTable.final_amount,
        price_per_unit: dealsTable.price_per_unit,
        created_at: dealsTable.created_at,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!deal) { res.status(404).json({ error: "NotFound" }); return; }
    const isParty = deal.producer_company_id === company.id || deal.buyer_company_id === company.id;
    if (!isParty) { res.status(403).json({ error: "Forbidden" }); return; }

    // Fetch transport request
    const [tr] = await db
      .select()
      .from(transportRequestsTable)
      .where(and(eq(transportRequestsTable.id, tid), eq(transportRequestsTable.deal_id, dealId)))
      .limit(1);

    if (!tr) { res.status(404).json({ error: "TransportRequestNotFound" }); return; }

    // Fetch both companies
    const companyIds = [...new Set([deal.producer_company_id, deal.buyer_company_id])];
    const companies = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        city: companiesTable.city,
        commercialRegistration: companiesTable.commercialRegistration,
      })
      .from(companiesTable)
      .where(inArray(companiesTable.id, companyIds));

    const compMap = Object.fromEntries(companies.map((c) => [c.id, c]));
    const producer = compMap[deal.producer_company_id];
    const buyer    = compMap[deal.buyer_company_id];

    // Fetch waste listing
    const [listing] = deal.listing_id
      ? await db
          .select({ quantity: wasteListingsTable.quantity, unit: wasteListingsTable.unit, material_category_id: wasteListingsTable.material_category_id })
          .from(wasteListingsTable)
          .where(eq(wasteListingsTable.id, deal.listing_id))
          .limit(1)
      : [null];

    // Fetch category (TR category override or listing category)
    const catId = tr.waste_category_id ?? listing?.material_category_id;
    const [cat] = catId
      ? await db
          .select({ name_ar: materialCategoriesTable.name_ar, name_en: materialCategoriesTable.name_en, regulatory_code: materialCategoriesTable.regulatory_code, physical_state: materialCategoriesTable.physical_state })
          .from(materialCategoriesTable)
          .where(eq(materialCategoriesTable.id, catId))
          .limit(1)
      : [null];

    // ── Build PDF ────────────────────────────────────────────────────────────

    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Tadweerah Movement Summary — ${tr.manifest_ref ?? dealId}` } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tadweerah-${tr.manifest_ref ?? dealId}.pdf"`,
    );
    doc.pipe(res);

    const primaryColor = "#1d4ed8";
    const green        = "#166534";
    const grey         = "#64748b";
    const pageWidth    = doc.page.width - 96; // usable width

    // Header bar
    doc.rect(48, 48, pageWidth, 44).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold")
       .text("Tadweerah · تدويرة", 64, 62, { lineBreak: false });
    doc.fontSize(10).font("Helvetica")
       .text("Movement Summary / ملخص حركة النفايات", 0, 66, { align: "right", width: pageWidth + 48 });

    doc.moveDown(3.2);

    // Manifest ref + date
    const manifestLine = tr.manifest_ref ? `Manifest Ref: ${tr.manifest_ref}` : `Deal ID: ${dealId}`;
    doc.fillColor(primaryColor).fontSize(14).font("Helvetica-Bold").text(manifestLine, 48, doc.y);
    doc.fillColor(grey).fontSize(9).font("Helvetica")
       .text(`Date: ${new Date().toISOString().split("T")[0]}   Status: ${deal.status.toUpperCase()}`, { align: "left" });

    doc.moveDown(0.8);
    doc.moveTo(48, doc.y).lineTo(48 + pageWidth, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.moveDown(0.8);

    // Section helper
    function section(title: string, rows: [string, string | undefined | null][]): void {
      doc.fillColor(green).fontSize(10).font("Helvetica-Bold").text(title.toUpperCase());
      doc.moveDown(0.3);
      for (const [label, value] of rows) {
        if (!value) continue;
        doc.fillColor(grey).fontSize(9).font("Helvetica")
           .text(label + ":", { continued: true, width: 140 });
        doc.fillColor("#1e293b").font("Helvetica-Bold")
           .text(" " + value, { indent: 0 });
      }
      doc.moveDown(0.8);
    }

    // Generator (Producer)
    section("Generator / المُولِّد", [
      ["Company", producer?.name],
      ["CR Number", producer?.commercialRegistration],
      ["City", producer?.city],
      ["Pickup Facility", tr.pickup_facility_name],
    ]);

    // Receiver (Buyer)
    section("Receiver / المُستقبِل", [
      ["Company", buyer?.name],
      ["CR Number", buyer?.commercialRegistration],
      ["City", buyer?.city],
      ["Delivery Facility", tr.delivery_facility_name],
    ]);

    // Waste
    const qty = deal.actual_quantity ?? deal.estimated_amount;
    section("Waste / النفايات", [
      ["Category (AR)", cat?.name_ar],
      ["Category (EN)", cat?.name_en],
      ["Regulatory Code", cat?.regulatory_code],
      ["Physical State", cat?.physical_state],
      ["Quantity", qty ? `${Number(qty).toLocaleString()} ${listing?.unit ?? ""}`.trim() : undefined],
    ]);

    // Transport
    section("Transport / النقل", [
      ["Transporter", tr.transporter_name],
      ["Vehicle Plate", tr.vehicle_plate],
      ["Pickup City", tr.pickup_city],
      ["Delivery City", tr.delivery_city],
    ]);

    // Footer
    const footerY = doc.page.height - 56;
    doc.moveTo(48, footerY - 8).lineTo(48 + pageWidth, footerY - 8).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.fillColor(grey).fontSize(8).font("Helvetica")
       .text("Generated by Tadweerah Platform · منصة تدويرة للنفايات الصناعية", 48, footerY, { align: "center", width: pageWidth });

    doc.end();
  },
);

export default router;
