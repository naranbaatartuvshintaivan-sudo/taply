import { describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({ env: () => ({ CRON_SECRET: "s".repeat(32) }) }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

import type { CustomDb, CustomRequest, MockupSet } from "./custom-db";
import { buildItems, customQuote, loadChoice, payForChoice, sameOrder, type CheckoutDeps } from "./custom-checkout";
import type { NewOrder, Order } from "./db";

const TOKEN = "T".repeat(32);
const REQ_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const baseReq: CustomRequest = {
  id: REQ_ID,
  token: TOKEN,
  business_id: "biz",
  business_name: "Номин",
  contact_name: "Бат",
  email: "bat@x.mn",
  phone: "99112233",
  district: "Баянгол",
  address: "12-р байр",
  quantity: 2,
  status: "sent",
  chosen_design: null,
  chosen_set: null,
  chosen_at: null,
  fb_url: "https://www.facebook.com/nomin",
  ig_url: "https://www.instagram.com/nomin/",
  logo_path: `${REQ_ID}/original.png`,
  note: null,
  design_set: 2,
  mockup_dir: "dir-2",
  generated_at: "now",
  sent_at: "now",
  created_at: "now",
  updated_at: "now",
};

const SETS: MockupSet[] = [
  { request_id: REQ_ID, design_set: 1, mockup_dir: "dir-1", created_at: "t1" },
  { request_id: REQ_ID, design_set: 2, mockup_dir: "dir-2", created_at: "t2" },
];

function setup(o: { req?: Partial<CustomRequest> | null; allow?: boolean } = {}) {
  const req = o.req === null ? null : { ...baseReq, ...o.req };
  const orders: Order[] = [];
  const payments: Awaited<ReturnType<CheckoutDeps["listPayments"]>> = [];
  const calls: string[] = [];
  let seq = 0;
  const telegram = vi.fn(async () => {});
  const alert = vi.fn(async () => {});
  const limits = new Map<string, number>();
  const db: Partial<CustomDb> = {
    hitRateLimit: async (bucket, key, limit) => {
      if (o.allow === false) return false;
      const n = (limits.get(bucket + key) ?? 0) + 1;
      limits.set(bucket + key, n);
      return n <= limit;
    },
    getByToken: async (t) => (req && t === req.token ? req : null),
    getMockupSet: async (_id, set) => SETS.find((s) => s.design_set === set) ?? null,
    mockupUrl: (p) => `https://cdn/${p}`,
    listOpenOrders: async () => orders.filter((x) => ["pending_payment", "paid", "in_production", "delivered"].includes(x.status)),
    insertCustomOrder: async (n: NewOrder & { custom_request_id: string }) => {
      if (orders.some((x) => x.status === "pending_payment")) return null; // unique index
      const order = { ...n, id: `order-${++seq}`, code: `TP-${2000 + seq}`, status: "pending_payment" } as Order;
      orders.push(order);
      calls.push(`insert:${order.id}`);
      return order;
    },
  };
  const deps: CheckoutDeps = {
    db: db as CustomDb,
    orders: {
      setOrderStatus: async (id, from, to) => {
        const x = orders.find((y) => y.id === id)!;
        if (x.status !== from) return false;
        x.status = to;
        calls.push(`status:${id}:${to}`);
        return true;
      },
    },
    startCheckout: async (order) => (calls.push(`checkout:${order.id}`), `https://pay.wire.mn/c/${order.id}`),
    retryCheckout: async (id) => (calls.push(`retry:${id}`), { kind: "redirect", url: `https://pay.wire.mn/c/${id}-retry` }),
    syncPaid: async (id) => (calls.push(`sync:${id}`), { status: orders.find((x) => x.id === id)!.status }),
    listPayments: async () => payments,
    voidIntents: async (id) => void calls.push(`void:${id}`),
    telegram,
    alert,
    secret: "s".repeat(32),
  };
  return { deps, orders, calls, telegram, alert, payments };
}

describe("үнэ (custom хүснэгт, нийт тоогоор)", () => {
  const total = (fb: number, ig = 0) => {
    const q = customQuote(ig ? ["fb", "ig"] : ["fb"], { fb, ig });
    return q.ok ? [q.subtotal, q.deliveryFee, q.total] : q.reason;
  };
  it.each([
    [1, [44_900, 7_000, 51_900]],
    [2, [69_900, 7_000, 76_900]],
    [3, [3 * 32_900, 0, 3 * 32_900]],
    [9, [9 * 32_900, 0, 9 * 32_900]],
    [10, [10 * 29_900, 0, 10 * 29_900]],
    [29, [29 * 29_900, 0, 29 * 29_900]],
  ])("%i ширхэг", (n, expected) => {
    expect(total(n)).toEqual(expected);
  });
  it("30+ → онлайн төлбөргүй (phone_only)", () => {
    expect(total(30)).toBe("phone_only");
    expect(total(20, 10)).toBe("phone_only"); // FB+IG нийлбэрээр
  });
  it("FB+IG үнэ нийт тоогоор: 2+1 = 3 ширхэгийн үнэ", () => {
    expect(total(2, 1)).toEqual([3 * 32_900, 0, 3 * 32_900]);
  });
});

describe("buildItems", () => {
  const c = { design: "B" as const, set: 1 };
  it("хоёр платформ: тус бүр ≥0, нийт ≥1 — нэг платформын захиалга зөвшөөрнө", () => {
    expect(buildItems(["fb", "ig"], { fb: 0, ig: 0 }, c).ok).toBe(false);
    expect(buildItems(["fb", "ig"], { fb: 0, ig: 1 }, c)).toEqual({
      ok: true,
      totalQty: 1,
      items: [{ sku: "custom_wide", qty: 1, platform: "ig", design: "B", set: 1 }],
    });
    const r = buildItems(["fb", "ig"], { fb: 2, ig: 0 }, c);
    expect(r).toEqual({ ok: true, totalQty: 2, items: [{ sku: "custom_wide", qty: 2, platform: "fb", design: "B", set: 1 }] });
  });
  it("линк өгөөгүй платформын тоог авч үзэхгүй (сервер)", () => {
    expect(buildItems(["fb"], { fb: 1, ig: 5 }, c)).toMatchObject({ ok: true, totalQty: 1 });
  });
  it("нэг платформ: ≥1; бутархай/сөрөг татгалзана", () => {
    expect(buildItems(["ig"], { ig: 0 }, c).ok).toBe(false);
    expect(buildItems(["ig"], { ig: 1 }, c).ok).toBe(true);
    expect(buildItems(["fb"], { fb: 1.5 }, c).ok).toBe(false);
    expect(buildItems(["fb"], { fb: -1 }, c).ok).toBe(false);
  });
});

describe("loadChoice (/c/<token>)", () => {
  it("хуучин багцын линк (s=1) → багц 1-ийн зураг; s байхгүй → сүүлийнх", async () => {
    const s = setup();
    const old = await loadChoice(TOKEN, "1", "C", "ip", s.deps);
    expect(old.kind === "ok" && old.page.set.design_set).toBe(1);
    expect(old.kind === "ok" && old.page.images.C.map((i) => i.url)).toEqual(["https://cdn/dir-1/C-fb.png", "https://cdn/dir-1/C-ig.png"]);
    const latest = await loadChoice(TOKEN, undefined, "x", "ip", s.deps);
    expect(latest.kind === "ok" && [latest.page.set.design_set, latest.page.design]).toEqual([2, "A"]);
  });
  it("token таарахгүй → not_found (юу ч задруулахгүй)", async () => {
    const s = setup({ req: null });
    expect(await loadChoice(TOKEN, "1", "A", "ip", s.deps)).toEqual({ kind: "not_found" });
    expect(await loadChoice("short", "1", "A", "ip", setup().deps)).toEqual({ kind: "not_found" });
  });
  it("IP rate limit → rate_limited, DB-ээс token хайхгүй", async () => {
    const s = setup({ allow: false });
    expect(await loadChoice(TOKEN, "1", "A", "ip", s.deps)).toEqual({ kind: "rate_limited" });
  });
});

describe("payForChoice", () => {
  const input = { d: "B", s: "1", qty: { fb: 2, ig: 1 } };

  it("захиалга: custom, snapshot хаяг, серверийн үнэ, загвар/багц items-д", async () => {
    const s = setup();
    const r = await payForChoice(TOKEN, input, "ip", false, s.deps);
    expect(r).toEqual({ kind: "redirect", url: "https://pay.wire.mn/c/order-1", orderId: "order-1" });
    expect(s.orders[0]).toMatchObject({
      type: "custom",
      custom_request_id: REQ_ID,
      customer_name: "Бат",
      phone: "99112233",
      district: "Баянгол",
      address: "12-р байр",
      total_qty: 3,
      total: 3 * 32_900,
      delivery_fee: 0,
      note: "Загвар B (багц 1)",
    });
    expect(s.orders[0].items).toEqual([
      { sku: "custom_wide", qty: 2, platform: "fb", design: "B", set: 1 },
      { sku: "custom_wide", qty: 1, platform: "ig", design: "B", set: 1 },
    ]);
  });

  it("давхар дарах → ижил pending-ийг дахин ашиглана, 2 дахь захиалга үүсэхгүй", async () => {
    const s = setup();
    await payForChoice(TOKEN, input, "ip", false, s.deps);
    const r2 = await payForChoice(TOKEN, input, "ip", false, s.deps);
    expect(r2).toMatchObject({ kind: "redirect", orderId: "order-1" });
    expect(s.orders).toHaveLength(1);
    expect(s.calls).toEqual(["insert:order-1", "checkout:order-1", "retry:order-1"]);
  });

  it("тоо/загвар өөрчилбөл: шалгах → DB-д хуучныг canceled → шинэ захиалга → Wire intent цуцлах (best-effort)", async () => {
    const s = setup();
    await payForChoice(TOKEN, input, "ip", false, s.deps);
    const r = await payForChoice(TOKEN, { ...input, d: "A" }, "ip", false, s.deps);
    expect(r).toMatchObject({ kind: "redirect", orderId: "order-2" });
    expect(s.calls).toEqual([
      "insert:order-1",
      "checkout:order-1",
      "sync:order-1",
      "status:order-1:canceled",
      "insert:order-2",
      "checkout:order-2",
      "void:order-1",
    ]);
  });

  it("Wire intent цуцлах алдаа нь шинэ захиалгыг блоклохгүй (лог + ⚠️)", async () => {
    const s = setup();
    await payForChoice(TOKEN, input, "ip", false, s.deps);
    s.deps.voidIntents = async () => {
      throw new Error("wire down");
    };
    const r = await payForChoice(TOKEN, { ...input, qty: { fb: 1, ig: 0 } }, "ip", false, s.deps);
    expect(r).toMatchObject({ kind: "redirect", orderId: "order-2" });
    expect(s.alert).toHaveBeenCalledWith("Wire intent цуцлах", "order-1", expect.any(Error));
  });

  it("хуучин pending-ийн банк төлбөр боловсруулж байвал солихгүй", async () => {
    const s = setup();
    await payForChoice(TOKEN, input, "ip", false, s.deps);
    s.payments.push({ id: "p", order_id: "order-1", payment_intent_id: "pi", attempt: 1, status: "processing", amount: 1, livemode: true, created_at: "" });
    expect(await payForChoice(TOKEN, { ...input, d: "A" }, "ip", false, s.deps)).toEqual({ kind: "processing" });
    expect(s.orders.map((o) => o.status)).toEqual(["pending_payment"]);
  });

  it("төлөгдсөн захиалгатай хүсэлт → дахин захиалга үүсгэхгүй, 'paid'", async () => {
    const s = setup();
    await payForChoice(TOKEN, input, "ip", false, s.deps);
    s.orders[0].status = "paid";
    expect(await payForChoice(TOKEN, { ...input, d: "C" }, "ip", false, s.deps)).toEqual({ kind: "paid", orderId: "order-1" });
    expect(s.orders).toHaveLength(1);
  });

  it("30+ → захиалга үүсэхгүй, утасны мессеж, Telegram '30+ CUSTOM' өдөрт нэг удаа", async () => {
    const s = setup();
    const r = await payForChoice(TOKEN, { ...input, qty: { fb: 20, ig: 10 } }, "ip", false, s.deps);
    expect(r).toMatchObject({ kind: "phone_only" });
    expect((r as { message: string }).message).toContain("9973 2298 · 8018 8488");
    await payForChoice(TOKEN, { ...input, qty: { fb: 30, ig: 5 } }, "ip", false, s.deps);
    expect(s.orders).toHaveLength(0);
    expect(s.telegram).toHaveBeenCalledTimes(1);
    expect((s.telegram.mock.calls[0] as unknown as [string])[0]).toContain("30+ CUSTOM");
  });

  it("байхгүй багц (s=9) → invalid; token буруу → not_found", async () => {
    expect((await payForChoice(TOKEN, { ...input, s: "9" }, "ip", false, setup().deps)).kind).toBe("invalid");
    expect(await payForChoice(TOKEN, input, "ip", false, setup({ req: null }).deps)).toEqual({ kind: "not_found" });
  });

  it("🧪 тест 100₮: админгүй бол татгалзана; админ бол test_100, тэмдэглэлд ТЕСТ", async () => {
    const s = setup();
    expect((await payForChoice(TOKEN, { ...input, test: true }, "ip", false, s.deps)).kind).toBe("invalid");
    const r = await payForChoice(TOKEN, { ...input, test: true }, "ip", true, s.deps);
    expect(r.kind).toBe("redirect");
    expect(s.orders[0]).toMatchObject({ total: 100, subtotal: 100, delivery_fee: 0, note: "🧪 ТЕСТ · Загвар B (багц 1)" });
    expect(s.orders[0].items).toEqual([{ sku: "test_100", qty: 1, design: "B", set: 1 }]);
  });

  it("зэрэг үүсгэх (unique pending 23505) → нөгөөгийн pending-ийг ашиглана", async () => {
    const s = setup();
    // Өөр хүсэлт яг одоо ижил pending үүсгэсэн гэж үзье
    const first = await payForChoice(TOKEN, input, "ip", false, s.deps);
    s.deps.db.listOpenOrders = (() => {
      let n = 0;
      return async () => (n++ === 0 ? [] : s.orders); // эхний шалгалтад хараахан харагдаагүй
    })();
    const second = await payForChoice(TOKEN, input, "ip", false, s.deps);
    expect(first).toMatchObject({ orderId: "order-1" });
    expect(second).toMatchObject({ kind: "redirect", orderId: "order-1" });
    expect(s.orders).toHaveLength(1);
  });
});

describe("sameOrder", () => {
  it("дараалал хамаагүй, тоо/загвар өөр бол false", () => {
    const a = [
      { sku: "custom_wide", qty: 1, platform: "ig" as const, design: "A" as const, set: 1 },
      { sku: "custom_wide", qty: 2, platform: "fb" as const, design: "A" as const, set: 1 },
    ];
    expect(sameOrder({ items: [a[1], a[0]], total: 98_700 }, a, 98_700)).toBe(true);
    expect(sameOrder({ items: a, total: 98_700 }, [{ ...a[0], design: "B" }, a[1]], 98_700)).toBe(false);
  });
});
