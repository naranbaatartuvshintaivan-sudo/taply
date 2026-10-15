import { customQuote, PHONE_ONLY_MESSAGE } from "@/lib/custom-checkout";
import { json, readJson, userError } from "@/lib/http";
import type { Platform } from "@/lib/mockups/variants";
import { validateStandardOrder } from "@/lib/order-input";

export const runtime = "nodejs";

// Хураангуй алхамд харуулах дүн — серверээс тооцно (захиалга үүсгэхгүй)
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return userError(400, "Хүсэлт буруу байна");
  }

  // Өөрийн логотой (/c хуудас): { type: "custom", platforms: ["fb","ig"], qty: { fb, ig } }
  const b = body as { type?: unknown; platforms?: unknown; qty?: unknown } | null;
  if (b?.type === "custom") {
    const platforms = Array.isArray(b.platforms) ? b.platforms.filter((p): p is Platform => p === "fb" || p === "ig") : [];
    if (platforms.length === 0 || platforms.length !== new Set(platforms).size) return userError(400, "Хүсэлт буруу байна");
    const raw = (b.qty ?? {}) as Record<string, unknown>;
    const qty = Object.fromEntries(platforms.map((p) => [p, Number(raw[p] ?? 0)]));
    const q = customQuote(platforms, qty);
    if (!q.ok) {
      if (q.reason === "phone_only") return json({ ok: false, phoneOnly: true, message: PHONE_ONLY_MESSAGE });
      return userError(400, "message" in q ? q.message : "Тоо ширхгээ шалгана уу");
    }
    return json({ ok: true, totalQty: q.totalQty, subtotal: q.subtotal, unitPrice: q.unitPrice, deliveryFee: q.deliveryFee, total: q.total });
  }

  const v = validateStandardOrder(body);
  if (!v.ok) return userError(400, v.message, { field: v.field });
  const q = v.order.quote;
  return json({
    ok: true,
    totalQty: q.totalQty,
    subtotal: q.subtotal,
    unitPrice: q.unitPrice,
    deliveryFee: q.deliveryFee,
    total: q.total,
    fbUrl: v.order.fbUrl,
    igUrl: v.order.igUrl,
  });
}
