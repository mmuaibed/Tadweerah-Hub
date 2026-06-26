/**
 * Admin notification helpers (SIR-2D).
 *
 * Admin notifications are stored in `admin_notifications` (not the company-scoped
 * `notifications` table). They also trigger transactional emails to admin addresses.
 *
 * Admin email recipients: ADMIN_NOTIFICATION_EMAILS env var (comma-separated).
 * Falls back to SUPPORT_EMAIL if ADMIN_NOTIFICATION_EMAILS is not set.
 */
import { db, adminNotificationsTable } from "@workspace/db";
import { sendEmail } from "./email";

const BASE_URL = process.env.PLATFORM_URL ?? "https://tadweerah.com";

function getAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_NOTIFICATION_EMAILS ?? process.env.SUPPORT_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

interface AdminNotifyParams {
  type: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  /** If true, also send email to all admin addresses. */
  sendMail?: boolean;
  actionText_ar?: string;
  actionText_en?: string;
}

export async function createAdminNotification(p: AdminNotifyParams): Promise<void> {
  try {
    await db.insert(adminNotificationsTable).values({
      type: p.type,
      title_ar: p.title_ar,
      title_en: p.title_en,
      body_ar: p.body_ar ?? null,
      body_en: p.body_en ?? null,
      related_entity_type: p.relatedEntityType ?? null,
      related_entity_id: p.relatedEntityId
        ? (p.relatedEntityId as any)
        : null,
      action_url: p.actionUrl ?? null,
    });
  } catch {
    console.error("[admin-notify] Failed to insert admin notification", {
      type: p.type,
    });
  }

  if (p.sendMail) {
    const emails = getAdminEmails();
    for (const email of emails) {
      void (async () => {
        try {
          await sendEmail({
            to: email,
            title_ar: p.title_ar,
            title_en: p.title_en,
            body_ar: p.body_ar,
            body_en: p.body_en,
            actionUrl: p.actionUrl,
            actionText_ar: p.actionText_ar,
            actionText_en: p.actionText_en,
          });
        } catch {
          console.error("[admin-notify] Failed to send admin email", { email, type: p.type });
        }
      })();
    }
  }
}

// ── Typed helpers ────────────────────────────────────────────────────────────

export async function notifyAdminCorrectionRequested({
  allocationId,
  receivedLineId,
  companyName,
  reason,
  commercialRef,
}: {
  allocationId: string;
  receivedLineId: string;
  companyName: string;
  reason: string;
  commercialRef: string;
}): Promise<void> {
  const actionUrl = `${BASE_URL}/admin?tab=reports&reportSubTab=sustainability`;
  await createAdminNotification({
    type: "sustainability.correction_requested",
    title_ar: `طلب تصحيح استدامة من ${companyName}`,
    title_en: `Sustainability correction request from ${companyName}`,
    body_ar: `طلبت ${companyName} إعادة فتح التخصيص ${commercialRef} كمسودة تصحيحية.\n\nالسبب: ${reason}`,
    body_en: `${companyName} requested a correction draft for allocation ${commercialRef}.\n\nReason: ${reason}`,
    relatedEntityType: "sustainability_correction_request",
    relatedEntityId: receivedLineId,
    actionUrl,
    actionText_ar: "مراجعة الطلب",
    actionText_en: "Review Request",
    sendMail: true,
  });
}
