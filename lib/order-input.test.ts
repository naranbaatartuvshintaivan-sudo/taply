import { describe, expect, it } from "vitest";
import { validateStandardOrder } from "./order-input";

const base = {
  items: [
    { sku: "fb_sticker", qty: 2 },
    { sku: "ig_stand", qty: 1 },
  ],
  fb: "facebook.com/bat",
  ig: "@bat",
  name: "Бат",
  phone: "9911 2233",
  email: "",
  district: "Хан-Уул",
  address: "15-р хороо, 3-р байр",
  note: "",
};

describe("validateStandardOrder", () => {
  it("зөв оролт → серверийн дүн", () => {
    const r = validateStandardOrder(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.quote.total).toBe(83_700);
    expect(r.order.contact.phone).toBe("99112233");
    expect(r.order.contact.email).toBeNull();
    expect(r.order.fbUrl).toBe("https://www.facebook.com/bat");
    expect(r.order.igUrl).toBe("https://www.instagram.com/bat/");
  });

  it("client-ийн илгээсэн дүнг тоохгүй", () => {
    const r = validateStandardOrder({ ...base, total: 1, subtotal: 1 });
    expect(r.ok && r.order.quote.total).toBe(83_700);
  });

  it("FB бараа байхад FB линк заавал", () => {
    expect(validateStandardOrder({ ...base, fb: "" })).toMatchObject({ ok: false, field: "fb" });
  });

  it("IG бараа байхгүй бол IG линк шаардахгүй", () => {
    const r = validateStandardOrder({ ...base, items: [{ sku: "fb_stand", qty: 1 }], ig: "" });
    expect(r.ok && r.order.igUrl).toBeNull();
  });

  it.each([
    [{ phone: "9911223" }, "phone"],
    [{ phone: "abcdefgh" }, "phone"],
    [{ email: "not-an-email" }, "email"],
    [{ district: "Налайх" }, "district"],
    [{ address: "" }, "address"],
    [{ name: "" }, "name"],
    [{ website: "http://spam" }, "website"],
    [{ items: [{ sku: "fb_sticker", qty: 0 }] }, "items"],
    [{ items: [{ sku: "custom_wide", qty: 1 }] }, "items"],
    [{ items: [{ sku: "fb_sticker", qty: -1 }] }, "items"],
    [{ items: [{ sku: "fb_sticker", qty: 1.5 }] }, "items"],
  ])("%o → %s алдаа", (patch, field) => {
    expect(validateStandardOrder({ ...base, ...patch })).toMatchObject({ ok: false, field });
  });
});
