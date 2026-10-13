import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** ADMIN_KEY-г constant-time харьцуулна. */
export function isAdminKey(given: unknown): boolean {
  if (typeof given !== "string" || given.length === 0 || given.length > 512) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(env().ADMIN_KEY).digest();
  return timingSafeEqual(a, b);
}

// Нуугдмал тест бүтээгдэхүүн — бодит Wire төлбөрийг 100₮-өөр шалгахад.
// Зөвхөн ?key=ADMIN_KEY-тэй үед харагдана, сервер мөн key-г шалгана.
export const TEST_SKU = "test_100";
export const TEST_PRICE = 100;
