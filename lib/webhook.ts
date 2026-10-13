import "server-only";
import { defaultDeps, markPaid, type Deps } from "./fulfil";
import { verifyWireSignature } from "./wire-signature";

type Result = { status: number; body: string };

/**
 * Wire webhook-ийн логик (route-оос салгасан — тестлэхэд).
 * 1. Raw body дээр signature шалгана.
 * 2. event.id-аар давхардлыг шүүнэ.
 * 3. payment_intent.succeeded → markPaid (дотроо Wire-аас GET хийж шалгана).
 */
export async function handleWireWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  deps: Deps = defaultDeps(),
  nowSec?: number,
): Promise<Result> {
  let event: { id?: unknown; type?: unknown; data?: { id?: unknown } } | null = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    event = null;
  }

  if (!verifyWireSignature(rawBody, signatureHeader, secret, nowSec)) {
    // Endpoint баталгаажуулах ping — ямар ч үйлдэлгүйгээр 200
    if (event?.type === "endpoint.verification") return { status: 200, body: "ok" };
    return { status: 400, body: "bad signature" };
  }
  if (!event || typeof event.id !== "string" || typeof event.type !== "string") {
    return { status: 400, body: "bad event" };
  }
  if (event.type === "endpoint.verification") return { status: 200, body: "ok" };

  const isNew = await deps.db.recordWebhookEvent(event.id, event.type);
  if (!isNew) return { status: 200, body: "duplicate" };

  try {
    await processEvent(event.type, event.data?.id, deps);
  } catch (e) {
    // Боловсруулж чадсангүй → бүртгэлийг буцааж устгаад 500. Wire дахин илгээнэ.
    await deps.db.forgetWebhookEvent(event.id).catch(() => {});
    await deps.alert("Webhook", null, e);
    return { status: 500, body: "retry" };
  }
  return { status: 200, body: "ok" };
}

async function processEvent(type: string, intentId: unknown, deps: Deps): Promise<void> {
  if (type === "payment_intent.succeeded") {
    if (typeof intentId !== "string") return;
    const payment = await deps.db.getPaymentByIntent(intentId);
    if (!payment) {
      // Манай захиалгад холбогдоогүй intent (өөр систем?) — дахин илгээлгэхгүй
      await deps.alert("Webhook", null, new Error(`бүртгэлгүй PaymentIntent ${intentId}`));
      return;
    }
    await markPaid(payment.order_id, intentId, deps);
  }
}
