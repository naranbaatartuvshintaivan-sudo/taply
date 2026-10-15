import "server-only";
import { isAdminCookie, TEST_PRICE, TEST_SKU } from "./admin";
import { alert } from "./alert";
import { CONTACT } from "./config";
import { customDb, PAID_STATUSES, type CustomDb, type CustomRequest, type MockupSet } from "./custom-db";
import { db, type Db, type Order, type OrderItem } from "./db";
import { env } from "./env";
import { cancelOpenIntents, defaultDeps as fulfilDeps, retryCheckout, startCheckout } from "./fulfil";
import { mockupPath, PLATFORM_LABEL, requestPlatforms } from "./mockup-paths";
import { DESIGN_KEYS, designSet, type DesignKey } from "./mockups/designs";
import type { Platform } from "./mockups/variants";
import { CUSTOM_PHONE_ONLY_FROM, quote, type Quote } from "./pricing";
import { checkLimits, hashKey, type RateRule } from "./rate-limit";
import { escapeHtml, sendTelegram } from "./telegram";

// Шат 3: /c/<token>?d=A&s=1 — харилцагч загвараа сонгож, тоогоо оруулаад төлнө.
// Үнийг ҮРГЭЛЖ сервер тооцно (lib/pricing-ийн custom хүснэгт). Төлбөр нь Phase 2-ын
// startCheckout / retryCheckout / markPaid-ийг ДАХИН ашиглана — шинэ төлбөрийн код биш.

export const CUSTOM_SKU = "custom_wide";

// Token таамаглахаас хамгаалах (token 192 бит, гэхдээ давтан оролдлогыг ч хязгаарлана)
export const C_LIMITS = {
  view: { bucket: "c_view_ip", limit: 120, window: "1 hour" },
  pay: { bucket: "c_pay_ip", limit: 20, window: "1 hour" },
} as const satisfies Record<string, RateRule>;

/** Token-ий хэлбэр (32 тэмдэгт base64url) — буруу бол DB-д хүрэхгүйгээр 404 */
export const isTokenShape = (t: string) => /^[A-Za-z0-9_-]{32}$/.test(t);

const PHONES = CONTACT.phones.map((p) => p.label).join(" · ");
export const PHONE_ONLY_MESSAGE = `${CUSTOM_PHONE_ONLY_FROM}-аас дээш ширхэгийг утсаар тохирно: ${PHONES}`;

// ─── Тоо ширхэг, үнэ (цэвэр функц) ───────────────────────────────

export type Qty = Partial<Record<Platform, number>>;
export type Choice = { design: DesignKey; set: number };

export type ItemsResult = { ok: true; items: OrderItem[]; totalQty: number } | { ok: false; field: string; message: string };

/**
 * Платформ бүрийн тоо → захиалгын мөрүүд. Нэг платформ бол ≥1. Хоёр платформ бол тус бүр ≥0,
 * нийт ≥2 (хоёр хувилбартай загварт). Үнэ нийт тоогоор тооцогдоно.
 */
export function buildItems(platforms: Platform[], qty: Qty, choice: Choice): ItemsResult {
  const items: OrderItem[] = [];
  let total = 0;
  for (const p of platforms) {
    const n = qty[p] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > 999) return { ok: false, field: p, message: "Тоо ширхэг бүхэл тоо байх ёстой" };
    total += n;
    if (n > 0) items.push({ sku: CUSTOM_SKU, qty: n, platform: p, design: choice.design, set: choice.set });
  }
  if (platforms.length === 1 && total < 1) return { ok: false, field: platforms[0], message: "Дор хаяж 1 ширхэг" };
  if (platforms.length > 1 && total < 2) return { ok: false, field: "fb", message: "Facebook, Instagram нийлээд дор хаяж 2 ширхэг" };
  return { ok: true, items, totalQty: total };
}

