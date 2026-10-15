import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminCookieValue, isAdminKey } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /admin/login?key=ADMIN_KEY[&next=/admin/custom/<id>] — iPhone дээр нэг удаа нээхэд cookie тавина.
// Түлхүүр буруу бол 404 (хуудас байгааг ч мэдэгдэхгүй).
export function GET(req: Request) {
  const url = new URL(req.url);
  if (!isAdminKey(url.searchParams.get("key"))) return new NextResponse("Not found", { status: 404 });
  const next = url.searchParams.get("next") ?? "";
  const target = /^\/admin\/[A-Za-z0-9/_-]*$/.test(next) ? next : "/admin/custom";
  const res = NextResponse.redirect(new URL(target, url), 303);
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    secure: url.protocol === "https:",
    // Lax: Telegram-аас нээхэд (top-level GET) илгээгдэнэ, өөр сайтаас POST хийхэд илгээгдэхгүй
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
