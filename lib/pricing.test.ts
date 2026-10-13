import { describe, expect, it } from "vitest";
import { quote } from "./pricing";

const q = (type: "standard" | "custom", qty: number) => quote(type, [{ sku: "x", qty }]);
const sub = (type: "standard" | "custom", qty: number) => {
  const r = q(type, qty);
  if (!r.ok) throw new Error(r.reason);
  return r.subtotal;
};

describe("энгийн карт", () => {
  it.each([
    [1, 34_900],
    [2, 55_900],
    [3, 3 * 27_900],
    [9, 9 * 27_900],
    [10, 10 * 24_900],
    [29, 29 * 24_900],
    [30, 30 * 24_900],
  ])("%i ширхэг → %i₮", (qty, expected) => {
    expect(sub("standard", qty)).toBe(expected);
  });

  it("сагсны нийт ширхгээр шатлана (формат хамааралгүй)", () => {
    const r = quote("standard", [
      { sku: "fb_sticker", qty: 2 },
      { sku: "ig_stand", qty: 1 },
    ]);
    expect(r.ok && r.subtotal).toBe(3 * 27_900);
    expect(r.ok && r.total).toBe(83_700);
    expect(r.ok && r.breakdown).toBe("3 × 27,900, хүргэлт үнэгүй");
  });
});

describe("өөрийн логотой", () => {
  it.each([
    [1, 44_900],
    [2, 69_900],
    [3, 3 * 32_900],
    [9, 9 * 32_900],
    [10, 10 * 29_900],
    [29, 29 * 29_900],
  ])("%i ширхэг → %i₮", (qty, expected) => {
    expect(sub("custom", qty)).toBe(expected);
  });

  it("30 ширхэг → онлайн төлбөргүй, утсаар", () => {
    expect(q("custom", 30)).toEqual({ ok: false, reason: "phone_only" });
  });
});

describe("хүргэлт", () => {
  it("2 ширхэг → 7,000₮", () => {
    const r = q("standard", 2);
    expect(r.ok && r.deliveryFee).toBe(7_000);
    expect(r.ok && r.total).toBe(55_900 + 7_000);
  });
  it("3 ширхэг → үнэгүй", () => {
    const r = q("standard", 3);
    expect(r.ok && r.deliveryFee).toBe(0);
    expect(r.ok && r.total).toBe(3 * 27_900);
  });
  it("1 custom → 7,000₮", () => {
    const r = q("custom", 1);
    expect(r.ok && r.total).toBe(44_900 + 7_000);
  });
});

describe("буруу оролт", () => {
  it("хоосон сагс", () => expect(quote("standard", [])).toEqual({ ok: false, reason: "empty" }));
  it("0 ширхэг", () => expect(q("standard", 0)).toEqual({ ok: false, reason: "empty" }));
  it("сөрөг", () => expect(q("standard", -1)).toEqual({ ok: false, reason: "bad_qty" }));
  it("бутархай", () => expect(q("standard", 1.5)).toEqual({ ok: false, reason: "bad_qty" }));
  it("хэт их", () => expect(q("standard", 201)).toEqual({ ok: false, reason: "too_many" }));
});
