import { isAdminKey, TEST_PRICE, TEST_SKU } from "@/lib/admin";
import { alert } from "@/lib/alert";
import { db } from "@/lib/db";
import { startCheckout } from "@/lib/fulfil";
import { readJson, supportMessage, userError, json } from "@/lib/http";
import { contactSchema, validateStandardOrder } from "@/lib/order-input";
import { SKU_LABEL } from "@/lib/pricing";

export const runtime = "nodejs";

// Энгийн захиалга: шалгах → үнэ тооцох (сервер) → нөөц → orders insert → Wire checkout URL
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return userError(400, "Хүсэлт буруу байна");
  }

  const b = body as { test?: unknown; testKey?: unknown } | null;
  if (b?.test === true) return createTestOrder(body, b.testKey);

  const v = validateStandardOrder(body);
  if (!v.ok) {
    if (v.field === "website") return userError(400, "Хүсэлт буруу байна");
    return userError(400, v.message, { field: v.field });
  }
  const { contact, items, fbUrl, igUrl, quote } = v.order;

  let code: string | undefined;
  try {
    const short = await db.checkStock(items);
    if (short.length > 0) {
      const names = short.map((s) => `${SKU_LABEL[s.sku as keyof typeof SKU_LABEL]} (үлдсэн ${s.available})`);
      return userError(409, `Уучлаарай, нөөц хүрэлцэхгүй байна: ${names.join(", ")}`, { field: "items" });
    }

    const order = await db.insertOrder({
      type: "standard",
      customer_name: contact.name,
      phone: contact.phone,
      email: contact.email,
      district: contact.district,
      address: contact.address,
      note: contact.note,
      items,
      total_qty: quote.totalQty,
      subtotal: quote.subtotal,
      delivery_fee: quote.deliveryFee,
      total: quote.total,
      fb_url: fbUrl,
      ig_url: igUrl,
    });
    code = order.code;

    const url = await startCheckout(order, 1);
    return json({ ok: true, url, orderId: order.id, code: order.code });
  } catch (e) {
    await alert("Захиалга үүсгэх", code ?? null, e);
    return userError(502, supportMessage(code));
  }
}

// 🧪 Нуугдмал 100₮ тест захиалга — ADMIN_KEY шаардлагатай. Бодит Wire төлбөрийг шалгахад.
async function createTestOrder(body: unknown, testKey: unknown) {
  if (!isAdminKey(testKey)) return userError(403, "Хүсэлт буруу байна");
  const c = contactSchema.safeParse(body);
  if (!c.success) {
    const issue = c.error.issues[0];
    return userError(400, issue.message, { field: String(issue.path[0] ?? "") });
  }
  let code: string | undefined;
  try {
    const order = await db.insertOrder({
      type: "standard",
      customer_name: c.data.name,
      phone: c.data.phone,
      email: c.data.email,
      district: c.data.district,
      address: c.data.address,
      note: ["🧪 ТЕСТ ЗАХИАЛГА", c.data.note].filter(Boolean).join(" · "),
      items: [{ sku: TEST_SKU, qty: 1 }],
      total_qty: 1,
      subtotal: TEST_PRICE,
      delivery_fee: 0,
      total: TEST_PRICE,
      fb_url: null,
      ig_url: null,
    });
    code = order.code;
    const url = await startCheckout(order, 1);
    return json({ ok: true, url, orderId: order.id, code: order.code });
  } catch (e) {
    await alert("Тест захиалга", code ?? null, e);
    return userError(502, supportMessage(code));
  }
}
