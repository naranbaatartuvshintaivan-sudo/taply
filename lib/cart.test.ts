import { describe, expect, it } from "vitest";
import {
  CART_KEY,
  cartQuote,
  cartReducer,
  EMPTY_CART,
  lineCap,
  loadCart,
  parseCart,
  platformsOf,
  saveCart,
  toItems,
  totalQty,
  upsellHint,
  type CartState,
  type KV,
} from "./cart";
import { MAX_QTY } from "./pricing";

const s = (lines: CartState["lines"]): CartState => ({ lines });

function memory(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const broken: KV = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("cartReducer", () => {
  it("нэмэх: шинэ мөр, дахин нэмэхэд тоо нэмэгдэнэ, дараалал хадгалагдана", () => {
    let c = cartReducer(EMPTY_CART, { type: "add", sku: "ig_stand" });
    c = cartReducer(c, { type: "add", sku: "fb_sticker", qty: 2 });
    c = cartReducer(c, { type: "add", sku: "ig_stand" });
    expect(c.lines).toEqual([
      { sku: "ig_stand", qty: 2 },
      { sku: "fb_sticker", qty: 2 },
    ]);
    expect(totalQty(c)).toBe(4);
  });

  it("set: тоо солих, 0 бол мөр хасагдана", () => {
    let c = s([{ sku: "fb_stand", qty: 3 }]);
    c = cartReducer(c, { type: "set", sku: "fb_stand", qty: 5 });
    expect(c.lines).toEqual([{ sku: "fb_stand", qty: 5 }]);
    c = cartReducer(c, { type: "set", sku: "fb_stand", qty: 0 });
    expect(c.lines).toEqual([]);
  });

  it("хасах, цэвэрлэх", () => {
    const c = s([
      { sku: "fb_stand", qty: 1 },
      { sku: "ig_stand", qty: 1 },
    ]);
    expect(cartReducer(c, { type: "remove", sku: "fb_stand" }).lines).toEqual([{ sku: "ig_stand", qty: 1 }]);
    expect(cartReducer(c, { type: "remove", sku: "ig_sticker" })).toBe(c);
    expect(cartReducer(c, { type: "clear" })).toEqual(EMPTY_CART);
  });

  it("тооны хязгаар: серверийн MAX_QTY-оос хэтрэхгүй, сөрөг/бутархай/NaN засагдана", () => {
    expect(cartReducer(EMPTY_CART, { type: "set", sku: "fb_sticker", qty: 999 }).lines[0].qty).toBe(MAX_QTY);
    expect(cartReducer(s([{ sku: "fb_sticker", qty: MAX_QTY }]), { type: "add", sku: "fb_sticker" }).lines[0].qty).toBe(MAX_QTY);
    expect(cartReducer(EMPTY_CART, { type: "set", sku: "fb_sticker", qty: 2.7 }).lines[0].qty).toBe(2);
    expect(cartReducer(EMPTY_CART, { type: "set", sku: "fb_sticker", qty: -3 }).lines).toEqual([]);
    expect(cartReducer(EMPTY_CART, { type: "set", sku: "fb_sticker", qty: NaN }).lines).toEqual([]);
  });

  it("stock cap: тоо бол дээд хязгаар, null бол хязгааргүй (MAX_QTY)", () => {
    expect(lineCap(null)).toBe(MAX_QTY);
    expect(lineCap(undefined)).toBe(MAX_QTY);
    expect(lineCap(4)).toBe(4);
    expect(lineCap(-2)).toBe(0);
    let c = cartReducer(EMPTY_CART, { type: "add", sku: "ig_stand", qty: 3, stock: 4 });
    c = cartReducer(c, { type: "add", sku: "ig_stand", qty: 3, stock: 4 });
    expect(c.lines).toEqual([{ sku: "ig_stand", qty: 4 }]);
    expect(cartReducer(EMPTY_CART, { type: "add", sku: "ig_stand", stock: 0 }).lines).toEqual([]);
  });

  it("hydrate: буруу өгөгдлийг шүүнэ", () => {
    const c = cartReducer(EMPTY_CART, {
      type: "hydrate",
      lines: [{ sku: "fb_stand", qty: 2 }, { sku: "custom_wide", qty: 1 }, { sku: "fb_stand", qty: 5 }, null, { sku: "ig_sticker", qty: "x" }],
    });
    expect(c.lines).toEqual([{ sku: "fb_stand", qty: 2 }]);
  });
});

describe("payload, үнэ", () => {
  it("toItems: /order хуудастай ижил хэлбэр (4 SKU, 0-тэй)", () => {
    expect(toItems(s([{ sku: "ig_stand", qty: 2 }]))).toEqual([
      { sku: "fb_sticker", qty: 0 },
      { sku: "ig_sticker", qty: 0 },
      { sku: "fb_stand", qty: 0 },
      { sku: "ig_stand", qty: 2 },
    ]);
  });

  it("platformsOf: FB/IG линк шаардлага", () => {
    expect([...platformsOf(s([{ sku: "fb_sticker", qty: 1 }]))]).toEqual(["fb"]);
    expect(platformsOf(s([{ sku: "fb_sticker", qty: 1 }, { sku: "ig_stand", qty: 1 }])).size).toBe(2);
  });

  it("cartQuote: нийт ширхгээр шатлана", () => {
    const two = cartQuote(s([{ sku: "fb_sticker", qty: 1 }, { sku: "ig_sticker", qty: 1 }]));
    expect(two).toMatchObject({ ok: true, subtotal: 55_900, deliveryFee: 7_000, total: 62_900 });
    const many = cartQuote(s([{ sku: "fb_sticker", qty: 150 }, { sku: "ig_sticker", qty: 60 }]));
    expect(many).toEqual({ ok: false, reason: "too_many" });
  });
});

describe("upsellHint", () => {
  it("1 ширхэг: дахиад 2 → нийт 83,700₮, хүргэлт үнэгүй, нэгж 27,900₮", () => {
    expect(upsellHint(s([{ sku: "fb_stand", qty: 1 }]))).toEqual({ add: 2, total: 83_700, unitPrice: 27_900, freeDelivery: true });
  });
  it("2 ширхэг: дахиад 1", () => {
    expect(upsellHint(s([{ sku: "fb_stand", qty: 1 }, { sku: "ig_stand", qty: 1 }]))?.add).toBe(1);
  });
  it("хоосон эсвэл 3+ үед hint байхгүй", () => {
    expect(upsellHint(EMPTY_CART)).toBeNull();
    expect(upsellHint(s([{ sku: "fb_stand", qty: 3 }]))).toBeNull();
  });
  it("hint-ийн дүн сагсны бодит quote-той таарна", () => {
    const after = cartQuote(s([{ sku: "fb_stand", qty: 3 }]));
    expect(after.ok && after.total).toBe(upsellHint(s([{ sku: "fb_stand", qty: 1 }]))?.total);
  });
});

describe("хадгалалт", () => {
  it("хадгалаад уншина, хоосон бол key устгана", () => {
    const m = memory();
    const c = s([{ sku: "ig_sticker", qty: 3 }]);
    expect(saveCart(m, c)).toBe(true);
    expect(loadCart(m)).toEqual(c.lines);
    expect(saveCart(m, EMPTY_CART)).toBe(true);
    expect(m.data.has(CART_KEY)).toBe(false);
  });

  it("storage байхгүй (SSR, private mode) → хоосон, алдаагүй", () => {
    expect(loadCart(null)).toEqual([]);
    expect(saveCart(null, s([{ sku: "fb_stand", qty: 1 }]))).toBe(false);
  });

  it("storage алдаа шидвэл (SecurityError, Quota) → хоосон / false, throw хийхгүй", () => {
    expect(loadCart(broken)).toEqual([]);
    expect(saveCart(broken, s([{ sku: "fb_stand", qty: 1 }]))).toBe(false);
    expect(saveCart(broken, EMPTY_CART)).toBe(false);
  });

  it("эвдэрсэн JSON → хоосон", () => {
    expect(parseCart("{not json")).toEqual([]);
    expect(parseCart("null")).toEqual([]);
    expect(parseCart(JSON.stringify({ lines: "x" }))).toEqual([]);
    expect(parseCart(undefined)).toEqual([]);
  });
});
