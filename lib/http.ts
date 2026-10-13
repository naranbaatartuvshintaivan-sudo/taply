import "server-only";
import { NextResponse } from "next/server";
import { CONTACT } from "./config";

export const SUPPORT_PHONE = CONTACT.phones[0].label;

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Хэрэглэгчид харуулах алдаа — нууц/техник мэдээлэлгүй. */
export const userError = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, message, ...extra }, status);

export const supportMessage = (code?: string) =>
  `Алдаа гарлаа, ${SUPPORT_PHONE} руу залгана уу.${code ? ` Захиалгын код: ${code}` : ""}`;

export async function readJson(req: Request, maxBytes = 20_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("body too large");
  return JSON.parse(text);
}
