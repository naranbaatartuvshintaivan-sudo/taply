import { describe, expect, it } from "vitest";
import { checkLimits, clientIp, CUSTOM_LIMITS, hashKey } from "./rate-limit";

// Postgres-ийн hit_rate_limit-ийг санах ойд дуурайна (цонх үргэлж идэвхтэй гэж үзнэ)
function fakeHit() {
  const rows: { bucket: string; key: string }[] = [];
  const hit = async (bucket: string, key: string, limit: number) => {
    if (rows.filter((r) => r.bucket === bucket && r.key === key).length >= limit) return false;
    rows.push({ bucket, key });
    return true;
  };
  return { hit, rows };
}

const run = (h: ReturnType<typeof fakeHit>, ip: string, email: string) =>
  checkLimits(h.hit, "secret", [
    { rule: CUSTOM_LIMITS.ip, value: ip },
    { rule: CUSTOM_LIMITS.email, value: email },
  ]);

describe("rate limit", () => {
  it("дүрэм: IP 3/цаг, имэйл 3/өдөр", () => {
    expect(CUSTOM_LIMITS.ip).toMatchObject({ limit: 3, window: "1 hour" });
    expect(CUSTOM_LIMITS.email).toMatchObject({ limit: 3, window: "1 day" });
  });

  it("IP-ээр 3 удаа зөвшөөрөөд 4 дэхийг хаана, өөр IP хэвийн", async () => {
    const h = fakeHit();
    for (let i = 0; i < 3; i++) expect(await run(h, "1.2.3.4", `a${i}@x.mn`)).toEqual({ ok: true });
    expect(await run(h, "1.2.3.4", "new@x.mn")).toEqual({ ok: false, bucket: "custom_ip" });
    expect(await run(h, "5.6.7.8", "new@x.mn")).toEqual({ ok: true });
  });

  it("өөр өөр IP-ээс ч ижил имэйлээр 3-аас дээш бол хаана", async () => {
    const h = fakeHit();
    for (let i = 0; i < 3; i++) expect(await run(h, `10.0.0.${i}`, "same@x.mn")).toEqual({ ok: true });
    expect(await run(h, "10.0.0.9", " SAME@x.mn ")).toEqual({ ok: false, bucket: "custom_email" });
  });

  it("IP хаагдсан бол имэйлийг тоолохгүй (бусдын имэйлийн квотыг идэхгүй)", async () => {
    const h = fakeHit();
    for (let i = 0; i < 3; i++) await run(h, "1.1.1.1", `u${i}@x.mn`);
    await run(h, "1.1.1.1", "victim@x.mn");
    expect(h.rows.filter((r) => r.bucket === "custom_email")).toHaveLength(3);
  });

  it("hash: IP/имэйл ил харагдахгүй, bucket ба нууцаас хамаарна, том жижиг үсэг хамаарахгүй", () => {
    const a = hashKey("s", "custom_email", "Bat@X.mn");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("bat");
    expect(a).toBe(hashKey("s", "custom_email", " bat@x.mn"));
    expect(a).not.toBe(hashKey("s", "custom_ip", "bat@x.mn"));
    expect(a).not.toBe(hashKey("other-secret", "custom_email", "bat@x.mn"));
  });

  it("clientIp: x-real-ip → x-forwarded-for эхнийх → unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
