// Харилцагчдын зургийг вэбэд бэлтгэх.
//   node scripts/prepare-photos.ts <эх.jpg> <public/customers/нэр.webp> [<эх> <гаралт> ...]
//
// - EXIF orientation-ыг пикселд шингээж эргүүлнэ (.rotate())
// - EXIF/GPS/ICC зэрэг бүх metadata-г хасна (sharp анхдагчаар хуулахгүй)
// - Урт тал нь 1600px, WebP 82 чанар, ~300 KB-аас хэтэрвэл чанарыг бууруулна
import sharp from "sharp";
import { statSync } from "node:fs";

const LONG_EDGE = 1600;
const MAX_BYTES = 300 * 1024;

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
  throw new Error("Хэрэглээ: node scripts/prepare-photos.ts <эх> <гаралт.webp> [...]");
}

for (let i = 0; i < args.length; i += 2) {
  const [src, out] = [args[i], args[i + 1]];
  if (!out.endsWith(".webp")) throw new Error(`${out}: .webp байх ёстой`);
  let quality = 82;
  for (;;) {
    await sharp(src)
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toFile(out);
    if (statSync(out).size <= MAX_BYTES || quality <= 60) break;
    quality -= 5;
  }
  const meta = await sharp(out).metadata();
  if (meta.exif || meta.icc || meta.xmp || meta.iptc) throw new Error(`${out}: metadata үлдсэн байна`);
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`✓ ${out} ${meta.width}×${meta.height} · ${kb} KB · q${quality} · metadata алга`);
}
