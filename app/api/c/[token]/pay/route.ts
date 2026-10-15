import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin";
import { adminFromCookie, payForChoice } from "@/lib/custom-checkout";
import { json, readJson, supportMessage, userError } from "@/lib/http";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// /c/<token> "Төлөх" → { d, s, qty: { fb, ig }, test? } → Wire checkout URL.
// Бүх үнэ, шалгалт lib/custom-checkout.ts-д (сервер). Token буруу бол 404, мэдээлэл задруулахгүй.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let body: { d?: unknown; s?: unknown; qty?: unknown; test?: unknown };
  try {
    body = ((await readJson(req)) ?? {}) as typeof body;
  } catch {
    return userError(400, "Хүсэлт буруу байна");
  }
  const raw = (body.qty ?? {}) as Record<string, unknown>;
  const qty = { fb: Number(raw.fb ?? 0), ig: Number(raw.ig ?? 0) };
  const admin = adminFromCookie((await cookies()).get(ADMIN_COOKIE)?.value);

  const r = await payForChoice(token, { d: body.d, s: body.s, qty, test: body.test === true }, clientIp(req.headers), admin);
  switch (r.kind) {
    case "redirect":
      return json({ ok: true, url: r.url, orderId: r.orderId });
    case "paid":
      return json({ ok: true, paid: true, orderId: r.orderId });
    case "processing":
      return userError(409, "Таны төлбөр шалгагдаж байна. Түр хүлээгээд дахин оролдоно уу.");
    case "phone_only":
      return json({ ok: false, phoneOnly: true, message: r.message });
    case "invalid":
      return userError(400, r.message, r.field ? { field: r.field } : {});
    case "rate_limited":
      return userError(429, "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.");
    case "not_found":
      return new Response("Not found", { status: 404 });
    default:
      return userError(502, supportMessage());
  }
}
