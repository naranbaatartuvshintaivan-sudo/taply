import { describe, expect, it, vi } from "vitest";
import { checkContact, checkLinks, EMPTY_FIELDS, orderPayload, submitCheckout, type OrderFields } from "./checkout";

const good: OrderFields = {
  ...EMPTY_FIELDS,
  fb: "facebook.com/taply",
  name: "Бат",
  phone: "9911 2233",
  district: "Баянгол",
  address: "3-р хороо, 12-р байр",
};
const items = [
  { sku: "fb_sticker", qty: 2 },
  { sku: "ig_sticker", qty: 0 },
  { sku: "fb_stand", qty: 0 },
  { sku: "ig_stand", qty: 0 },
];

type Reply = { status: number; body: unknown } | Error;
function mockFetch(...replies: Reply[]) {
  const calls: { url: string; body: unknown }[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    const r = replies.shift();
    if (!r) throw new Error("unexpected call");
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  });
  return { fn, calls };
}

describe("шалгалт (/order-тэй ижил)", () => {
  it("зөв мэдээлэл → алдаагүй", () => {
    expect(checkContact(good)).toEqual({});
    expect(checkLinks(good, new Set(["fb"]))).toEqual({});
  });
  it("FB бараа байвал FB линк, IG бараа байвал IG хаяг шаардлагатай", () => {
    expect(Object.keys(checkLinks(EMPTY_FIELDS, new Set(["fb", "ig"])))).toEqual(["fb", "ig"]);
    expect(checkLinks(EMPTY_FIELDS, new Set())).toEqual({});
  });
  it("талбар бүрийн алдаа", () => {
    expect(Object.keys(checkContact(EMPTY_FIELDS)).sort()).toEqual(["address", "district", "name", "phone"]);
    expect(checkContact({ ...good, email: "буруу" }).email).toBeDefined();
    expect(checkContact({ ...good, district: "__other" }).district).toBeDefined();
  });
  it("payload: шаардлагагүй линкийг хоосолно, items хэлбэр өөрчлөгдөхгүй", () => {
    const p = orderPayload(items, { ...good, ig: "@x" }, new Set(["fb"]));
    expect(p).toEqual({ ...good, items, ig: "" });
  });
});

describe("submitCheckout (төлбөрийн алхам)", () => {
  const payload = orderPayload(items, good, new Set(["fb"]));

  it("quote таарвал захиалга үүсгээд Wire URL буцаана", async () => {
    const { fn, calls } = mockFetch(
      { status: 200, body: { ok: true, total: 62_900 } },
      { status: 200, body: { ok: true, url: "https://pay.wire.mn/x", orderId: "1", code: "T-1" } },
    );
    expect(await submitCheckout(payload, 62_900, fn)).toEqual({ ok: true, url: "https://pay.wire.mn/x" });
    expect(calls.map((c) => c.url)).toEqual(["/api/quote", "/api/orders"]);
    expect(calls[1].body).toEqual(payload);
  });

  it("серверийн дүн өөр бол захиалга үүсгэхгүй", async () => {
    const { fn, calls } = mockFetch({ status: 200, body: { ok: true, total: 70_000 } });
    expect(await submitCheckout(payload, 62_900, fn)).toEqual({ ok: false, kind: "price_changed", total: 70_000 });
    expect(calls).toHaveLength(1);
  });

  it("validation алдаа → талбартай", async () => {
    const { fn } = mockFetch({ status: 400, body: { ok: false, field: "phone", message: "Утасны дугаар 8 оронтой байх ёстой" } });
    expect(await submitCheckout(payload, 62_900, fn)).toEqual({
      ok: false,
      kind: "error",
      field: "phone",
      message: "Утасны дугаар 8 оронтой байх ёстой",
      contact: false,
    });
  });

  it("409 нөөц хүрэлцэхгүй → утас, имэйлтэй мессеж", async () => {
    const { fn } = mockFetch(
      { status: 200, body: { ok: true, total: 62_900 } },
      { status: 409, body: { ok: false, field: "items", message: "Уучлаарай, нөөц хүрэлцэхгүй байна: FB наалт (үлдсэн 1)" } },
    );
    const r = await submitCheckout(payload, 62_900, fn);
    expect(r).toMatchObject({ ok: false, kind: "error", field: "items", contact: true });
    expect(r.ok === false && r.kind === "error" && r.message).toContain("Утсаар эсвэл имэйлээр холбогдоно уу");
  });

  it("URL-гүй хариу эсвэл 502 → алдаа, холбоо барих", async () => {
    const { fn } = mockFetch({ status: 200, body: { ok: true, total: 62_900 } }, { status: 502, body: { ok: false, message: "Алдаа" } });
    expect(await submitCheckout(payload, 62_900, fn)).toMatchObject({ ok: false, kind: "error", contact: true });
  });

  it("сүлжээний алдаа → throw хийхгүй", async () => {
    const { fn } = mockFetch(new TypeError("Failed to fetch"));
    expect(await submitCheckout(payload, 62_900, fn)).toMatchObject({ ok: false, kind: "error", contact: true });
  });
});
