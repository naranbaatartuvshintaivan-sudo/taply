import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import sharp from "sharp";
import { DESIGN_KEYS, designSet, FACE_H, FACE_W, QR_MAX, type DesignKey, type FaceInput } from "./designs";
import { fonts } from "./fonts";
import type { PreparedLogo } from "./logo";
import { decodeQr, qrPng } from "./qr";
import { PREVIEW, Stand } from "./stand";

// 3 загварыг рендэрлээд QR бүрийг буцааж уншиж шалгана. Таарахгүй бол алдаа шиднэ —
// дуудагч тал (lib/custom-mockups.ts) status='failed' болгож, имэйл илгээхгүй.

export type RenderInput = {
  name: string;
  logo: PreparedLogo;
  fbUrl: string | null;
  igUrl: string | null;
  /** custom_requests.design_set — 1, 2, 3, … */
  set: number;
};

export type RenderedDesign = { key: DesignKey; label: string; face: Buffer; preview: Buffer };

export class QrMismatchError extends Error {}

/** QR-д орох линк: FB өгсөн бол FB, үгүй бол IG */
export const qrTarget = (fbUrl: string | null, igUrl: string | null) => {
  const url = fbUrl ?? igUrl;
  if (!url) throw new Error("FB эсвэл IG линк байхгүй");
  return url;
};

const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

async function toPng(el: ReactElement, width: number, height: number): Promise<Buffer> {
  const res = new ImageResponse(el, { width, height, fonts: fonts() });
  const raw = Buffer.from(await res.arrayBuffer());
  return sharp(raw).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

export async function renderDesigns(input: RenderInput): Promise<RenderedDesign[]> {
  const url = qrTarget(input.fbUrl, input.igUrl);
  const qr = await qrPng(url, QR_MAX);
  const face: FaceInput = {
    name: input.name,
    logo: {
      src: dataUri(input.logo.png),
      width: input.logo.width,
      height: input.logo.height,
      transparent: input.logo.transparent,
      lightness: input.logo.lightness,
    },
    qr: { src: dataUri(qr.png), size: qr.size },
    platforms: [...(input.fbUrl ? (["fb"] as const) : []), ...(input.igUrl ? (["ig"] as const) : [])],
    brand: input.logo.brand,
  };

  const set = designSet(input.set);
  const out: RenderedDesign[] = [];
  for (const key of DESIGN_KEYS) {
    const d = set[key];
    const facePng = await toPng(d.render(face), FACE_W, FACE_H);
    const preview = await toPng(<Stand face={dataUri(facePng)} />, PREVIEW, PREVIEW);
    for (const [what, img] of [["нүүр", facePng], ["танилцуулга", preview]] as const) {
      const got = await decodeQr(img, what === "нүүр" ? FACE_H : PREVIEW);
      if (got !== url) throw new QrMismatchError(`Загвар ${key} (${what}): QR уншигдсангүй эсвэл линк таарахгүй`);
    }
    out.push({ key, label: d.label, face: facePng, preview });
  }
  return out;
}
