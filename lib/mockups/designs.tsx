import type { ReactElement } from "react";
import { contrast, hex, INK, mix, textOn, WHITE, type Rgb } from "./color";
import { facebookIcon, instagramIcon } from "./icons";

// Хэвлэх нүүр 1200×1400 px (120×140 мм, 10 px/мм). AI биш — бүгд код.
//
// Бүх загварт ижил: QR хавтан доод-төвд ИЖИЛ байрлал, ИЖИЛ хэмжээтэй (NFC чип QR квадратын
// доор наалддаг тул), дээр нь "Утсаа энд хүргээд дагаарай", доор нь "эсвэл QR уншуулна уу".
// Зөвхөн өгсөн платформын (FB/IG) дүрс. Англи үг огт байхгүй. Нэр бичсэнээр нь.
//
// Багц бүр 3 өөр БҮТЭЦ + typography. "Дахин үүсгэх" дарахад дараагийн багц руу шилжинэ.

export const FACE_W = 1200;
export const FACE_H = 1400;

/** QR модулиудын дээд хэмжээ (px) — бүх загварт ижил */
export const QR_MAX = 400;
const PLATE = 460;
const PLATE_TOP = 800;
const PLATE_LEFT = (FACE_W - PLATE) / 2;
const HEAD_TOP = 706;
const CAPTION_TOP = PLATE_TOP + PLATE + 22;
const UPPER_H = 690;

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

type Design = { label: string; render: (f: FaceInput) => ReactElement };

// ─── Туслах ─────────────────────────────────────────────────────

const STONE: Rgb = { r: 233, g: 228, b: 218 }; // хар/цагаан логотой үед брэндийн өнгөний оронд
const IVORY: Rgb = { r: 244, g: 238, b: 226 };
const CREAM: Rgb = { r: 246, g: 241, b: 231 };
const GOLD: Rgb = { r: 200, g: 167, b: 94 };
const NIGHT: Rgb = { r: 14, g: 14, b: 14 };

const brandOr = (f: FaceInput, fallback: Rgb) => f.brand ?? fallback;
/** Цагаан дэвсгэр дээр уншигдах брэндийн өнгө (бүдэг бол бараан болгоно) */
const brandInk = (f: FaceInput) => {
  const b = f.brand;
  if (!b) return INK;
  return contrast(b, WHITE) >= 3 ? b : mix(b, INK, 0.55);
};

const LINE_HEIGHT = 1.06;

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

/**
 * Нэрийн фонтын хэмжээ: width-д үгээр таслахад height-д багтах хамгийн том хэмжээ.
 * em = нэг тэмдэгтийн дундаж өргөн (фонтын хэмжээтэй харьцуулсан, кирилл том үсэгт нөөцтэй).
 */
export function fitSize(name: string, o: { max: number; min: number; width: number; height: number; em: number }): number {
  const longest = Math.max(...name.split(/\s+/).map((w) => [...w].length), 1);
  for (let size = o.max; size > o.min; size -= 2) {
    const perLine = Math.floor(o.width / (size * o.em));
    if (longest > perLine) continue;
    if (wrapLines(name, perLine) * size * LINE_HEIGHT <= o.height) return size;
  }
  return o.min;
}

/** Логог box-д багтаах хэмжээ (томруулахгүй биш — жижиг логог ч box-д тохируулна) */
function fit(logo: FaceInput["logo"], boxW: number, boxH: number) {
  const s = Math.min(boxW / logo.width, boxH / logo.height);
  return { width: Math.round(logo.width * s), height: Math.round(logo.height * s) };
}

function Logo({ f, boxW, boxH, tile, pad = 0, radius = 20 }: { f: FaceInput; boxW: number; boxH: number; tile?: Rgb | null; pad?: number; radius?: number }) {
  const size = fit(f.logo, boxW - pad * 2, boxH - pad * 2);
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={f.logo.src} width={size.width} height={size.height} alt="" />;
  if (!tile) return img;
  return (
    <div style={{ display: "flex", padding: pad, background: hex(tile), borderRadius: radius }}>{img}</div>
  );
}

