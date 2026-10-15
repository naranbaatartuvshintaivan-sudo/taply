import type { ReactElement } from "react";
import sharp from "sharp";
import { FACE_H, FACE_W } from "./designs";

// Танилцуулах зураг 1600×1600: хэвлэх нүүрийг урдаас харсан L хэлбэрийн стенд дээр,
// саарал дэвсгэр, зөөлөн сүүдэр. Бодит product зураг (өнцөгтэй) ашиглахгүй.
//
// Хурдны тулд: дэвсгэр + суурь + сүүдрийг нэг удаа (instance тус бүрд) satori-гоор зурж кэшлээд,
// нүүр бүрийг sharp-аар багасгаж, булангийн радиустай тайрч дээр нь тавина.

export const PREVIEW = 1600;

const W = 860; // нүүрний өргөн (px)
const H = Math.round((W * FACE_H) / FACE_W); // 1003
const PX_PER_MM = W / 120;
const RADIUS = Math.round(3.18 * PX_PER_MM); // R3.18 булан
const TOP = 215;
const LEFT = (PREVIEW - W) / 2;
const BASE_H = 64; // 50 мм суурийн урд тийш харагдах хэсэг (перспектив)
const BASE_SPREAD = 46;

const base = () => {
  const w = W + BASE_SPREAD * 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BASE_H + 10}" viewBox="0 0 ${w} ${BASE_H + 10}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d9d9"/><stop offset="1" stop-color="#f4f4f4"/></linearGradient></defs>` +
    `<path d="M${BASE_SPREAD} 0 H${w - BASE_SPREAD} L${w} ${BASE_H} H0 Z" fill="url(#g)"/>` +
    `<path d="M0 ${BASE_H} H${w} V${BASE_H + 8} Q${w} ${BASE_H + 10} ${w - 4} ${BASE_H + 10} H4 Q0 ${BASE_H + 10} 0 ${BASE_H + 8} Z" fill="#bdbdbd"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

/** Нүүргүй дэвсгэр: саарал, ширээний сүүдэр, суурь, нүүрний сүүдэр (нүүр байх газар цагаан). */
export function StandBackground(): ReactElement {
  return (
    <div
      style={{
        width: PREVIEW,
        height: PREVIEW,
        display: "flex",
        position: "relative",
        background: "radial-gradient(circle at 50% 38%, #f1f1f1 0%, #e2e2e2 55%, #d4d4d4 100%)",
      }}
    >
      {/* Ширээн дээрх зөөлөн сүүдэр */}
      <div
        style={{
          position: "absolute",
          top: TOP + H + BASE_H - 30,
          left: LEFT - 170,
          width: W + 340,
          height: 120,
          display: "flex",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0) 70%)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={base()} width={W + BASE_SPREAD * 2} height={BASE_H + 10} style={{ position: "absolute", top: TOP + H - 2, left: LEFT - BASE_SPREAD }} alt="" />
      <div
        style={{
          position: "absolute",
          top: TOP,
          left: LEFT,
          width: W,
          height: H,
          display: "flex",
          borderRadius: RADIUS,
          background: "#ffffff",
          boxShadow: "0 28px 50px rgba(0,0,0,0.16), 0 4px 10px rgba(0,0,0,0.10)",
        }}
      />
    </div>
  );
}

const ROUND_MASK = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`,
);

/** Кэшлэсэн дэвсгэр дээр нүүрийг (R3.18 булантай) тавина. */
export async function composeStand(background: Buffer, face: Buffer): Promise<Buffer> {
  const small = await sharp(face)
    .resize(W, H, { kernel: "lanczos3" })
    .ensureAlpha()
    .composite([{ input: ROUND_MASK, blend: "dest-in" }])
    .png()
    .toBuffer();
  return sharp(background)
    .composite([{ input: small, top: TOP, left: LEFT }])
    .png({ compressionLevel: 6 })
    .toBuffer();
}
