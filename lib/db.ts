import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Supabase — зөвхөн сервер, service role. Client талд key огт байхгүй.

export type OrderStatus = "pending_payment" | "paid" | "expired" | "canceled" | "in_production" | "delivered";

export type OrderItem = { sku: string; qty: number };

export type Order = {
  id: string;
  code: string;
  type: "standard" | "custom";
  status: OrderStatus;
  customer_name: string;
  phone: string;
  email: string | null;
  district: string;
  address: string;
  note: string | null;
  items: OrderItem[];
  total_qty: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  fb_url: string | null;
  ig_url: string | null;
  custom_request_id: string | null;
  paid_at: string | null;
  paid_payment_intent_id: string | null;
  notified_at: string | null;
  customer_emailed_at: string | null;
  created_at: string;
};

export type NewOrder = Pick<
  Order,
  | "type"
  | "customer_name"
  | "phone"
  | "email"
  | "district"
  | "address"
  | "note"
  | "items"
  | "total_qty"
  | "subtotal"
  | "delivery_fee"
  | "total"
  | "fb_url"
  | "ig_url"
>;

export type Payment = {
  id: string;
  order_id: string;
  payment_intent_id: string;
  attempt: number;
  status: string;
  amount: number;
  livemode: boolean;
  created_at: string;
};

export interface Db {
  insertOrder(o: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  setOrderStatus(id: string, from: OrderStatus, to: OrderStatus): Promise<boolean>;
  listPayments(orderId: string): Promise<Payment[]>;
  insertPayment(p: Omit<Payment, "id" | "created_at">): Promise<void>;
  setPaymentStatus(paymentIntentId: string, status: string): Promise<void>;
  getPaymentByIntent(paymentIntentId: string): Promise<Payment | null>;
  /** Атомаар paid болгоно. Энэ дуудлага "ялсан" бол мөр буцаана, үгүй бол null. */
  markOrderPaid(orderId: string, paymentIntentId: string): Promise<{ order: Order; shortSkus: string[] } | null>;
  /** Мэдэгдэл илгээх эрх (10 минутын lease). true бол зөвхөн энэ дуудлага илгээнэ. */
  claimNotification(orderId: string, kind: "telegram" | "email"): Promise<boolean>;
  setNotified(orderId: string, kind: "telegram" | "email"): Promise<void>;
  releaseNotification(orderId: string, kind: "telegram" | "email"): Promise<void>;
  /** Шинэ event бол true, давхардсан бол false. */
  recordWebhookEvent(eventId: string, type: string): Promise<boolean>;
  forgetWebhookEvent(eventId: string): Promise<void>;
  checkStock(items: OrderItem[]): Promise<{ sku: string; available: number }[]>;
  listStalePending(olderThanMinutes: number): Promise<Order[]>;
  listUnnotifiedPaid(): Promise<Order[]>;
}

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) {
    const e = env();
    client = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
  }
  return client;
}

