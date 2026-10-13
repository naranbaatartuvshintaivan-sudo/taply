import { z } from "zod";
import { DELIVERY } from "./config";
import { normalizeFacebook, normalizeInstagram } from "./links";
import { MAX_QTY, quote, SKU_PLATFORM, STANDARD_SKUS, type Quote, type StandardSku } from "./pricing";

// Энгийн захиалгын оролт — сервер дээр бүрэн шалгана.
// Алдааны мессеж бүгд монголоор, хэрэглэгчид шууд харуулна.

const trimmed = (max: number) => z.string().trim().max(max, `${max} тэмдэгтээс ихгүй`);

export const PHONE_RE = /^\d{8}$/;
export const normalizePhone = (s: string) => s.replace(/[\s-]/g, "");

export const contactSchema = z.object({
  name: trimmed(80).min(2, "Нэрээ оруулна уу"),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((s) => PHONE_RE.test(s), "Утасны дугаар 8 оронтой байх ёстой"),
  email: z
    .string()
    .trim()
    .max(200)
    .transform((s) => (s === "" ? null : s.toLowerCase()))
    .refine((s) => s === null || z.email().safeParse(s).success, "Имэйл хаяг буруу байна"),
  district: z.string().refine((d) => DELIVERY.districts.includes(d), "Хүргэлтийн дүүргээ сонгоно уу"),
  address: trimmed(300).min(5, "Хаягаа дэлгэрэнгүй оруулна уу"),
  note: trimmed(500).transform((s) => (s === "" ? null : s)),
  // Honeypot — хүн бөглөхгүй, бот бөглөнө
  website: z.string().max(0, "spam").optional().default(""),
});

export const standardOrderSchema = contactSchema.extend({
  items: z
    .array(z.object({ sku: z.enum(STANDARD_SKUS), qty: z.number().int().min(0).max(MAX_QTY) }))
    .min(1)
    .max(STANDARD_SKUS.length)
    .refine((a) => new Set(a.map((i) => i.sku)).size === a.length, "Давхардсан бүтээгдэхүүн"),
  fb: z.string().max(300).default(""),
  ig: z.string().max(300).default(""),
});

export type StandardOrderInput = z.input<typeof standardOrderSchema>;

export type ValidOrder = {
  contact: z.output<typeof contactSchema>;
  items: { sku: StandardSku; qty: number }[];
  fbUrl: string | null;
  igUrl: string | null;
  quote: Extract<Quote, { ok: true }>;
};

export type Invalid = { ok: false; field: string; message: string };

export function validateStandardOrder(body: unknown): { ok: true; order: ValidOrder } | Invalid {
  const parsed = standardOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: String(issue.path[0] ?? ""), message: issue.message };
  }
  const d = parsed.data;
  const items = d.items.filter((i) => i.qty > 0);
  const q = quote("standard", items);
  if (!q.ok) {
    const message =
      q.reason === "too_many"
        ? `${MAX_QTY}-аас дээш ширхгийг утсаар тохирно`
        : "Дор хаяж нэг бүтээгдэхүүн сонгоно уу";
    return { ok: false, field: "items", message };
  }

  const needs = new Set(items.map((i) => SKU_PLATFORM[i.sku]));
  let fbUrl: string | null = null;
  let igUrl: string | null = null;
  if (needs.has("fb")) {
    fbUrl = normalizeFacebook(d.fb);
    if (!fbUrl) return { ok: false, field: "fb", message: "Facebook хуудасныхаа линкийг оруулна уу (facebook.com/...)" };
  }
  if (needs.has("ig")) {
    igUrl = normalizeInstagram(d.ig);
    if (!igUrl) return { ok: false, field: "ig", message: "Instagram хаягаа оруулна уу (@нэр эсвэл instagram.com/...)" };
  }

  const { name, phone, email, district, address, note, website } = d;
  return {
    ok: true,
    order: { contact: { name, phone, email, district, address, note, website }, items, fbUrl, igUrl, quote: q },
  };
}
