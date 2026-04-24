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
}

interface EmailPayload {
  to: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  listingId?: string;
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
                    <a href="${listingLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
                      فتح في تدويرة &rarr;
                    </a>
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
    await resend.emails.send({
      from: FROM,
      to: p.to,
      subject: `${p.title_ar} — ${p.title_en}`,
      html: buildHtml(p),
    });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
