import "server-only";
import { sb } from "./db";

// Custom (өөрийн логотой) хүсэлтийн DB/Storage хандалт — зөвхөн сервер, service role.
// Mockup, имэйл, хэвлэх файл нь ҮРГЭЛЖ custom_requests-ийн snapshot (business_name,
// contact_name, email)-ыг ашиглана. businesses нь зөвхөн холбоо барих лавлах.

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
  created_at: string;
};

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
  "id" | "token" | "business_id" | "business_name" | "contact_name" | "email" | "quantity" | "status" | "fb_url" | "ig_url" | "logo_path" | "note"
>;

export interface CustomDb {
  hitRateLimit(bucket: string, keyHash: string, limit: number, window: string): Promise<boolean>;
  /** Утсаар upsert — ижил утсаар дахин ирвэл мэдээллийг шинэчилнэ. */
  upsertBusiness(b: NewBusiness): Promise<{ id: string }>;
  insertCustomRequest(r: NewCustomRequest): Promise<CustomRequest>;
  uploadLogo(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  removeLogo(path: string): Promise<void>;
}

function must<T>(r: { data: T; error: { message: string; code?: string } | null }, where: string): T {
  if (r.error) throw new Error(`DB ${where}: ${r.error.code ?? ""} ${r.error.message}`);
  return r.data;
}

export const LOGO_BUCKET = "logos";

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
};
