import { beforeEach, describe, expect, it, vi } from "vitest";

// GET /api/orders/[id] (статус poll) → allowRequest → checkLimits → hitRateLimit бүхэл гинжийг
// route-ийн түвшинд шалгана. Зөвхөн DB-ийн RPC-г санах ойд, prod-ын hit_rate_limit-тэй ижил
// дүрмээр (bucket + key_hash, цонхон доторх тоо >= limit бол false) дуурайна.
// SQL функц өөрөө prod дээр true, true, false гэж батлагдсан (selftest, 2026-10-16).

const clock = { now: 0 };
const rows: { bucket: string; key: string; at: number }[] = [];
const WINDOW_MS: Record<string, number> = { "10 minutes": 10 * 60_000, "1 hour": 60 * 60_000 };
let dbDown = false;

vi.mock("./db", () => ({
  isUuid: () => true,
  db: { getOrder: vi.fn(async () => null) },
  hitRateLimit: vi.fn(async (bucket: string, key: string, limit: number, window: string) => {
    if (dbDown) throw new Error("connection refused");
    const n = rows.filter((r) => r.bucket === bucket && r.key === key && r.at > clock.now - WINDOW_MS[window]).length;
    if (n >= limit) return false;
    rows.push({ bucket, key, at: clock.now });
    return true;
  }),
}));
vi.mock("./env", () => ({ env: () => ({ CRON_SECRET: "x".repeat(32) }) }));
vi.mock("./alert", () => ({ alert: vi.fn(), errorSummary: (e: unknown) => String(e) }));
vi.mock("./fulfil", () => ({ markPaid: vi.fn() }));

const { GET } = await import("@/app/api/orders/[id]/route");
const { ORDER_LIMITS } = await import("./guard");

const poll = (ip: string) =>
  GET(new Request("https://taplymn.com/api/orders/x", { headers: { "x-real-ip": ip } }), {
    params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }),
  });

beforeEach(() => {
  rows.length = 0;
  clock.now = 0;
  dbDown = false;
});

describe("статус poll rate limit (route)", () => {
  it("дүрэм: 300 / 10 минут", () => {
    expect(ORDER_LIMITS.status).toEqual({ bucket: "order_status_ip", limit: 300, window: "10 minutes" });
  });

  it("нэг IP: 300 хүсэлт нэвтэрнэ, 301 дэх нь 429; өөр IP хэвийн", async () => {
    for (let i = 0; i < 300; i++) expect((await poll("203.0.113.7")).status).toBe(404);
    expect((await poll("203.0.113.7")).status).toBe(429);
    expect((await poll("198.51.100.2")).status).toBe(404);
  });

  it("IP шууд хадгалагдахгүй (HMAC hash)", async () => {
    await poll("203.0.113.7");
    expect(rows[0].key).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].key).not.toContain("203.0.113.7");
  });

  it("10 минут өнгөрөхөд дахин нээгдэнэ", async () => {
    for (let i = 0; i < 300; i++) await poll("203.0.113.7");
    clock.now += 9 * 60_000;
    expect((await poll("203.0.113.7")).status).toBe(429);
    clock.now += 60_001;
    expect((await poll("203.0.113.7")).status).toBe(404);
  });

  it("DB алдаатай бол хаахгүй (fail-open)", async () => {
    dbDown = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await poll("203.0.113.7")).status).toBe(404);
  });
});
