import type { CSSProperties, ReactElement, ReactNode } from "react";
import { contrast, hex, INK, mix, WHITE, type Rgb } from "../color";
import { facebookIcon, instagramIcon } from "../icons";

// Хэвлэх нүүр 1200×1400 px = 120×140 мм (10 px = 1 мм). AI биш — бүгд код.
//
// Бүх загварт ИЖИЛ: QR хавтан доод-төвд нэг байрлал, нэг хэмжээ (NFC чип QR квадратын доор
// наалддаг), доор нь "эсвэл QR уншуулна уу". Уриалга ≈5 мм (14pt), платформын дүрс ≥10 мм,
// доод бичвэр ≥3 мм. Зөвхөн тухайн хувилбарын платформын (FB эсвэл IG) дүрс. Англи үг байхгүй.

export const FACE_W = 1200;
export const FACE_H = 1400;
export const MM = 10; // px / мм

/** QR модулиудын дээд хэмжээ (px) — бүх загварт ижил, Шат 2-ын эхний хувилбараас багасаагүй */
export const QR_MAX = 400;
export const PLATE = 460;
export const PLATE_TOP = 800;
export const PLATE_LEFT = (FACE_W - PLATE) / 2;
export const CAPTION_TOP = PLATE_TOP + PLATE + 16;

/** Уриалгын мөр 50px = 5 мм (≈14pt) */
export const HEAD_SIZE = 50;
/** Платформын дүрс 104px = 10.4 мм */
export const ICON = 104;
/** "эсвэл QR уншуулна уу" 34px = 3.4 мм (≈9pt) */
export const CAPTION_SIZE = 34;
/** Дүрс + уриалгын мөр QR хавтангийн яг дээр */
export const ROW_TOP = PLATE_TOP - ICON - 22;

export const HEADLINE = "Утсаа энд хүргээд дагаарай";
export const CAPTION = "эсвэл QR уншуулна уу";

export type FaceInput = {
  name: string;
  logo: { src: string; width: number; height: number; transparent: boolean; lightness: number };
  qr: { src: string; size: number };
  platforms: ("fb" | "ig")[];
  /** Логоны брэндийн өнгө; хар/цагаан лого бол null */
  brand: Rgb | null;
};

export type DesignKey = "A" | "B" | "C";
export const DESIGN_KEYS: DesignKey[] = ["A", "B", "C"];
export type Design = { label: string; render: (f: FaceInput) => ReactElement };

// ─── Өнгө ───────────────────────────────────────────────────────

export const STONE: Rgb = { r: 233, g: 228, b: 218 }; // хар/цагаан логотой үед брэндийн өнгөний оронд
export const IVORY: Rgb = { r: 244, g: 238, b: 226 };
export const CREAM: Rgb = { r: 246, g: 241, b: 231 };
export const GOLD: Rgb = { r: 200, g: 167, b: 94 };
export const NIGHT: Rgb = { r: 14, g: 14, b: 14 };
export const RULE: Rgb = { r: 222, g: 222, b: 222 };
export const MUTE: Rgb = { r: 96, g: 96, b: 96 };

export const brandOr = (f: FaceInput, fallback: Rgb) => f.brand ?? fallback;
/** Цагаан/цайвар дэвсгэр дээр уншигдах брэндийн өнгө (бүдэг бол бараан болгоно) */
export const brandInk = (f: FaceInput) => {
  const b = f.brand;
  if (!b) return INK;
  return contrast(b, WHITE) >= 3 ? b : mix(b, INK, 0.55);
};

// ─── Нэр ────────────────────────────────────────────────────────

