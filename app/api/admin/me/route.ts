import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Нүүр хуудасны карт админ эсэхийг асуухад — { ok: true | false }. httpOnly cookie-г сервер шалгана,
// түлхүүр хариунд, URL-д хэзээ ч орохгүй. Хувийн, кэшлэхгүй.
export function GET(req: Request) {
  const cookie = (req.headers.get("cookie") ?? "")
    .split(/;\s*/)
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  let ok = false;
  try {
    ok = isAdminCookie(cookie);
  } catch {
    ok = false; // env тохируулаагүй
  }
  return Response.json({ ok }, { headers: { "Cache-Control": "private, no-store" } });
}
