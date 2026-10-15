// Хувилбар = өгсөн платформ бүр (FB, IG). Цэвэр функц — render болон төлбөрийн код хоёулаа ашиглана.

export type Platform = "fb" | "ig";

/** Өгсөн платформууд дарааллаар (FB, IG) — хувилбар бүрийн QR линк */
export function variants(fbUrl: string | null, igUrl: string | null): { platform: Platform; url: string }[] {
  const out: { platform: Platform; url: string }[] = [];
  if (fbUrl) out.push({ platform: "fb", url: fbUrl });
  if (igUrl) out.push({ platform: "ig", url: igUrl });
  if (out.length === 0) throw new Error("FB эсвэл IG линк байхгүй");
  return out;
}
