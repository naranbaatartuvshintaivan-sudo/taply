import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import sharp from "sharp";
import { cleanName, DESIGN_KEYS, designSet, FACE_H, FACE_W, QR_MAX, type DesignKey, type FaceInput } from "./designs";
import { fonts } from "./fonts";
import type { PreparedLogo } from "./logo";
import { decodeQr, qrPng } from "./qr";
import { composeStand, PREVIEW, StandBackground } from "./stand";
import { variants, type Platform } from "./variants";

export { variants, type Platform };

// 3 загварыг платформ бүрээр (FB, IG — өгсөн нь) рендэрлээд QR бүрийг буцааж уншиж шалгана.
// FB+IG хоёулаа бол загвар бүр 2 хувилбартай: бүтэц ижил, зөвхөн дүрс + QR өөр.
// QR таарахгүй бол алдаа шиднэ — дуудагч тал (lib/custom-mockups.ts) status='failed' болгож, имэйл илгээхгүй.

export type RenderInput = {
  name: string;
  logo: PreparedLogo;
  fbUrl: string | null;
  igUrl: string | null;
  /** custom_requests.design_set — 1, 2, 3, … */
  set: number;
};

export type RenderedDesign = { key: DesignKey; platform: Platform; url: string; label: string; face: Buffer; preview: Buffer };

export class QrMismatchError extends Error {}


const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

async function toPng(el: ReactElement, width: number, height: number): Promise<Buffer> {
  const res = new ImageResponse(el, { width, height, fonts: fonts() });
  const raw = Buffer.from(await res.arrayBuffer());
  return sharp(raw).png({ compressionLevel: 6 }).toBuffer();
}

// Стендийн дэвсгэр өөрчлөгддөггүй — instance тус бүрд нэг л удаа зурна
let standBg: Promise<Buffer> | null = null;
const standBackground = () => (standBg ??= toPng(<StandBackground />, PREVIEW, PREVIEW).catch((e) => ((standBg = null), Promise.reject(e))));

// QR унших хэмжээ: нүүр 1000px (QR ≈ 330px), танилцуулга 1100px (QR ≈ 200px) — хангалттай, хурдан
const DECODE_FACE = 1000;
const DECODE_PREVIEW = 1100;

export async function renderDesigns(input: RenderInput): Promise<RenderedDesign[]> {
  const logo: FaceInput["logo"] = {
    src: dataUri(input.logo.png),
    width: input.logo.width,
    height: input.logo.height,
    transparent: input.logo.transparent,
    lightness: input.logo.lightness,
  };
  const qrs = await Promise.all(
    variants(input.fbUrl, input.igUrl).map(async (v) => ({ ...v, qr: await qrPng(v.url, QR_MAX) })),
  );

  // Emoji-г хасна (фонтууд дэмждэггүй); бусад тэмдэгт бичсэнээр нь
  const name = cleanName(input.name);
  const set = designSet(input.set);
  const bg = await standBackground();
  // Хувилбар бүрийг зэрэг: satori (JS) ажиллах зуур sharp (libuv thread) нь өмнөхийг боловсруулна
  const jobs = DESIGN_KEYS.flatMap((key) =>
    qrs.map(async ({ platform, url, qr }): Promise<RenderedDesign> => {
      const d = set[key];
      const face: FaceInput = { name, logo, qr: { src: dataUri(qr.png), size: qr.size }, platforms: [platform], brand: input.logo.brand };
      const facePng = await toPng(d.render(face), FACE_W, FACE_H);
      const preview = await composeStand(bg, facePng);
      // QR бүрийг яг тэр платформын линктэй тулгана
      for (const [what, img, side] of [["нүүр", facePng, DECODE_FACE], ["танилцуулга", preview, DECODE_PREVIEW]] as const) {
        const got = await decodeQr(img, side);
        if (got !== url) throw new QrMismatchError(`Загвар ${key}-${platform} (${what}): QR уншигдсангүй эсвэл линк таарахгүй`);
      }
      return { key, platform, url, label: d.label, face: facePng, preview };
    }),
  );
  return Promise.all(jobs);
}