function must<T>(r: { data: T; error: { message: string; code?: string } | null }, where: string): T {
  if (r.error) throw new Error(`DB ${where}: ${r.error.code ?? ""} ${r.error.message}`);
  return r.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

export const db: Db = {
  async insertOrder(o) {
    return must(await sb().from("orders").insert(o).select().single(), "insertOrder") as Order;
  },

  async getOrder(id) {
    if (!isUuid(id)) return null;
    return must(await sb().from("orders").select().eq("id", id).maybeSingle(), "getOrder") as Order | null;
  },

  async setOrderStatus(id, from, to) {
    const rows = must(
      await sb().from("orders").update({ status: to }).eq("id", id).eq("status", from).select("id"),
      "setOrderStatus",
    );
    return (rows ?? []).length > 0;
  },

  async listPayments(orderId) {
    return must(
      await sb().from("payments").select().eq("order_id", orderId).order("attempt", { ascending: true }),
      "listPayments",
    ) as Payment[];
  },

  async insertPayment(p) {
    const r = await sb().from("payments").insert(p);
    // Ижил intent аль хэдийн бүртгэгдсэн (idempotent replay) бол алдаа биш
    if (r.error && r.error.code !== "23505") must(r, "insertPayment");
  },

  async setPaymentStatus(paymentIntentId, status) {
    must(
      await sb().from("payments").update({ status }).eq("payment_intent_id", paymentIntentId),
      "setPaymentStatus",
    );
  },

  async getPaymentByIntent(paymentIntentId) {
    return must(
      await sb().from("payments").select().eq("payment_intent_id", paymentIntentId).maybeSingle(),
      "getPaymentByIntent",
    ) as Payment | null;
  },

  async markOrderPaid(orderId, paymentIntentId) {
    const rows = must(
      await sb().rpc("mark_order_paid", { p_order_id: orderId, p_payment_intent_id: paymentIntentId }),
      "markOrderPaid",
    ) as { order_row: Order; short_skus: string[] }[];
    if (!rows || rows.length === 0) return null;
    return { order: rows[0].order_row, shortSkus: rows[0].short_skus ?? [] };
  },

  async claimNotification(orderId, kind) {
    return must(
      await sb().rpc("claim_order_notification", { p_order_id: orderId, p_kind: kind }),
      "claimNotification",
    ) as boolean;
  },

  async setNotified(orderId, kind) {
    const col = kind === "telegram" ? "notified_at" : "customer_emailed_at";
    must(await sb().from("orders").update({ [col]: new Date().toISOString() }).eq("id", orderId), "setNotified");
  },

  async releaseNotification(orderId, kind) {
    const col = kind === "telegram" ? "notify_claimed_at" : "email_claimed_at";
    must(await sb().from("orders").update({ [col]: null }).eq("id", orderId), "releaseNotification");
  },

  async recordWebhookEvent(eventId, type) {
    const r = await sb().from("webhook_events").insert({ event_id: eventId, type });
    if (r.error?.code === "23505") return false; // давхардсан
    must(r, "recordWebhookEvent");
    return true;
  },

  async forgetWebhookEvent(eventId) {
    must(await sb().from("webhook_events").delete().eq("event_id", eventId), "forgetWebhookEvent");
  },

  async checkStock(items) {
    const skus = items.map((i) => i.sku);
    const rows = must(
      await sb().from("products").select("sku, stock").in("sku", skus),
      "checkStock",
    ) as { sku: string; stock: number | null }[];
    const short: { sku: string; available: number }[] = [];
    for (const it of items) {
      const row = rows.find((r) => r.sku === it.sku);
      if (!row) throw new Error(`DB checkStock: unknown sku ${it.sku}`);
      if (row.stock !== null && row.stock < it.qty) short.push({ sku: it.sku, available: Math.max(0, row.stock) });
    }
    return short;
  },

  async listStalePending(olderThanMinutes) {
    const before = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
    return must(
      await sb().from("orders").select().eq("status", "pending_payment").lt("created_at", before).limit(100),
      "listStalePending",
    ) as Order[];
  },

  async listUnnotifiedPaid() {
    return must(
      await sb()
        .from("orders")
        .select()
        .not("paid_at", "is", null)
        .or("notified_at.is.null,and(email.not.is.null,customer_emailed_at.is.null)")
        .limit(100),
      "listUnnotifiedPaid",
    ) as Order[];
  },
};

/** Rate limit (public.hit_rate_limit — prod DB-д бий, migration нь site/custom-system салбарт). true = зөвшөөрнө. */
export async function hitRateLimit(bucket: string, keyHash: string, limit: number, window: string): Promise<boolean> {
  const r = await sb().rpc("hit_rate_limit", { p_bucket: bucket, p_key_hash: keyHash, p_limit: limit, p_window: window });
  return must(r, "hitRateLimit") === true;
}

/** /api/health — service role-оор orders хүснэгтэд хандаж чадаж байгаа эсэх. */
export async function pingDb(): Promise<void> {
  must(await sb().from("orders").select("id").limit(1), "ping");
}
