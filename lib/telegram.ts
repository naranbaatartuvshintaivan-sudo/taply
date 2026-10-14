import "server-only";
import { env } from "./env";

// Шинэ TAPLY bot-оор зөвхөн sendMessage / sendPhoto / sendMediaGroup дуудна.
// getUpdates, setWebhook, deleteWebhook-ийг энд хэзээ ч дуудахгүй.

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// payload: JSON объект эсвэл (файлтай бол) FormData
async function tg(method: string, payload: Record<string, unknown> | FormData) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env();
  let body: string | FormData;
  const headers: Record<string, string> = {};
  if (payload instanceof FormData) {
    payload.set("chat_id", TELEGRAM_CHAT_ID);
    body = payload;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, ...payload });
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(payload instanceof FormData ? 30_000 : 10_000),
  });
  if (!res.ok) {
    // Token URL-д байдаг тул URL-ийг хэзээ ч алдаанд оруулахгүй
    const json = (await res.json().catch(() => null)) as { description?: string } | null;
    throw new Error(`Telegram ${method} ${res.status}: ${json?.description ?? "алдаа"}`);
  }
}

type Button = { buttonText?: string; buttonUrl?: string };
const keyboard = (o: Button) =>
  o.buttonUrl ? { inline_keyboard: [[{ text: o.buttonText ?? "Нээх", url: o.buttonUrl }]] } : undefined;

/** HTML parse mode. Хэрэглэгчийн өгөгдлийг дуудагч тал escapeHtml-ээр escape хийсэн байх ёстой. */
export function sendTelegram(html: string, opts: Button = {}) {
  const reply_markup = keyboard(opts);
  return tg("sendMessage", {
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(reply_markup ? { reply_markup } : {}),
  });
}

/** Зураг + HTML caption (≤1024 тэмдэгт). Файлыг шууд илгээнэ — public URL шаардлагагүй. */
export function sendTelegramPhoto(photo: { bytes: Uint8Array; filename: string; type: string }, html: string, opts: Button = {}) {
  const form = new FormData();
  form.set("photo", new Blob([photo.bytes as BlobPart], { type: photo.type }), photo.filename);
  form.set("caption", html);
  form.set("parse_mode", "HTML");
  const reply_markup = keyboard(opts);
  if (reply_markup) form.set("reply_markup", JSON.stringify(reply_markup));
  return tg("sendPhoto", form);
}

/** /api/health — token хүчинтэй, bot TELEGRAM_CHAT_ID-д хандаж чадаж байгаа эсэх (мессеж илгээхгүй). */
export function pingTelegram() {
  return tg("getChat", {});
}
