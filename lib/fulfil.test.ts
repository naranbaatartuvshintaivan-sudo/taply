import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("./env", () => ({ env: () => ({}) }));

import type { Db, Order, Payment } from "./db";
import { deliverNotifications, markPaid, retryCheckout, voidIntents, type Deps } from "./fulfil";
import { handleWireWebhook } from "./webhook";
import { signWirePayload } from "./wire-signature";
import type { PaymentIntent } from "./wire";

const tick = () => new Promise((r) => setTimeout(r, Math.random() * 3));

// ─── Санах ой дахь DB: Postgres-ийн атом UPDATE-ийг дуурайна ───
function fakeDb() {
  const orders = new Map<string, Order & { notify_claimed_at: number | null; email_claimed_at: number | null }>();
  const payments: Payment[] = [];
  const events = new Set<string>();
  const db: Db = {
    async insertOrder() {
      throw new Error("n/a");
    },
    async getOrder(id) {
      await tick();
      const o = orders.get(id);
      return o ? structuredClone(o) : null;
    },
    async setOrderStatus(id, from, to) {
      const o = orders.get(id)!;
      if (o.status !== from) return false;
      o.status = to;
      return true;
    },
    async listPayments(orderId) {
      await tick();
      return payments.filter((p) => p.order_id === orderId).map((p) => ({ ...p }));
    },
    async insertPayment(p) {
      if (payments.some((x) => x.payment_intent_id === p.payment_intent_id)) return;
      payments.push({ ...p, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    },
    async setPaymentStatus(id, status) {
      await tick();
      payments.find((p) => p.payment_intent_id === id)!.status = status;
    },
    async getPaymentByIntent(id) {
      await tick();
      return payments.find((p) => p.payment_intent_id === id) ?? null;
    },
    async markOrderPaid(orderId, intentId) {
      await tick();
      // ↓ синхрон блок = нэг transaction
      const o = orders.get(orderId)!;
      if (o.status !== "pending_payment" && o.status !== "expired") return null;
      o.status = "paid";
      o.paid_at = new Date().toISOString();
      o.paid_payment_intent_id = intentId;
      payments.find((p) => p.payment_intent_id === intentId)!.status = "succeeded";
      return { order: structuredClone(o), shortSkus: [] };
    },
    async claimNotification(orderId, kind) {
      await tick();
      const o = orders.get(orderId)!;
      const [done, claim] =
        kind === "telegram" ? (["notified_at", "notify_claimed_at"] as const) : (["customer_emailed_at", "email_claimed_at"] as const);
      if (o.status === "pending_payment" || o[done]) return false;
      if (kind === "email" && !o.email) return false;
      const c = o[claim];
      if (c !== null && Date.now() - c < 10 * 60_000) return false;
      o[claim] = Date.now();
      return true;
    },
    async setNotified(orderId, kind) {
      const o = orders.get(orderId)!;
      if (kind === "telegram") o.notified_at = new Date().toISOString();
      else o.customer_emailed_at = new Date().toISOString();
    },
    async releaseNotification(orderId, kind) {
      const o = orders.get(orderId)!;
      if (kind === "telegram") o.notify_claimed_at = null;
      else o.email_claimed_at = null;
    },
    async recordWebhookEvent(id) {
      await tick();
      if (events.has(id)) return false;
      events.add(id);
      return true;
    },
    async forgetWebhookEvent(id) {
      events.delete(id);
    },
    async checkStock() {
      return [];
    },
    async listStalePending() {
      return [];
    },
    async listUnnotifiedPaid() {
      return [];
    },
  };
  return { db, orders, payments, events };
}

const ORDER_ID = "11111111-2222-3333-4444-555555555555";

function setup(opts: { piStatus?: PaymentIntent["status"]; piAmount?: number; email?: string | null } = {}) {
  const f = fakeDb();
  f.orders.set(ORDER_ID, {
    id: ORDER_ID,
    code: "TP-1042",
    type: "standard",
    status: "pending_payment",
    customer_name: "Бат",
    phone: "99112233",
    email: opts.email === undefined ? "bat@example.com" : opts.email,
    district: "Хан-Уул",
    address: "15-р хороо",
    note: null,
    items: [
      { sku: "fb_sticker", qty: 2 },
      { sku: "ig_stand", qty: 1 },
    ],
    total_qty: 3,
    subtotal: 83_700,
    delivery_fee: 0,
    total: 83_700,
    fb_url: "https://www.facebook.com/bat",
    ig_url: "https://www.instagram.com/bat/",
    custom_request_id: null,
    paid_at: null,
    paid_payment_intent_id: null,
    notified_at: null,
    customer_emailed_at: null,
    created_at: new Date().toISOString(),
    notify_claimed_at: null,
    email_claimed_at: null,
  });
  f.payments.push({
    id: "p1",
    order_id: ORDER_ID,
    payment_intent_id: "pi_one",
    attempt: 1,
    status: "requires_payment_method",
    amount: 83_700,
    livemode: true,
    created_at: new Date().toISOString(),
  });

  const pending: Promise<void>[] = [];
  const intents = new Map<string, PaymentIntent>();
  const mkPi = (id: string, status: PaymentIntent["status"], amount = 83_700): PaymentIntent => ({
    id,
    object: "payment_intent",
    amount,
    currency: "MNT",
    description: "TAPLY TP-1042",
    status,
    metadata: { order_id: ORDER_ID, order_code: "TP-1042" },
    livemode: true,
    created: 0,
    expires_at: null,
  });
  intents.set("pi_one", mkPi("pi_one", opts.piStatus ?? "succeeded", opts.piAmount));

  const telegram = vi.fn(async () => {
    await tick();
  });
  const email = vi.fn(async () => {
    await tick();
  });
  const alert = vi.fn(async () => {});
  const deps: Deps = {
    db: f.db,
    wire: {
      getPaymentIntent: vi.fn(async (id: string) => {
        await tick();
        return { ...intents.get(id)! };
      }),
      createPaymentIntent: vi.fn(async (p) => {
        const id = `pi_${p.idempotencyKey.replace(/\W/g, "")}`;
        if (!intents.has(id)) intents.set(id, mkPi(id, "requires_payment_method", p.amount));
        return { ...intents.get(id)! };
      }),
      createCheckoutSession: vi.fn(async (p) => ({
        id: "cs_x",
        object: "checkout_session" as const,
        payment_intent: p.paymentIntentId,
        status: "open",
        url: `https://pay.wire.mn/c/cs_${p.paymentIntentId}`,
      })),
      cancelPaymentIntent: vi.fn(async (id: string) => {
        const pi = intents.get(id)!;
        if (pi.status === "succeeded") throw new Error("payment_intent_unexpected_state");
        pi.status = "canceled";
        return { ...pi };
      }),
    },
    telegram,
    email,
    makeWebhook: null,
    alert,
    schedule: (fn) => void pending.push(fn()),
    siteUrl: "https://taplymn.com",
  };
  const flush = async () => {
    while (pending.length) await pending.shift();
  };
  return { ...f, deps, telegram, email, alert, intents, flush, mkPi };
}

describe("markPaid", () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it("succeeded → paid, Telegram 1, имэйл 1", async () => {
    const r = await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    expect(r).toEqual({ status: "paid", newlyPaid: true });
    expect(s.orders.get(ORDER_ID)!.status).toBe("paid");
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect(s.email).toHaveBeenCalledTimes(1);
  });

  it("race: 10 зэрэг дуудалт → 1 мэдэгдэл", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => markPaid(ORDER_ID, i % 2 ? "pi_one" : undefined, s.deps)),
    );
    await s.flush();
    expect(results.filter((r) => r.newlyPaid)).toHaveLength(1);
    expect(results.every((r) => r.status === "paid")).toBe(true);
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect(s.email).toHaveBeenCalledTimes(1);
  });

  it("төлөгдөөгүй intent → pending хэвээр, мэдэгдэлгүй", async () => {
    s = setup({ piStatus: "requires_action" });
    const r = await markPaid(ORDER_ID, undefined, s.deps);
    await s.flush();
    expect(r).toEqual({ status: "pending_payment", newlyPaid: false });
    expect(s.payments[0].status).toBe("requires_action");
    expect(s.telegram).not.toHaveBeenCalled();
  });

  it("дүн таарахгүй → paid болгохгүй, ⚠️", async () => {
    s = setup({ piAmount: 1 });
    const r = await markPaid(ORDER_ID, "pi_one", s.deps);
    expect(r.newlyPaid).toBe(false);
    expect(s.orders.get(ORDER_ID)!.status).toBe("pending_payment");
    expect(s.alert).toHaveBeenCalledTimes(1);
  });

  it("metadata.order_id таарахгүй → paid болгохгүй", async () => {
    s.intents.get("pi_one")!.metadata = { order_id: "other" };
    const r = await markPaid(ORDER_ID, "pi_one", s.deps);
    expect(r.newlyPaid).toBe(false);
    expect(s.orders.get(ORDER_ID)!.status).toBe("pending_payment");
  });

  it("хугацаа дууссан (expired) захиалга дээр хожуу төлбөр → paid", async () => {
    s.orders.get(ORDER_ID)!.status = "expired";
    const r = await markPaid(ORDER_ID, undefined, s.deps);
    expect(r.newlyPaid).toBe(true);
  });

  it("өөр intent-ээр давхар төлөгдсөн → ⚠️ давхар төлбөр", async () => {
    await markPaid(ORDER_ID, "pi_one", s.deps);
    s.payments.push({ ...s.payments[0], id: "p2", payment_intent_id: "pi_two", attempt: 2, status: "requires_action" });
    s.intents.set("pi_two", s.mkPi("pi_two", "succeeded"));
    const r = await markPaid(ORDER_ID, "pi_two", s.deps);
    await s.flush();
    expect(r.newlyPaid).toBe(false);
    expect(s.alert).toHaveBeenCalledWith("Давхар төлбөр", "TP-1042", expect.any(Error));
    expect(s.telegram).toHaveBeenCalledTimes(1);
  });

  it("мэдэгдэл дахин дуудсан ч (reconcile) давхардахгүй", async () => {
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    await Promise.all([deliverNotifications(ORDER_ID, [], s.deps), deliverNotifications(ORDER_ID, [], s.deps)]);
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect(s.email).toHaveBeenCalledTimes(1);
  });

  it("Telegram алдаа гарвал дараа нь дахин оролдоно", async () => {
    s.telegram.mockRejectedValueOnce(new Error("Telegram 502"));
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    expect(s.orders.get(ORDER_ID)!.notified_at).toBeNull();
    await deliverNotifications(ORDER_ID, [], s.deps);
    expect(s.telegram).toHaveBeenCalledTimes(2);
    expect(s.orders.get(ORDER_ID)!.notified_at).not.toBeNull();
  });

  it("имэйлгүй захиалга → имэйл илгээхгүй", async () => {
    s = setup({ email: null });
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect(s.email).not.toHaveBeenCalled();
  });
});

