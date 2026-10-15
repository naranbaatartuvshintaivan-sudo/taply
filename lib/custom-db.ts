import "server-only";
import { sb, type NewOrder, type Order } from "./db";

// Custom (өөрийн логотой) хүсэлтийн DB/Storage хандалт — зөвхөн сервер, service role.
// Mockup, имэйл, хэвлэх файл нь ҮРГЭЛЖ custom_requests-ийн snapshot (business_name,
// contact_name, email, phone, district, address)-ыг ашиглана. businesses нь зөвхөн холбоо барих лавлах.

export type CustomStatus = "generating" | "awaiting_approval" | "sent" | "chosen" | "failed" | "manual";

export type CustomRequest = {
  id: string;
  token: string;
  business_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  quantity: number;
  status: CustomStatus;
  chosen_design: "A" | "B" | "C" | null;
  fb_url: string | null;
  ig_url: string | null;
  logo_path: string | null;
  note: string | null;
  /** Хэд дэх удаагаа загвар үүсгэсэн (0 = хараахан) — layout-ийн багцыг тодорхойлно */
  design_set: number;
  /** mockups bucket доторх хавтас */
  mockup_dir: string | null;
  generated_at: string | null;
  sent_at: string | null;
  /** Төлөгдсөн үед: аль багцаас сонгосон, хэзээ */
  chosen_set: number | null;
  chosen_at: string | null;
  /** Хүргэлтийн snapshot — захиалга үүсгэхэд businesses-ийг биш, эдгээрийг ашиглана */
  phone: string;
  district: string;
  address: string;
  created_at: string;
  updated_at: string;
};

export type MockupSet = { request_id: string; design_set: number; mockup_dir: string; created_at: string };

export type NewBusiness = {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  district: string;
  address: string;
};

export type NewCustomRequest = Pick<
  CustomRequest,
  | "id" | "token" | "business_id" | "business_name" | "contact_name" | "email" | "phone" | "district" | "address"
  | "quantity" | "status" | "fb_url" | "ig_url" | "logo_path" | "note"
>;

export const PAID_STATUSES = ["paid", "in_production", "delivered"] as const;

