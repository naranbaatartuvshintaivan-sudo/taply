import "server-only";
import { after } from "next/server";
import { alert } from "./alert";
import { CONTACT } from "./config";
import { db as realDb, type Db, type Order } from "./db";
import { emailLayout, sendEmail } from "./email";
import { env } from "./env";
import { displayLink } from "./links";
import { fmt, quote, SKU_LABEL, type Sku } from "./pricing";
import { escapeHtml, sendTelegram } from "./telegram";
import * as realWire from "./wire";

// ─── Хамаарлууд (тестэд хуурамчаар солино) ─────────────────────
export type Deps = {
  db: Db;
  wire: Pick<typeof realWire, "getPaymentIntent" | "createPaymentIntent" | "createCheckoutSession" | "cancelPaymentIntent">;
  telegram: (html: string, opts?: { buttonText?: string; buttonUrl?: string }) => Promise<void>;
  email: typeof sendEmail | null; // null = Resend тохируулаагүй
  makeWebhook: ((order: Order) => Promise<void>) | null;
  alert: typeof alert;
  schedule: (fn: () => Promise<void>) => void;
  siteUrl: string;
};

export function defaultDeps(): Deps {
  const e = env();
  return {
    db: realDb,
    wire: realWire,
    telegram: sendTelegram,
    email: e.RESEND_API_KEY ? sendEmail : null,
    makeWebhook: e.MAKE_WEBHOOK_URL ? (o) => postToMake(e.MAKE_WEBHOOK_URL!, o) : null,
    alert,
    schedule: (fn) => after(fn),
    siteUrl: e.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
  };
}

const FINAL = new Set(["succeeded", "canceled"]);
export const MAX_ATTEMPTS = 10;

