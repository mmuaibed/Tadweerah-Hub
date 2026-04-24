/**
 * Notification creation helpers.
 * Creates DB notification rows for company users.
 *
 * Charter: notification `type` keys are stable internal identifiers.
 * Title/body text is defined here and must be bilingual (AR + EN).
 */
import { db, notificationsTable } from "@workspace/db";

interface NotifyParams {
  companyId: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export async function createNotification(p: NotifyParams): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      company_id: p.companyId,
      type: p.type,
      title_ar: p.title_ar,
      title_en: p.title_en,
      body_ar: p.body_ar ?? null,
      body_en: p.body_en ?? null,
      related_entity_type: p.relatedEntityType ?? null,
      related_entity_id: p.relatedEntityId ?? null,
    });
  } catch {
    // Notification failure must never surface to the caller.
    console.error(`[notify] Failed to create notification type=${p.type}`, { companyId: p.companyId });
  }
}

// ── Typed helpers for each notification event ────────────────────────────────

export async function notifyOfferReceived({
  producerCompanyId,
  listingId,
  listingRef,
  buyerName,
}: {
  producerCompanyId: string;
  listingId: string;
  listingRef: string;
  buyerName: string;
}): Promise<void> {
  await createNotification({
    companyId: producerCompanyId,
    type: "offer_received",
    title_ar: `عرض جديد على ${listingRef}`,
    title_en: `New offer on ${listingRef}`,
    body_ar: `قدّمت ${buyerName} عرضاً جديداً على إعلانك`,
    body_en: `${buyerName} submitted a new offer on your listing`,
    relatedEntityType: "listing",
    relatedEntityId: listingId,
  });
}

export async function notifyOutbid({
  buyerCompanyId,
  listingId,
  listingRef,
}: {
  buyerCompanyId: string;
  listingId: string;
  listingRef: string;
}): Promise<void> {
  await createNotification({
    companyId: buyerCompanyId,
    type: "outbid",
    title_ar: `تم تجاوز عرضك على ${listingRef}`,
    title_en: `You were outbid on ${listingRef}`,
    body_ar: "عرض أعلى منك — قم بتحسين عرضك للحفاظ على مركزك",
    body_en: "A higher offer was submitted — improve your offer to stay competitive",
    relatedEntityType: "listing",
    relatedEntityId: listingId,
  });
}

export async function notifyOfferAccepted({
  buyerCompanyId,
  listingId,
  listingRef,
}: {
  buyerCompanyId: string;
  listingId: string;
  listingRef: string;
}): Promise<void> {
  await createNotification({
    companyId: buyerCompanyId,
    type: "offer_accepted",
    title_ar: `تم قبول عرضك على ${listingRef}`,
    title_en: `Your offer was accepted on ${listingRef}`,
    body_ar: "تهانينا! تم قبول عرضك وجار إنشاء الصفقة",
    body_en: "Congratulations! Your offer was accepted and a deal has been created",
    relatedEntityType: "listing",
    relatedEntityId: listingId,
  });
}

export async function notifyOfferRejected({
  buyerCompanyId,
  listingId,
  listingRef,
  reason,
}: {
  buyerCompanyId: string;
  listingId: string;
  listingRef: string;
  reason?: string;
}): Promise<void> {
  await createNotification({
    companyId: buyerCompanyId,
    type: "offer_rejected",
    title_ar: `تم رفض عرضك على ${listingRef}`,
    title_en: `Your offer was rejected on ${listingRef}`,
    body_ar: reason ? `السبب: ${reason}` : undefined,
    body_en: reason ? `Reason: ${reason}` : undefined,
    relatedEntityType: "listing",
    relatedEntityId: listingId,
  });
}

/**
 * Fired when a producer creates a specific_company listing targeting a named buyer.
 * The target company is notified that a private deal has been offered to them.
 */
export async function notifyPrivateDealInvitation({
  targetCompanyId,
  listingId,
  listingRef,
  producerName,
}: {
  targetCompanyId: string;
  listingId: string;
  listingRef: string;
  producerName: string;
}): Promise<void> {
  await createNotification({
    companyId: targetCompanyId,
    type: "private_deal_invitation",
    title_ar: `عرض خاص من ${producerName}`,
    title_en: `Private deal from ${producerName}`,
    body_ar: `تلقيت عرضاً خاصاً على ${listingRef}. يمكنك مراجعة العرض والمشاركة فيه`,
    body_en: `You received a private listing on ${listingRef}. Review it and submit your offer`,
    relatedEntityType: "listing",
    relatedEntityId: listingId,
  });
}

export async function notifyDealStageChange({
  companyId,
  dealId,
  listingId,
  type,
  title_ar,
  title_en,
  body_ar,
  body_en,
}: {
  companyId: string;
  dealId: string;
  listingId?: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
}): Promise<void> {
  await createNotification({
    companyId,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    relatedEntityType: listingId ? "listing" : "deal",
    relatedEntityId: listingId ?? dealId,
  });
}
