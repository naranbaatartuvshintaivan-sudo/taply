import "server-only";
import { CONTACT } from "./config";
import { env } from "./env";
import { escapeHtml } from "./telegram";

// Resend — https://resend.com/docs/api-reference/emails/send-email
export async function sendEmail(p: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY тохируулаагүй");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": p.idempotencyKey,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [p.to],
      reply_to: CONTACT.email,
      subject: p.subject,
      html: p.html,
      text: p.text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { name?: string; message?: string } | null;
    throw new Error(`Resend ${res.status}: ${body?.name ?? ""} ${body?.message ?? ""}`.trim());
  }
}

// Имэйлийн энгийн, хар/цагаан загвар
export function emailLayout(title: string, rows: [string, string][], footer: string): string {
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-top:1px solid #e5e5e5;color:#6b6b6b;font-size:14px;vertical-align:top;width:140px">${escapeHtml(k)}</td>` +
        `<td style="padding:10px 0;border-top:1px solid #e5e5e5;color:#0a0a0a;font-size:14px;font-weight:600">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="mn"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<div style="font-size:20px;font-weight:800;letter-spacing:.18em">TAPLY</div>
<h1 style="font-size:28px;line-height:1.15;letter-spacing:-.02em;margin:40px 0 24px">${escapeHtml(title)}</h1>
<table style="width:100%;border-collapse:collapse;border-bottom:1px solid #e5e5e5">${tr}</table>
<p style="font-size:14px;line-height:1.7;color:#4a4a4a;margin:28px 0 0">${footer}</p>
</div></body></html>`;
}

/** /api/health — Resend key хүчинтэй эсэх (имэйл илгээхгүй).
 *  Зөвхөн "sending access" эрхтэй key GET /domains-д restricted_api_key буцаадаг — энэ нь key хүчинтэйг харуулна. */
export async function pingResend(): Promise<void> {
  const { RESEND_API_KEY } = env();
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY тохируулаагүй");
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as { name?: string } | null;
  if (res.status === 401 && body?.name === "restricted_api_key") return;
  throw new Error(`Resend ${res.status}: ${body?.name ?? ""}`.trim());
}
