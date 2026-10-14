import "server-only";
import { env } from "./env";

// Wire API — https://docs.wire.mn
// amount нь бүхэл төгрөг (100-аар үржүүлэхгүй). POST бүрд Idempotency-Key заавал.
const API = "https://api.wire.mn/v1";

export type PaymentIntentStatus =
  | "new"
  | "requires_payment_method"
  | "requires_action"
  | "requires_capture"
  | "processing"
  | "succeeded"
  | "canceled";

export type PaymentIntent = {
  id: string;
  object: "payment_intent";
  amount: number;
  currency: string;
  description: string;
  status: PaymentIntentStatus;
  metadata: Record<string, string>;
  livemode: boolean;
  created: number;
  expires_at: number | null;
};

export type CheckoutSession = {
  id: string;
  object: "checkout_session";
  payment_intent: string;
  status: string;
  url: string;
};

export class WireError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId: string | undefined,
  ) {
    // message-д нууц мэдээлэл байхгүй: зөвхөн HTTP статус, код
    super(`Wire ${status} ${code}${requestId ? ` (${requestId})` : ""}`);
  }
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  if (method === "POST" && !opts.idempotencyKey) throw new Error("Wire POST: Idempotency-Key заавал");
  const headers: Record<string, string> = { Authorization: `Bearer ${env().WIRE_SECRET_KEY}` };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = opts.idempotencyKey!;
  }
  const res = await fetch(API + path, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(opts.body ?? {}) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* JSON биш хариу — доор алдаа болно */
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; request_id?: string } } | null)?.error;
    throw new WireError(res.status, err?.code ?? "unknown", err?.request_id);
  }
  return json as T;
}

export function createPaymentIntent(p: {
  amount: number;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}) {
  if (!Number.isInteger(p.amount) || p.amount < 1) throw new Error("amount бүхэл, эерэг тоо байх ёстой");
  return call<PaymentIntent>("POST", "/payment_intents", {
    body: { amount: p.amount, currency: "MNT", description: p.description, metadata: p.metadata },
    idempotencyKey: p.idempotencyKey,
  });
}

export function createCheckoutSession(p: {
  paymentIntentId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}) {
  return call<CheckoutSession>("POST", "/checkout/sessions", {
    body: { payment_intent: p.paymentIntentId, success_url: p.successUrl, cancel_url: p.cancelUrl },
    idempotencyKey: p.idempotencyKey,
  });
}

export function getPaymentIntent(id: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new Error("PaymentIntent id буруу");
  return call<PaymentIntent>("GET", `/payment_intents/${id}`);
}

export function cancelPaymentIntent(id: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new Error("PaymentIntent id буруу");
  return call<PaymentIntent>("POST", `/payment_intents/${id}/cancel`, { idempotencyKey: `cancel-${id}` });
}

// Төлөгдөх боломжгүй болсон (эцсийн) төлөв
export const isFinal = (s: PaymentIntentStatus) => s === "succeeded" || s === "canceled";

/** /api/health — Wire key хүчинтэй эсэх (юу ч үүсгэхгүй). */
export async function pingWire(): Promise<void> {
  await call<unknown>("GET", "/webhook_endpoints");
}
