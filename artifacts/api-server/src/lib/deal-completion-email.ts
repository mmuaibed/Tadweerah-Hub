import { db, dealsTable, wasteListingsTable, companiesTable, transportRequestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { sendDealCompletionEmail } from "./email";
import { lookupOwnerEmail } from "./notify";
import { dealRef } from "./listing-ref";

export async function triggerDealCompletionEmails(dealId: string): Promise<void> {
  try {
    // 1. Fetch deal and listing
    const [dealRecord] = await db
      .select({
        deal: dealsTable,
        listing: wasteListingsTable,
      })
      .from(dealsTable)
      .innerJoin(wasteListingsTable, eq(dealsTable.listing_id, wasteListingsTable.id))
      .where(eq(dealsTable.id, dealId))
      .limit(1);

    if (!dealRecord) {
      logger.warn({ dealId }, "[deal-completion-email] Deal not found");
      return;
    }

    const { deal, listing } = dealRecord;

    // 2. Fetch companies
    const [producer, buyer] = await Promise.all([
      db.select().from(companiesTable).where(eq(companiesTable.id, deal.producer_company_id)).limit(1).then(r => r[0]),
      db.select().from(companiesTable).where(eq(companiesTable.id, deal.buyer_company_id)).limit(1).then(r => r[0])
    ]);

    if (!producer || !buyer) {
      logger.warn({ dealId }, "[deal-completion-email] Producer or buyer company not found");
      return;
    }

    // 3. Fetch manifest_ref from transport_requests (optional)
    const [tr] = await db
      .select({ manifest_ref: transportRequestsTable.manifest_ref })
      .from(transportRequestsTable)
      .where(eq(transportRequestsTable.deal_id, dealId))
      .limit(1);

    // 4. Resolve emails
    const [producerEmail, buyerEmail] = await Promise.all([
      lookupOwnerEmail(deal.producer_company_id),
      lookupOwnerEmail(deal.buyer_company_id)
    ]);

    // 5. Prepare common data
    const formattedDealRef = dealRef(deal.id, deal.created_at.toISOString());
    const completionDate = (deal.received_at ?? new Date()).toISOString().split('T')[0];
    const category = listing.material ?? "نفايات صناعية";
    const quantity = deal.actual_quantity ? deal.actual_quantity : listing.quantity;
    const finalAmount = deal.final_amount ?? deal.total_amount ?? undefined;
    const manifestRef = tr?.manifest_ref ?? undefined;

    // 6. Send to producer (if email found)
    if (producerEmail) {
      await sendDealCompletionEmail({
        to: producerEmail,
        dealId,
        dealRef: formattedDealRef,
        completionDate,
        counterpartyName: buyer.name,
        counterpartyCr: buyer.commercialRegistration ?? undefined,
        wasteCategory: category,
        quantity: quantity ?? undefined,
        finalAmount: finalAmount ?? undefined,
        manifestRef
      });
      logger.info({ dealId, email: producerEmail }, "[deal-completion-email] Sent to producer");
    } else {
      logger.warn({ dealId, companyId: deal.producer_company_id }, "[deal-completion-email] Producer email not resolved");
    }

    // 7. Send to buyer (if email found)
    if (buyerEmail) {
      await sendDealCompletionEmail({
        to: buyerEmail,
        dealId,
        dealRef: formattedDealRef,
        completionDate,
        counterpartyName: producer.name,
        counterpartyCr: producer.commercialRegistration ?? undefined,
        wasteCategory: category,
        quantity: quantity ?? undefined,
        finalAmount: finalAmount ?? undefined,
        manifestRef
      });
      logger.info({ dealId, email: buyerEmail }, "[deal-completion-email] Sent to buyer");
    } else {
      logger.warn({ dealId, companyId: deal.buyer_company_id }, "[deal-completion-email] Buyer email not resolved");
    }

  } catch (err) {
    logger.error({ dealId, err }, "[deal-completion-email] Failed to trigger emails");
  }
}
