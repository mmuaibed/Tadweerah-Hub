/**
 * expire-deals job
 *
 * Runs hourly. Handles three responsibilities:
 *
 * 1. PRE-EXPIRY NOTIFICATIONS
 *    Fires once per deal when ≤3 calendar days remain before the effective deadline.
 *    Effective deadline:
 *      - active:            extended_until ?? (created_at + 31d)
 *      - payment_confirmed: extended_until ?? (payment_confirmed_at + 8d)
 *      - dispatched:        dispatched_at + 72h   (extension not allowed post-dispatch)
 *
 * 2. DEAL EXPIRY
 *    Marks deals as 'expired' when they stall past their effective deadline.
 *    Cancelled, completed, and already-expired deals are skipped.
 *
 * 3. DISPATCHED-EXPIRY RECEIPT FAILURE TRACKING
 *    When a deal expires from 'dispatched' status:
 *      - buyer.receipt_failures_count is incremented
 *      - if receipt_failures_count reaches 2, buyer.offer_submission_blocked is set true
 *
 * Expiry thresholds (base, before any extension):
 *   active            → 31 calendar days from created_at
 *   payment_confirmed → 8 calendar days from payment_confirmed_at
 *   dispatched        → 72 hours from dispatched_at
 *
 * Extension rules:
 *   - Allowed once only, before dispatch
 *   - Duration: 7 calendar days from when extension was granted (stored as extended_until)
 *   - extended_until overrides the base threshold for active and payment_confirmed
 */