/** Лого дэвсгэрээсээ ялгарахгүй бол ард нь хавтан тавина */
function logoTile(f: FaceInput, bg: Rgb, tile: Rgb): Rgb | null {
  if (!f.logo.transparent) return bg === WHITE ? null : tile; // цагаан дэвсгэртэй лого
  const logoIsLight = f.logo.lightness > 0.6;
  const bgIsLight = contrast(bg, WHITE) < contrast(bg, INK);
  return logoIsLight === bgIsLight ? tile : null;
}

function Icons({ f, color, on, size }: { f: FaceInput; color: Rgb; on: Rgb; size: number }) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {f.platforms.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p} src={p === "fb" ? facebookIcon(hex(color), hex(on)) : instagramIcon(hex(color))} width={size} height={size} alt="" />
      ))}
    </div>
  );
}

type BottomStyle = {
  font: string;
  headWeight: number;
  headSize: number;
  headColor: Rgb;
  iconColor: Rgb;
  iconOn: Rgb;
  plate: Rgb;
  plateBorder?: { color: Rgb; width: number };
  plateRadius: number;
  captionColor: Rgb;
  captionStyle?: "normal" | "italic";
};

/** Доод хэсэг — бүх загварт ижил байрлал */
function Bottom({ f, s }: { f: FaceInput; s: BottomStyle }) {
  const border = s.plateBorder;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: HEAD_TOP,
          left: 0,
          width: FACE_W,
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <Icons f={f} color={s.iconColor} on={s.iconOn} size={52} />
        <div style={{ fontFamily: s.font, fontWeight: s.headWeight, fontSize: s.headSize, color: hex(s.headColor), letterSpacing: -0.5 }}>
          {HEADLINE}
        </div>
      </div>
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
          background: hex(s.plate),
          borderRadius: s.plateRadius,
          ...(border ? { border: `${border.width}px solid ${hex(border.color)}` } : {}),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.qr.src} width={f.qr.size} height={f.qr.size} alt="" />
      </div>
      <div
        style={{
          position: "absolute",
          top: CAPTION_TOP,
          left: 0,
          width: FACE_W,
          display: "flex",
          justifyContent: "center",
          fontFamily: s.font,
          fontWeight: 500,
          fontStyle: s.captionStyle ?? "normal",
          fontSize: 32,
          color: hex(s.captionColor),
        }}
      >
        {CAPTION}
      </div>
    </>
  );
}

function Face({ bg, children }: { bg: Rgb; children: React.ReactNode }) {
  return (
    <div style={{ width: FACE_W, height: FACE_H, display: "flex", position: "relative", background: hex(bg) }}>{children}</div>
  );
}

function Upper({ children, align = "center", pad = 90, gap = 44 }: { children: React.ReactNode; align?: "center" | "flex-start"; pad?: number; gap?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: FACE_W,
        height: UPPER_H,
        padding: `${pad}px ${pad}px 40px`,
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        justifyContent: "center",
        gap,
      }}
    >
      {children}
    </div>
  );
}

function Name({ text, font, weight, size, color, style = "normal", align = "center", width }: { text: string; font: string; weight: number; size: number; color: Rgb; style?: "normal" | "italic"; align?: "center" | "left"; width: number }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        justifyContent: align === "center" ? "center" : "flex-start",
        textAlign: align,
        fontFamily: font,
        fontWeight: weight,
        fontStyle: style,
        fontSize: size,
        lineHeight: LINE_HEIGHT,
        letterSpacing: size > 80 ? -size * 0.025 : -1,
        color: hex(color),
      }}
    >
      {text}
    </div>
  );
}

// ─── Багц 1 ──────────────────────────────────────────────────────