/** Нэрээс emoji-г хасна (фонтууд дэмждэггүй), илүү зайг цэгцэлнэ. Бусад тэмдэгт хэвээр. */
export function cleanName(name: string): string {
  return name
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|[‍︎️⃣]|[\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const LINE_HEIGHT = 1.08;

/** Үгээр мөр таслах (тэмдэгтийн тоогоор ойролцоо) — satori-гийн таслалттай ойролцоо */
export function wrapLines(text: string, charsPerLine: number): number {
  let lines = 1;
  let used = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const n = [...w].length;
    if (used === 0) used = n;
    else if (used + 1 + n <= charsPerLine) used += 1 + n;
    else {
      lines++;
      used = n;
    }
  }
  return lines;
}

export type FitOpts = {
  max: number;
  min: number;
  width: number;
  /** Нэг тэмдэгтийн дундаж өргөн (фонтын хэмжээтэй харьцуулсан), кирилл том үсэгт нөөцтэй */
  em: number;
  /** Үсэг хоорондын нэмэлт зай (em-ээр) */
  tracking?: number;
  maxLines?: number;
  height?: number;
};

/** width-д үгээр таслахад maxLines (≤2) мөр, height-д багтах хамгийн том хэмжээ. */
export function fitSize(name: string, o: FitOpts): number {
  const per = o.em + (o.tracking ?? 0);
  const maxLines = o.maxLines ?? 2;
  const longest = Math.max(...name.split(/\s+/).map((w) => [...w].length), 1);
  for (let size = o.max; size > o.min; size -= 2) {
    const perLine = Math.floor(o.width / (size * per));
    if (longest > perLine) continue;
    const lines = wrapLines(name, perLine);
    if (lines <= maxLines && (o.height === undefined || lines * size * LINE_HEIGHT <= o.height)) return size;
  }
  return o.min;
}

export function Name({
  text,
  font,
  weight,
  size,
  color,
  width,
  italic = false,
  align = "center",
  tracking = 0,
  style,
}: {
  text: string;
  font: string;
  weight: number;
  size: number;
  color: Rgb;
  width: number;
  italic?: boolean;
  align?: "center" | "left";
  tracking?: number;
  style?: CSSProperties;
}) {
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        width,
        justifyContent: align === "center" ? "center" : "flex-start",
        textAlign: align,
        fontFamily: font,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize: size,
        lineHeight: LINE_HEIGHT,
        letterSpacing: tracking ? size * tracking : size > 80 ? -size * 0.025 : -0.5,
        color: hex(color),
        ...style,
      }}
    >
      {text}
    </div>
  );
}

// ─── Лого ───────────────────────────────────────────────────────

export const logoAspect = (f: FaceInput) => f.logo.width / f.logo.height;

/**
 * Логоны хэмжээ: box-д бүтэн багтана (тайрагдахгүй), мөн талбайгаар нь тэнцүүлнэ — өргөн
 * wordmark (4:1) хэт том, босоо (1:2) лого хэт жижиг болохгүй. area нь зорилтот талбай (px²).
 */
export function fitLogo(f: FaceInput, maxW: number, maxH: number, area = maxW * maxH * 0.55) {
  const { width: w, height: h } = f.logo;
  const s = Math.min(maxW / w, maxH / h, Math.sqrt(area / (w * h)));
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}

/** Лого дэвсгэрээсээ ялгарахгүй бол ард нь хавтан тавина (null = шууд) */
export function logoTile(f: FaceInput, bg: Rgb, tile: Rgb): Rgb | null {
  const bgIsLight = contrast(bg, WHITE) < contrast(bg, INK);
  if (!f.logo.transparent) return bgIsLight && contrast(bg, WHITE) < 1.15 ? null : tile; // цагаан дэвсгэртэй лого
  const logoIsLight = f.logo.lightness > 0.6;
  return logoIsLight === bgIsLight ? tile : null;
}

export function LogoImg({ f, maxW, maxH, area }: { f: FaceInput; maxW: number; maxH: number; area?: number }) {
  const s = fitLogo(f, maxW, maxH, area);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={f.logo.src} width={s.width} height={s.height} alt="" />;
}

export function Logo({ f, maxW, maxH, area, tile, pad = 0, radius = 18 }: { f: FaceInput; maxW: number; maxH: number; area?: number; tile?: Rgb | null; pad?: number; radius?: number }) {
  if (!tile) return <LogoImg f={f} maxW={maxW} maxH={maxH} area={area} />;
  return (
    <div style={{ display: "flex", padding: pad, background: hex(tile), borderRadius: radius }}>
      <LogoImg f={f} maxW={maxW - pad * 2} maxH={maxH - pad * 2} area={area} />
    </div>
  );
}

/**
 * Лого цагаан "чип" дотор: дөрвөлжин/босоо лого → дугуй, өргөн (wordmark) → бөөрөнхий зууван.
 * Ингэснээр өргөн лого дугуйд шахагдаж жижгэрэхгүй.
 */