export interface CustomDb {
  hitRateLimit(bucket: string, keyHash: string, limit: number, window: string): Promise<boolean>;
  /** Утсаар upsert — ижил утсаар дахин ирвэл мэдээллийг шинэчилнэ. */
  upsertBusiness(b: NewBusiness): Promise<{ id: string }>;
  insertCustomRequest(r: NewCustomRequest): Promise<CustomRequest>;
  uploadLogo(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  removeLogo(path: string): Promise<void>;

  getCustomRequest(id: string): Promise<CustomRequest | null>;
  /** Admin хуудсанд утас, хаяг (snapshot-д утас байхгүй) */
  getBusiness(id: string): Promise<(NewBusiness & { id: string }) | null>;
  downloadLogo(path: string): Promise<Uint8Array>;
  /**
   * Загвар үүсгэх эрх авна: design_set = fromSet + 1, status = 'generating'.
   * Зөвхөн design_set нь fromSet хэвээр, status нь зөвшөөрөгдсөн үед (давхар дарахад нэг л ялна).
   * Дахин үүсгэхэд 3 минутаас удаан 'generating'-д гацсан хүсэлтийг ч авна.
   */
  claimGeneration(id: string, fromSet: number, mode: "initial" | "regenerate"): Promise<number | null>;
  uploadMockup(path: string, png: Buffer): Promise<void>;
  /** 'generating' → 'awaiting_approval'. Энэ үеийн design_set хэвээр бол true (өөр үүсгэлт давж гараагүй). */
  finishGeneration(id: string, set: number, dir: string): Promise<boolean>;
  failGeneration(id: string, set: number): Promise<void>;
  /** 'awaiting_approval' → 'sent' (атомаар). true бол энэ дуудлага л имэйл илгээнэ. */
  claimSend(id: string, set: number): Promise<boolean>;
  releaseSend(id: string, set: number): Promise<void>;
  mockupUrl(path: string): string;
  logoSignedUrl(path: string): Promise<string | null>;

  // ─── Шат 3: сонголт ба төлбөр ───
  /** Генераци бүрийг custom_mockup_sets-д бичнэ (хуучин багцын линк ажиллахын тулд) */
  recordMockupSet(requestId: string, set: number, dir: string): Promise<void>;
  getByToken(token: string): Promise<CustomRequest | null>;
  getMockupSet(requestId: string, set: number): Promise<MockupSet | null>;
  /** Хүсэлтийн цуцлагдаагүй захиалгууд (pending + төлөгдсөн) */
  listOpenOrders(requestId: string): Promise<Order[]>;
  /** Шинэ custom захиалга. Нэг хүсэлтэд pending аль хэдийн байвал (unique index) null. */
  insertCustomOrder(o: NewOrder & { custom_request_id: string }): Promise<Order | null>;
  /** Төлөгдсөн үед — давтан дуудсан ч ижил үр дүн */
  markChosen(requestId: string, design: string, set: number): Promise<void>;
  downloadMockup(path: string): Promise<Uint8Array>;
}

function must<T>(r: { data: T; error: { message: string; code?: string } | null }, where: string): T {
  if (r.error) throw new Error(`DB ${where}: ${r.error.code ?? ""} ${r.error.message}`);
  return r.data;
}

export const LOGO_BUCKET = "logos";
export const MOCKUP_BUCKET = "mockups";

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STUCK_MINUTES = 3;

export const customDb: CustomDb = {
  async hitRateLimit(bucket, keyHash, limit, window) {
    const r = await sb().rpc("hit_rate_limit", { p_bucket: bucket, p_key_hash: keyHash, p_limit: limit, p_window: window });
    return must(r, "hitRateLimit") === true;
  },

  async upsertBusiness(b) {
    const r = await sb().from("businesses").upsert(b, { onConflict: "phone" }).select("id").single();
    return must(r, "upsertBusiness") as { id: string };
  },

  async insertCustomRequest(req) {
    return must(await sb().from("custom_requests").insert(req).select().single(), "insertCustomRequest") as CustomRequest;
  },

  async uploadLogo(path, bytes, contentType) {
    const r = await sb().storage.from(LOGO_BUCKET).upload(path, bytes, { contentType, upsert: false });
    if (r.error) throw new Error(`Storage uploadLogo: ${r.error.message}`);
  },

  async removeLogo(path) {
    const r = await sb().storage.from(LOGO_BUCKET).remove([path]);
    if (r.error) throw new Error(`Storage removeLogo: ${r.error.message}`);
  },

  async getCustomRequest(id) {
    if (!UUID_RE.test(id)) return null;
    return must(await sb().from("custom_requests").select().eq("id", id).maybeSingle(), "getCustomRequest") as CustomRequest | null;
  },

  async getBusiness(id) {
    return must(await sb().from("businesses").select().eq("id", id).maybeSingle(), "getBusiness") as (NewBusiness & { id: string }) | null;
  },

  async downloadLogo(path) {
    const r = await sb().storage.from(LOGO_BUCKET).download(path);
    if (r.error || !r.data) throw new Error(`Storage downloadLogo: ${r.error?.message ?? "хоосон"}`);
    return new Uint8Array(await r.data.arrayBuffer());
  },

  async claimGeneration(id, fromSet, mode) {
    let q = sb()
      .from("custom_requests")
      .update({ status: "generating", design_set: fromSet + 1 })
      .eq("id", id)
      .eq("design_set", fromSet)
      .not("logo_path", "is", null);
    if (mode === "initial") q = q.eq("status", "generating");
    else {
      const stuck = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();
      q = q.or(`status.in.(awaiting_approval,sent,failed),and(status.eq.generating,updated_at.lt.${stuck})`);
    }
    const rows = must(await q.select("design_set"), "claimGeneration") as { design_set: number }[];
    return rows.length > 0 ? rows[0].design_set : null;
  },

  async uploadMockup(path, png) {
    const r = await sb().storage.from(MOCKUP_BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
    if (r.error) throw new Error(`Storage uploadMockup: ${r.error.message}`);
  },

  async finishGeneration(id, set, dir) {
    const rows = must(
      await sb()
        .from("custom_requests")
        .update({ status: "awaiting_approval", mockup_dir: dir, generated_at: new Date().toISOString(), sent_at: null })
        .eq("id", id)
        .eq("design_set", set)
        .eq("status", "generating")
        .select("id"),
      "finishGeneration",
    );
    return (rows ?? []).length > 0;
  },

  async failGeneration(id, set) {
    must(
      await sb().from("custom_requests").update({ status: "failed" }).eq("id", id).eq("design_set", set).eq("status", "generating"),
      "failGeneration",
    );
  },

  async claimSend(id, set) {
    const rows = must(
      await sb()
        .from("custom_requests")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id)
        .eq("design_set", set)
        .eq("status", "awaiting_approval")
        .select("id"),
      "claimSend",
    );
    return (rows ?? []).length > 0;
  },

  async releaseSend(id, set) {
    must(
      await sb().from("custom_requests").update({ status: "awaiting_approval", sent_at: null }).eq("id", id).eq("design_set", set).eq("status", "sent"),
      "releaseSend",
    );
  },

  mockupUrl(path) {
    return sb().storage.from(MOCKUP_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async recordMockupSet(requestId, set, dir) {
    must(
      await sb().from("custom_mockup_sets").upsert({ request_id: requestId, design_set: set, mockup_dir: dir }, { onConflict: "request_id,design_set" }),
      "recordMockupSet",
    );
  },

  async getByToken(token) {
    if (!TOKEN_RE.test(token)) return null;
    return must(await sb().from("custom_requests").select().eq("token", token).maybeSingle(), "getByToken") as CustomRequest | null;
  },

  async getMockupSet(requestId, set) {
    if (!Number.isInteger(set) || set < 1) return null;
    return must(
      await sb().from("custom_mockup_sets").select().eq("request_id", requestId).eq("design_set", set).maybeSingle(),
      "getMockupSet",
    ) as MockupSet | null;
  },

  async listOpenOrders(requestId) {
    return must(
      await sb()
        .from("orders")
        .select()
        .eq("custom_request_id", requestId)
        .in("status", ["pending_payment", ...PAID_STATUSES])
        .order("created_at", { ascending: false }),
      "listOpenOrders",
    ) as Order[];
  },

  async insertCustomOrder(o) {
    const r = await sb().from("orders").insert(o).select().single();
    if (r.error?.code === "23505") return null; // өөр хүсэлт яг одоо pending үүсгэсэн
    return must(r, "insertCustomOrder") as Order;
  },

  async markChosen(requestId, design, set) {
    must(
      await sb()
        .from("custom_requests")
        .update({ status: "chosen", chosen_design: design, chosen_set: set, chosen_at: new Date().toISOString() })
        .eq("id", requestId)
        .neq("status", "chosen"),
      "markChosen",
    );
  },

  async downloadMockup(path) {
    const r = await sb().storage.from(MOCKUP_BUCKET).download(path);
    if (r.error || !r.data) throw new Error(`Storage downloadMockup: ${r.error?.message ?? "хоосон"}`);
    return new Uint8Array(await r.data.arrayBuffer());
  },

  async logoSignedUrl(path) {
    const r = await sb().storage.from(LOGO_BUCKET).createSignedUrl(path, 60 * 30);
    return r.error ? null : r.data.signedUrl;
  },
};
