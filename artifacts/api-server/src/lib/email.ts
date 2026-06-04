/**
 * Email helper — wraps Resend for transactional notifications.
 *
 * Soft-disabled when RESEND_API_KEY is absent (dev / pre-config).
 * Never throws — caller is fire-and-forget.
 */
import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "تدويرة <noreply@tadweerah.sa>";
const BASE_URL = process.env.PLATFORM_URL ?? "https://tadweerah.sa";

let resend: Resend | null = null;
if (API_KEY) {
  resend = new Resend(API_KEY);
  console.info("[email] Resend initialised. FROM:", FROM);
} else {
  console.info("[email] RESEND_API_KEY absent — all emails disabled.");
}

interface EmailPayload {
  to: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  listingId?: string;
  actionUrl?: string;
  actionText_ar?: string;
  actionText_en?: string;
}

function buildHtml(p: EmailPayload): string {
  const listingLink = p.listingId ? `${BASE_URL}/listings/${p.listingId}` : BASE_URL;
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${p.title_ar}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Tajawal',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:20px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">تدويرة · Tadweerah</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b;">${p.title_ar}</p>
              ${p.body_ar ? `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">${p.body_ar}</p>` : ""}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
              <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;direction:ltr;text-align:left;">${p.title_en}</p>
              ${p.body_en ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;direction:ltr;text-align:left;">${p.body_en}</p>` : ""}
              <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td>
                    ${p.actionUrl ? `
                    <a href="${p.actionUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;text-align:center;">
                      ${p.actionText_ar ?? 'فتح الرابط'} &rarr;<br/>
                      <span style="font-size:13px;font-weight:400;opacity:0.9">${p.actionText_en ?? 'Open Link'}</span>
                    </a>
                    ` : p.listingId ? `
                    <a href="${listingLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
                      فتح في تدويرة &rarr;
                    </a>
                    ` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                منصة تدويرة · Saudi Arabia — هذا البريد أُرسل تلقائياً، لا تردّ عليه
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(p: EmailPayload): Promise<void> {
  if (!resend) return;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: p.to,
      subject: `${p.title_ar} — ${p.title_en}`,
      html: buildHtml(p),
    });
    if (error) {
      console.error("[email] Resend API rejected email. reason:", error.name, error.message);
    } else {
      console.info("[email] Resend accepted email id:", data?.id);
    }
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : String(err));
  }
}

// ─── Deal Completion Email ────────────────────────────────────────────────────

interface DealCompletionParams {
  /** Recipient email address */
  to: string;
  dealRef: string;
  completionDate: string;
  counterpartyName: string;
  counterpartyCr?: string;
  wasteCategory?: string;
  quantity?: string;
  finalAmount?: string;
  manifestRef?: string;
  dealId: string;
}

