import { Router, type IRouter } from "express";
import { and, eq, or, inArray, desc, count } from "drizzle-orm";
import PDFDocument from "pdfkit";
import {
  db,
  dealsTable,
  transportRequestsTable,
  transportQuotesTable,
  companyRolesTable,
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

    // ── Fire-and-forget ops email notification (all modes) ───────────────────
    // Sent for every TR regardless of mode — ops must be notified even for
    // self_managed requests (to log, track, and follow up if needed).
    // Runs after response is sent; failures are logged but never affect the TR.
    void (async () => {
      try {
        const [listing, producerCo, buyerCo] = await Promise.all([
          db
            .select({
              material: wasteListingsTable.material,
              quantity: wasteListingsTable.quantity,
              unit: wasteListingsTable.unit,
              city: wasteListingsTable.city,
              pickupAddress: wasteListingsTable.material_location_address,
              siteDetails: wasteListingsTable.material_location_notes,
              googleMapsUrl: wasteListingsTable.google_maps_url,
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

        const emailSent = await sendTransportRequestNotification({
          dealId: created.deal_id,
          listingId: deal.listing_id,
          transportMode,
          manifestRef: created.manifest_ref ?? null,
          pickupCity: created.pickup_city ?? null,
          deliveryCity: created.delivery_city ?? null,
          wasteDescription: created.waste_description ?? null,
          quantity: listing?.quantity ?? null,
          unit: listing?.unit ?? null,
          material: listing?.material ?? null,
          requestedAt: created.created_at.toISOString(),
          producerName: producerCo?.name ?? "—",
          producerPhone: producerCo?.contactPhone ?? "—",
          buyerName: buyerCo?.name ?? "—",
          buyerPhone: buyerCo?.contactPhone ?? "—",
          pickupAddress: listing?.pickupAddress ?? null,
          siteDetails: listing?.siteDetails ?? null,
          googleMapsUrl: listing?.googleMapsUrl ?? null,
        });

        // Mark email_sent flag so ops can identify any delivery failures
        if (emailSent) {
          await db
            .update(transportRequestsTable)
            .set({ email_sent: true })
            .where(eq(transportRequestsTable.id, created.id));
        }
      } catch (err) {
        req.log?.error({ err, dealId: created.deal_id }, "[transport-request] ops email dispatch error");
      }
    })();
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
        payment_confirmed_at: dealsTable.payment_confirmed_at,
        payment_submitted_at: dealsTable.payment_submitted_at,
        payment_reference: dealsTable.payment_reference,
        payment_proof_url: dealsTable.payment_proof_url,
        dispatched_at: dealsTable.dispatched_at,
        received_at: dealsTable.received_at,
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
        contactPhone: companiesTable.contactPhone,
      })
      .from(companiesTable)
      .where(inArray(companiesTable.id, companyIds));

    const compMap = Object.fromEntries(companies.map((c) => [c.id, c]));
    const producer = compMap[deal.producer_company_id];
    const buyer    = compMap[deal.buyer_company_id];

    // Fetch waste listing
    const [listing] = deal.listing_id
      ? await db
          .select({
            quantity: wasteListingsTable.quantity,
            unit: wasteListingsTable.unit,
            material: wasteListingsTable.material,
            description: wasteListingsTable.description,
            material_category_id: wasteListingsTable.material_category_id,
            material_subcategory_id: wasteListingsTable.material_subcategory_id,
          })
          .from(wasteListingsTable)
          .where(eq(wasteListingsTable.id, deal.listing_id))
          .limit(1)
      : [null];

    // Collect all category IDs to fetch in one query
    const catIdsToFetch = [
      listing?.material_category_id,
      listing?.material_subcategory_id,
      tr.waste_category_id,
    ].filter((id): id is string => !!id);

    const catRows = catIdsToFetch.length
      ? await db
          .select({
            id: materialCategoriesTable.id,
            name_ar: materialCategoriesTable.name_ar,
            name_en: materialCategoriesTable.name_en,
            regulatory_code: materialCategoriesTable.regulatory_code,
            physical_state: materialCategoriesTable.physical_state,
            parent_id: materialCategoriesTable.parent_id,
          })
          .from(materialCategoriesTable)
          .where(inArray(materialCategoriesTable.id, catIdsToFetch))
      : [];

    const catMap = Object.fromEntries(catRows.map((r) => [r.id, r]));

    // Resolve category (parent = null) and subcategory (has parent)
    const cat    = listing?.material_category_id    ? catMap[listing.material_category_id]    ?? null : null;
    const subCat = listing?.material_subcategory_id ? catMap[listing.material_subcategory_id] ?? null : null;
    // TR waste_category_id override — could be either level; use for regulatory fields if no listing cat
    const trCat  = tr.waste_category_id             ? catMap[tr.waste_category_id]             ?? null : null;
    // Determine which record carries regulatory metadata (prefer subcategory → category → TR)
    const regCat = subCat ?? cat ?? trCat;

    // ── Build PDF ────────────────────────────────────────────────────────────

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: `Tadweerah Deal Report — ${tr.manifest_ref ?? dealId.slice(0, 8).toUpperCase()}` },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tadweerah-${tr.manifest_ref ?? dealId.slice(0, 8)}.pdf"`,
    );
    doc.pipe(res);

    // ── Palette ─────────────────────────────────────────────────────────────
    const blue       = "#1d4ed8";
    const blueDark   = "#1e3a8a";
    const blueLight  = "#dbeafe";
    const ink        = "#1e293b";
    const muted      = "#64748b";
    const border     = "#e2e8f0";
    const green      = "#15803d";
    const greenBg    = "#f0fdf4";
    const amber      = "#b45309";
    const white      = "#ffffff";

    const W   = doc.page.width;   // 595.28
    const H   = doc.page.height;  // 841.89
    const ML  = 48;               // left margin
    const MR  = 48;               // right margin
    const PW  = W - ML - MR;     // printable width = 499.28
    let   Y   = 0;                // running y cursor

    // ─────────────────────────────────────────────────────────────────────────
    // 1. HEADER BAR
    // ─────────────────────────────────────────────────────────────────────────
    const HEADER_H = 72;
    doc.rect(0, Y, W, HEADER_H).fill(blue);

    // Brand name left
    doc.fillColor(white).fontSize(20).font("Helvetica-Bold")
       .text("Tadweerah", ML, 20, { lineBreak: false });
    doc.fillColor("#93c5fd").fontSize(20).font("Helvetica")
       .text("  ·  تدويرة", ML + 95, 20, { lineBreak: false });

    // Subtitle right
    doc.fillColor("#bfdbfe").fontSize(9).font("Helvetica")
       .text("سجل العملية التجارية  /  Transaction Record", ML, 48, { width: PW, align: "right" });

    Y = HEADER_H;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DEAL HIGHLIGHT BOX  (ref header + 3-column summary)
    // ─────────────────────────────────────────────────────────────────────────
    const todayStr = new Date().toISOString().split("T")[0]!;
    const refLabel = tr.manifest_ref ?? `#${dealId.slice(0, 8).toUpperCase()}`;

    // Ref / date sub-bar
    const REFBAR_H = 32;
    doc.rect(0, Y, W, REFBAR_H).fill("#f1f5f9");
    doc.moveTo(0, Y + REFBAR_H).lineTo(W, Y + REFBAR_H).strokeColor(border).lineWidth(0.5).stroke();
    doc.fillColor(blue).fontSize(11).font("Helvetica-Bold")
       .text(refLabel, ML, Y + 9, { lineBreak: false });
    doc.fillColor(muted).fontSize(8).font("Helvetica")
       .text(`تاريخ التقرير: ${todayStr}  /  Report Date: ${todayStr}`, ML, Y + 12, { width: PW, align: "right" });
    Y += REFBAR_H;

    // 3-column highlight cards
    const statusLabel = deal.status === "completed"          ? "مكتملة  /  Completed"
                      : deal.status === "dispatched"         ? "في الطريق  /  Dispatched"
                      : deal.status === "payment_confirmed"  ? "مؤكدة  /  Confirmed"
                      : deal.status === "active"             ? "نشطة  /  Active"
                      : deal.status === "cancelled"          ? "ملغاة  /  Cancelled"
                      : deal.status.toUpperCase();
    const statusColor = deal.status === "completed"  ? green
                      : deal.status === "dispatched" ? blue
                      : deal.status === "cancelled"  ? "#dc2626"
                      : amber;

    const dealValue = deal.final_amount
      ? `${Number(deal.final_amount).toLocaleString()} ريال`
      : deal.estimated_amount
        ? `${Number(deal.estimated_amount).toLocaleString()} ريال`
        : "—";
    const completionDate = deal.received_at
      ? new Date(deal.received_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
      : deal.dispatched_at
        ? new Date(deal.dispatched_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
        : "—";

    const CARD_TOP   = Y + 12;
    const CARD_H     = 60;
    const NCOLS      = 3;
    const COL_W      = PW / NCOLS;

    type SumCard = { titleAr: string; titleEn: string; value: string; color: string };
    const sumCards: SumCard[] = [
      { titleAr: "الحالة", titleEn: "Status",          value: statusLabel,    color: statusColor },
      { titleAr: "قيمة الصفقة", titleEn: "Deal Value", value: dealValue,      color: blue },
      { titleAr: "تاريخ الإتمام", titleEn: "Completion", value: completionDate, color: ink },
    ];

    sumCards.forEach((card, i) => {
      const cx = ML + COL_W * i;
      // Card background
      doc.rect(cx, CARD_TOP, COL_W - 6, CARD_H).fill("#f8fafc");
      doc.rect(cx, CARD_TOP, COL_W - 6, CARD_H).strokeColor(border).lineWidth(0.5).stroke();
      // Top colour accent line
      doc.rect(cx, CARD_TOP, COL_W - 6, 3).fill(card.color);
      // Labels
      doc.fillColor(muted).fontSize(7).font("Helvetica")
         .text(`${card.titleAr}  /  ${card.titleEn}`, cx + 6, CARD_TOP + 10, { width: COL_W - 18 });
      // Value
      doc.fillColor(card.color).fontSize(10).font("Helvetica-Bold")
         .text(card.value, cx + 6, CARD_TOP + 24, { width: COL_W - 18 });
    });

    Y = CARD_TOP + CARD_H + 18;

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Section title with coloured left accent bar */
    function sectionTitle(title: string): void {
      doc.rect(ML, Y, 3, 14).fill(blue);
      doc.fillColor(ink).fontSize(10).font("Helvetica-Bold")
         .text(title, ML + 9, Y + 1);
      Y += 20;
    }

    /** Horizontal rule */
    function hr(gap = 12): void {
      Y += gap / 2;
      doc.moveTo(ML, Y).lineTo(ML + PW, Y).strokeColor(border).lineWidth(0.5).stroke();
      Y += gap / 2;
    }

    /** Single row in a section: label ── value */
    function row(label: string, value: string | null | undefined, opts?: { bold?: boolean }): void {
      if (!value) return;
      const COL = 160;
      doc.fillColor(muted).fontSize(8.5).font("Helvetica")
         .text(label, ML, Y, { width: COL, lineBreak: false });
      doc.fillColor(ink).fontSize(8.5).font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
         .text(value, ML + COL, Y, { width: PW - COL });
      Y += 15;
    }

    /** Two-column party card */
    function partyCard(
      label: string,
      name: string | undefined,
      cr: string | undefined,
      city: string | undefined,
      phone: string | undefined,
      facility: string | undefined,
      x: number,
      w: number,
    ): void {
      const cardH = 90;
      doc.rect(x, Y, w, cardH).fill(blueLight);
      doc.rect(x, Y, w, 18).fill(blue);
      doc.fillColor(white).fontSize(7.5).font("Helvetica-Bold")
         .text(label, x + 6, Y + 5, { width: w - 12 });
      let cy = Y + 24;
      const labelW = 70;
      function cRow(l: string, v: string | undefined): void {
        if (!v) return;
        doc.fillColor(muted).fontSize(7.5).font("Helvetica").text(l, x + 6, cy, { width: labelW, lineBreak: false });
        doc.fillColor(ink).fontSize(7.5).font("Helvetica-Bold").text(v, x + 6 + labelW, cy, { width: w - labelW - 12 });
        cy += 13;
      }
      cRow("الاسم / Name:", name);
      cRow("س.ت / CR:", cr);
      cRow("المدينة / City:", city);
      cRow("هاتف / Phone:", phone);
      cRow("المنشأة / Facility:", facility);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. MATERIAL DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    sectionTitle("تفاصيل المادة  /  Material Details");

    const qty = deal.actual_quantity ?? deal.estimated_amount;
    const qtyStr = qty ? `${Number(qty).toLocaleString()} ${listing?.unit ?? ""}`.trim() : undefined;

    // Category row (top-level parent, e.g., "معادن / Metals")
    if (cat) {
      row("الفئة / Category:", `${cat.name_ar}${cat.name_en ? "  /  " + cat.name_en : ""}`);
    }
    // Material name = subcategory (specific, e.g., "حديد وصلب / Iron & Steel")
    if (subCat) {
      row("المادة / Material:", `${subCat.name_ar}${subCat.name_en ? "  /  " + subCat.name_en : ""}`, { bold: true });
    } else if (!cat && trCat) {
      // Fallback: TR override only
      row("الفئة / Category:", `${trCat.name_ar}${trCat.name_en ? "  /  " + trCat.name_en : ""}`);
    }
    // Regulatory fields from most specific record
    if (regCat?.regulatory_code) row("الكود التنظيمي / Reg. Code:", regCat.regulatory_code);
    if (regCat?.physical_state)  row("الحالة المادية / Physical State:", regCat.physical_state);
    row("الكمية / Quantity:", qtyStr, { bold: true });

    // Description block (full-width if present)
    if (listing?.description) {
      Y += 4;
      doc.rect(ML, Y, PW, 8).fill("#f1f5f9");
      doc.fillColor(muted).fontSize(7.5).font("Helvetica-Bold")
         .text("وصف المادة  /  Material Description", ML + 4, Y + 1);
      Y += 10;
      const descH = Math.max(24, Math.ceil(listing.description.length / 80) * 12 + 8);
      doc.rect(ML, Y, PW, descH).fill("#f8fafc");
      doc.rect(ML, Y, 2, descH).fill(blue);
      doc.fillColor(ink).fontSize(8.5).font("Helvetica")
         .text(listing.description, ML + 8, Y + 5, { width: PW - 16 });
      Y += descH + 8;
    } else {
      Y += 4;
    }

    hr();

    // ─────────────────────────────────────────────────────────────────────────
    // 3.5. PAYMENT DETAILS (If available)
    // ─────────────────────────────────────────────────────────────────────────
    if (deal.payment_reference || deal.payment_submitted_at) {
      sectionTitle("تفاصيل الدفع  /  Payment Details");
      
      row("حالة الدفع / Payment Status:", deal.payment_confirmed_at ? "تم التأكيد / Confirmed" : "قيد المراجعة / Under Review", { bold: true });
      row("مرجع الحوالة / Transfer Ref:", deal.payment_reference);
      
      if (deal.payment_submitted_at) {
        row("تاريخ الإرسال / Submitted Date:", fmt(deal.payment_submitted_at));
      }
      
      if (deal.payment_proof_url) {
        row("إيصال التحويل / Transfer Receipt:", "مرفق في لوحة الصفقة / Attached in Deal Panel");
      }
      
      Y += 4;
      hr();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. PARTIES (two-column cards)
    // ─────────────────────────────────────────────────────────────────────────
    sectionTitle("أطراف الصفقة  /  Transaction Parties");

    const CARD_GAP  = 12;
    const CARD_W    = (PW - CARD_GAP) / 2;
    partyCard(
      "المُولِّد (البائع)  /  Generator (Seller)",
      producer?.name,
      producer?.commercialRegistration ?? undefined,
      producer?.city ?? undefined,
      producer?.contactPhone,
      tr.pickup_facility_name ?? undefined,
      ML, CARD_W,
    );
    partyCard(
      "المُستقبِل (المشتري)  /  Receiver (Buyer)",
      buyer?.name,
      buyer?.commercialRegistration ?? undefined,
      buyer?.city ?? undefined,
      buyer?.contactPhone,
      tr.delivery_facility_name ?? undefined,
      ML + CARD_W + CARD_GAP, CARD_W,
    );
    Y += 94;

    hr();

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TRANSPORT DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    const hasTransport = !!(tr.transporter_name || tr.vehicle_plate || tr.pickup_city || tr.delivery_city);
    if (hasTransport) {
      sectionTitle("تفاصيل النقل  /  Transport Details");
      row("شركة النقل / Transporter:", tr.transporter_name);
      row("لوحة المركبة / Vehicle Plate:", tr.vehicle_plate);
      row("مدينة الاستلام / Pickup City:", tr.pickup_city);
      row("مدينة التسليم / Delivery City:", tr.delivery_city);
      if (tr.waste_description) row("وصف النفايات / Waste Description:", tr.waste_description);
      Y += 4;
      hr();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. TIMELINE
    // ─────────────────────────────────────────────────────────────────────────
    sectionTitle("الجدول الزمني  /  Transaction Timeline");

    type TimelineStep = { label: string; date: Date | null | undefined; done: boolean };
    const fmt = (d: Date | null | undefined): string =>
      d ? new Date(d).toLocaleDateString("en-SA", { year: "numeric", month: "short", day: "numeric" }) : "—";

    const steps: TimelineStep[] = [
      { label: "إنشاء الصفقة\nDeal Created",         date: deal.created_at,           done: true },
      { label: "تأكيد الدفع\nPayment Confirmed",      date: deal.payment_confirmed_at,  done: !!deal.payment_confirmed_at },
      { label: "تم الشحن\nDispatched",                date: deal.dispatched_at,         done: !!deal.dispatched_at },
      { label: "استلام البضاعة\nGoods Received",      date: deal.received_at,           done: !!deal.received_at },
    ];

    const STEP_W = PW / steps.length;
    const DOT_R  = 6;
    const LINE_Y = Y + 18;

    // Connecting line
    doc.moveTo(ML + DOT_R, LINE_Y).lineTo(ML + PW - DOT_R, LINE_Y)
       .strokeColor(border).lineWidth(1.5).stroke();

    steps.forEach((step, i) => {
      const cx = ML + STEP_W * i + STEP_W / 2;
      const color = step.done ? green : "#cbd5e1";
      doc.circle(cx, LINE_Y, DOT_R).fill(color);
      if (step.done) {
        // Checkmark
        doc.moveTo(cx - 3, LINE_Y).lineTo(cx - 1, LINE_Y + 2.5).lineTo(cx + 3.5, LINE_Y - 3)
           .strokeColor(white).lineWidth(1.5).stroke();
      }
      doc.fillColor(step.done ? ink : "#94a3b8").fontSize(7).font("Helvetica-Bold")
         .text(step.label.split("\n")[0]!, cx - STEP_W / 2 + 4, LINE_Y + 11, { width: STEP_W - 8, align: "center" });
      doc.fillColor(muted).fontSize(6.5).font("Helvetica")
         .text(step.label.split("\n")[1]!, cx - STEP_W / 2 + 4, LINE_Y + 20, { width: STEP_W - 8, align: "center" });
      doc.fillColor(step.done ? green : "#94a3b8").fontSize(7).font("Helvetica")
         .text(fmt(step.date), cx - STEP_W / 2 + 4, LINE_Y + 30, { width: STEP_W - 8, align: "center" });
    });

    Y = LINE_Y + 50;
    hr();

    // ─────────────────────────────────────────────────────────────────────────
    // 7. ATTESTATION BLOCK
    // ─────────────────────────────────────────────────────────────────────────
    const attestH = 56;
    doc.rect(ML, Y, PW, attestH).fill(greenBg);
    doc.rect(ML, Y, PW, attestH).strokeColor(green).lineWidth(0.5).stroke();
    doc.fillColor(green).fontSize(9).font("Helvetica-Bold")
       .text("إقرار توثيق الصفقة  /  Transaction Attestation", ML + 8, Y + 8, { width: PW - 16 });
    doc.fillColor(ink).fontSize(7.5).font("Helvetica")
       .text(
         "تم تنفيذ هذه الصفقة التجارية وتوثيقها إلكترونياً عبر منصة تدويرة للنفايات الصناعية. " +
         "يُعدّ هذا المستند سجلاً رسمياً لحركة المواد ويتوافق مع متطلبات نظام إدارة النفايات الصناعية في المملكة العربية السعودية.\n" +
         "This transaction was executed and digitally recorded on the Tadweerah industrial waste platform, " +
         "in alignment with Saudi Arabia's industrial waste management regulatory requirements.",
         ML + 8, Y + 22, { width: PW - 16 },
       );
    Y += attestH + 4;

    // ─────────────────────────────────────────────────────────────────────────
    // 8. FOOTER
    // ─────────────────────────────────────────────────────────────────────────
    const FOOTER_H = 36;
    const footerY = H - FOOTER_H;
    doc.rect(0, footerY, W, FOOTER_H).fill(blueDark);
    doc.fillColor("#93c5fd").fontSize(8).font("Helvetica-Bold")
       .text(
         "منصة تدويرة للنفايات الصناعية",
         ML, footerY + 8, { width: PW, align: "center" },
       );
    doc.fillColor("#bfdbfe").fontSize(7.5).font("Helvetica")
       .text(
         `info@tadweerah.com  ·  www.tadweerah.com  ·  تاريخ التقرير: ${todayStr}`,
         ML, footerY + 20, { width: PW, align: "center" },
       );

    doc.end();
  },
);

// ── Transport Quotes ──────────────────────────────────────────────────────────

/** Check that the authenticated company has the 'transporter' MWAN role. */
async function requireTransporterRole(companyId: string): Promise<boolean> {
  const [row] = await db
    .select({ company_id: companyRolesTable.company_id })
    .from(companyRolesTable)
    .where(
      and(
        eq(companyRolesTable.company_id, companyId),
        eq(companyRolesTable.role, "transporter"),
      ),
    )
    .limit(1);
  return !!row;
}

function serializeQuote(
  q: typeof transportQuotesTable.$inferSelect,
  transporter_name?: string | null,
) {
  return {
    id: q.id,
    transport_request_id: q.transport_request_id,
    transporter_company_id: q.transporter_company_id,
    transporter_name: transporter_name ?? undefined,
    price_total: q.price_total,
    truck_count: q.truck_count,
    truck_type: q.truck_type ?? undefined,
    notes: q.notes ?? undefined,
    status: q.status,
    created_at: q.created_at.toISOString(),
    updated_at: q.updated_at.toISOString(),
  };
}

// ── POST /transport-requests/:id/quotes ───────────────────────────────────────
// Transporter company submits a price quote for a pending transport request.

router.post(
  "/transport-requests/:id/quotes",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const trId = req.params.id as string;

    // Must have transporter role
    const isTransporter = await requireTransporterRole(company.id);
    if (!isTransporter) {
      res.status(403).json({ error: "Forbidden", message: "Company does not have the transporter role" });
      return;
    }

    // TR must exist and be in pending status
    const [tr] = await db
      .select({ id: transportRequestsTable.id, status: transportRequestsTable.status })
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.id, trId))
      .limit(1);

    if (!tr) {
      res.status(404).json({ error: "NotFound", message: "Transport request not found" });
      return;
    }

    if (tr.status !== "pending") {
      res.status(422).json({ error: "UnprocessableEntity", message: "Transport request is not open for quotes" });
      return;
    }

    // Prevent duplicate quotes from the same company
    const [existing] = await db
      .select({ id: transportQuotesTable.id })
      .from(transportQuotesTable)
      .where(
        and(
          eq(transportQuotesTable.transport_request_id, trId),
          eq(transportQuotesTable.transporter_company_id, company.id),
        ),
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Conflict", message: "You have already submitted a quote for this transport request" });
      return;
    }

    // Validate body
    const priceTotalRaw = req.body?.price_total;
    const truckCountRaw = req.body?.truck_count;
    const truckType = typeof req.body?.truck_type === "string" ? req.body.truck_type.trim() : null;
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : null;

    const priceTotal = Number(priceTotalRaw);
    if (!priceTotalRaw || isNaN(priceTotal) || priceTotal <= 0) {
      res.status(400).json({ error: "BadRequest", message: "price_total must be a positive number" });
      return;
    }

    const truckCount = Number(truckCountRaw) || 1;
    if (truckCount < 1 || !Number.isInteger(truckCount)) {
      res.status(400).json({ error: "BadRequest", message: "truck_count must be a positive integer" });
      return;
    }

    const [quote] = await db
      .insert(transportQuotesTable)
      .values({
        transport_request_id: trId,
        transporter_company_id: company.id,
        price_total: String(priceTotal),
        truck_count: truckCount,
        truck_type: truckType || null,
        notes: notes || null,
        status: "submitted",
      })
      .returning();

    res.status(201).json(serializeQuote(quote, company.name));
  },
);

// ── GET /transport-requests/:id/quotes ────────────────────────────────────────
// Returns quotes for a transport request.
// - Deal party (TR creator): sees all quotes with company names.
// - Transporter: sees only their own quote.

router.get(
  "/transport-requests/:id/quotes",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const trId = req.params.id as string;

    const [tr] = await db
      .select({
        id: transportRequestsTable.id,
        created_by_company_id: transportRequestsTable.created_by_company_id,
        deal_id: transportRequestsTable.deal_id,
        transporter_company_id: transportRequestsTable.transporter_company_id,
      })
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.id, trId))
      .limit(1);

    if (!tr) {
      res.status(404).json({ error: "NotFound", message: "Transport request not found" });
      return;
    }

    // Check authorization: TR creator or deal party can see all quotes; transporter sees own only
    const [deal] = await db
      .select({ producer_company_id: dealsTable.producer_company_id, buyer_company_id: dealsTable.buyer_company_id })
      .from(dealsTable)
      .where(eq(dealsTable.id, tr.deal_id))
      .limit(1);

    const isDealParty = deal && (deal.producer_company_id === company.id || deal.buyer_company_id === company.id);
    const isTRCreator = tr.created_by_company_id === company.id;
    const canSeeAll = isDealParty || isTRCreator;

    const rows = await db
      .select({
        quote: transportQuotesTable,
        company_name: companiesTable.name,
      })
      .from(transportQuotesTable)
      .leftJoin(companiesTable, eq(transportQuotesTable.transporter_company_id, companiesTable.id))
      .where(
        canSeeAll
          ? eq(transportQuotesTable.transport_request_id, trId)
          : and(
              eq(transportQuotesTable.transport_request_id, trId),
              eq(transportQuotesTable.transporter_company_id, company.id),
            ),
      )
      .orderBy(transportQuotesTable.price_total);

    res.json(rows.map(({ quote, company_name }) => serializeQuote(quote, company_name)));
  },
);

