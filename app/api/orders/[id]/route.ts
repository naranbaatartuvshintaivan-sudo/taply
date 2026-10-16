import { alert } from "@/lib/alert";
import { db, isUuid } from "@/lib/db";
import { markPaid } from "@/lib/fulfil";
import { allowRequest, ORDER_LIMITS } from "@/lib/guard";
import { json, userError } from "@/lib/http";

export const runtime = "nodejs";

// /o/[id] хуудасны 3 сек тутмын poll. Хүлээгдэж байвал Wire-аас шууд шалгана (webhook хоцорсон үед).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return userError(404, "Олдсонгүй");
  // Poll бүр Wire API-г дууддаг тул хязгаарлана (Wire-ийн хязгаарыг шавхаж, бусдын төлбөрийн баталгаажуулалтыг саатуулахаас)
  if (!(await allowRequest(req, ORDER_LIMITS.status))) return userError(429, "Түр хүлээнэ үү");
  let order = await db.getOrder(id).catch(() => null);
  if (!order) return userError(404, "Олдсонгүй");

  if (order.status === "pending_payment" || order.status === "expired") {
    try {
      await markPaid(order.id);
      order = (await db.getOrder(id)) ?? order;
    } catch (e) {
      await alert("Төлөв шалгах", order.code, e);
    }
  }
  const payments = await db.listPayments(order.id).catch(() => []);
  return json({
    ok: true,
    status: order.status,
    processing: payments.some((p) => p.status === "processing"),
  });
}
