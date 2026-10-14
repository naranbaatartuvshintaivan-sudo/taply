// Харилцагчдын зургийг вэбэд бэлтгэнэ:  node scripts/prep-customers.mjs
//
// public/customers/*.jpg → public/customers/<нэр>.webp
// - EXIF orientation-ыг пикселд шингээж эргүүлнэ (.rotate())
// - EXIF/GPS/ICC/XMP бүх metadata-г хасна (sharp анхдагчаар хуулахгүй) — гаралтыг шалгана
// - Урт тал ≤ 1200px, WebP ~82; 300 KB-аас хэтэрвэл чанарыг бууруулна
// Эх .jpg нь .gitignore-д байгаа тул repo руу орохгүй. Гаралтын хэмжээг lib/customers.ts-д хуулна.
import { readdirSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const DIR = "public/customers";
const LONG_EDGE = 1200;
const MAX_BYTES = 300 * 1024;

const sources = readdirSync(DIR).filter((f) => /\.(jpe?g|png|heic)$/i.test(f));
if (sources.length === 0) throw new Error(`${DIR} дотор эх зураг алга`);

for (const file of sources) {
  const out = join(DIR, `${parse(file).name}.webp`);
  let quality = 82;
  for (;;) {
    await sharp(join(DIR, file))
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toFile(out);
    if (statSync(out).size <= MAX_BYTES || quality <= 60) break;
    quality -= 5;
  }
  const m = await sharp(out).metadata();
  if (m.exif || m.icc || m.xmp || m.iptc) throw new Error(`${out}: metadata үлдсэн байна`);
  console.log(`${out}  ${m.width}×${m.height}  ${Math.round(statSync(out).size / 1024)} KB  q${quality}`);
}