/** Сервер дээрх үнэ — custom хүснэгт, хүргэлт (3+ үнэгүй). 30+ бол phone_only. */
export function customQuote(platforms: Platform[], qty: Qty): Quote | { ok: false; reason: "invalid"; message: string } {
  const b = buildItems(platforms, qty, { design: "A", set: 1 });
  if (!b.ok) return { ok: false, reason: "invalid", message: b.message };
  return quote("custom", b.items);
}

/** ?d=, ?s= параметрийг цэвэрлэнэ */
export const parseDesign = (d: unknown): DesignKey => (DESIGN_KEYS.includes(d as DesignKey) ? (d as DesignKey) : "A");
export const parseSet = (s: unknown): number | null => {
  const n = typeof s === "string" && /^\d{1,4}$/.test(s) ? Number(s) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : null;
};

/** Pending захиалга яг ижил сонголт/тоотой юу (давхар дарахад дахин ашиглана) */
export function sameOrder(o: Pick<Order, "items" | "total">, items: OrderItem[], total: number): boolean {
  const norm = (xs: OrderItem[]) =>
    JSON.stringify(
      [...xs]
        .map((i) => ({ sku: i.sku, qty: i.qty, platform: i.platform ?? null, design: i.design ?? null, set: i.set ?? null }))
        .sort((a, b) => `${a.sku}${a.platform}`.localeCompare(`${b.sku}${b.platform}`)),
    );
  return o.total === total && norm(o.items) === norm(items);
}

// ─── Хамаарлууд ──────────────────────────────────────────────────

export type CheckoutDeps = {
  db: CustomDb;
  orders: Pick<Db, "setOrderStatus">;
  /** Phase 2-ын төлбөрийн функцууд (тестэд хуурамч) */
  startCheckout: (order: Order) => Promise<string>;
  retryCheckout: typeof retryCheckout;
  cancelOpenIntents: typeof cancelOpenIntents;
  telegram: typeof sendTelegram;
  alert: typeof alert;
  secret: string;
};

export const defaultCheckoutDeps = (): CheckoutDeps => ({
  db: customDb,
  orders: db,
  startCheckout: (o) => startCheckout(o, 1, fulfilDeps()),
  retryCheckout: (id) => retryCheckout(id, fulfilDeps()),
  cancelOpenIntents: (id) => cancelOpenIntents(id, fulfilDeps()),
  telegram: sendTelegram,
  alert,
  secret: env().CRON_SECRET,
});

async function limited(deps: CheckoutDeps, rule: RateRule, ip: string): Promise<boolean> {
  return !(await checkLimits(deps.db.hitRateLimit, deps.secret, [{ rule, value: ip }])).ok;
}

// ─── Хуудасны өгөгдөл ────────────────────────────────────────────

export type ChoicePage = {
  req: Pick<CustomRequest, "id" | "token" | "business_name" | "fb_url" | "ig_url">;
  set: MockupSet;
  design: DesignKey;
  platforms: Platform[];
  labels: Record<DesignKey, string>;
  /** design → platform → танилцуулах зургийн public URL */
  images: Record<DesignKey, { platform: Platform; label: string; url: string }[]>;
  paid: Pick<Order, "id" | "code" | "items"> | null;
};

export type LoadResult = { kind: "ok"; page: ChoicePage } | { kind: "not_found" } | { kind: "rate_limited" };

/**
 * Token + багц → хуудасны өгөгдөл. Token буруу/байхгүй бол not_found (юу ч задруулахгүй).
 * ?s= байхгүй эсвэл тэр багц олдохгүй бол сүүлийн багцыг харуулна.
 */
