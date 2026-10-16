import { DELIVERY } from "./config";
import { normalizeFacebook, normalizeInstagram } from "./links";
import { MAX_QTY } from "./pricing";

// Захиалгын client тал — /order хуудас болон нүүр хуудасны сагс хоёулаа ашиглана.
// Шалгалт нь хэрэглэгчид хурдан хариу өгөх зорилготой; сервер (lib/order-input) бүгдийг дахин шалгана.

export type OrderFields = {
  fb: string;
  ig: string;
  name: string;
  phone: string;
  email: string;
  district: string;
  address: string;
  note: string;
  website: string; // honeypot
};

export const EMPTY_FIELDS: OrderFields = { fb: "", ig: "", name: "", phone: "", email: "", district: "", address: "", note: "", website: "" };

export type Errors = Partial<Record<string, string>>;
export type Platforms = Set<"fb" | "ig">;

export const TOO_MANY_MESSAGE = `${MAX_QTY}-аас дээш ширхгийг утсаар эсвэл имэйлээр тохирно`;

export function checkLinks(f: Pick<OrderFields, "fb" | "ig">, needs: Platforms): Errors {
  const e: Errors = {};
  if (needs.has("fb") && !normalizeFacebook(f.fb)) e.fb = "Facebook хуудасныхаа линкийг оруулна уу (facebook.com/...)";
  if (needs.has("ig") && !normalizeInstagram(f.ig)) e.ig = "Instagram хаягаа оруулна уу (@нэр эсвэл instagram.com/...)";
  return e;
}

export function checkContact(f: OrderFields): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Нэрээ оруулна уу";
  if (!/^\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Утасны дугаар 8 оронтой байх ёстой";
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Имэйл хаяг буруу байна";
  if (!DELIVERY.districts.includes(f.district)) e.district = "Хүргэлтийн дүүргээ сонгоно уу";
  if (f.address.trim().length < 5) e.address = "Хаягаа дэлгэрэнгүй оруулна уу";
  return e;
}

// /api/orders payload — /order хуудастай яг ижил хэлбэр
export function orderPayload(items: { sku: string; qty: number }[], f: OrderFields, needs: Platforms) {
  return { items, ...f, fb: needs.has("fb") ? f.fb : "", ig: needs.has("ig") ? f.ig : "" };
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; kind: "price_changed"; total: number }
  | { ok: false; kind: "error"; field?: string; message: string; contact: boolean };

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const NETWORK: CheckoutResult = { ok: false, kind: "error", message: "Сүлжээний алдаа. Дахин оролдоно уу эсвэл холбогдоно уу:", contact: true };

async function post(fetchImpl: Fetch, url: string, body: unknown) {
  const r = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let d: Record<string, unknown> = {};
  try {
    d = await r.json();
  } catch {
    /* JSON биш хариу */
  }
  return { status: r.status, ok: r.ok && d.ok === true, d };
}

function fail(status: number, d: Record<string, unknown>): CheckoutResult {
  const field = typeof d.field === "string" ? d.field : undefined;
  const raw = typeof d.message === "string" ? d.message : "Алдаа гарлаа";
  // 409 = нөөц хүрэлцэхгүй → утас, имэйлээ дагуулж харуулна
  if (status === 409) return { ok: false, kind: "error", field, message: `${raw}. Утсаар эсвэл имэйлээр холбогдоно уу:`, contact: true };
  return { ok: false, kind: "error", field, message: raw, contact: status >= 500 };
}

/**
 * Төлбөрийн алхам: (1) /api/quote — серверийн эцсийн дүнг баталгаажуулна,
 * дэлгэцэнд харуулсантай зөрвөл захиалга үүсгэхгүй, шинэ дүнг буцаана;
 * (2) /api/orders — Wire checkout URL. Redirect-ийг дуудагч хийнэ.
 */
export async function submitCheckout(payload: unknown, shownTotal: number, fetchImpl: Fetch = fetch): Promise<CheckoutResult> {
  try {
    const q = await post(fetchImpl, "/api/quote", payload);
    if (!q.ok) return fail(q.status, q.d);
    if (typeof q.d.total !== "number") return fail(500, {});
    if (q.d.total !== shownTotal) return { ok: false, kind: "price_changed", total: q.d.total };

    const o = await post(fetchImpl, "/api/orders", payload);
    if (!o.ok || typeof o.d.url !== "string") return fail(o.status, o.d);
    return { ok: true, url: o.d.url };
  } catch {
    return NETWORK;
  }
}