import { db, dealsTable, companiesTable } from "@workspace/db";
import { and, eq, gt, gte, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { logAudit } from "../lib/audit";
import { notifyDealStageChange } from "../lib/notify";

const MS = {
  active:            31 * 24 * 60 * 60 * 1000,
  payment_confirmed:  8 * 24 * 60 * 60 * 1000,
  dispatched:        72 * 60 * 60 * 1000,
  pre_expiry_warn:    3 * 24 * 60 * 60 * 1000,
} as const;

/** Returns the effective expiry deadline for a deal row (null if not computable). */
function effectiveDeadline(deal: {
  status: string;
  created_at: Date;
  payment_confirmed_at: Date | null;
  dispatched_at: Date | null;
  extended_until: Date | null;
}): Date | null {
  switch (deal.status) {
    case "active":
      return deal.extended_until
        ? deal.extended_until
        : new Date(deal.created_at.getTime() + MS.active);
    case "payment_confirmed":
      if (!deal.payment_confirmed_at) return null;
      return deal.extended_until
        ? deal.extended_until
        : new Date(deal.payment_confirmed_at.getTime() + MS.payment_confirmed);
    case "dispatched":
      if (!deal.dispatched_at) return null;
      return new Date(deal.dispatched_at.getTime() + MS.dispatched);
    default:
      return null;
  }
}

const TERMINAL = ["completed", "expired", "cancelled"] as const;
const NON_TERMINAL_STATUSES = ["active", "payment_confirmed", "dispatched"] as const;

export async function expireStaleDeals(): Promise<void> {
  const now = new Date();

  try {
    /* ------------------------------------------------------------------ */
    /* Step 1: Pre-expiry notifications                                    */
    /* ------------------------------------------------------------------ */
    const preNotifyCandidates = await db
      .select({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
        status: dealsTable.status,
        created_at: dealsTable.created_at,
        payment_confirmed_at: dealsTable.payment_confirmed_at,
        dispatched_at: dealsTable.dispatched_at,
        extended_until: dealsTable.extended_until,
        pre_expiry_notified: dealsTable.pre_expiry_notified,
      })
      .from(dealsTable)
      .where(
        and(
          eq(dealsTable.pre_expiry_notified, false),
          inArray(dealsTable.status, [...NON_TERMINAL_STATUSES]),
        ),
      );

    const dealsToNotify = preNotifyCandidates.filter((deal) => {
      const deadline = effectiveDeadline(deal);
      if (!deadline) return false;
      const msRemaining = deadline.getTime() - now.getTime();
      return msRemaining > 0 && msRemaining <= MS.pre_expiry_warn;
    });

    if (dealsToNotify.length > 0) {
      const notifyIds = dealsToNotify.map((d) => d.id);
      await db
        .update(dealsTable)
        .set({ pre_expiry_notified: true, updated_at: now })
        .where(inArray(dealsTable.id, notifyIds));

      logger.info({ count: dealsToNotify.length }, "[expire-deals] pre-expiry notifications sent");

      for (const deal of dealsToNotify) {
        const deadline = effectiveDeadline(deal)!;
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        void notifyDealStageChange({
          companyId: deal.producer_company_id,
          dealId: deal.id,
          listingId: deal.listing_id,
          type: "deal_expiry_warning",
          title_ar: "تنبيه: صفقتك على وشك الانتهاء",
          title_en: "Warning: Your deal is about to expire",
          body_ar: `تبقّى ${daysLeft} يوم/أيام قبل انتهاء مدة الصفقة. يمكنك إلغاؤها أو تمديدها (مرة واحدة) إذا لزم الأمر`,
          body_en: `${daysLeft} day(s) remaining before this deal expires. You can cancel or extend it (once) if needed.`,
        });
      }
    }

    /* ------------------------------------------------------------------ */
    /* Step 2: Find and expire stale deals                                 */
    /* Separate dispatched from active/payment_confirmed to track failures */
    /* ------------------------------------------------------------------ */
    const activeThreshold   = new Date(now.getTime() - MS.active);
    const paymentThreshold  = new Date(now.getTime() - MS.payment_confirmed);
    const dispatchThreshold = new Date(now.getTime() - MS.dispatched);

    // Expire active and payment_confirmed deals (respects extended_until)
    const expiredNonDispatched = await db
      .update(dealsTable)
      .set({ status: "expired", updated_at: now })
      .where(
        or(
          // Active — no extension, past 31d
          and(
            eq(dealsTable.status, "active"),
            isNull(dealsTable.extended_until),
            lt(dealsTable.created_at, activeThreshold),
          ),
          // Active — extended, past extended_until
          and(
            eq(dealsTable.status, "active"),
            isNotNull(dealsTable.extended_until),
            sql`${dealsTable.extended_until} < ${now.toISOString()}`,
          ),
          // Payment confirmed — no extension, past 8d
          and(
            eq(dealsTable.status, "payment_confirmed"),
            isNull(dealsTable.extended_until),
            sql`${dealsTable.payment_confirmed_at} IS NOT NULL AND ${dealsTable.payment_confirmed_at} < ${paymentThreshold.toISOString()}`,
          ),
          // Payment confirmed — extended, past extended_until
          and(
            eq(dealsTable.status, "payment_confirmed"),
            isNotNull(dealsTable.extended_until),
            sql`${dealsTable.extended_until} < ${now.toISOString()}`,
          ),
        ),
      )
      .returning({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
      });

    // Expire dispatched deals past 72h (tracked separately for receipt_failures_count)
    const expiredDispatched = await db
      .update(dealsTable)
      .set({ status: "expired", updated_at: now })
      .where(
        and(
          eq(dealsTable.status, "dispatched"),
          sql`${dealsTable.dispatched_at} IS NOT NULL AND ${dealsTable.dispatched_at} < ${dispatchThreshold.toISOString()}`,
        ),
      )
      .returning({
        id: dealsTable.id,
        listing_id: dealsTable.listing_id,
        producer_company_id: dealsTable.producer_company_id,
        buyer_company_id: dealsTable.buyer_company_id,
      });

    const allExpired = [...expiredNonDispatched, ...expiredDispatched];

    /* ------------------------------------------------------------------ */
    /* Step 3: Receipt failure tracking for dispatched-expired deals       */
    /* ------------------------------------------------------------------ */
    if (expiredDispatched.length > 0) {
      // Group by buyer_company_id to count failures per buyer
      const failureCountByBuyer = new Map<string, number>();
      for (const deal of expiredDispatched) {
        failureCountByBuyer.set(
          deal.buyer_company_id,
          (failureCountByBuyer.get(deal.buyer_company_id) ?? 0) + 1,
        );
      }

      for (const [buyerCompanyId, increment] of failureCountByBuyer) {
        // Fetch current counts first
        const [buyer] = await db
          .select({
            receipt_failures_count: companiesTable.receipt_failures_count,
            offer_submission_blocked: companiesTable.offer_submission_blocked,
          })
          .from(companiesTable)
          .where(eq(companiesTable.id, buyerCompanyId))
          .limit(1);

        if (!buyer) continue;

        const newCount = (buyer.receipt_failures_count ?? 0) + increment;
        const shouldBlock = !buyer.offer_submission_blocked && newCount >= 2;

        await db
          .update(companiesTable)
          .set({
            receipt_failures_count: newCount,
            ...(shouldBlock ? { offer_submission_blocked: true } : {}),
          })
          .where(eq(companiesTable.id, buyerCompanyId));

        if (shouldBlock) {
          logger.warn(
            { buyerCompanyId, receipt_failures_count: newCount },
            "[expire-deals] buyer blocked due to repeated receipt failures",
          );
          void logAudit({
            action: "company.offer_submission_blocked",
            entityType: "company",
            entityId: buyerCompanyId,
            severity: "warn",
            details: { reason: "dispatched_expiry_threshold_reached", receipt_failures_count: newCount },
          });
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Step 4: Notify both parties for all expired deals                   */
    /* ------------------------------------------------------------------ */
    if (allExpired.length > 0) {
      logger.info({ count: allExpired.length }, "[expire-deals] expired stale deals");

      for (const deal of allExpired) {
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
