import { describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({ env: () => ({ ADMIN_KEY: "k".repeat(48) }) }));

import { GET } from "@/app/api/admin/me/route";
import { adminCookieValue } from "./admin";
import { customCardTarget, hasAdminHint } from "./admin-card";

const me = async (cookie?: string) =>
  (await GET(new Request("https://x/api/admin/me", { headers: cookie ? { cookie } : {} }))).json() as Promise<{ ok: boolean }>;

describe("Өөрийн логотой карт (CUSTOM_PUBLIC=false)", () => {
  it("cookie-гүй → #contact, 'Холбогдох'; админ → /custom, 'Custom захиалга (тест)'", () => {
    expect(customCardTarget(false)).toEqual({ href: "#contact", cta: "Холбогдох" });
    expect(customCardTarget(true)).toEqual({ href: "/custom", cta: "Custom захиалга (тест)" });
  });

  it("/api/admin/me: cookie-гүй эсвэл буруу → ok:false, зөв admin cookie → ok:true; кэшлэхгүй", async () => {
    expect(await me()).toEqual({ ok: false });
    expect(await me(`taply_admin=${"0".repeat(64)}`)).toEqual({ ok: false });
    expect(await me("taply_ah=1")).toEqual({ ok: false }); // дохио-cookie эрх олгохгүй
    expect(await me(`other=1; taply_admin=${adminCookieValue()}`)).toEqual({ ok: true });
    const res = await GET(new Request("https://x/api/admin/me"));
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("хариунд түлхүүр, cookie-ийн утга орохгүй", async () => {
    const res = await GET(new Request("https://x/api/admin/me", { headers: { cookie: `taply_admin=${adminCookieValue()}` } }));
    const text = await res.text();
    expect(text).toBe('{"ok":true}');
    expect(text).not.toContain("k".repeat(48));
  });

  it("дохио-cookie байхгүй бол client хүсэлт ч явуулахгүй", () => {
    expect(hasAdminHint("")).toBe(false);
    expect(hasAdminHint("a=1; taply_ah=0")).toBe(false);
    expect(hasAdminHint("a=1; taply_ah=1")).toBe(true);
  });
});
