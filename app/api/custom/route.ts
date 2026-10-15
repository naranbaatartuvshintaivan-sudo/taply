import { submitCustomRequest } from "@/lib/custom";
import { json, supportMessage, userError } from "@/lib/http";
import { LOGO_MAX_BYTES, LOGO_TOO_BIG } from "@/lib/image-check";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
// Хариу буцсаны дараа (after) 3 загвар рендэрлэнэ
export const maxDuration = 60;

// Өөрийн логотой хүсэлт (multipart/form-data). Бүх шалгалт lib/custom.ts-д.
export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > LOGO_MAX_BYTES + 64 * 1024) return userError(413, LOGO_TOO_BIG, { field: "logo" });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return userError(400, "Хүсэлт буруу байна");
  }

  const fields: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
  const file = form.get("logo");
  const logo =
    file instanceof File && file.size > 0 ? { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type } : null;

  const r = await submitCustomRequest(fields, logo, clientIp(req.headers));
  if (r.ok) return json({ ok: true });
  if (r.status === 500) return userError(502, supportMessage());
  return userError(r.status, r.message, r.field ? { field: r.field } : {});
}