// ── GET /transport-requests/my-quotes ─────────────────────────────────────────
// Returns all quotes submitted by the authenticated transporter company.

router.get(
  "/transport-requests/my-quotes",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;

    const rows = await db
      .select({
        quote: transportQuotesTable,
        pickup_city: transportRequestsTable.pickup_city,
        delivery_city: transportRequestsTable.delivery_city,
        waste_description: transportRequestsTable.waste_description,
        tr_status: transportRequestsTable.status,
        planned_pickup_at: transportRequestsTable.planned_pickup_at,
      })
      .from(transportQuotesTable)
      .innerJoin(transportRequestsTable, eq(transportQuotesTable.transport_request_id, transportRequestsTable.id))
      .where(eq(transportQuotesTable.transporter_company_id, company.id))
      .orderBy(desc(transportQuotesTable.created_at));

    res.json(
      rows.map(({ quote, pickup_city, delivery_city, waste_description, tr_status, planned_pickup_at }) => ({
        ...serializeQuote(quote),
        pickup_city: pickup_city ?? undefined,
        delivery_city: delivery_city ?? undefined,
        waste_description: waste_description ?? undefined,
        tr_status,
        planned_pickup_at: planned_pickup_at?.toISOString() ?? undefined,
      })),
    );
  },
);

export default router;
