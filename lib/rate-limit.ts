import { createHmac } from "node:crypto";

// IP, имэйлийг DB-д шууд хадгалахгүй — HMAC-SHA256 hash. Түлхүүр нь серверийн нууц
// (CRON_SECRET), тиймээс DB алдагдсан ч hash-аас IP/имэйлийг сэргээх боломжгүй.
export const hashKey = (secret: string, bucket: string, value: string) =>
  createHmac("sha256", secret).update(`${bucket}:${value.trim().toLowerCase()}`).digest("hex");

export type RateRule = { bucket: string; limit: number; window: string };

// Custom хүсэлт: IP-ээр 3/цаг, имэйлээр 3/өдөр
export const CUSTOM_LIMITS = {
  ip: { bucket: "custom_ip", limit: 3, window: "1 hour" },
  email: { bucket: "custom_email", limit: 3, window: "1 day" },
} as const satisfies Record<string, RateRule>;

/**
 * Имэйлийн rate limit түлхүүр: жижиг үсэг, @gmail.com (googlemail.com) бол "+tag"-ийг хасна —
 * a+1@gmail.com, a+2@gmail.com нэг inbox тул нэг хязгаарт тоологдоно. Зөвхөн түлхүүрт;
 * имэйл илгээх хаяг хэвээр.
 */
export function normalizeEmailKey(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain !== "gmail.com" && domain !== "googlemail.com") return e;
  return `${local.split("+")[0]}@gmail.com`;
}

/** Vercel нь жинхэнэ client IP-г x-real-ip / x-forwarded-for-ийн эхэнд тавьдаг. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

/**
 * Дүрмүүдийг дарааллаар шалгана. hit нь DB-д атомаар тоолж, хязгаарт хүрээгүй бол бичээд true.
 * Аль нэг нь хязгаарт хүрвэл түүний bucket-ийг буцаана (дараагийнх нь тоологдохгүй).
 */
export async function checkLimits(
  hit: (bucket: string, keyHash: string, limit: number, window: string) => Promise<boolean>,
  secret: string,
  checks: { rule: RateRule; value: string }[],
): Promise<{ ok: true } | { ok: false; bucket: string }> {
  for (const { rule, value } of checks) {
    if (!(await hit(rule.bucket, hashKey(secret, rule.bucket, value), rule.limit, rule.window))) {
      return { ok: false, bucket: rule.bucket };
    }
  }
  return { ok: true };
}