// ─── Төлбөр эхлүүлэх ──────────────────────────────────────────
/** Шинэ PaymentIntent + checkout session үүсгээд pay.wire.mn URL буцаана. */
export async function startCheckout(order: Order, attempt: number, deps: Deps = defaultDeps()): Promise<string> {
  // Idempotency key: захиалгын код + оролдлого (+ id-ийн эхний 8 тэмдэгт — DB reset хийвэл код давтагдахаас сэргийлнэ)
  const suffix = `${order.code}-${attempt}-${order.id.slice(0, 8)}`;
  const pi = await deps.wire.createPaymentIntent({
    amount: order.total,
    description: `TAPLY ${order.code}`,
    metadata: { order_id: order.id, order_code: order.code },
    idempotencyKey: `pi-${suffix}`,
  });
  if (pi.amount !== order.total) throw new Error(`PaymentIntent дүн таарахгүй (${pi.amount} ≠ ${order.total})`);

  await deps.db.insertPayment({
    order_id: order.id,
    payment_intent_id: pi.id,
    attempt,
    status: pi.status,
    amount: pi.amount,
    livemode: pi.livemode,
  });

  const back = `${deps.siteUrl}/o/${order.id}`;
  const cs = await deps.wire.createCheckoutSession({
    paymentIntentId: pi.id,
    successUrl: back,
    cancelUrl: back,
    idempotencyKey: `cs-${suffix}`,
  });
  if (!/^https:\/\/pay\.wire\.mn\//.test(cs.url)) throw new Error("Checkout URL хүлээгдээгүй хаяг");
  return cs.url;
}

/** "Дахин төлөх": өмнөх төлөгдөөгүй intent-үүдийг цуцлаад шинэ оролдлого. */
export async function retryCheckout(
  orderId: string,
  deps: Deps = defaultDeps(),
): Promise<
  | { kind: "redirect"; url: string }
  | { kind: "status"; status: Order["status"] }
  | { kind: "processing" }
> {
  // Эхлээд төлөгдсөн эсэхийг шалгана (хэрэглэгч аль хэдийн төлсөн байж болно)
  const synced = await markPaid(orderId, undefined, deps);
  if (synced.status !== "pending_payment") return { kind: "status", status: synced.status };

  const payments = await deps.db.listPayments(orderId);
  // Банк төлбөрийг боловсруулж байна — цуцалбал жинхэнэ төлбөрийг таслах эрсдэлтэй
  if (payments.some((p) => p.status === "processing")) return { kind: "processing" };
  for (const p of payments) {
    if (FINAL.has(p.status)) continue;
    try {
      const pi = await deps.wire.cancelPaymentIntent(p.payment_intent_id);
      await deps.db.setPaymentStatus(p.payment_intent_id, pi.status);
    } catch (e) {
      // Цуцлах боломжгүй (жишээ нь яг одоо төлөгдсөн) → дахин шалгаад зогсооно
      const again = await markPaid(orderId, undefined, deps);
      if (again.status !== "pending_payment") return { kind: "status", status: again.status };
      throw e;
    }
  }

  const order = await deps.db.getOrder(orderId);
  if (!order || order.status !== "pending_payment") return { kind: "status", status: order?.status ?? "canceled" };
  const attempt = payments.reduce((m, p) => Math.max(m, p.attempt), 0) + 1;
  if (attempt > MAX_ATTEMPTS) throw new Error("Хэт олон оролдлого");
  return { kind: "redirect", url: await startCheckout(order, attempt, deps) };
}

// ─── markPaid — webhook, /o/[id], reconcile бүгд үүнийг дуудна ─
/**
 * Wire-аас PaymentIntent-ийг GET хийж `succeeded`, дүн, metadata таарч байвал
 * захиалгыг атомаар paid болгоно. Мэдэгдэл нэг л удаа (DB-ийн UPDATE ... WHERE status
 * дээр зөвхөн нэг дуудлага ялна).
 *
 * intentId өгвөл зөвхөн тэр intent-ийг, өгөхгүй бол захиалгын бүх эцсийн бус intent-ийг шалгана.
 */
export async function markPaid(
  orderId: string,
  intentId?: string,
  deps: Deps = defaultDeps(),
): Promise<{ status: Order["status"]; newlyPaid: boolean }> {
  const order = await deps.db.getOrder(orderId);
  if (!order) throw new Error("Захиалга олдсонгүй");

  const payments = await deps.db.listPayments(orderId);
  const candidates = intentId
    ? payments.filter((p) => p.payment_intent_id === intentId)
    : payments.filter((p) => !FINAL.has(p.status));
  if (intentId && candidates.length === 0) throw new Error("Энэ захиалгад тухайн PaymentIntent бүртгэлгүй");

  for (const p of candidates) {
    const pi = await deps.wire.getPaymentIntent(p.payment_intent_id);
    if (pi.status !== p.status) await deps.db.setPaymentStatus(pi.id, pi.status);
    if (pi.status !== "succeeded") continue;

    if (pi.amount !== order.total || pi.metadata?.order_id !== order.id) {
      await deps.alert("markPaid", order.code, new Error(`дүн/metadata таарахгүй (${pi.amount} vs ${order.total})`));
      continue;
    }

    const won = await deps.db.markOrderPaid(order.id, pi.id);
    if (won) {
      deps.schedule(() => deliverNotifications(order.id, won.shortSkus, deps));
      return { status: "paid", newlyPaid: true };
    }

    // Өөр дуудлага аль хэдийн paid болгосон. Өөр intent-ээр төлөгдсөн бол давхар төлбөр!
    const fresh = await deps.db.getOrder(order.id);
    if (fresh?.paid_payment_intent_id && fresh.paid_payment_intent_id !== pi.id) {
      await deps.alert("Давхар төлбөр", order.code, new Error(`${pi.id} — буцаалт хийх хэрэгтэй`));
    }
    return { status: fresh?.status ?? order.status, newlyPaid: false };
  }

  return { status: order.status, newlyPaid: false };
}

// ─── Мэдэгдэл ─────────────────────────────────────────────────
export function itemsText(order: Pick<Order, "items">): string {
  return order.items
    .filter((i) => i.qty > 0)
    .map((i) => `${i.qty}× ${SKU_LABEL[i.sku as Sku] ?? (i.sku === "test_100" ? "🧪 ТЕСТ 100₮" : i.sku)}`)
    .join(", ");
}

export function paidTelegramHtml(order: Order, siteUrl: string, shortSkus: string[] = []): string {
  const q = quote(order.type, order.items);
  // Дахин тооцсон дүн төлсөн дүнтэй таарвал л задаргааг харуулна (тест захиалга г.м.)
  const breakdown =
    q.ok && q.total === order.total
      ? q.breakdown
      : order.delivery_fee === 0
        ? "хүргэлт үнэгүй"
        : `хүргэлт ${fmt(order.delivery_fee)}`;
  const links = [
    order.fb_url ? `FB: ${escapeHtml(displayLink(order.fb_url))}` : null,
    order.ig_url ? `IG: ${escapeHtml(displayLink(order.ig_url))}` : null,
  ].filter(Boolean);
  const head =
    order.type === "custom"
      ? `🟣 CUSTOM · ${escapeHtml(order.code)} · ТӨЛӨГДСӨН`
      : `🟢 ШИНЭ ЗАХИАЛГА · ${escapeHtml(order.code)} · ТӨЛӨГДСӨН`;
  const lines = [
    `<b>${head}</b>`,
    escapeHtml(itemsText(order)),
    `Дүн: <b>${fmt(order.total)}₮</b> (${escapeHtml(breakdown)})`,
    `👤 ${escapeHtml(order.customer_name)} · ${escapeHtml(order.phone)}`,
    `📍 ${escapeHtml(order.district)}, ${escapeHtml(order.address)}`,
    links.length ? links.join("  ") : null,
    order.email ? `✉️ ${escapeHtml(order.email)}` : null,
    order.note ? `Тэмдэглэл: ${escapeHtml(order.note)}` : null,
    shortSkus.length
      ? `⚠️ Нөөц хүрэлцэхгүй: ${escapeHtml(shortSkus.map((s) => SKU_LABEL[s as Sku] ?? s).join(", "))}`
      : null,
    `🔗 ${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}/o/${order.id}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function paidEmail(order: Order): { subject: string; html: string; text: string } {
  const phones = CONTACT.phones.map((p) => p.label).join(" · ");
  const delivery = order.delivery_fee === 0 ? "Үнэгүй" : `${fmt(order.delivery_fee)}₮`;
  const rows: [string, string][] = [
    ["Захиалга", order.code],
    ["Бараа", itemsText(order)],
    ["Хүргэлт", `${delivery}\n${order.district}, ${order.address}`],
    ["Нийт төлсөн", `${fmt(order.total)}₮`],
  ];
  const footer =
    `Бид удахгүй тантай утсаар холбогдож хүргэх цагаа тохирно. ` +
    `Асуух зүйл байвал: <b>${phones}</b>.<br>` +
    `7 хоногийн дотор карт ажиллахгүй бол мөнгийг тань бүтэн буцаана.`;
  return {
    subject: `TAPLY — ${order.code} захиалгын төлбөр баталгаажлаа`,
    html: emailLayout("Төлбөр баталгаажлаа. Баярлалаа!", rows, footer),
    text: [
      `TAPLY — ${order.code} захиалгын төлбөр баталгаажлаа.`,
      ...rows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ", ")}`),
      `Бид удахгүй тантай холбогдоно. Утас: ${phones}`,
      `7 хоногийн дотор карт ажиллахгүй бол мөнгийг тань бүтэн буцаана.`,
    ].join("\n"),
  };
}

