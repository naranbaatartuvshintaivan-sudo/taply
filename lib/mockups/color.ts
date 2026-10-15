// Өнгөний жижиг туслах функцууд. Цэвэр — unit test-тэй.

export type Rgb = { r: number; g: number; b: number };

export const hex = ({ r, g, b }: Rgb) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export function parseHex(s: string): Rgb {
  const m = s.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error(`hex өнгө биш: ${s}`);
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/** WCAG харьцангуй гэрэлтэлт 0..1 */
export function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio 1..21 */
export function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 };
export const INK: Rgb = { r: 10, g: 10, b: 10 };

/** Дэвсгэр дээр уншигдах бичвэрийн өнгө — цагаан эсвэл бараан. */
export const textOn = (bg: Rgb): Rgb => (contrast(bg, WHITE) >= contrast(bg, INK) ? WHITE : INK);

export function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Хоёр өнгийг холино: t=0 → a, t=1 → b */
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
});

/**
 * Логоны RGBA пикселээс брэндийн өнгө: тунгалаг, бараг цагаан, бараг хар,
 * саарал пикселийг алгасаад хамгийн их давтагдсан өнгөний бүлгийн дундаж.
 * Өнгөт пиксел бараг байхгүй (хар/цагаан лого) бол null.
 */
export function brandColorFromPixels(rgba: Uint8Array | Buffer, minShare = 0.02): Rgb | null {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  let opaque = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    opaque++;
    const p = { r: rgba[i], g: rgba[i + 1], b: rgba[i + 2] };
    const max = Math.max(p.r, p.g, p.b);
    if (max < 40 || saturation(p) < 0.25 || (max > 235 && saturation(p) < 0.4)) continue;
    const key = ((p.r >> 4) << 8) | ((p.g >> 4) << 4) | (p.b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += p.r;
    bin.g += p.g;
    bin.b += p.b;
    bins.set(key, bin);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const bin of bins.values()) if (!best || bin.n > best.n) best = bin;
  if (!best || opaque === 0 || best.n / opaque < minShare) return null;
  return { r: Math.round(best.r / best.n), g: Math.round(best.g / best.n), b: Math.round(best.b / best.n) };
}

/** Тунгалаг биш пикселийн дундаж гэрэлтэлт 0..1 (лого цайвар уу, бараан уу) */
export function meanLuminance(rgba: Uint8Array | Buffer): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    sum += luminance({ r: rgba[i], g: rgba[i + 1], b: rgba[i + 2] });
    n++;
  }
  return n === 0 ? 0 : sum / n;
}
