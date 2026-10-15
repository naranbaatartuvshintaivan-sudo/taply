import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Нэвтрэх — TAPLY", robots: { index: false, follow: false } };

// iPhone дээр нэг удаа түлхүүрээ бичнэ → 180 хоногийн cookie. Түлхүүр URL-д орохгүй (POST).
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, jar] = await Promise.all([searchParams, cookies()]);
  const next = typeof sp.next === "string" && /^\/admin\/[A-Za-z0-9/_-]*$/.test(sp.next) ? sp.next : "";
  const loggedIn = isAdminCookie(jar.get(ADMIN_COOKIE)?.value);

  return (
    <main className="min-h-screen bg-white px-4 pt-16 text-ink sm:px-8">
      <div className="mx-auto max-w-[420px]">
        <p className="text-[13px] font-medium uppercase tracking-[.22em] text-mute">TAPLY · Админ</p>
        {loggedIn && (
          <p className="mt-6 text-lg font-semibold">
            Нэвтэрсэн байна ✓ Telegram-ийн “Админ хуудас” товч нээгдэнэ. Нүүр хуудасны тест холбоос харагдахгүй бол дахин нэвтэрнэ үү.
          </p>
        )}
        <form method="post" action="/api/admin/login" className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="text-[13px] font-medium uppercase tracking-[.16em] text-mute">Түлхүүр</span>
            <input
              name="key"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 block min-h-[52px] w-full border-0 border-b-[1.5px] border-ink bg-transparent text-lg outline-none"
            />
          </label>
          <button className="inline-flex min-h-14 items-center justify-center rounded-full bg-ink px-8 text-[16px] font-bold text-white">
            Нэвтрэх
          </button>
          </form>
      </div>
    </main>
  );
}