/** Telegram + имэйл + Make. Тус бүр claim-тэй — давтан дуудсан ч нэг л удаа явна. */
export async function deliverNotifications(orderId: string, shortSkus: string[] = [], deps: Deps = defaultDeps()) {
  const order = await deps.db.getOrder(orderId);
  if (!order || !order.paid_at) return;

  if (!order.notified_at && (await deps.db.claimNotification(order.id, "telegram"))) {
    try {
      await deps.telegram(paidTelegramHtml(order, deps.siteUrl, shortSkus), {
        buttonText: "Захиалга нээх",
        buttonUrl: `${deps.siteUrl}/o/${order.id}`,
      });
      await deps.db.setNotified(order.id, "telegram");
    } catch (e) {
      await deps.db.releaseNotification(order.id, "telegram").catch(() => {});
      await deps.alert("Telegram мэдэгдэл", order.code, e);
    }
    // Make (Google Sheet) — заавал биш, амжилтгүй бол зөвхөн ⚠️
    if (deps.makeWebhook) {
      try {
        await deps.makeWebhook(order);
      } catch (e) {
        await deps.alert("Make webhook", order.code, e);
      }
    }
  }

  if (order.email && !order.customer_emailed_at && deps.email && (await deps.db.claimNotification(order.id, "email"))) {
    try {
      await deps.email({ to: order.email, ...paidEmail(order), idempotencyKey: `paid-${order.id}` });
      await deps.db.setNotified(order.id, "email");
    } catch (e) {
      await deps.db.releaseNotification(order.id, "email").catch(() => {});
      await deps.alert("Имэйл", order.code, e);
    }
  }
}

async function postToMake(url: string, order: Order) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: order.code,
      type: order.type,
      paid_at: order.paid_at,
      customer_name: order.customer_name,
      phone: order.phone,
      email: order.email,
      district: order.district,
      address: order.address,
      note: order.note,
      items: itemsText(order),
      total_qty: order.total_qty,
      total: order.total,
      fb_url: order.fb_url,
      ig_url: order.ig_url,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Make ${res.status}`);
}

