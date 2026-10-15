import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** ADMIN_KEY-г constant-time харьцуулна. */
export function isAdminKey(given: unknown): boolean {
  if (typeof given !== "string" || given.length === 0 || given.length > 512) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(env().ADMIN_KEY).digest();
  return timingSafeEqual(a, b);
}

// Админ cookie: /admin/login хуудсанд түлхүүрээ нэг удаа бичихэд (POST) тавигдана (iPhone дээр 180 хоног).
// Түлхүүр URL-д огт орохгүй — Vercel-ийн request log, Telegram, браузерын түүхэнд үлдэхгүй.
// Cookie-д ADMIN_KEY өөрөө биш, түүнээс гаргасан HMAC хадгална.
export const ADMIN_COOKIE = "taply_admin";
export const ADMIN_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export const adminCookieValue = () => createHmac("sha256", env().ADMIN_KEY).update("taply-admin-cookie-v1").digest("hex");

export function isAdminCookie(given: unknown): boolean {
  if (typeof given !== "string" || given.length !== 64) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(adminCookieValue()));
}

// Түлхүүрээр нэвтрэх оролдлого: IP-ээр 10/цаг
export const ADMIN_LOGIN_LIMIT = { bucket: "admin_login_ip", limit: 10, window: "1 hour" } as const;

// Нуугдмал тест бүтээгдэхүүн — бодит Wire төлбөрийг 100₮-өөр шалгахад.
// Зөвхөн ?key=ADMIN_KEY-тэй үед харагдана, сервер мөн key-г шалгана.
export const TEST_SKU = "test_100";
export const TEST_PRICE = 100;
