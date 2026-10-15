import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, ADMIN_LOGIN_LIMIT, adminCookieValue, isAdminKey } from "@/lib/admin";
import { customDb } from "@/lib/custom-db";
import { env } from "@/lib/env";
import { checkLimits, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// /admin/login form (POST body) → түлхүүр зөв бол cookie тавиад next руу. Түлхүүр URL-д хэзээ ч орохгүй.
// Буруу бол 404. IP-ээр 10 оролдлого/цаг.
export async function POST(req: Request) {
  let key: FormDataEntryValue | null = null;
  let next = "";
  try {
    const form = await req.formData();
    key = form.get("key");
    next = String(form.get("next") ?? "");
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const limited = await checkLimits(customDb.hitRateLimit, env().CRON_SECRET, [{ rule: ADMIN_LOGIN_LIMIT, value: clientIp(req.headers) }]);
  if (!limited.ok || !isAdminKey(key)) return new NextResponse("Not found", { status: 404 });

  const target = /^\/admin\/[A-Za-z0-9/_-]*$/.test(next) ? next : "/admin/login?ok=1";
  const res = NextResponse.redirect(new URL(target, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    secure: new URL(req.url).protocol === "https:",
    // Lax: Telegram-аас нээхэд (top-level GET) илгээгдэнэ, өөр сайтаас POST хийхэд илгээгдэхгүй
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
