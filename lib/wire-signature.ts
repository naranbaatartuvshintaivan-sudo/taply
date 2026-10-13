import { createHmac, timingSafeEqual } from "node:crypto";

// WirePayment-Signature: t=<unix сек>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>
// Raw body дээр (parse хийхээс өмнө) шалгана. Цагийн зөрүү ±300 сек.
export const SIGNATURE_HEADER = "wirepayment-signature";
export const TOLERANCE_SEC = 300;

export function verifyWireSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false;
  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const i = piece.indexOf("=");
    if (i > 0) parts.set(piece.slice(0, i).trim(), piece.slice(i + 1).trim());
  }
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1 || !/^\d+$/.test(t) || !/^[0-9a-f]+$/i.test(v1)) return false;
  if (Math.abs(nowSec - Number(t)) > TOLERANCE_SEC) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest();
  const given = Buffer.from(v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Тестэд ашиглах: зөв гарын үсэг үүсгэх
export function signWirePayload(rawBody: string, secret: string, t: number): string {
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex");
  return `t=${t},v1=${v1}`;
}