function buildDealCompletionHtml(p: DealCompletionParams): string {
  const dealLink = `${BASE_URL}/dashboard`;
  const rows = [
    ["رقم الصفقة / Deal Ref", p.dealRef],
    ["تاريخ الاكتمال / Completion Date", p.completionDate],
    ["الطرف الآخر / Counterparty", p.counterpartyName + (p.counterpartyCr ? ` · ${p.counterpartyCr}` : "")],
    ...(p.wasteCategory ? [["الفئة / Waste Category", p.wasteCategory]] : []),
    ...(p.quantity ? [["الكمية / Quantity", p.quantity]] : []),
    ...(p.finalAmount ? [["المبلغ النهائي / Final Amount", p.finalAmount + " SAR"]] : []),
    ...(p.manifestRef ? [["رقم البيان / Manifest Ref", p.manifestRef]] : []),
  ] as [string, string][];

  const tableRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${label}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;font-family:monospace,monospace;">${value}</td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>اكتملت الصفقة</title></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Tajawal',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
      <tr><td style="background:#166534;padding:20px 32px;">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">تدويرة · Tadweerah</p>
        <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px;">✓ اكتملت الصفقة · Deal Completed</p>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#166534;">اكتملت الصفقة بنجاح</p>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;">أكّد الطرفان إتمام عملية الاستلام والتسليم. يمكنك مراجعة التفاصيل أدناه.</p>
        <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1e293b;direction:ltr;text-align:left;">The deal has been completed successfully.</p>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;direction:ltr;text-align:left;">Both parties have confirmed receipt and delivery. See details below.</p>
      </td></tr>
      <tr><td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          ${tableRows}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 28px;">
        <a href="${dealLink}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          عرض الصفقة في تدويرة &rarr;
        </a>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
          Generated by Tadweerah Platform · منصة تدويرة للنفايات الصناعية
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/* ─────────────────────────────────────────────────────────────
 * Support notification — sent to SUPPORT_EMAIL when a user
 * submits an issue report. No-ops gracefully when RESEND_API_KEY
 * or SUPPORT_EMAIL is absent.
 * ───────────────────────────────────────────────────────────── */
interface SupportNotificationParams {
  reportId: string;
  userId: string;
  companyId: string | null;
  message: string;
  subject?: string | null;
  phone?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

export async function sendSupportNotification(p: SupportNotificationParams): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping support notification for report:", p.reportId);
    return;
  }
  if (!supportEmail) {
    console.info("[email] SUPPORT_EMAIL not set — skipping support notification for report:", p.reportId);
    return;
  }
  const subjectLine = p.subject
    ? `[تدويرة] ${p.subject} — Issue Report ${p.reportId}`
    : `[تدويرة] بلاغ جديد من المستخدم — Issue Report ${p.reportId}`;
  console.info("[email:support] attempting send →", supportEmail, "| report:", p.reportId, "| from:", FROM);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: supportEmail,
      subject: subjectLine,
      html: `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
  <table width="560" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <tr><td style="background:#166534;padding:20px 32px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">تدويرة — Customer Issue Report</p>
    </td></tr>
    <tr><td style="padding:24px 32px;">
      <table width="100%" style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#64748b;width:130px">Report ID</td><td style="padding:6px 0;font-weight:600;font-family:monospace;font-size:11px">${p.reportId}</td></tr>
        ${p.userName ? `<tr><td style="padding:6px 0;color:#64748b">Name</td><td style="padding:6px 0;font-weight:600">${p.userName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
        ${p.userEmail ? `<tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${p.userEmail.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
        ${p.phone ? `<tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0">${p.phone.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
        ${p.companyId ? `<tr><td style="padding:6px 0;color:#64748b">Company ID</td><td style="padding:6px 0;font-family:monospace;font-size:11px">${p.companyId}</td></tr>` : ""}
        ${p.subject ? `<tr><td style="padding:6px 0;color:#64748b">Subject</td><td style="padding:6px 0;font-weight:600">${p.subject.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
      </table>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Message</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px;font-size:14px;color:#1e293b;white-space:pre-wrap;line-height:1.6">${p.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:12px 32px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">Tadweerah Platform — Auto-generated support notification</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`,
    });
    if (error) {
      console.error("[email:support] Resend API error — name:", error.name, "| message:", error.message, "| report:", p.reportId);
    } else {
      console.info("[email:support] Resend accepted — message id:", data?.id, "| report:", p.reportId);
    }
  } catch (err) {
    console.error("[email:support] unexpected exception — report:", p.reportId, err);
  }
}

// ─── Transport Request Ops Notification ───────────────────────────────────────

interface TransportRequestNotificationParams {
  dealId: string;
  listingId: string;
  transportMode: "platform" | "self_managed";
  manifestRef: string | null;
  pickupCity: string | null;
  deliveryCity: string | null;
  wasteDescription: string | null;
  quantity: string | null;
  unit: string | null;
  material: string | null;
  requestedAt: string;
  producerName: string;
  producerPhone: string;
  buyerName: string;
  buyerPhone: string;
}

