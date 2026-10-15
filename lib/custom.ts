import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { after } from "next/server";
import sharp from "sharp";
import { alert } from "./alert";
import { customDb, type CustomDb, type CustomRequest } from "./custom-db";
import { generateMockups } from "./custom-mockups";
import { validateCustomRequest, type CustomRequestInput } from "./custom-input";
import { env } from "./env";
import { checkLogo, LOGO_EXT } from "./image-check";
import { displayLink } from "./links";
import { checkLimits, CUSTOM_LIMITS } from "./rate-limit";
import { escapeHtml, sendTelegram, sendTelegramPhoto } from "./telegram";

// Өөрийн логотой хүсэлт: шалгах → rate limit → лого хадгалах → бизнес upsert → хүсэлт → Telegram.
// Дараа нь (хариу буцсаны дараа) лого байвал 3 загвар үүсгэнэ — lib/custom-mockups.ts.

export type CustomDeps = {
  db: CustomDb;
  secret: string; // rate limit hash-ийн түлхүүр
  schedule: (fn: () => Promise<void>) => void;
  notify: (req: CustomRequest, input: CustomRequestInput, logo: Uint8Array | null) => Promise<void>;
  generate: (id: string) => Promise<unknown>;
  alert: typeof alert;
  newId: () => string;
  newToken: () => string;
};

export const defaultCustomDeps = (): CustomDeps => ({
  db: customDb,
  secret: env().CRON_SECRET,
  schedule: (fn) => after(fn),
  notify: notifyTelegram,
  generate: (id) => generateMockups(id, "initial"),
  alert,
  newId: randomUUID,
  newToken: () => randomBytes(24).toString("base64url"), // 32 тэмдэгт
});

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; status: 400 | 429; field?: string; message: string }
  | { ok: false; status: 500 };

export async function submitCustomRequest(
  fields: Record<string, unknown>,
  logo: { bytes: Uint8Array; type: string } | null,
  ip: string,
  deps: CustomDeps = defaultCustomDeps(),
): Promise<SubmitResult> {
  // Honeypot — хүн бөглөхгүй талбар
  if (typeof fields.website === "string" && fields.website !== "") {
    return { ok: false, status: 400, message: "Хүсэлт буруу байна" };
  }
  const v = validateCustomRequest(fields);
  if (!v.ok) return { ok: false, status: 400, field: v.field, message: v.message };
  const input = v.input;

  let logoType: keyof typeof LOGO_EXT | null = null;
  if (!input.noLogo) {
    if (!logo) return { ok: false, status: 400, field: "logo", message: "Логогоо оруулна уу, эсвэл “Лого байхгүй”-г сонгоно уу" };
    const c = checkLogo(logo.bytes, logo.type);
    if (!c.ok) return { ok: false, status: 400, field: "logo", message: c.message };
    logoType = c.type;
  }

  // Шалгалт давсны дараа л тоолно — алдаатай бөглөсөн оролдлого хязгаарыг идэхгүй
  const limited = await checkLimits(deps.db.hitRateLimit, deps.secret, [
    { rule: CUSTOM_LIMITS.ip, value: ip },
    { rule: CUSTOM_LIMITS.email, value: input.email },
  ]);
  if (!limited.ok) {
    return {
      ok: false,
      status: 429,
      message: "Хэт олон хүсэлт ирлээ. Түр хүлээгээд дахин оролдоно уу, эсвэл 9973 2298 руу залгана уу.",
    };
  }

  const id = deps.newId();
  const logoPath = logoType ? `${id}/original.${LOGO_EXT[logoType]}` : null;
  try {
    if (logoPath && logo && logoType) await deps.db.uploadLogo(logoPath, logo.bytes, logoType);
    const business = await deps.db.upsertBusiness({
      name: input.business,
      contact_name: input.name,
      phone: input.phone,
      email: input.email,
      district: input.district,
      address: input.address,
    });
    const req = await deps.db.insertCustomRequest({
      id,
      token: deps.newToken(),
      business_id: business.id,
      business_name: input.business,
      contact_name: input.name,
      email: input.email,
      // Хүргэлтийн snapshot — захиалга үүсгэхэд эдгээрийг ашиглана (businesses биш)
      phone: input.phone,
      district: input.district,
      address: input.address,
      quantity: input.qty,
      status: logoPath ? "generating" : "manual",
      fb_url: input.fbUrl,
      ig_url: input.igUrl,
      logo_path: logoPath,
      note: input.note,
    });
    const logoBytes = logo && logoPath ? logo.bytes : null;
    deps.schedule(async () => {
      try {
        await deps.notify(req, input, logoBytes);
      } catch (e) {
        await deps.alert("Custom Telegram", input.business, e);
      }
      if (!logoPath) return; // "Лого байхгүй" — гараар хийнэ
      try {
        await deps.generate(req.id);
      } catch (e) {
        await deps.alert("Custom загвар", input.business, e);
      }
    });
    return { ok: true, id: req.id };
  } catch (e) {
    // Хүсэлт хадгалагдаагүй бол логог үлдээхгүй
    if (logoPath) await deps.db.removeLogo(logoPath).catch(() => {});
    await deps.alert("Custom хүсэлт", input.business, e);
    return { ok: false, status: 500 };
  }
}

/** Telegram мессеж — хэрэглэгчийн бүх өгөгдлийг escape хийнэ. Caption ≤1024 тэмдэгт. */
export function customRequestMessage(req: Pick<CustomRequest, "business_name" | "contact_name" | "email" | "quantity" | "fb_url" | "ig_url" | "note">, input: Pick<CustomRequestInput, "phone" | "district" | "address" | "noLogo">): string {
  const e = escapeHtml;
  const lines = [
    `🟣 <b>CUSTOM ХҮСЭЛТ</b> · ${e(req.business_name)} · ${e(input.phone)} · ${req.quantity}ш`,
    input.noLogo ? "⚠️ <b>ЛОГОГҮЙ — гараар хийнэ</b>" : null,
    `👤 ${e(req.contact_name)} · ${e(req.email)}`,
    req.fb_url ? `FB: <a href="${e(req.fb_url)}">${e(displayLink(req.fb_url))}</a>` : null,
    req.ig_url ? `IG: <a href="${e(req.ig_url)}">${e(displayLink(req.ig_url))}</a>` : null,
    `📍 ${e(input.district)}, ${e(input.address)}`,
    req.note ? `📝 ${e(req.note.slice(0, 300))}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

async function notifyTelegram(req: CustomRequest, input: CustomRequestInput, logo: Uint8Array | null): Promise<void> {
  const html = customRequestMessage(req, input);
  if (!logo) return sendTelegram(html);
  // Telegram-д тогтвортой харагдахаар PNG болгож багасгана (тунгалаг дэвсгэр цагаан болно)
  const png = await sharp(logo).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }).png().toBuffer();
  await sendTelegramPhoto({ bytes: png, filename: "logo.png", type: "image/png" }, html);
}
