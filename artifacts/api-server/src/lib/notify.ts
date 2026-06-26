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
import { db, notificationsTable, companyMembersTable, companiesTable } from "@workspace/db";
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
    // Check if there is an overridden notification recipient
    const [company] = await db
      .select({ notification_recipient_user_id: companiesTable.notification_recipient_user_id })
      .from(companiesTable)
      .where(eq(companiesTable.id, companyId))
      .limit(1);

    if (company?.notification_recipient_user_id) {
      // Verify the overridden user is still a valid member of the company
      const [overrideMember] = await db
        .select({ user_id: companyMembersTable.user_id })
        .from(companyMembersTable)
        .where(
          and(
            eq(companyMembersTable.company_id, companyId),
            eq(companyMembersTable.user_id, company.notification_recipient_user_id),
          ),
        )
        .limit(1);

      if (overrideMember) {
        const user = await clerkClient.users.getUser(overrideMember.user_id);
        return user.emailAddresses[0]?.emailAddress ?? null;
      }
    }

    // Fallback: use the default owner
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
  city,
  categoryAr,
  categoryEn,
  subcategoryAr,
  subcategoryEn,
  quantityAr,
  quantityEn,
}: {
  sellerCompanyId: string;
  listingId: string;
  listingRef: string;
  city: string;
  categoryAr: string;
  categoryEn: string;
  subcategoryAr: string;
  subcategoryEn: string;
  quantityAr: string;
  quantityEn: string;
}): Promise<void> {
  await createNotification({
    companyId: sellerCompanyId,
    type: "new_listing_published",
    title_ar: `تم نشر الإعلان ${listingRef} بنجاح`,
    title_en: `Listing ${listingRef} published successfully`,
    body_ar: `تم نشر إعلانك بنجاح وهو متاح الآن للشركات المؤهلة لاستقبال العروض.\n\nرقم الإعلان: ${listingRef}\nالمدينة: ${city}\nالتصنيف الرئيسي: ${categoryAr}\nالتصنيف الفرعي: ${subcategoryAr}\nالكمية: ${quantityAr}`,
    body_en: `Your listing has been published successfully and is now live for qualified companies to submit offers.\n\nListing reference: ${listingRef}\nCity: ${city}\nMain category: ${categoryEn}\nSubcategory: ${subcategoryEn}\nQuantity: ${quantityEn}`,
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
  city,
  categoryAr,
  categoryEn,
  subcategoryAr,
  subcategoryEn,
  quantityAr,
  quantityEn,
}: {
  buyerCompanyId: string;
  listingId: string;
  listingRef: string;
  city: string;
  categoryAr: string;
  categoryEn: string;
  subcategoryAr: string;
  subcategoryEn: string;
  quantityAr: string;
  quantityEn: string;
}): Promise<void> {
  await createNotification({
    companyId: buyerCompanyId,
    type: "new_listing_published",
    title_ar: `إعلان جديد متاح للمزايدة: ${categoryAr} في ${city}`,
    title_en: `New Listing Available for Bidding: ${categoryEn} in ${city}`,
    body_ar: `تم نشر إعلان جديد قد يناسب نشاطكم.\n\nرقم الإعلان: ${listingRef}\nالمدينة: ${city}\nالتصنيف الرئيسي: ${categoryAr}\nالتصنيف الفرعي: ${subcategoryAr}\nالكمية: ${quantityAr}\n\nيمكنكم فتح الإعلان للاطلاع على التفاصيل وتقديم عرضكم.`,
    body_en: `A new listing may match your company activity.\n\nListing reference: ${listingRef}\nCity: ${city}\nMain category: ${categoryEn}\nSubcategory: ${subcategoryEn}\nQuantity: ${quantityEn}\n\nOpen the listing to review details and submit your offer.`,
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
    body_ar: `تمت إضافة شحنة جديدة ضمن العقد، وقد تتطلب متابعة أو تأكيد استلام من طرفكم.\n\nرابط العملية: ${url}`,
    body_en: `A new shipment has been added under the contract, which may require follow-up or receipt confirmation from your side.\n\nOperation link: ${url}`,
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
    body_ar: `توجد شحنة بانتظار تأكيد الاستلام.\n\nرابط العملية: ${url}`,
    body_en: `A shipment is awaiting receipt confirmation.\n\nOperation link: ${url}`,
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
    body_ar: `توجد شحنة بانتظار الاعتماد النهائي.\n\nرابط العملية: ${url}`,
    body_en: `A shipment is awaiting finalization.\n\nOperation link: ${url}`,
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

export async function notifyContractCompleted(companyId: string, contractId: string, reference: string) {
  const url = `${BASE_URL}/contracts/${contractId}`;
  await createNotification({
    companyId,
    type: "contract_completed",
    title_ar: `تم إكمال العقد`,
    title_en: `Contract completed`,
    body_ar: `تم إكمال العقد ${reference}. يمكنك مراجعة تفاصيل العقد والشحنات من صفحة العقد.`,
    body_en: `Contract ${reference} has been completed. You can review the contract and shipment details from the contract page.`,
    relatedEntityType: "contract",
    relatedEntityId: contractId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض العقد",
    actionText_en: "View Contract",
  });
}

// ── SIR-2D: Sustainability Correction Notifications ──────────────────────────

export async function notifyCorrectionApproved({
  companyId,
  allocationId,
  commercialRef,
}: {
  companyId: string;
  allocationId: string;
  commercialRef: string;
}): Promise<void> {
  const url = `${BASE_URL}/sustainability/allocations`;
  await createNotification({
    companyId,
    type: "sustainability.correction_approved",
    title_ar: `تمت الموافقة على طلب التصحيح: ${commercialRef}`,
    title_en: `Correction request approved: ${commercialRef}`,
    body_ar: `تمت الموافقة على طلب إعادة فتح التخصيص ${commercialRef} كمسودة تصحيحية. يمكنك الآن تعديل المسودة واعتمادها.`,
    body_en: `Your correction request for allocation ${commercialRef} has been approved. You can now edit and finalize the correction draft.`,
    relatedEntityType: "sustainability_allocation",
    relatedEntityId: allocationId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض مسودة التصحيح",
    actionText_en: "View Correction Draft",
  });
}

export async function notifyCorrectionRejected({
  companyId,
  allocationId,
  commercialRef,
  rejectionReason,
}: {
  companyId: string;
  allocationId: string;
  commercialRef: string;
  rejectionReason: string;
}): Promise<void> {
  await createNotification({
    companyId,
    type: "sustainability.correction_rejected",
    title_ar: `تم رفض طلب التصحيح: ${commercialRef}`,
    title_en: `Correction request rejected: ${commercialRef}`,
    body_ar: `تم رفض طلب إعادة فتح التخصيص ${commercialRef}.\n\nالسبب: ${rejectionReason}`,
    body_en: `Your correction request for allocation ${commercialRef} was rejected.\n\nReason: ${rejectionReason}`,
    relatedEntityType: "sustainability_allocation",
    relatedEntityId: allocationId,
    sendMail: true,
  });
}

export async function notifyAdminInitiatedCorrection({
  companyId,
  allocationId,
  commercialRef,
}: {
  companyId: string;
  allocationId: string;
  commercialRef: string;
}): Promise<void> {
  const url = `${BASE_URL}/sustainability/allocations`;
  await createNotification({
    companyId,
    type: "sustainability.admin_initiated_correction",
    title_ar: `تم فتح مسودة تصحيحية بواسطة المسؤول: ${commercialRef}`,
    title_en: `Admin opened a correction draft: ${commercialRef}`,
    body_ar: `قام المسؤول بإنشاء مسودة تصحيحية للتخصيص ${commercialRef}. يمكنك مراجعة التعديلات واعتمادها.`,
    body_en: `An admin created a correction draft for allocation ${commercialRef}. You can review and finalize the correction.`,
    relatedEntityType: "sustainability_allocation",
    relatedEntityId: allocationId,
    sendMail: true,
    actionUrl: url,
    actionText_ar: "عرض مسودة التصحيح",
    actionText_en: "View Correction Draft",
  });
}