const SET_1: Record<DesignKey, Design> = {
  // A — Минимал: цагаан дэвсгэр, лого дээр, нэр, голд QR
  A: {
    label: "Минимал",
    render: (f) => (
      <Face bg={WHITE}>
        <Upper>
          <Logo f={f} boxW={560} boxH={280} tile={logoTile(f, WHITE, INK)} pad={logoTile(f, WHITE, INK) ? 28 : 0} />
          <Name text={f.name} font="Manrope" weight={800} size={fitSize(f.name, { max: 96, min: 40, width: 1000, height: 230, em: 0.66 })} color={INK} width={1000} />
        </Upper>
        <Bottom
          f={f}
          s={{
            font: "Manrope", headWeight: 700, headSize: 40, headColor: INK, iconColor: INK, iconOn: WHITE,
            plate: WHITE, plateBorder: { color: { r: 225, g: 225, b: 225 }, width: 2 }, plateRadius: 28, captionColor: { r: 107, g: 107, b: 107 },
          }}
        />
      </Face>
    ),
  },
  // B — Брэндийн өнгө: логоны өнгөний дэвсгэр, том нэр, цагаан хавтан дээр QR
  B: {
    label: "Брэндийн өнгө",
    render: (f) => {
      const bg = brandOr(f, STONE);
      const fg = textOn(bg);
      return (
        <Face bg={bg}>
          <Upper gap={40}>
            <Logo f={f} boxW={440} boxH={250} tile={WHITE} pad={34} radius={36} />
            <Name text={f.name} font="Manrope" weight={800} size={fitSize(f.name, { max: 116, min: 40, width: 1020, height: 260, em: 0.66 })} color={fg} width={1020} />
          </Upper>
          <Bottom
            f={f}
            s={{ font: "Manrope", headWeight: 700, headSize: 40, headColor: fg, iconColor: fg, iconOn: bg, plate: WHITE, plateRadius: 36, captionColor: fg }}
          />
        </Face>
      );
    },
  },
  // C — Premium хар: хар дэвсгэр, serif, нимгэн алтлаг хүрээ
  C: {
    label: "Premium хар",
    render: (f) => {
      const tile = logoTile(f, NIGHT, IVORY);
      return (
        <Face bg={NIGHT}>
          <div style={{ position: "absolute", top: 36, left: 36, width: FACE_W - 72, height: FACE_H - 72, border: `2px solid ${hex(GOLD)}`, display: "flex" }} />
          <div style={{ position: "absolute", top: 50, left: 50, width: FACE_W - 100, height: FACE_H - 100, border: `1px solid ${hex(mix(GOLD, NIGHT, 0.45))}`, display: "flex" }} />
          <Upper gap={36}>
            <Logo f={f} boxW={460} boxH={250} tile={tile} pad={tile ? 30 : 0} radius={6} />
            <div style={{ display: "flex", width: 120, height: 2, background: hex(GOLD) }} />
            <Name text={f.name} font="Playfair" weight={700} size={fitSize(f.name, { max: 96, min: 40, width: 980, height: 220, em: 0.62 })} color={IVORY} width={980} />
          </Upper>
          <Bottom
            f={f}
            s={{
              font: "Playfair", headWeight: 400, headSize: 42, headColor: IVORY, iconColor: GOLD, iconOn: NIGHT,
              plate: IVORY, plateBorder: { color: GOLD, width: 2 }, plateRadius: 6, captionColor: GOLD,
            }}
          />
        </Face>
      );
    },
  },
};

// ─── Багц 2 ──────────────────────────────────────────────────────

