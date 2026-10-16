import "server-only";
import { errorSummary } from "./alert";
import { hitRateLimit } from "./db";
import { env } from "./env";
import { checkLimits, clientIp, type RateRule } from "./rate-limit";

// Нийтийн order API-ийн IP хязгаар — spam захиалга, Wire API-г дарах, DB дүүргэхээс сэргийлнэ.
// Status poll 3 сек тутам (20/мин) тул 10 минутад 300 нь 1–2 таб хангалттай.
export const ORDER_LIMITS = {
  create: { bucket: "order_create_ip", limit: 10, window: "1 hour" },
  pay: { bucket: "order_pay_ip", limit: 20, window: "1 hour" },
  status: { bucket: "order_status_ip", limit: 300, window: "10 minutes" },
} as const satisfies Record<string, RateRule>;

/**
 * true = зөвшөөрнө. DB түр алдаатай бол жинхэнэ худалдан авагчийг хаахгүйн тулд
 * зөвшөөрнө (fail-open) — зөвхөн лог.
 */
export async function allowRequest(req: Request, rule: RateRule): Promise<boolean> {
  try {
    const r = await checkLimits(hitRateLimit, env().CRON_SECRET, [{ rule, value: clientIp(req.headers) }]);
    return r.ok;
  } catch (e) {
    console.error(`[rate-limit] ${rule.bucket}: ${errorSummary(e)}`);
    return true;
  }
}
