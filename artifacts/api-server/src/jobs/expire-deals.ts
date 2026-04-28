/**
 * expire-deals job
 *
 * Marks deals as 'expired' when they stall past their SLA window:
 *   active            → no payment confirmed within 31 days of deal creation
 *   payment_confirmed → not dispatched within 8 calendar days of payment
 *   dispatched        → not received within 72 hours of dispatch
 *
 * Designed to run on a periodic interval (every hour).
 * On expiry: notifies both producer and buyer, logs deal.expired at severity 'warn'.
 */
import { db, dealsTable } from "@workspace/db";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logAudit } from "../lib/audit";
import { notifyDealStageChange } from "../lib/notify";

const EXPIRY_THRESHOLDS = {
  active:            31 * 24 * 60 * 60 * 1000,
  payment_confirmed:  8 * 24 * 60 * 60 * 1000,
  dispatched:        72 * 60 * 60 * 1000,
} as const;

export async function expireStaleDeals(): Promise<void> {
  const now = new Date();
  const activeThreshold   = new Date(now.getTime() - EXPIRY_THRESHOLDS.active);
  const paymentThreshold  = new Date(now.getTime() - EXPIRY_THRESHOLDS.payment_confirmed);
  const dispatchThreshold = new Date(now.getTime() - EXPIRY_THRESHOLDS.dispatched);

  try {
    const expired = await db
      .update(dealsTable)
      .set({ status: "expired", updated_at: now })
      .where(
        or(
          // Stalled at active — no payment within 31d
          and(eq(dealsTable.status, "active"), lt(dealsTable.created_at, activeThreshold)),
          // Stalled at payment_confirmed — no dispatch within 8d
          and(
            eq(dealsTable.status, "payment_confirmed"),
            sql`${dealsTable.payment_confirmed_at} IS NOT NULL AND ${dealsTable.payment_confirmed_at} < ${paymentThreshold.toISOString()}`,
          ),
          // Stalled at dispatched — no receipt within 72h
          and(
            eq(dealsTable.status, "dispatched"),
            sql`${dealsTable.dispatched_at} IS NOT NULL AND ${dealsTable.dispatched_at} < ${dispatchThreshold.toISOString()}`,
          ),
        ),
      )
      .returning({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
      });

    if (expired.length > 0) {
      logger.info({ count: expired.length }, "[expire-deals] expired stale deals");

      for (const deal of expired) {
        void logAudit({
          action: "deal.expired",
          entityType: "deal",
          entityId: deal.id,
          severity: "warn",
        });

        void notifyDealStageChange({
          companyId: deal.producer_company_id,
          dealId: deal.id,
          listingId: deal.listing_id,
          type: "deal_expired",
          title_ar: "انتهت مدة صفقتك",
          title_en: "Your deal has expired",
          body_ar: "انتهت المدة المحددة للصفقة دون اكتمالها. يمكنك البدء من جديد عبر إنشاء إعلان جديد",
          body_en: "The deal window passed without completion. You can start again by creating a new listing.",
        });

        void notifyDealStageChange({
          companyId: deal.buyer_company_id,
          dealId: deal.id,
          listingId: deal.listing_id,
          type: "deal_expired",
          title_ar: "انتهت مدة الصفقة",
          title_en: "Deal expired",
          body_ar: "انتهت المدة المحددة للصفقة دون اكتمالها. يرجى التواصل مع الطرف الآخر أو رفع تقرير",
          body_en: "The deal window passed without completion. Please contact the other party or file a report.",
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "[expire-deals] job failed");
  }
}
