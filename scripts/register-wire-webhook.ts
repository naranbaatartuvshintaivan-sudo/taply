// Wire webhook endpoint бүртгэх.
//   node scripts/register-wire-webhook.ts            → шинээр үүсгэнэ
//   node scripts/register-wire-webhook.ts --replace  → байгаа endpoint-ийг устгаад дахин үүсгэнэ
//
// Буцсан whsec_ secret-ийг терминалд ХЭВЛЭХГҮЙ — .env.local-д шууд бичнэ.
// WIRE_SECRET_KEY-г .env.local-аас уншина.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const URL_ = process.env.WEBHOOK_URL ?? "https://taplymn.com/api/wire/webhook";
const API = "https://api.wire.mn/v1";

if (!existsSync(ENV_FILE)) throw new Error(`${ENV_FILE} олдсонгүй`);
process.loadEnvFile(ENV_FILE);
const key = process.env.WIRE_SECRET_KEY ?? "";
if (!/^sk_(live|test)_/.test(key)) throw new Error("WIRE_SECRET_KEY .env.local-д алга эсвэл буруу");

type WireJson = {
  id?: string;
  url?: string;
  status?: string;
  livemode?: boolean;
  secret?: string;
  data?: { id: string; url: string }[];
  error?: { code?: string };
};

async function wire(method: string, path: string, body?: unknown): Promise<WireJson> {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = `register-webhook-${randomUUID()}`;
  }
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => null)) as WireJson | null;
  if (!res.ok) throw new Error(`Wire ${method} ${path} → ${res.status} ${json?.error?.code ?? ""}`);
  return json!;
}

if (process.argv.includes("--replace")) {
  const list = await wire("GET", "/webhook_endpoints");
  for (const ep of (list.data ?? []) as { id: string; url: string }[]) {
    console.log(`Хуучин endpoint устгаж байна: ${ep.id} (${ep.url})`);
    await wire("DELETE", `/webhook_endpoints/${ep.id}`);
  }
}

const ep = await wire("POST", "/webhook_endpoints", {
  url: URL_,
  enabled_events: ["payment_intent.succeeded"],
});
const secret = String(ep.secret ?? "");
if (!secret.startsWith("whsec_")) throw new Error("Хариунд whsec_ secret ирсэнгүй");

const lines = readFileSync(ENV_FILE, "utf8").split(/\r?\n/).filter((l) => !/^WIRE_WEBHOOK_SECRET=/.test(l));
while (lines.length && lines[lines.length - 1] === "") lines.pop();
lines.push(`WIRE_WEBHOOK_SECRET=${secret}`, "");
writeFileSync(ENV_FILE, lines.join("\n"));

console.log(`✓ Endpoint үүслээ: ${ep.id} → ${ep.url} (төлөв: ${ep.status}, livemode: ${ep.livemode})`);
console.log(`✓ WIRE_WEBHOOK_SECRET-ийг ${ENV_FILE}-д нэмлээ (утгыг хэвлээгүй).`);
console.log("");
console.log("Дараагийн алхам:");
console.log("  1. Vercel → Settings → Environment Variables-д WIRE_WEBHOOK_SECRET нэмээд redeploy хий.");
console.log("  2. Wire dashboard-аас endpoint-ийг баталгаажуул (verification ping 2xx авах ёстой).");
