/**
 * Notification creation helpers.
 * Creates DB notification rows for company users.
 * Also fires transactional emails (fire-and-forget) via email.ts.
 *
 * Charter: notification `type` keys are stable internal identifiers.
 * Title/body text is defined here and must be bilingual (AR + EN).
 */
import { eq, and } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, notificationsTable, companyMembersTable } from "@workspace/db";
import { sendEmail } from "./email";

interface NotifyParams {
  companyId: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** If true, also send a transactional email to the company owner. */
  sendMail?: boolean;
  actionUrl?: string;
  actionText_ar?: string;
  actionText_en?: string;
}

async function lookupOwnerEmail(companyId: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ user_id: companyMembersTable.user_id })
      .from(companyMembersTable)
      .where(
        and(
          eq(companyMembersTable.company_id, companyId),
          eq(companyMembersTable.role, "owner"),
        ),
      )
      .limit(1);
    if (!rows.length) return null;
    const user = await clerkClient.users.getUser(rows[0].user_id);
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
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
    console.error(`[notify] Failed to create notification type=${p.type}`, { companyId: p.companyId });
  }

  if (p.sendMail) {
    void (async () => {
      const email = await lookupOwnerEmail(p.companyId);
      if (email) {
        await sendEmail({
          to: email,
          title_ar: p.title_ar,
          title_en: p.title_en,
          body_ar: p.body_ar,
          body_en: p.body_en,
          listingId: p.relatedEntityType === "listing" ? p.relatedEntityId : undefined,
          actionUrl: p.actionUrl,
          actionText_ar: p.actionText_ar,
          actionText_en: p.actionText_en,
        });
      }
    })();
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
    sendMail: true,
  });
}

export async function notifyListingPublishedSuccess({
  sellerCompanyId,
  listingId,
  listingRef,
}: {
  sellerCompanyId: string;
  listingId: string;
  listingRef: string;
}): Promise<void> {
  await createNotification({
    companyId: sellerCompanyId,
    type: "new_listing_published",
    title_ar: `تم نشر الإعلان ${listingRef} بنجاح`,
    title_en: `Listing ${listingRef} published successfully`,
    body_ar: "إعلانك متاح الآن للشركات المؤهلة لاستقبال العروض.",
    body_en: "Your listing is now live for qualified companies to submit offers.",
    relatedEntityType: "listing",
    relatedEntityId: listingId,
    sendMail: true,
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
    sendMail: true,
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
    sendMail: true,
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
    sendMail: true,
  });
}

