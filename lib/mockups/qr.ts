import jsQR from "jsqr";
import QRCode from "qrcode";
import sharp from "sharp";

// QR — error correction Q (25% гэмтэлд тэсвэртэй). Модулийг бүхэл пикселээр зурна:
// ирмэг нь бүдгэрэхгүй, хэвлэхэд тод.

export type QrImage = { png: Buffer; size: number; modules: number };

/** maxPx-ээс хэтрэхгүй, модуль бүр бүхэл пиксел, quiet zone-гүй (хавтан өөрөө цагаан зай өгнө). */
export async function qrPng(text: string, maxPx: number): Promise<QrImage> {
  const modules = QRCode.create(text, { errorCorrectionLevel: "Q" }).modules.size;
  const scale = Math.floor(maxPx / modules);
  if (scale < 4) throw new Error(`QR хэт нягт: ${modules} модуль ${maxPx}px-д`);
  const png = await QRCode.toBuffer(text, {
    errorCorrectionLevel: "Q",
    margin: 0,
    scale,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  return { png, size: modules * scale, modules };
}

/** Зурган дээрх QR-ийг уншина. Олдохгүй бол null. */
export async function decodeQr(image: Buffer, maxSide = 1400): Promise<string | null> {
  const { data, info } = await sharp(image)
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const r = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height);
  return r?.data ?? null;
}
