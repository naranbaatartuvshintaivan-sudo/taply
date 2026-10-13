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
  try {
    const r = await handleWireWebhook(raw, req.headers.get(SIGNATURE_HEADER), env().WIRE_WEBHOOK_SECRET);
    return new Response(r.body, { status: r.status });
  } catch (e) {
    await alert("Webhook", null, e);
    return new Response("error", { status: 500 }); // Wire дахин илгээнэ
  }
}
