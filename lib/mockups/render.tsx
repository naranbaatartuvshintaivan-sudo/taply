import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import sharp from "sharp";
import { DESIGN_KEYS, designSet, FACE_H, FACE_W, QR_MAX, type DesignKey, type FaceInput } from "./designs";
import { fonts } from "./fonts";
import type { PreparedLogo } from "./logo";
import { decodeQr, qrPng } from "./qr";
import { PREVIEW, Stand } from "./stand";

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

export type Platform = "fb" | "ig";
export type RenderedDesign = { key: DesignKey; platform: Platform; url: string; label: string; face: Buffer; preview: Buffer };

export class QrMismatchError extends Error {}

/** Өгсөн платформууд дарааллаар (FB, IG) — хувилбар бүрийн QR линк */
export function variants(fbUrl: string | null, igUrl: string | null): { platform: Platform; url: string }[] {
  const out: { platform: Platform; url: string }[] = [];
  if (fbUrl) out.push({ platform: "fb", url: fbUrl });
  if (igUrl) out.push({ platform: "ig", url: igUrl });
  if (out.length === 0) throw new Error("FB эсвэл IG линк байхгүй");
  return out;
}

const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

async function toPng(el: ReactElement, width: number, height: number): Promise<Buffer> {
  const res = new ImageResponse(el, { width, height, fonts: fonts() });
  const raw = Buffer.from(await res.arrayBuffer());
  return sharp(raw).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

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

  const set = designSet(input.set);
  const out: RenderedDesign[] = [];
  for (const key of DESIGN_KEYS) {
    const d = set[key];
    for (const { platform, url, qr } of qrs) {
      const face: FaceInput = { name: input.name, logo, qr: { src: dataUri(qr.png), size: qr.size }, platforms: [platform], brand: input.logo.brand };
      const facePng = await toPng(d.render(face), FACE_W, FACE_H);
      const preview = await toPng(<Stand face={dataUri(facePng)} />, PREVIEW, PREVIEW);
      // QR бүрийг яг тэр платформын линктэй тулгана
      for (const [what, img] of [["нүүр", facePng], ["танилцуулга", preview]] as const) {
        const got = await decodeQr(img, what === "нүүр" ? FACE_H : PREVIEW);
        if (got !== url) throw new QrMismatchError(`Загвар ${key}-${platform} (${what}): QR уншигдсангүй эсвэл линк таарахгүй`);
      }
      out.push({ key, platform, url, label: d.label, face: facePng, preview });
    }
  }
  return out;
}