export function LogoChip({ f, size, bg = WHITE, ring }: { f: FaceInput; size: number; bg?: Rgb; ring?: { color: Rgb; width: number } }) {
  const wide = logoAspect(f) >= 1.7;
  const w = wide ? Math.round(size * 2.3) : size;
  const h = size;
  // Босоо лого дугуйд хэт жижгэрэхгүй — дотоод зайг багасгана
  const pad = wide ? size * 0.2 : logoAspect(f) < 0.8 ? size * 0.12 : size * 0.18;
  return (
    <div
      style={{
        display: "flex",
        width: w,
        height: h,
        borderRadius: h / 2,
        background: hex(bg),
        alignItems: "center",
        justifyContent: "center",
        ...(ring ? { border: `${ring.width}px solid ${hex(ring.color)}` } : {}),
      }}
    >
      <LogoImg f={f} maxW={w - pad * 2 - (wide ? h * 0.3 : 0)} maxH={h - pad * 2} area={(w - pad * 2) * (h - pad * 2)} />
    </div>
  );
}

// ─── Дүрс, уриалга, QR ──────────────────────────────────────────

export function PlatformIcon({ f, color, on, size }: { f: FaceInput; color: Rgb; on: Rgb; size: number }) {
  const p = f.platforms[0] ?? "fb";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p === "fb" ? facebookIcon(hex(color), hex(on)) : instagramIcon(hex(color))} width={size} height={size} alt="" />;
}

/** Дүрс + "Утсаа энд хүргээд дагаарай" — QR хавтангийн яг дээр */
export function CtaRow({
  f,
  font,
  weight,
  color,
  iconColor,
  iconOn,
  italic = false,
  size = HEAD_SIZE,
  align = "center",
  left = 0,
  width = FACE_W,
}: {
  f: FaceInput;
  font: string;
  weight: number;
  color: Rgb;
  iconColor: Rgb;
  iconOn: Rgb;
  italic?: boolean;
  size?: number;
  align?: "center" | "left";
  left?: number;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: ROW_TOP,
        left,
        width,
        height: ICON,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: 22,
      }}
    >
      <PlatformIcon f={f} color={iconColor} on={iconOn} size={ICON} />
      <div style={{ display: "flex", fontFamily: font, fontWeight: weight, fontStyle: italic ? "italic" : "normal", fontSize: size, color: hex(color), letterSpacing: -0.5, whiteSpace: "nowrap" }}>
        {HEADLINE}
      </div>
    </div>
  );
}

export function QrPlate({ f, bg, border, radius = 0 }: { f: FaceInput; bg: Rgb; border?: { color: Rgb; width: number }; radius?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: PLATE_TOP,
        left: PLATE_LEFT,
        width: PLATE,
        height: PLATE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hex(bg),
        borderRadius: radius,
        ...(border ? { border: `${border.width}px solid ${hex(border.color)}` } : {}),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.qr.src} width={f.qr.size} height={f.qr.size} alt="" />
    </div>
  );
}

export function Caption({ font, color, italic = false, weight = 500 }: { font: string; color: Rgb; italic?: boolean; weight?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: CAPTION_TOP,
        left: 0,
        width: FACE_W,
        display: "flex",
        justifyContent: "center",
        fontFamily: font,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize: CAPTION_SIZE,
        color: hex(color),
      }}
    >
      {CAPTION}
    </div>
  );
}

// ─── Байрлал ────────────────────────────────────────────────────

export function Face({ bg, children }: { bg: Rgb; children: ReactNode }) {
  return (
    <div style={{ width: FACE_W, height: FACE_H, display: "flex", position: "relative", overflow: "hidden", background: hex(bg) }}>
      {children}
    </div>
  );
}

/** Үнэмлэхүй байрлалтай flex хайрцаг */
export function Abs({
  top,
  left = 0,
  width = FACE_W,
  height,
  dir = "column",
  align = "center",
  justify = "center",
  gap = 0,
  style,
  children,
}: {
  top: number;
  left?: number;
  width?: number;
  height: number;
  dir?: "row" | "column";
  align?: "center" | "flex-start" | "flex-end";
  justify?: "center" | "flex-start" | "flex-end" | "space-between";
  gap?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", top, left, width, height, display: "flex", flexDirection: dir, alignItems: align, justifyContent: justify, gap, ...style }}>
      {children}
    </div>
  );
}

export const Rect = ({ top, left, width, height, color, style }: { top: number; left: number; width: number; height: number; color: Rgb; style?: CSSProperties }) => (
  <div style={{ position: "absolute", top, left, width, height, background: hex(color), display: "flex", ...style }} />
);

export { contrast, hex, INK, mix, WHITE };
export type { Rgb };
