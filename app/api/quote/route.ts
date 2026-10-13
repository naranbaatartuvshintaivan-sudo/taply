import { json, readJson, userError } from "@/lib/http";
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
