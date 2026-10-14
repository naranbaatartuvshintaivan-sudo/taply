import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("./env", () => ({ env: () => ({}) }));

import { customRequestMessage, submitCustomRequest, type CustomDeps } from "./custom";
import type { CustomDb, CustomRequest, NewCustomRequest } from "./custom-db";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

const fields = {
  business: "Номин <Бутик>",
  name: "Бат",
  phone: "99112233",
  email: "bat@x.mn",
  fb: "facebook.com/nomin",
  ig: "",
  qty: "2",
  district: "Баянгол",
  address: "3-р хороо, 12-р байр",
  note: "",
  website: "",
};

function setup(over: Partial<CustomDb> = {}, allow = true) {
  const calls: string[] = [];
  const inserted: NewCustomRequest[] = [];
  const notified: { req: CustomRequest; logo: Uint8Array | null }[] = [];
  const db: CustomDb = {
    hitRateLimit: async (bucket) => (calls.push(`hit:${bucket}`), allow),
    upsertBusiness: async (b) => (calls.push(`business:${b.phone}`), { id: "biz-1" }),
    insertCustomRequest: async (r) => {
      calls.push("insert");
      inserted.push(r);
      return { ...r, chosen_design: null, created_at: "now" } as CustomRequest;
    },
    uploadLogo: async (path) => void calls.push(`upload:${path}`),
    removeLogo: async (path) => void calls.push(`remove:${path}`),
    ...over,
  };
  const alerts: string[] = [];
  const deps: CustomDeps = {
    db,
    secret: "s",
    schedule: (fn) => void fn(),
    notify: async (req, _input, logo) => void notified.push({ req, logo }),
    alert: async (where) => void alerts.push(where),
    newId: () => "11111111-1111-1111-1111-111111111111",
    newToken: () => "t".repeat(32),
  };
  return { deps, calls, inserted, notified, alerts };
}

describe("submitCustomRequest", () => {
  it("логотой: upload → business upsert → snapshot-тай хүсэлт 'generating' → Telegram", async () => {
    const s = setup();
    const r = await submitCustomRequest(fields, { bytes: PNG, type: "image/png" }, "1.1.1.1", s.deps);
    expect(r).toEqual({ ok: true, id: "11111111-1111-1111-1111-111111111111" });
    expect(s.calls).toEqual([
      "hit:custom_ip",
      "hit:custom_email",
      "upload:11111111-1111-1111-1111-111111111111/original.png",
      "business:99112233",
      "insert",
    ]);
    expect(s.inserted[0]).toMatchObject({
      business_id: "biz-1",
      business_name: "Номин <Бутик>",
      contact_name: "Бат",
      email: "bat@x.mn",
      quantity: 2,
      status: "generating",
      fb_url: "https://www.facebook.com/nomin",
      ig_url: null,
      logo_path: "11111111-1111-1111-1111-111111111111/original.png",
      token: "t".repeat(32),
    });
    expect(s.notified).toHaveLength(1);
    expect(s.notified[0].logo).toBe(PNG);
  });

  it("лого байхгүй: upload хийхгүй, status 'manual', logo_path null", async () => {
    const s = setup();
    const r = await submitCustomRequest({ ...fields, noLogo: "true" }, null, "1.1.1.1", s.deps);
    expect(r.ok).toBe(true);
    expect(s.calls.some((c) => c.startsWith("upload"))).toBe(false);
    expect(s.inserted[0]).toMatchObject({ status: "manual", logo_path: null });
    expect(s.notified[0].logo).toBeNull();
  });

  it("лого заавал (чекбокс сонгоогүй бол), SVG татгалзана — rate limit тоологдохгүй", async () => {
    const s = setup();
    expect(await submitCustomRequest(fields, null, "1.1.1.1", s.deps)).toMatchObject({ ok: false, status: 400, field: "logo" });
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");
    expect(await submitCustomRequest(fields, { bytes: svg, type: "image/png" }, "1.1.1.1", s.deps)).toMatchObject({ ok: false, field: "logo" });
    expect(s.calls).toEqual([]);
  });

  it("validation алдаа → 400 талбартай, DB-д хүрэхгүй", async () => {
    const s = setup();
    expect(await submitCustomRequest({ ...fields, email: "" }, { bytes: PNG, type: "image/png" }, "ip", s.deps)).toMatchObject({ status: 400, field: "email" });
    expect(s.calls).toEqual([]);
  });

  it("honeypot → 400, юу ч хийхгүй", async () => {
    const s = setup();
    expect(await submitCustomRequest({ ...fields, website: "x" }, { bytes: PNG, type: "image/png" }, "ip", s.deps)).toMatchObject({ status: 400 });
    expect(s.calls).toEqual([]);
  });

  it("rate limit → 429, upload/insert хийхгүй", async () => {
    const s = setup({}, false);
    const r = await submitCustomRequest(fields, { bytes: PNG, type: "image/png" }, "ip", s.deps);
    expect(r).toMatchObject({ ok: false, status: 429 });
    expect(s.calls).toEqual(["hit:custom_ip"]);
  });

  it("insert алдаа → upload хийсэн логог устгаад 500, ⚠️ alert", async () => {
    const s = setup({ insertCustomRequest: async () => { throw new Error("DB down"); } });
    const r = await submitCustomRequest(fields, { bytes: PNG, type: "image/png" }, "ip", s.deps);
    expect(r).toEqual({ ok: false, status: 500 });
    expect(s.calls).toContain("remove:11111111-1111-1111-1111-111111111111/original.png");
    expect(s.alerts).toEqual(["Custom хүсэлт"]);
    expect(s.notified).toHaveLength(0);
  });

  it("Telegram алдаа нь хүсэлтийг унагахгүй — зөвхөн alert", async () => {
    const s = setup();
    s.deps.notify = async () => { throw new Error("tg down"); };
    const r = await submitCustomRequest(fields, { bytes: PNG, type: "image/png" }, "ip", s.deps);
    expect(r.ok).toBe(true);
    await new Promise((res) => setTimeout(res, 0));
    expect(s.alerts).toEqual(["Custom Telegram"]);
  });
});

describe("customRequestMessage", () => {
  const req = {
    business_name: "Номин <Бутик> & Co",
    contact_name: "Бат",
    email: "bat@x.mn",
    quantity: 5,
    fb_url: "https://www.facebook.com/nomin",
    ig_url: null,
    note: "<b>улаан</b>",
  };
  it("гарчиг, HTML escape, зөвхөн өгсөн платформ", () => {
    const m = customRequestMessage(req, { phone: "99112233", district: "Баянгол", address: "12-р байр", noLogo: false });
    expect(m.split("\n")[0]).toBe("🟣 <b>CUSTOM ХҮСЭЛТ</b> · Номин &lt;Бутик&gt; &amp; Co · 99112233 · 5ш");
    expect(m).toContain("&lt;b&gt;улаан&lt;/b&gt;");
    expect(m).toContain("FB:");
    expect(m).not.toContain("IG:");
    expect(m).not.toContain("ЛОГОГҮЙ");
  });
  it("лого байхгүй бол тэмдэглэнэ", () => {
    const m = customRequestMessage(req, { phone: "99112233", district: "Баянгол", address: "12", noLogo: true });
    expect(m).toContain("ЛОГОГҮЙ — гараар хийнэ");
  });
});
