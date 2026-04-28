/**
 * expire-deals job
 *
 * Marks deals as 'expired' when they stall past their SLA window:
 *   active           → no payment confirmed within 30 days of deal creation
 *   payment_confirmed → not dispatched within 7 calendar days of payment
 *   dispatched       → not received within 48 hours of dispatch
 *
 * Designed to run on a periodic interval (e.g. every hour).
 */
import { db, dealsTable } from "@workspace/db";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logAudit } from "../lib/audit";

const EXPIRY_THRESHOLDS = {
  active:            31 * 24 * 60 * 60 * 1000,
  payment_confirmed:  8 * 24 * 60 * 60 * 1000,
  dispatched:        72 * 60 * 60 * 1000,
} as const;

export async function expireStaleDeals(): Promise<void> {
  const now = new Date();
  const activeThreshold    = new Date(now.getTime() - EXPIRY_THRESHOLDS.active);
  const paymentThreshold   = new Date(now.getTime() - EXPIRY_THRESHOLDS.payment_confirmed);
  const dispatchThreshold  = new Date(now.getTime() - EXPIRY_THRESHOLDS.dispatched);

  try {
    const expired = await db
      .update(dealsTable)
      .set({ status: "expired", updated_at: now })
      .where(
        or(
          // Stalled at active — no payment within 30d
          and(eq(dealsTable.status, "active"), lt(dealsTable.created_at, activeThreshold)),
          // Stalled at payment_confirmed — no dispatch within 7d
          and(
            eq(dealsTable.status, "payment_confirmed"),
            sql`${dealsTable.payment_confirmed_at} IS NOT NULL AND ${dealsTable.payment_confirmed_at} < ${paymentThreshold.toISOString()}`,
          ),
          // Stalled at dispatched — no receipt within 48h
          and(
            eq(dealsTable.status, "dispatched"),
            sql`${dealsTable.dispatched_at} IS NOT NULL AND ${dealsTable.dispatched_at} < ${dispatchThreshold.toISOString()}`,
          ),
        ),
      )
      .returning({ id: dealsTable.id });

    if (expired.length > 0) {
      logger.info({ count: expired.length }, "[expire-deals] expired stale deals");
      for (const deal of expired) {
        void logAudit({
          action: "deal.expired",
          entityType: "deal",
          entityId: deal.id,
        });
      }
    }
  } catch (err) {
    logger.error({ err }, "[expire-deals] job failed");
  }
}