function buildTransportRequestHtml(p: TransportRequestNotificationParams): string {
  const dealLink = `${BASE_URL}/listings/${p.listingId}`;
  const isPlatform = p.transportMode === "platform";
  const quantityLabel = p.quantity
    ? `${p.quantity}${p.unit ? " " + p.unit : " طن"}`
    : "—";

  const rows: [string, string][] = [
    ["رقم الصفقة / Deal ID", p.dealId],
    ["نوع النقل / Transport Mode", isPlatform ? "منصة (Platform)" : "ذاتي (Self-Managed)"],
    ...(p.manifestRef ? [["رقم البيان / Manifest Ref", p.manifestRef] as [string, string]] : []),
    ["المادة / Material", p.material ?? "—"],
    ["الكمية / Quantity", quantityLabel],
    ["مدينة الاستلام / Pickup City", p.pickupCity ?? "—"],
    ["مدينة التسليم / Delivery City", p.deliveryCity ?? "—"],
    ...(p.wasteDescription ? [["وصف المادة / Waste Description", p.wasteDescription] as [string, string]] : []),
    ["البائع / Seller", p.producerName],
    ["جوال البائع / Seller Phone", p.producerPhone],
    ["المشتري / Buyer", p.buyerName],
    ["جوال المشتري / Buyer Phone", p.buyerPhone],
    ["وقت الطلب / Requested At", p.requestedAt],
  ];

  const tableRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;white-space:nowrap;min-width:160px;">${label}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;">${value}</td>
      </tr>`)
    .join("");

  const headerNote = isPlatform
    ? `<p style="margin:0 0 20px;font-size:14px;color:#64748b;">اختار المنتج خدمة "رتّب النقل لي" — يرجى التنسيق مع ناقل مناسب والتواصل مع الطرفين.</p>
       <p style="margin:0 0 8px;font-size:14px;color:#475569;direction:ltr;text-align:left;">Platform request — please arrange a carrier and follow up with both parties.</p>`
    : `<p style="margin:0 0 20px;font-size:14px;color:#64748b;">طلب نقل ذاتي — سيتولى المنتج أو المشتري ترتيب النقل بشكل مستقل. للمتابعة فقط.</p>
       <p style="margin:0 0 8px;font-size:14px;color:#475569;direction:ltr;text-align:left;">Self-managed transport — parties handle their own logistics. For tracking purposes.</p>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>طلب نقل جديد</title></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Tajawal',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
      <tr><td style="background:#1d4ed8;padding:20px 32px;">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">تدويرة · Tadweerah</p>
        <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">🚛 طلب نقل جديد${isPlatform ? " — يحتاج تنسيق" : " — ذاتي"}</p>
      </td></tr>
      <tr><td style="padding:28px 32px 16px;">
        <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#1e293b;">طلب نقل جديد</p>
        ${headerNote}
      </td></tr>
      <tr><td style="padding:0 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          ${tableRows}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 28px;">
        <a href="${dealLink}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          فتح الصفقة في تدويرة &rarr;
        </a>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
          Tadweerah Ops — Auto-generated transport notification · هذا البريد أُرسل تلقائياً
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/**
 * Sends an ops notification email for every new transport request.
 * Returns true if the email was successfully dispatched, false otherwise.
 */
export async function sendTransportRequestNotification(
  p: TransportRequestNotificationParams,
): Promise<boolean> {
  const opsEmail = process.env.TRANSPORT_REQUEST_EMAIL;
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping transport request notification for deal:", p.dealId);
    return false;
  }
  if (!opsEmail) {
    console.info("[email] TRANSPORT_REQUEST_EMAIL not set — skipping transport request notification for deal:", p.dealId);
    return false;
  }
  try {
    const modeTag = p.transportMode === "platform" ? "PLATFORM" : "SELF";
    await resend.emails.send({
      from: FROM,
      to: opsEmail,
      subject: `[TRANSPORT REQUEST][${modeTag}] - Deal #${p.dealId}`,
      html: buildTransportRequestHtml(p),
    });
    console.info("[email] transport request notification sent for deal:", p.dealId);
    return true;
  } catch (err) {
    console.error("[email] transport request notification FAILED for deal:", p.dealId, err);
    return false;
  }
}

export async function sendDealCompletionEmail(p: DealCompletionParams): Promise<void> {
  if (!resend) {
    console.info("[email] RESEND_API_KEY not set — skipping deal completion email to:", p.to);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: p.to,
      subject: `✓ اكتملت الصفقة ${p.dealRef} — Deal Completed`,
      html: buildDealCompletionHtml(p),
    });
  } catch (err) {
    console.error("[email] deal completion send failed:", err);
  }
}