describe("Wire webhook", () => {
  const secret = "whsec_unit_test";
  const now = 1_791_774_042;
  const body = (id = "evt_1", type = "payment_intent.succeeded") =>
    JSON.stringify({ id, object: "event", type, created: now, data: { id: "pi_one", status: "succeeded" } });
  const send = (s: ReturnType<typeof setup>, raw: string, sig = signWirePayload(raw, secret, now)) =>
    handleWireWebhook(raw, sig, secret, s.deps, now);

  it("зөв event → 200, paid, мэдэгдэл 1", async () => {
    const s = setup();
    expect((await send(s, body())).status).toBe(200);
    await s.flush();
    expect(s.orders.get(ORDER_ID)!.status).toBe("paid");
    expect(s.telegram).toHaveBeenCalledTimes(1);
  });

  it("ижил event 2 удаа (зэрэг) → мэдэгдэл 1", async () => {
    const s = setup();
    const raw = body();
    const r = await Promise.all([send(s, raw), send(s, raw)]);
    await s.flush();
    expect(r.map((x) => x.status)).toEqual([200, 200]);
    expect(r.map((x) => x.body).sort()).toEqual(["duplicate", "ok"]);
    expect(s.telegram).toHaveBeenCalledTimes(1);
  });

  it("өөр event id, ижил intent → мэдэгдэл 1", async () => {
    const s = setup();
    await Promise.all([send(s, body("evt_1")), send(s, body("evt_2"))]);
    await s.flush();
    expect(s.telegram).toHaveBeenCalledTimes(1);
  });

  it("буруу гарын үсэг → 400, юу ч өөрчлөхгүй", async () => {
    const s = setup();
    const r = await send(s, body(), signWirePayload(body(), "whsec_wrong", now));
    expect(r.status).toBe(400);
    expect(s.orders.get(ORDER_ID)!.status).toBe("pending_payment");
    expect(s.events.size).toBe(0);
  });

  it("хуучирсан timestamp → 400", async () => {
    const s = setup();
    const r = await send(s, body(), signWirePayload(body(), secret, now - 600));
    expect(r.status).toBe(400);
  });

  it("endpoint.verification гарын үсэггүй → 200, үйлдэлгүй", async () => {
    const s = setup();
    const raw = JSON.stringify({ id: "evt_v", type: "endpoint.verification" });
    const r = await send(s, raw, null as unknown as string);
    expect(r.status).toBe(200);
    expect(s.events.size).toBe(0);
  });

  it("Wire GET алдаа → 500 ба event-ийг мартаж, дахин илгээхэд боловсруулна", async () => {
    const s = setup();
    const get = s.deps.wire.getPaymentIntent as ReturnType<typeof vi.fn>;
    get.mockRejectedValueOnce(new Error("Wire 503"));
    expect((await send(s, body())).status).toBe(500);
    expect(s.events.size).toBe(0);
    expect((await send(s, body())).status).toBe(200);
    await s.flush();
    expect(s.orders.get(ORDER_ID)!.status).toBe("paid");
    expect(s.telegram).toHaveBeenCalledTimes(1);
  });
});

