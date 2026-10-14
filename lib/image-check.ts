// Хэрэглэгчийн upload хийсэн логог шалгана. Цэвэр функц — unit test-тэй.
// Файлын нэр, браузерын зарласан MIME-д итгэхгүй: эхний байтууд (magic bytes)-аар төрлийг тогтооно.

export type LogoType = "image/png" | "image/jpeg" | "image/webp";

// Vercel serverless функцийн хүсэлтийн body дээд тал нь 4.5 MB тул form-ын бусад талбартай
// хамт багтаахаар 4 MB. (logos bucket өөрөө 5 MB хүлээн авна.)
export const LOGO_MAX_BYTES = 4 * 1024 * 1024;
export const LOGO_TOO_BIG = "Логоны хэмжээ 4 MB-аас бага байх ёстой. Зургаа жижигрүүлээд дахин оролдоно уу";

export const LOGO_EXT: Record<LogoType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Эхний байтуудаар PNG / JPEG / WEBP-г таньна. Бусад (SVG, GIF, HEIC, PDF…) → null. */
export function sniffImageType(b: Uint8Array): LogoType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  return null;
}

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

export type LogoCheck = { ok: true; type: LogoType } | { ok: false; message: string };

/** Хэмжээ, төрлийг шалгаад хэрэглэгчид ойлгомжтой монгол алдаа буцаана. */
export function checkLogo(bytes: Uint8Array, declaredType: string): LogoCheck {
  if (bytes.length === 0) return { ok: false, message: "Логоны файл хоосон байна" };
  if (bytes.length > LOGO_MAX_BYTES) return { ok: false, message: LOGO_TOO_BIG };
  if (declaredType === "image/svg+xml" || looksLikeSvg(bytes)) {
    return { ok: false, message: "SVG файл хүлээж авахгүй. PNG, JPG эсвэл WEBP илгээнэ үү" };
  }
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, message: "Логоны файл PNG, JPG эсвэл WEBP байх ёстой" };
  return { ok: true, type };
}

function looksLikeSvg(b: Uint8Array): boolean {
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}
