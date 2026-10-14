import { describe, expect, it } from "vitest";
import { validateCustomRequest } from "./custom-input";

const base = {
  business: "Номин Бутик",
  name: "Бат",
  phone: "9911 2233",
  email: "Bat@Example.MN ",
  fb: "",
  ig: "@nomin.butik",
  qty: "3",
  district: "Баянгол",
  address: "3-р хороо, 12-р байр",
  note: "",
  website: "",
};

describe("validateCustomRequest", () => {
  it("зөв өгөгдөл → нэг хэлбэрт оруулна", () => {
    const r = validateCustomRequest(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input).toMatchObject({
      business: "Номин Бутик",
      phone: "99112233",
      email: "bat@example.mn",
      fbUrl: null,
      igUrl: "https://www.instagram.com/nomin.butik/",
      qty: 3,
      note: null,
      noLogo: false,
    });
  });

  it("бизнесийн нэрийг бичсэнээр нь хадгална (зөвхөн захын зайг хасна)", () => {
    const r = validateCustomRequest({ ...base, business: "  MARAL cosmetics  " });
    expect(r.ok && r.input.business).toBe("MARAL cosmetics");
  });

  it("имэйл заавал", () => {
    expect(validateCustomRequest({ ...base, email: "" })).toMatchObject({ ok: false, field: "email" });
    expect(validateCustomRequest({ ...base, email: "bat@" })).toMatchObject({ ok: false, field: "email" });
  });

  it("FB эсвэл IG — дор хаяж нэг, оруулсан бол формат зөв", () => {
    expect(validateCustomRequest({ ...base, ig: "" })).toMatchObject({ ok: false, field: "fb" });
    expect(validateCustomRequest({ ...base, fb: "google.com/x" })).toMatchObject({ ok: false, field: "fb" });
    expect(validateCustomRequest({ ...base, ig: "instagram.com/p/abc" })).toMatchObject({ ok: false, field: "ig" });
    const both = validateCustomRequest({ ...base, fb: "facebook.com/nomin" });
    expect(both.ok && [both.input.fbUrl, both.input.igUrl]).toEqual([
      "https://www.facebook.com/nomin",
      "https://www.instagram.com/nomin.butik/",
    ]);
  });

  it("утас 8 орон, тоо 1–200 бүхэл", () => {
    expect(validateCustomRequest({ ...base, phone: "991122" })).toMatchObject({ ok: false, field: "phone" });
    expect(validateCustomRequest({ ...base, qty: "0" })).toMatchObject({ ok: false, field: "qty" });
    expect(validateCustomRequest({ ...base, qty: "2.5" })).toMatchObject({ ok: false, field: "qty" });
    expect(validateCustomRequest({ ...base, qty: "201" })).toMatchObject({ ok: false, field: "qty" });
    expect(validateCustomRequest({ ...base, qty: "abc" })).toMatchObject({ ok: false, field: "qty" });
  });

  it("дүүрэг жагсаалтаас, хаяг дэлгэрэнгүй", () => {
    expect(validateCustomRequest({ ...base, district: "Дархан" })).toMatchObject({ ok: false, field: "district" });
    expect(validateCustomRequest({ ...base, address: "12" })).toMatchObject({ ok: false, field: "address" });
  });

  it("лого байхгүй чекбокс", () => {
    const r = validateCustomRequest({ ...base, noLogo: "true" });
    expect(r.ok && r.input.noLogo).toBe(true);
  });

  it("honeypot бөглөгдсөн бол татгалзана", () => {
    expect(validateCustomRequest({ ...base, website: "http://spam" })).toMatchObject({ ok: false, field: "website" });
  });
});