/**
 * Fired when a producer creates a specific_company listing targeting a named buyer.
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
    sendMail: true,
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
    sendMail: true,
  });
}

export async function notifyNewListingPublished({
  buyerCompanyId,
  listingId,
  listingRef,
  material,
  city,
  quantity,
  priceHintText,
}: {
  buyerCompanyId: string;
  listingId: string;
  listingRef: string;
  material: string;
  city: string;
  quantity: string;
  priceHintText?: string;
}): Promise<void> {
  const pHintAr = priceHintText || "غير محدد";
  const pHintEn = priceHintText || "Not specified";

  await createNotification({
    companyId: buyerCompanyId,
    type: "new_listing_published",
    title_ar: `إعلان جديد متاح للمزايدة: ${material} في ${city}`,
    title_en: `New Listing Available for Bidding: ${material} in ${city}`,
    body_ar: `تم نشر إعلان جديد في منصة تدويرة متاح للمزايدة.\n\nرقم الإعلان: ${listingRef}\nالمادة: ${material}\nالكمية: ${quantity}\nالمدينة: ${city}\nالسعر الإرشادي: ${pHintAr}\n\nيمكنك مراجعة الإعلان وتقديم عرضك من خلال منصة تدويرة.`,
    body_en: `A new listing is now available for bidding on Tadweerah.\n\nListing ID: ${listingRef}\nMaterial: ${material}\nQuantity: ${quantity}\nCity: ${city}\nIndicative price: ${pHintEn}\n\nYou can review the listing and submit your offer through Tadweerah.`,
    relatedEntityType: "listing",
    relatedEntityId: listingId,
    sendMail: true,
  });
}
  
// �� Contract Lite Notifications �����������������������������������������������  
 

const BASE_URL = process.env.PLATFORM_URL ?? "https://tadweerah.com";

export async function notifyContractSubmitted(companyId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_submitted",
    title_ar: `عقد جديد بانتظار تأكيدك: ${reference}`,
    title_en: `New contract awaiting your confirmation: ${reference}`,
    body_ar: `تم إرسال عقد جديد إليك لمراجعته وتأكيده.\n\nرابط العملية: ${url}`,
    body_en: `A new Contract Lite agreement has been sent to you for review and confirmation.\n\nOperation link: ${url}`,
    relatedEntityType: "contract",
    relatedEntityId: contractId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractConfirmed(companyId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_confirmed",
    title_ar: `تم تأكيد العقد: ${reference}`,
    title_en: `Contract confirmed: ${reference}`,
    body_ar: `قام الطرف الآخر بتأكيد العقد وهو جاهز الآن للبدء بالتنفيذ.\n\nرابط العملية: ${url}`,
    body_en: `The counterparty has confirmed the contract and it is now ready for shipment execution.\n\nOperation link: ${url}`,
    relatedEntityType: "contract",
    relatedEntityId: contractId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractCancelled(companyId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_cancelled",
    title_ar: `تم إلغاء العقد: ${reference}`,
    title_en: `Contract cancelled: ${reference}`,
    body_ar: `تم إلغاء عقد التنفيذ. يمكنك مراجعة التفاصيل من صفحة العقود.\n\nرابط العملية: ${url}`,
    body_en: `The Contract Lite agreement was cancelled. You can review the details from the contracts page.\n\nOperation link: ${url}`,
    relatedEntityType: "contract",
    relatedEntityId: contractId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractShipmentCreated(companyId: string, shipmentId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_shipment_created",
    title_ar: `إضافة شحنة جديدة: ${reference}`,
    title_en: `New shipment added: ${reference}`,
    body_ar: `تم إضافة شحنة جديدة تحت عقد التنفيذ.\n\nرابط العملية: ${url}`,
    body_en: `A new shipment has been added under a Contract Lite agreement.\n\nOperation link: ${url}`,
    relatedEntityType: "contract_shipment",
    relatedEntityId: shipmentId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractShipmentDispatched(companyId: string, shipmentId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_shipment_dispatched",
    title_ar: `تم إرسال الشحنة: ${reference}`,
    title_en: `Shipment dispatched: ${reference}`,
    body_ar: `تم تسجيل وزن الشحنة في موقع البائع وهي بانتظار الاستلام.\n\nرابط العملية: ${url}`,
    body_en: `The shipment weight at the seller site has been recorded and is awaiting receipt.\n\nOperation link: ${url}`,
    relatedEntityType: "contract_shipment",
    relatedEntityId: shipmentId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractShipmentReceived(companyId: string, shipmentId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_shipment_received",
    title_ar: `تم استلام الشحنة: ${reference}`,
    title_en: `Shipment received: ${reference}`,
    body_ar: `تم تسجيل وزن الشحنة في موقع المشتري وهي جاهزة للمراجعة.\n\nرابط العملية: ${url}`,
    body_en: `The shipment weight at the buyer site has been recorded and is ready for review and finalization.\n\nOperation link: ${url}`,
    relatedEntityType: "contract_shipment",
    relatedEntityId: shipmentId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractShipmentFinalized(companyId: string, shipmentId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_shipment_finalized",
    title_ar: `تم اعتماد الشحنة نهائياً: ${reference}`,
    title_en: `Shipment finalized: ${reference}`,
    body_ar: `تم اعتماد الشحنة نهائياً وتوثيق الوزن والقيمة النهائية.\n\nرابط العملية: ${url}`,
    body_en: `The shipment has been finalized and the final weight and value have been recorded.\n\nOperation link: ${url}`,
    relatedEntityType: "contract_shipment",
    relatedEntityId: shipmentId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

export async function notifyContractShipmentCancelled(companyId: string, shipmentId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_shipment_cancelled",
    title_ar: `تم إلغاء الشحنة: ${reference}`,
    title_en: `Shipment cancelled: ${reference}`,
    body_ar: `تم إلغاء شحنة من تحت عقد التنفيذ.\n\nرابط العملية: ${url}`,
    body_en: `A shipment under a Contract Lite agreement has been cancelled.\n\nOperation link: ${url}`,
    relatedEntityType: "contract_shipment",
    relatedEntityId: shipmentId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}
