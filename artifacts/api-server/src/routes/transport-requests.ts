import { Router, type IRouter } from "express";
import { eq, or, inArray, desc } from "drizzle-orm";
import {
  db,
  dealsTable,
  transportRequestsTable,
  companiesTable,
  wasteListingsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";

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
      })
      .returning();

    res.status(201).json(serializeTR(created));
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

    // Fetch listing for waste details
    const [listing] = await db
      .select({
        id: wasteListingsTable.id,
        material: wasteListingsTable.material,
        quantity: wasteListingsTable.quantity,
        unit: wasteListingsTable.unit,
        description: wasteListingsTable.description,
        city: wasteListingsTable.city,
      })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.id, deal.listing_id))
      .limit(1);

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

export default router;
