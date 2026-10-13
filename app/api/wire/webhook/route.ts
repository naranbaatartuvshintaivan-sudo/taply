import { alert } from "@/lib/alert";
import { env } from "@/lib/env";
import { handleWireWebhook } from "@/lib/webhook";
import { SIGNATURE_HEADER } from "@/lib/wire-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wire webhook. Raw body-г parse хийхээс өмнө signature шалгана (lib/webhook.ts).
// Мэдэгдлийг markPaid дотор after()-аар явуулдаг тул хариу хурдан буцна.
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = env().WIRE_WEBHOOK_SECRET;
  if (!secret) {
    // Secret хараахан тохируулаагүй: dashboard-ын баталгаажуулах ping-д 200,
    // жинхэнэ event-д 503 (Wire дахин илгээнэ — event алдагдахгүй).
    let type: unknown;
    try {
      type = JSON.parse(raw)?.type;
    } catch {
      type = null;
    }
    if (type === "endpoint.verification") return new Response("ok", { status: 200 });
    await alert("Webhook", null, new Error("WIRE_WEBHOOK_SECRET тохируулаагүй — Vercel env-д нэмээд redeploy хий"));
    return new Response("not configured", { status: 503 });
  }
  try {
    const r = await handleWireWebhook(raw, req.headers.get(SIGNATURE_HEADER), secret);
    return new Response(r.body, { status: r.status });
  } catch (e) {
    await alert("Webhook", null, e);
    return new Response("error", { status: 500 }); // Wire дахин илгээнэ
  }
}
