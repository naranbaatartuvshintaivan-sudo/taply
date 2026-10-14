import { z } from "zod";
import { contactSchema } from "./order-input";
import { normalizeFacebook, normalizeInstagram } from "./links";
import { MAX_QTY } from "./pricing";

// Өөрийн логотой (custom) хүсэлтийн form — сервер дээр бүрэн шалгана.
// Алдааны мессеж бүгд монголоор, хэрэглэгчид шууд харуулна.

const trimmed = (max: number) => z.string().trim().max(max, `${max} тэмдэгтээс ихгүй`);

export const customRequestSchema = contactSchema.extend({
  business: trimmed(80).min(1, "Бизнесийнхээ нэрийг оруулна уу"),
  // Custom-д имэйл заавал — загварууд имэйлээр очно
  email: z
    .string()
    .trim()
    .max(200)
    .transform((s) => s.toLowerCase())
    .refine((s) => z.email().safeParse(s).success, "Имэйл хаягаа зөв оруулна уу — загварууд имэйлээр очно"),
  fb: z.string().max(300).default(""),
  ig: z.string().max(300).default(""),
  qty: z.coerce
    .number({ error: "Тоо ширхгээ оруулна уу" })
    .int("Тоо ширхэг бүхэл тоо байх ёстой")
    .min(1, "Дор хаяж 1 ширхэг")
    .max(MAX_QTY, `${MAX_QTY}-аас дээш бол утсаар тохирно`),
  noLogo: z
    .string()
    .optional()
    .transform((s) => s === "on" || s === "true"),
});

export type CustomRequestInput = {
  business: string;
  name: string;
  phone: string;
  email: string;
  fbUrl: string | null;
  igUrl: string | null;
  qty: number;
  district: string;
  address: string;
  note: string | null;
  noLogo: boolean;
};

export type Invalid = { ok: false; field: string; message: string };

const TEXT_FIELDS = ["business", "name", "phone", "email", "fb", "ig", "qty", "district", "address", "note"] as const;

/** FormData-аас (лого файлаас бусад) талбаруудыг шалгана. */
export function validateCustomRequest(raw: Record<string, unknown>): { ok: true; input: CustomRequestInput } | Invalid {
  // Дутуу талбарыг хоосон гэж үзнэ — zod-ийн англи "expected string" биш, монгол мессеж гарна
  const filled: Record<string, unknown> = { ...raw };
  for (const k of TEXT_FIELDS) if (filled[k] === undefined || filled[k] === null) filled[k] = "";
  const parsed = customRequestSchema.safeParse(filled);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, field: String(issue.path[0] ?? ""), message: issue.message };
  }
  const d = parsed.data;

  // FB ба/эсвэл IG — дор хаяж нэг. Оруулсан бол формат нь зөв байх ёстой.
  const fbUrl = d.fb.trim() ? normalizeFacebook(d.fb) : null;
  if (d.fb.trim() && !fbUrl) return { ok: false, field: "fb", message: "Facebook хуудасныхаа линкийг оруулна уу (facebook.com/...)" };
  const igUrl = d.ig.trim() ? normalizeInstagram(d.ig) : null;
  if (d.ig.trim() && !igUrl) return { ok: false, field: "ig", message: "Instagram хаягаа оруулна уу (@нэр эсвэл instagram.com/...)" };
  if (!fbUrl && !igUrl) return { ok: false, field: "fb", message: "Facebook эсвэл Instagram-аас дор хаяж нэгийг оруулна уу" };

  return {
    ok: true,
    input: {
      business: d.business,
      name: d.name,
      phone: d.phone,
      email: d.email,
      fbUrl,
      igUrl,
      qty: d.qty,
      district: d.district,
      address: d.address,
      note: d.note,
      noLogo: d.noLogo,
    },
  };
}
