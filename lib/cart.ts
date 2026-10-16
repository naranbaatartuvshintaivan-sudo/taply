import { DELIVERY } from "./config";
import { MAX_QTY, quote, SKU_PLATFORM, STANDARD_SKUS, type StandardSku } from "./pricing";

// Нүүр хуудасны сагс — цэвэр функцууд (reducer, хадгалалт, hint). UI-гүй → unit test-тэй.
// Дүнг сервер /api/quote, /api/orders дээр дахин бүрэн тооцно; энд зөвхөн харуулна.

export type CartLine = { sku: StandardSku; qty: number };
export type CartState = { lines: CartLine[] };

export type CartAction =
  | { type: "add"; sku: StandardSku; qty?: number; stock?: number | null }
  | { type: "set"; sku: StandardSku; qty: number; stock?: number | null }
  | { type: "remove"; sku: StandardSku }
  | { type: "clear" }
  | { type: "hydrate"; lines: unknown };

export const EMPTY_CART: CartState = { lines: [] };

// Нэг мөрийн дээд хязгаар: серверийн schema (MAX_QTY) ба stock (null = хязгааргүй)
export const lineCap = (stock?: number | null) => Math.max(0, Math.min(MAX_QTY, stock ?? MAX_QTY));
const clamp = (qty: number, stock?: number | null) =>
  Number.isFinite(qty) ? Math.min(lineCap(stock), Math.max(0, Math.floor(qty))) : 0;

const isSku = (s: unknown): s is StandardSku => (STANDARD_SKUS as readonly unknown[]).includes(s);

function put(state: CartState, sku: StandardSku, qty: number): CartState {
  const exists = state.lines.some((l) => l.sku === sku);
  if (qty <= 0) return exists ? { lines: state.lines.filter((l) => l.sku !== sku) } : state;
  if (!exists) return { lines: [...state.lines, { sku, qty }] };
  return { lines: state.lines.map((l) => (l.sku === sku ? { sku, qty } : l)) };
}

export function cartReducer(state: CartState, a: CartAction): CartState {
  switch (a.type) {
    case "add":
      return put(state, a.sku, clamp(qtyOf(state, a.sku) + (a.qty ?? 1), a.stock));
    case "set":
      return put(state, a.sku, clamp(a.qty, a.stock));
    case "remove":
      return put(state, a.sku, 0);
    case "clear":
      return EMPTY_CART;
    case "hydrate":
      return { lines: sanitize(a.lines) };
  }
}

export const qtyOf = (s: CartState, sku: StandardSku) => s.lines.find((l) => l.sku === sku)?.qty ?? 0;
export const totalQty = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);

// /api/orders, /api/quote-ийн items — /order хуудастай ижил хэлбэр (4 SKU бүгд, 0 нь серверт шүүгдэнэ)
export const toItems = (s: CartState) => STANDARD_SKUS.map((sku) => ({ sku, qty: qtyOf(s, sku) }));

export const platformsOf = (s: CartState) => new Set(s.lines.map((l) => SKU_PLATFORM[l.sku]));

export const cartQuote = (s: CartState) => quote("standard", toItems(s));

// Урамшуулал: үнэгүй хүргэлтийн босгод (DELIVERY.freeFromQty) хүрэхэд дутуу ширхэг ба тэр үеийн дүн.
// Үнэ формат хамаарахгүй, нийт ширхгээр шатлана → lib/pricing-ийн quote-оор тооцно.
export type UpsellHint = { add: number; total: number; unitPrice: number; freeDelivery: boolean };
export function upsellHint(s: CartState): UpsellHint | null {
  const n = totalQty(s);
  const target = DELIVERY.freeFromQty;
  if (n < 1 || n >= target) return null;
  const q = quote("standard", [{ sku: "fb_sticker", qty: target }]);
  if (!q.ok || q.unitPrice === null) return null;
  return { add: target - n, total: q.total, unitPrice: q.unitPrice, freeDelivery: q.deliveryFee === 0 };
}

// ── Хадгалалт (localStorage) — алдаа гарвал сагс зүгээр л хоосон эхэлнэ ──
export const CART_KEY = "taply.cart.v1";

function sanitize(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];
  const out: CartLine[] = [];
  for (const l of lines) {
    const sku = (l as { sku?: unknown } | null)?.sku;
    const qty = clamp(Number((l as { qty?: unknown } | null)?.qty));
    if (isSku(sku) && qty > 0 && !out.some((o) => o.sku === sku)) out.push({ sku, qty });
  }
  return out;
}

export function parseCart(raw: string | null | undefined): CartLine[] {
  if (!raw) return [];
  try {
    return sanitize((JSON.parse(raw) as { lines?: unknown } | null)?.lines);
  } catch {
    return [];
  }
}

export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getStorage(): KV | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadCart(storage: KV | null): CartLine[] {
  try {
    return parseCart(storage?.getItem(CART_KEY));
  } catch {
    return [];
  }
}

export function saveCart(storage: KV | null, s: CartState): boolean {
  if (!storage) return false;
  try {
    if (s.lines.length === 0) storage.removeItem(CART_KEY);
    else storage.setItem(CART_KEY, JSON.stringify({ lines: s.lines }));
    return true;
  } catch {
    return false;
  }
}
