import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { contrast } from "./color";
import { cleanName, designSet, fitLogo, fitSize, wrapLines, type FaceInput } from "./designs";
import { CAP_RATIO, CAPTION_SIZE, CTA_BIG, ICON, ICON_BIG, LIGHT_GOLD, MM, NIGHT, QR_MAX } from "./designs/common";
import { prepareLogo } from "./logo";
import { decodeQr } from "./qr";
import { renderDesigns, variants } from "./render";

// MOCKUP_SAMPLES=<хавтас> тохируулбал жишээ зургуудыг тэнд хадгална (нүдээр шалгахад).
const SAMPLES = process.env.MOCKUP_SAMPLES;

const svg = (body: string, w: number, h: number) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

// Өргөн wordmark 4:1 — тунгалаг, улаан
const wideLogo = () =>
  sharp(svg(`<rect x="0" y="40" width="160" height="160" rx="30" fill="#d62828"/><rect x="200" y="70" width="560" height="100" rx="12" fill="#d62828"/>`, 800, 240)).png().toBuffer();
// Босоо 1:2 — цагаан дэвсгэртэй JPG, ногоон
const tallLogo = () =>
  sharp(svg(`<rect width="300" height="600" fill="#ffffff"/><circle cx="150" cy="150" r="110" fill="#2a9d8f"/><rect x="60" y="300" width="180" height="270" rx="20" fill="#264653"/>`, 300, 600))
    .jpeg({ quality: 90 })
    .toBuffer();
// Дөрвөлжин — тунгалаг, хар/цагаан (брэндийн өнгөгүй)
const squareLogo = () =>
  sharp(svg(`<path d="M40 460 L250 40 L460 460 Z" fill="#111111"/><circle cx="250" cy="330" r="70" fill="#ffffff"/>`, 500, 500)).png().toBuffer();

const FB = "https://www.facebook.com/taply.test";
const IG = "https://www.instagram.com/taply.test/";

const CASES = [
  { id: "wide", logo: wideLogo, name: "🧪 ТЕСТ Лого" },
  { id: "tall", logo: tallLogo, name: "Сүү & Кофе" },
  { id: "square", logo: squareLogo, name: "Улаанбаатар Цэцэг Чимэглэлийн Төв ХХК" },
];

describe("prepareLogo", () => {
  it("өргөн тунгалаг PNG: trim, брэнд улаан", async () => {
    const l = await prepareLogo(await wideLogo());
    expect(l.transparent).toBe(true);
    expect(l.width / l.height).toBeGreaterThan(3);
    expect(l.brand && l.brand.r > 150 && l.brand.g < 80).toBe(true);
  });
  it("цагаан дэвсгэртэй JPG: тунгалаг биш, ≤800px", async () => {
    const big = await sharp(await tallLogo()).resize(1200).jpeg().toBuffer();
    const l = await prepareLogo(big);
    expect(l.transparent).toBe(false);
    expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(800);
  });
  it("хар лого: брэндийн өнгөгүй, бараан", async () => {
    const l = await prepareLogo(await squareLogo());
    expect(l.brand).toBeNull();
    expect(l.lightness).toBeLessThan(0.3);
  });
});

describe("cleanName", () => {
  it("emoji, ZWJ, тугийг хасна, бусдыг хэвээр", () => {
    expect(cleanName("🧪 ТЕСТ Лого")).toBe("ТЕСТ Лого");
    expect(cleanName("Кофе ☕️ & Ко 👩‍👩‍👧 🇲🇳")).toBe("Кофе & Ко");
    expect(cleanName("Номин-2 (Төв)")).toBe("Номин-2 (Төв)");
  });
});

describe("fitSize", () => {
  const o = { max: 92, min: 40, width: 1000, em: 0.66, height: 170 };
  it("богино нэр max, урт нэр багасна, min-ээс доош орохгүй", () => {
    expect(fitSize("Номин", o)).toBe(92);
    expect(fitSize("Улаанбаатар Цэцэг Чимэглэлийн Төв ХХК", o)).toBeLessThan(92);
    expect(fitSize("А".repeat(200), o)).toBe(40);
  });
  it("урт нэр 2 мөрөөс хэтрэхгүй, өндөрт багтана", () => {
    const name = "Улаанбаатар Цэцэг Чимэглэлийн Төв ХХК";
    const size = fitSize(name, o);
    const lines = wrapLines(name, Math.floor(o.width / (size * o.em)));
    expect(lines).toBeLessThanOrEqual(2);
    expect(lines * size * 1.08).toBeLessThanOrEqual(o.height);
  });
});

