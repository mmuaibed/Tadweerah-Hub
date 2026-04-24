/**
 * GET /dashboard/stats
 *
 * Returns lightweight aggregate metrics for the authenticated company.
 * No schema changes — reads from existing tables only.
 */
import { Router, type IRouter } from "express";
import { and, count, eq, or, sum } from "drizzle-orm";
import {
  db,
  dealsTable,
  listingOffersTable,
  wasteListingsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireCompany, type AuthedCompanyRequest } from "../middlewares/requireCompany";

const router: IRouter = Router();

router.get(
  "/dashboard/stats",
  requireAuth,
  requireCompany(),
  async (req, res) => {
    const { company } = req as AuthedCompanyRequest;
    const cid = company.id;

    const [listingsRow] = await db
      .select({ total: count() })
      .from(wasteListingsTable)
      .where(eq(wasteListingsTable.company_id, cid));

    const [offersReceivedRow] = await db
      .select({ total: count() })
      .from(listingOffersTable)
      .innerJoin(
        wasteListingsTable,
        eq(listingOffersTable.waste_listing_id, wasteListingsTable.id),
      )
      .where(eq(wasteListingsTable.company_id, cid));

    const [offersMadeRow] = await db
      .select({ total: count() })
      .from(listingOffersTable)
      .where(eq(listingOffersTable.buyer_company_id, cid));

    const [completedDealsRow] = await db
      .select({ total: count() })
      .from(dealsTable)
      .where(
        and(
          or(
            eq(dealsTable.producer_company_id, cid),
            eq(dealsTable.buyer_company_id, cid),
          ),
          eq(dealsTable.status, "completed"),
        ),
      );

    const [dealValueRow] = await db
      .select({ total: sum(dealsTable.estimated_amount) })
      .from(dealsTable)
      .where(
        and(
          or(
            eq(dealsTable.producer_company_id, cid),
            eq(dealsTable.buyer_company_id, cid),
          ),
          eq(dealsTable.status, "completed"),
        ),
      );

    res.json({
      listings_count: Number(listingsRow?.total ?? 0),
      offers_received_count: Number(offersReceivedRow?.total ?? 0),
      offers_made_count: Number(offersMadeRow?.total ?? 0),
      completed_deals_count: Number(completedDealsRow?.total ?? 0),
      total_deal_value: Number(dealValueRow?.total ?? 0),
    });
  },
);

export default router;
