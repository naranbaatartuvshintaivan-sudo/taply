import sharp from "sharp";
import { brandColorFromPixels, meanLuminance, saturation, type Rgb } from "./color";

// Харилцагчийн логог загварт бэлтгэнэ: эргүүлэлт засах → ирмэгийн хоосон зайг тайрах (trim)
// → ≤800px → PNG. Брэндийн өнгө, лого тунгалаг эсэх, цайвар/бараан эсэхийг тодорхойлно.

export const LOGO_MAX_PX = 800;

export type PreparedLogo = {
  png: Buffer;
  width: number;
  height: number;
  /** Тунгалаг дэвсгэртэй (PNG/WEBP alpha) — өнгөт дэвсгэр дээр шууд тавьж болно */
  transparent: boolean;
  /** Тунгалаг биш пикселийн дундаж гэрэлтэлт 0..1 */
  lightness: number;
  /** Логоноос авсан брэндийн өнгө; хар/цагаан лого бол null */
  brand: Rgb | null;
};

export async function prepareLogo(bytes: Uint8Array): Promise<PreparedLogo> {
  // Эргүүлэлт (EXIF) + alpha суваг
  const base = await sharp(bytes).rotate().ensureAlpha().png().toBuffer();
  // trim нь зүүн дээд булангийн өнгийг (тунгалаг эсвэл цагаан) дэвсгэр гэж үзнэ
  let trimmed: Buffer;
  try {
    trimmed = await sharp(base).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    trimmed = base; // бүхэлдээ нэг өнгөтэй зураг — тайрах юм алга
  }
  const { data, info } = await sharp(trimmed)
    .resize({ width: LOGO_MAX_PX, height: LOGO_MAX_PX, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  const small = await sharp(data).resize({ width: 200, height: 200, fit: "inside" }).raw().ensureAlpha().toBuffer();
  const stats = await sharp(data).stats();

  let brand = brandColorFromPixels(small);
  if (!brand) {
    // Нөөц: sharp-ийн dominant өнгө хангалттай өнгөлөг бол
    const d = stats.dominant;
    if (saturation(d) >= 0.35 && Math.max(d.r, d.g, d.b) >= 60) brand = d;
  }

  return {
    png: data,
    width: info.width,
    height: info.height,
    transparent: !stats.isOpaque,
    lightness: meanLuminance(small),
    brand,
  };
}