export async function loadChoice(token: string, sRaw: unknown, dRaw: unknown, ip: string, deps: CheckoutDeps = defaultCheckoutDeps()): Promise<LoadResult> {
  if (!isTokenShape(token)) return { kind: "not_found" };
  if (await limited(deps, C_LIMITS.view, ip)) return { kind: "rate_limited" };
  const req = await deps.db.getByToken(token);
  if (!req || !req.logo_path || req.design_set < 1) return { kind: "not_found" };

  const wanted = parseSet(sRaw);
  const set = (wanted !== null ? await deps.db.getMockupSet(req.id, wanted) : null) ?? (await deps.db.getMockupSet(req.id, req.design_set));
  if (!set) return { kind: "not_found" };

  const platforms = requestPlatforms(req);
  const layout = designSet(set.design_set);
  const labels = Object.fromEntries(DESIGN_KEYS.map((k) => [k, layout[k].label])) as Record<DesignKey, string>;
  const images = Object.fromEntries(
    DESIGN_KEYS.map((k) => [
      k,
      platforms.map((p) => ({ platform: p, label: PLATFORM_LABEL[p], url: deps.db.mockupUrl(mockupPath(set.mockup_dir, k, p, "preview")) })),
    ]),
  ) as ChoicePage["images"];

  const orders = await deps.db.listOpenOrders(req.id);
  const paid = orders.find((o) => (PAID_STATUSES as readonly string[]).includes(o.status)) ?? null;

  return {
    kind: "ok",
    page: {
      req: { id: req.id, token: req.token, business_name: req.business_name, fb_url: req.fb_url, ig_url: req.ig_url },
      set,
      design: parseDesign(dRaw),
      platforms,
      labels,
      images,
      paid: paid ? { id: paid.id, code: paid.code, items: paid.items } : null,
    },
  };
}

// ─── Төлөх ───────────────────────────────────────────────────────

export type PayInput = { d: unknown; s: unknown; qty: Qty; test?: boolean };

export type PayResult =
  | { kind: "redirect"; url: string; orderId: string }
  | { kind: "paid"; orderId: string }
  | { kind: "processing" }
  | { kind: "phone_only"; message: string }
  | { kind: "invalid"; field?: string; message: string }
  | { kind: "not_found" }
  | { kind: "rate_limited" }
  | { kind: "error" };

/**
 * Сонголт → сервер үнэ → захиалга (эсвэл ижил pending-ийг дахин ашиглах) → Wire checkout URL.
 * Нэг хүсэлтэд: нэг л pending (unique index), нэг л төлөгдсөн захиалга.
 */