describe("retryCheckout", () => {
  it("өмнөх intent-ийг цуцлаад шинэ оролдлого", async () => {
    const s = setup({ piStatus: "requires_payment_method" });
    const r = await retryCheckout(ORDER_ID, s.deps);
    expect(r.kind).toBe("redirect");
    expect(s.intents.get("pi_one")!.status).toBe("canceled");
    expect(s.payments.map((p) => p.attempt)).toEqual([1, 2]);
  });

  it("processing intent байвал цуцлахгүй", async () => {
    const s = setup({ piStatus: "processing" });
    const r = await retryCheckout(ORDER_ID, s.deps);
    expect(r).toEqual({ kind: "processing" });
    expect(s.deps.wire.cancelPaymentIntent).not.toHaveBeenCalled();
    expect(s.deps.wire.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("аль хэдийн төлөгдсөн бол шинэ intent үүсгэхгүй", async () => {
    const s = setup({ piStatus: "succeeded" });
    const r = await retryCheckout(ORDER_ID, s.deps);
    expect(r).toEqual({ kind: "status", status: "paid" });
    expect(s.deps.wire.createPaymentIntent).not.toHaveBeenCalled();
  });
});

// ─── Шат 3: custom захиалгын төлөгдөлт (markPaid-ийн ижил зам + custom салбар) ───
describe("custom захиалга төлөгдөхөд", () => {
  const REQ = "99999999-8888-7777-6666-555555555555";
  function customSetup() {
    const s = setup();
    const o = s.orders.get(ORDER_ID)!;
    o.type = "custom";
    o.custom_request_id = REQ;
    o.items = [
      { sku: "custom_wide", qty: 2, platform: "fb", design: "B", set: 1 },
      { sku: "custom_wide", qty: 1, platform: "ig", design: "B", set: 1 },
    ];
    const chosen: string[] = [];
    const media = vi.fn(async () => {});
    s.deps.custom = {
      markChosen: async (id, d, set) => void chosen.push(`${id}:${d}:${set}`),
      photos: async () => [
        { bytes: new Uint8Array([1]), filename: "B-fb.png", type: "image/png" },
        { bytes: new Uint8Array([2]), filename: "logo.png", type: "image/png" },
      ],
      media,
    };
    return { ...s, chosen, media };
  }

  it("Telegram 1 (загвар B, багц 1) + зурагтай цомог 1, хүсэлт 'chosen' — зэрэг 10 дуудалтад ч нэг удаа", async () => {
    const s = customSetup();
    await Promise.all(Array.from({ length: 10 }, () => markPaid(ORDER_ID, "pi_one", s.deps)));
    await s.flush();
    expect(s.telegram).toHaveBeenCalledTimes(1);
    const html = (s.telegram.mock.calls[0] as unknown as [string])[0];
    expect(html).toContain("🟣 CUSTOM · TP-1042 · ТӨЛӨГДСӨН · загвар B (багц 1)");
    expect(html).toContain("2× Өөрийн логотой стенд (FB), 1× Өөрийн логотой стенд (IG)");
    expect(s.media).toHaveBeenCalledTimes(1);
    expect(s.chosen).toEqual([`${REQ}:B:1`]);
  });

  it("reconcile дахин дуудсан ч мэдэгдэл давхардахгүй", async () => {
    const s = customSetup();
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    await deliverNotifications(ORDER_ID, [], s.deps);
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect(s.media).toHaveBeenCalledTimes(1);
  });

  it("зургийн алдаа → зөвхөн ⚠️, үндсэн мэдэгдэл явсан, дахин явуулахгүй", async () => {
    const s = customSetup();
    s.deps.custom!.photos = async () => {
      throw new Error("storage down");
    };
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect(s.alert).toHaveBeenCalledWith("Custom Telegram зураг", "TP-1042", expect.any(Error));
    expect(s.orders.get(ORDER_ID)!.notified_at).not.toBeNull();
  });

  it("нэг хүсэлтэд өөр захиалга төлөгдсөн (unique 23505) → paid болохгүй, payments 'succeeded' хадгалагдана, ⚠️ НЭГ удаа", async () => {
    const s = customSetup();
    s.deps.db.markOrderPaid = async () => {
      throw new Error('DB markOrderPaid: 23505 duplicate key value violates unique constraint "orders_one_paid_per_custom_request"');
    };
    // webhook давтан ирсэн, reconcile — 3 дуудалт
    for (let i = 0; i < 3; i++) expect(await markPaid(ORDER_ID, "pi_one", s.deps)).toEqual({ status: "pending_payment", newlyPaid: false });
    await s.flush();
    expect(s.payments.find((p) => p.payment_intent_id === "pi_one")!.status).toBe("succeeded");
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect((s.telegram.mock.calls[0] as unknown as [string])[0]).toContain("ДАВХАР/ХУУЧИН ЗАХИАЛГЫН ТӨЛБӨР</b> TP-1042 — буцаалт/гараар шалгах");
    expect(s.chosen).toEqual([]);
    expect(s.media).not.toHaveBeenCalled();
  });

  it("цуцлагдсан (сольсон) захиалгын хуучин intent төлөгдвөл: canceled хэвээр, payments 'succeeded', ⚠️ НЭГ удаа", async () => {
    const s = customSetup();
    s.orders.get(ORDER_ID)!.status = "canceled";
    for (let i = 0; i < 3; i++) await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    expect(s.orders.get(ORDER_ID)!.status).toBe("canceled");
    expect(s.payments.find((p) => p.payment_intent_id === "pi_one")!.status).toBe("succeeded");
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect((s.telegram.mock.calls[0] as unknown as [string])[0]).toContain("ДАВХАР/ХУУЧИН ЗАХИАЛГЫН ТӨЛБӨР");
  });

  it("⚠️ илгээж чадаагүй бол дараагийн дуудалтад дахин оролдоно", async () => {
    const s = customSetup();
    s.orders.get(ORDER_ID)!.status = "canceled";
    s.telegram.mockRejectedValueOnce(new Error("tg down"));
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await markPaid(ORDER_ID, "pi_one", s.deps);
    expect(s.telegram).toHaveBeenCalledTimes(2);
    expect(s.alert).toHaveBeenCalledWith("Хуучин захиалгын төлбөр", "TP-1042", expect.any(Error));
  });

  it("voidIntents: Wire cancel алдаа → ⚠️, throw хийхгүй, бусдыг үргэлжлүүлнэ", async () => {
    const s = setup();
    s.payments.push({ id: "p2", order_id: ORDER_ID, payment_intent_id: "pi_two", attempt: 2, status: "requires_payment_method", amount: 1, livemode: true, created_at: "" });
    s.deps.wire.cancelPaymentIntent = vi.fn(async (id: string) => {
      if (id === "pi_one") throw new Error("wire 500");
      return { ...s.mkPi(id, "canceled") };
    });
    await expect(voidIntents(ORDER_ID, s.deps)).resolves.toBeUndefined();
    expect(s.alert).toHaveBeenCalledWith("Wire intent цуцлах", "pi_one", expect.any(Error));
    expect(s.payments.find((p) => p.payment_intent_id === "pi_two")!.status).toBe("canceled");
  });

  it("энгийн захиалгад custom deps байсан ч custom салбар ажиллахгүй", async () => {
    const s = setup();
    const media = vi.fn(async () => {});
    s.deps.custom = { markChosen: vi.fn(async () => {}), photos: async () => [], media };
    await markPaid(ORDER_ID, "pi_one", s.deps);
    await s.flush();
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect((s.telegram.mock.calls[0] as unknown as [string])[0]).toContain("🟢 ШИНЭ ЗАХИАЛГА");
    expect(media).not.toHaveBeenCalled();
    expect(s.deps.custom.markChosen).not.toHaveBeenCalled();
  });
});
