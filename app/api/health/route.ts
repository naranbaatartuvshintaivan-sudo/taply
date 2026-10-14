import { errorSummary } from "@/lib/alert";
import { pingDb } from "@/lib/db";
import { pingResend } from "@/lib/email";
import { env } from "@/lib/env";
import { json } from "@/lib/http";
import { pingTelegram } from "@/lib/telegram";
import { pingWire } from "@/lib/wire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Гадны үйлчилгээний холболтыг шалгана. Нийтэд нээлттэй тул зөвхөн true/false
// буцаана — алдааны дэлгэрэнгүйг зөвхөн серверийн лог руу (нууцыг таслаад).
// Instance тус бүр 30 секунд cache-лэнэ: олон дахин дуудахад гадны API-г дарахгүй.
const TTL_MS = 30_000;
let cached: { at: number; body: Record<string, unknown>; status: number } | null = null;

async function check(name: string, fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    console.error(`[health] ${name}: ${errorSummary(e)}`);
    return false;
  }
}

export async function GET() {
  if (cached && Date.now() - cached.at < TTL_MS) return json(cached.body, cached.status);

  let envOk = true;
  try {
    env();
  } catch (e) {
    envOk = false;
    console.error(`[health] env: ${errorSummary(e)}`);
  }
  const [supabase, telegram, resend, wire] = envOk
    ? await Promise.all([
        check("supabase", pingDb),
        check("telegram", pingTelegram),
        check("resend", pingResend),
        check("wire", pingWire),
      ])
    : [false, false, false, false];
  const checks = {
    env: envOk,
    supabase,
    telegram,
    resend,
    wire,
    wire_webhook_secret: envOk && Boolean(env().WIRE_WEBHOOK_SECRET),
  };
  // Webhook secret-гүй байх нь түр зуурын (бүртгэхээс өмнө) — ok-д нөлөөлөхгүй, тусад нь харуулна
  const ok = envOk && supabase && telegram && resend && wire;
  const body = { ok, checks };
  const status = ok ? 200 : 503;
  cached = { at: Date.now(), body, status };
  return json(body, status);
}
