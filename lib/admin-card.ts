// Нүүр хуудасны "Өөрийн логотой" карт: CUSTOM_PUBLIC=false үед нийтэд чат руу, админд /custom руу.
// Цэвэр функц — unit test-тэй. Админ эсэхийг сервер (/api/admin/me, httpOnly cookie) шийднэ.

/** Админ login-д тавигдах, эрх олгодоггүй дохио-cookie. Байхгүй бол /api/admin/me руу хүсэлт ч явуулахгүй. */
export const ADMIN_HINT_COOKIE = "taply_ah";

export function customCardTarget(isAdmin: boolean): { href: string; cta: string } {
  return isAdmin ? { href: "/custom", cta: "Custom захиалга (тест)" } : { href: "#contact", cta: "Холбогдох" };
}

/** document.cookie-д дохио байгаа эсэх (client) */
export const hasAdminHint = (cookie: string) => cookie.split(/;\s*/).some((c) => c === `${ADMIN_HINT_COOKIE}=1`);
