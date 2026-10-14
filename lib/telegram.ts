import "server-only";
import { env } from "./env";

// Шинэ TAPLY bot-оор зөвхөн sendMessage / sendMediaGroup дуудна.
// getUpdates, setWebhook, deleteWebhook-ийг энд хэзээ ч дуудахгүй.

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg(method: string, payload: Record<string, unknown>) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env();
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, ...payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Token URL-д байдаг тул URL-ийг хэзээ ч алдаанд оруулахгүй
    const body = (await res.json().catch(() => null)) as { description?: string } | null;
    throw new Error(`Telegram ${method} ${res.status}: ${body?.description ?? "алдаа"}`);
  }
}

/** HTML parse mode. Хэрэглэгчийн өгөгдлийг дуудагч тал escapeHtml-ээр escape хийсэн байх ёстой. */
export function sendTelegram(html: string, opts: { buttonText?: string; buttonUrl?: string } = {}) {
  return tg("sendMessage", {
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(opts.buttonUrl
      ? { reply_markup: { inline_keyboard: [[{ text: opts.buttonText ?? "Нээх", url: opts.buttonUrl }]] } }
      : {}),
  });
}

/** /api/health — token хүчинтэй, bot TELEGRAM_CHAT_ID-д хандаж чадаж байгаа эсэх (мессеж илгээхгүй). */
export function pingTelegram() {
  return tg("getChat", {});
}
