import "server-only";
import { redactSecrets } from "./redact";
import { escapeHtml, sendTelegram } from "./telegram";

// Чухал замын алдаа → Telegram "⚠️ <газар> · <захиалга> · <товч алдаа>".
// Нууц мэдээлэл оруулахгүй: зөвхөн алдааны төрөл/код, захиалгын код.
// Ижил мессежийг 10 минутад нэг л удаа (instance тус бүрд).
const DEDUPE_MS = 10 * 60_000;
const recent = new Map<string, number>();

export function errorSummary(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Нууц утга (ADMIN_KEY г.м.), URL-ийн ?key=, token-уудыг нууж, уртыг таслана
  return redactSecrets(msg).slice(0, 300);
}

export async function alert(where: string, refRaw: string | null, e: unknown): Promise<void> {
  const summary = errorSummary(e);
  const ref = refRaw === null ? null : redactSecrets(refRaw);
  console.error(`[alert] ${where} · ${ref ?? "-"} · ${summary}`);
  const key = `${where}|${ref}|${summary}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUPE_MS) return;
  recent.set(key, now);
  for (const [k, t] of recent) if (now - t > DEDUPE_MS) recent.delete(k);
  try {
    await sendTelegram(`⚠️ ${escapeHtml(where)} · ${escapeHtml(ref ?? "-")} · ${escapeHtml(summary)}`);
  } catch (err) {
    console.error("[alert] Telegram руу илгээж чадсангүй:", errorSummary(err));
  }
}