export async function payForChoice(
  token: string,
  input: PayInput,
  ip: string,
  admin: boolean,
  deps: CheckoutDeps = defaultCheckoutDeps(),
): Promise<PayResult> {
  if (!isTokenShape(token)) return { kind: "not_found" };
  if (await limited(deps, C_LIMITS.pay, ip)) return { kind: "rate_limited" };
  const req = await deps.db.getByToken(token);
  if (!req || !req.logo_path || req.design_set < 1) return { kind: "not_found" };

  const wanted = parseSet(input.s);
  const set = wanted !== null ? await deps.db.getMockupSet(req.id, wanted) : null;
  if (!set) return { kind: "invalid", message: "Загварын багц олдсонгүй. Имэйлийн линкээ дахин нээнэ үү." };
  const choice: Choice = { design: parseDesign(input.d), set: set.design_set };
  const platforms = requestPlatforms(req);

  // Аль хэдийн төлөгдсөн бол дахин төлүүлэхгүй
  const open = await deps.db.listOpenOrders(req.id);
  const paid = open.find((o) => (PAID_STATUSES as readonly string[]).includes(o.status));
  if (paid) return { kind: "paid", orderId: paid.id };

  // Захиалгын мөр, үнэ (сервер)
  let items: OrderItem[];
  let totals: { totalQty: number; subtotal: number; deliveryFee: number; total: number };
  const label = `Загвар ${choice.design} (багц ${choice.set})`;
  if (input.test) {
    // 🧪 Нуугдмал 100₮ тест — зөвхөн админ cookie-тэй үед (URL-д түлхүүр байхгүй)
    if (!admin) return { kind: "invalid", message: "Хүсэлт буруу байна" };
    items = [{ sku: TEST_SKU, qty: 1, design: choice.design, set: choice.set }];
    totals = { totalQty: 1, subtotal: TEST_PRICE, deliveryFee: 0, total: TEST_PRICE };
  } else {
    const b = buildItems(platforms, input.qty, choice);
    if (!b.ok) return { kind: "invalid", field: b.field, message: b.message };
    const q = quote("custom", b.items);
    if (!q.ok) {
      if (q.reason === "phone_only") {
        await notifyPhoneOnly(req, b.totalQty, deps);
        return { kind: "phone_only", message: PHONE_ONLY_MESSAGE };
      }
      return { kind: "invalid", message: "Тоо ширхгээ шалгана уу" };
    }
    items = b.items;
    totals = { totalQty: q.totalQty, subtotal: q.subtotal, deliveryFee: q.deliveryFee, total: q.total };
  }

  try {
    // Давхар дарах / буцаж ирэх: ижил pending байвал түүнийг дахин ашиглана (шинэ intent, ижил захиалга)
    const pending = open.find((o) => o.status === "pending_payment");
    if (pending) {
      if (sameOrder(pending, items, totals.total)) return await resume(pending.id, deps);
      // Тоо/загвар өөрчлөгдсөн → хуучныг Wire дээр цуцлаад шинийг үүсгэнэ
      const c = await deps.cancelOpenIntents(pending.id);
      if (c.kind === "processing") return { kind: "processing" };
      if (c.kind === "status" && c.status !== "pending_payment") {
        if ((PAID_STATUSES as readonly string[]).includes(c.status)) return { kind: "paid", orderId: pending.id };
      } else {
        await deps.orders.setOrderStatus(pending.id, "pending_payment", "canceled");
      }
    }

    const order = await deps.db.insertCustomOrder({
      type: "custom",
      custom_request_id: req.id,
      customer_name: req.contact_name,
      phone: req.phone,
      email: req.email,
      district: req.district,
      address: req.address,
      note: input.test ? `🧪 ТЕСТ · ${label}` : label,
      items,
      total_qty: totals.totalQty,
      subtotal: totals.subtotal,
      delivery_fee: totals.deliveryFee,
      total: totals.total,
      fb_url: req.fb_url,
      ig_url: req.ig_url,
    });
    if (!order) {
      // Зэрэг дарсан өөр хүсэлт pending үүсгэсэн — түүнийг дахин ашиглана
      const again = (await deps.db.listOpenOrders(req.id)).find((o) => o.status === "pending_payment");
      return again && sameOrder(again, items, totals.total) ? await resume(again.id, deps) : { kind: "processing" };
    }
    return { kind: "redirect", url: await deps.startCheckout(order), orderId: order.id };
  } catch (e) {
    await deps.alert("Custom төлбөр", req.business_name, e);
    return { kind: "error" };
  }
}

async function resume(orderId: string, deps: CheckoutDeps): Promise<PayResult> {
  const r = await deps.retryCheckout(orderId);
  if (r.kind === "redirect") return { kind: "redirect", url: r.url, orderId };
  if (r.kind === "processing") return { kind: "processing" };
  if ((PAID_STATUSES as readonly string[]).includes(r.status)) return { kind: "paid", orderId };
  return { kind: "processing" };
}

/** 30+ ширхэг: Telegram-д "30+ custom" — нэг хүсэлтэд өдөрт нэг удаа */
async function notifyPhoneOnly(req: CustomRequest, qty: number, deps: CheckoutDeps): Promise<void> {
  try {
    const first = await deps.db.hitRateLimit("custom_30plus", hashKey(deps.secret, "custom_30plus", req.id), 1, "1 day");
    if (!first) return;
    const e = escapeHtml;
    await deps.telegram(
      `🟣 <b>30+ CUSTOM</b> · ${e(req.business_name)} · ${qty}ш — утсаар тохирно\n👤 ${e(req.contact_name)} · ${e(req.phone)}`,
    );
  } catch (e) {
    await deps.alert("30+ custom мэдэгдэл", req.business_name, e);
  }
}

/** Route-уудад: admin cookie шалгах (env алдаатай бол false) */
export function adminFromCookie(value: string | undefined): boolean {
  try {
    return isAdminCookie(value);
  } catch {
    return false;
  }
}
