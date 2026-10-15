import { describe, expect, it } from "vitest";
import { siteUrl } from "./site";

describe("siteUrl", () => {
  it("production → taplymn.com (VERCEL_URL-ийг үл харгалзана)", () => {
    expect(siteUrl({ VERCEL_ENV: "production", VERCEL_URL: "taply-abc.vercel.app" })).toBe("https://taplymn.com");
  });
  it("preview → тухайн deployment-ийн хаяг", () => {
    expect(siteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "taply-abc-x.vercel.app" })).toBe("https://taply-abc-x.vercel.app");
  });
  it("локал → NEXT_PUBLIC_SITE_URL, байхгүй бол taplymn.com", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000/" })).toBe("http://localhost:3000");
    expect(siteUrl({})).toBe("https://taplymn.com");
  });
});
