import { alert } from "@/lib/alert";
import { db, isUuid } from "@/lib/db";
import { retryCheckout } from "@/lib/fulfil";
import { allowRequest, ORDER_LIMITS } from "@/lib/guard";
import { json, supportMessage, userError } from "@/lib/http";

export const runtime = "nodejs";

// "Дахин төлөх" — өмнөх төлөгдөөгүй intent-ийг цуцлаад шинэ checkout
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return userError(404, "Олдсонгүй");
  if (!(await allowRequest(req, ORDER_LIMITS.pay))) {
    return userError(429, "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.");
  }
  const order = await db.getOrder(id).catch(() => null);
  if (!order) return userError(404, "Олдсонгүй");

  try {
    const r = await retryCheckout(order.id);
    if (r.kind === "redirect") return json({ ok: true, url: r.url });
    if (r.kind === "processing") {
      return userError(409, "Таны төлбөр шалгагдаж байна. Түр хүлээнэ үү.", { status: "pending_payment" });
    }
    return json({ ok: true, status: r.status });
  } catch (e) {
    await alert("Дахин төлөх", order.code, e);
    return userError(502, supportMessage(order.code));
  }
}