describe("fitLogo", () => {
  const face = (w: number, h: number) => ({ logo: { width: w, height: h } }) as FaceInput;
  it("ямар ч харьцаа box-оос гарахгүй (тайрагдахгүй), хэт жижиг болохгүй", () => {
    for (const [w, h] of [[800, 200], [300, 600], [500, 500]]) {
      const s = fitLogo(face(w, h), 860, 360, 860 * 360 * 0.42);
      expect(s.width).toBeLessThanOrEqual(860);
      expect(s.height).toBeLessThanOrEqual(360);
      expect(s.width * s.height).toBeGreaterThan(860 * 360 * 0.14); // box-ийн 14%-иас бага биш
      expect(Math.abs(s.width / s.height - w / h)).toBeLessThan(0.05); // харьцаа хэвээр
    }
  });
});

describe("variants", () => {
  it("өгсөн платформ бүр нэг хувилбар (FB, IG дарааллаар)", () => {
    expect(variants("f", "i")).toEqual([{ platform: "fb", url: "f" }, { platform: "ig", url: "i" }]);
    expect(variants(null, "i")).toEqual([{ platform: "ig", url: "i" }]);
    expect(() => variants(null, null)).toThrow();
  });
});

describe("designSet", () => {
  it("3 багц эргэлдэнэ, нэр монголоор", () => {
    expect(designSet(1).A.label).toBe("Минимал");
    expect(designSet(1).B.label).toBe("Уриалга эхэнд");
    expect(designSet(1).C.label).toBe("Премиум хар");
    expect(designSet(4)).toBe(designSet(1));
    expect(new Set([1, 2, 3].map((n) => designSet(n).A.label)).size).toBe(3);
    for (const n of [1, 2, 3]) for (const k of ["A", "B", "C"] as const) expect(designSet(n)[k].label).not.toMatch(/[A-Za-z]/);
  });
});

describe("renderDesigns", () => {
  for (const set of [1, 2, 3]) {
    for (const c of CASES) {
      it(`багц ${set} · ${c.id}: 3 загвар × FB/IG = 6, хэмжээ зөв, QR тухайн платформын линк`, async () => {
        const logo = await prepareLogo(await c.logo());
        const out = await renderDesigns({ name: c.name, logo, fbUrl: FB, igUrl: IG, set });
        expect(out.map((d) => `${d.key}-${d.platform}`)).toEqual(["A-fb", "A-ig", "B-fb", "B-ig", "C-fb", "C-ig"]);
        for (const d of out) {
          const fm = await sharp(d.face).metadata();
          expect([fm.width, fm.height]).toEqual([1200, 1400]);
          const pm = await sharp(d.preview).metadata();
          expect([pm.width, pm.height]).toEqual([1600, 1600]);
          expect(await decodeQr(d.face)).toBe(d.platform === "fb" ? FB : IG);
          if (SAMPLES) {
            mkdirSync(SAMPLES, { recursive: true });
            writeFileSync(path.join(SAMPLES, `s${set}-${c.id}-${d.key}-${d.platform}-face.png`), d.face);
            writeFileSync(path.join(SAMPLES, `s${set}-${c.id}-${d.key}-${d.platform}-stand.png`), d.preview);
          }
        }
        expect(new Set(out.map((d) => d.face.toString("base64"))).size).toBe(out.length);
      }, 120_000);
    }
  }
});

describe("хэвлэх хэмжээ (120×140 мм, 10 px = 1 мм)", () => {
  it("том уриалга: том үсэг ≥5 мм, дүрс ≥10 мм; доод бичвэр ≥3 мм; QR ≥37 мм", () => {
    expect(CTA_BIG * CAP_RATIO).toBeGreaterThanOrEqual(5 * MM);
    expect(ICON_BIG).toBeGreaterThanOrEqual(10 * MM);
    expect(ICON).toBeGreaterThanOrEqual(10 * MM);
    expect(CAPTION_SIZE * CAP_RATIO).toBeGreaterThanOrEqual(3 * MM);
    expect(QR_MAX).toBeGreaterThanOrEqual(400);
  });
  it("Премиум хар: цайвар алтан уриалга хар дээр ≥7:1", () => {
    expect(contrast(LIGHT_GOLD, NIGHT)).toBeGreaterThanOrEqual(7);
  });
  it("өргөн лого (4:1) A, C дээр стендийн өргөний ~70% хүрнэ, өндөр хязгаартай", () => {
    const wide = fitLogo({ logo: { width: 800, height: 200 } } as FaceInput, 840, 290, 840 * 210);
    expect(wide.width).toBeGreaterThanOrEqual(830);
    expect(wide.height).toBeLessThanOrEqual(290);
    const square = fitLogo({ logo: { width: 500, height: 500 } } as FaceInput, 840, 290, 840 * 210);
    expect(square.height).toBeLessThanOrEqual(290);
  });
});