const SET_2: Record<DesignKey, Design> = {
  // A — Хуваасан: дээд хэсэг брэндийн өнгө, нэр зүүн тийш, доод хэсэг цагаан
  A: {
    label: "Хуваасан",
    render: (f) => {
      const band = brandOr(f, INK);
      const fg = textOn(band);
      const tile = logoTile(f, band, WHITE);
      return (
        <Face bg={WHITE}>
          <div style={{ position: "absolute", top: 0, left: 0, width: FACE_W, height: 650, background: hex(band), display: "flex" }} />
          <Upper align="flex-start" pad={90} gap={48}>
            <Logo f={f} boxW={380} boxH={220} tile={tile} pad={tile ? 26 : 0} radius={14} />
            <Name text={f.name} font="Inter" weight={800} size={fitSize(f.name, { max: 124, min: 40, width: 1020, height: 280, em: 0.7 })} color={fg} align="left" width={1020} />
          </Upper>
          <Bottom
            f={f}
            s={{
              font: "Inter", headWeight: 500, headSize: 38, headColor: INK, iconColor: brandInk(f), iconOn: WHITE,
              plate: WHITE, plateBorder: { color: { r: 225, g: 225, b: 225 }, width: 2 }, plateRadius: 14, captionColor: { r: 107, g: 107, b: 107 },
            }}
          />
        </Face>
      );
    },
  },
  // B — Хүрээ: цөцгий өнгө, брэндийн өнгөний зузаан хүрээ, налуу serif нэр, лого дугуйд
  B: {
    label: "Хүрээтэй",
    render: (f) => {
      const frame = f.brand ? brandInk(f) : INK;
      return (
        <Face bg={CREAM}>
          <div style={{ position: "absolute", top: 34, left: 34, width: FACE_W - 68, height: FACE_H - 68, border: `16px solid ${hex(frame)}`, borderRadius: 26, display: "flex" }} />
          <Upper gap={34}>
            <div style={{ display: "flex", width: 300, height: 300, borderRadius: 150, background: hex(f.logo.transparent && f.logo.lightness > 0.6 ? frame : WHITE), alignItems: "center", justifyContent: "center", border: `3px solid ${hex(frame)}` }}>
              <Logo f={f} boxW={200} boxH={170} />
            </div>
            <Name text={f.name} font="Lora" weight={500} style="italic" size={fitSize(f.name, { max: 100, min: 40, width: 960, height: 210, em: 0.56 })} color={INK} width={960} />
          </Upper>
          <Bottom
            f={f}
            s={{
              font: "Lora", headWeight: 500, headSize: 40, headColor: INK, iconColor: frame, iconOn: CREAM,
              plate: WHITE, plateRadius: 20, captionColor: frame, captionStyle: "italic",
            }}
          />
        </Face>
      );
    },
  },
  // C — Нэр голлосон: том нэр зүүн тийш брэндийн өнгөөр, жижиг лого, нимгэн зураас
  C: {
    label: "Нэр голлосон",
    render: (f) => {
      const ink = brandInk(f);
      return (
        <Face bg={WHITE}>
          <Upper align="flex-start" pad={90} gap={30}>
            <Logo f={f} boxW={240} boxH={130} tile={logoTile(f, WHITE, INK)} pad={logoTile(f, WHITE, INK) ? 18 : 0} radius={10} />
            <Name text={f.name} font="Inter" weight={800} size={fitSize(f.name, { max: 156, min: 40, width: 1020, height: 370, em: 0.7 })} color={ink} align="left" width={1020} />
          </Upper>
          <div style={{ position: "absolute", top: UPPER_H - 6, left: 90, width: FACE_W - 180, height: 3, background: hex(INK), display: "flex" }} />
          <Bottom
            f={f}
            s={{
              font: "Inter", headWeight: 800, headSize: 38, headColor: INK, iconColor: ink, iconOn: WHITE,
              plate: WHITE, plateBorder: { color: ink, width: 6 }, plateRadius: 0, captionColor: INK,
            }}
          />
        </Face>
      );
    },
  },
};

export const DESIGN_SETS = [SET_1, SET_2];

/** design_set (1, 2, 3, …) → багц. Дахин үүсгэх бүрт дараагийн багц, дуусвал эхнээсээ. */
export const designSet = (n: number) => DESIGN_SETS[(Math.max(1, n) - 1) % DESIGN_SETS.length];
