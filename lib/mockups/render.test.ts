import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { fitSize, wrapLines } from "./designs";
import { prepareLogo } from "./logo";
import { decodeQr } from "./qr";
import { qrTarget, renderDesigns } from "./render";

// MOCKUP_SAMPLES=<хавтас> тохируулбал жишээ зургуудыг тэнд хадгална (нүдээр шалгахад).
const SAMPLES = process.env.MOCKUP_SAMPLES;

const svg = (body: string, w = 600, h = 400) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

// 1) тунгалаг PNG, улаан
const transparentPng = () =>
  sharp(svg(`<circle cx="200" cy="200" r="150" fill="#d62828"/><rect x="330" y="120" width="220" height="160" rx="30" fill="#f4a261"/>`)).png().toBuffer();
// 2) цагаан дэвсгэртэй JPG, цэнхэр
const whiteJpg = () =>
  sharp(svg(`<rect width="600" height="400" fill="#ffffff"/><rect x="150" y="80" width="300" height="240" rx="40" fill="#1d4ed8"/><circle cx="300" cy="200" r="70" fill="#ffffff"/>`))
    .jpeg({ quality: 90 })
    .toBuffer();
// 3) хар/цагаан тунгалаг лого (брэндийн өнгөгүй)
const monoPng = () =>
  sharp(svg(`<path d="M60 340 L200 60 L340 340 Z" fill="#111111"/><rect x="380" y="60" width="160" height="280" fill="#111111"/>`)).png().toBuffer();

const CASES = [
  { id: "1-transparent", logo: transparentPng, name: "Номин Бутик", fb: "https://www.facebook.com/nomin.butik", ig: null },
  { id: "2-white-jpg", logo: whiteJpg, name: "Сүү & Кофе", fb: null, ig: "https://www.instagram.com/suu.coffee/" },
  {
    id: "3-long-name",
    logo: monoPng,
    name: "Улаанбаатар Цэцэг Чимэглэлийн Төв ХХК",
    fb: "https://www.facebook.com/profile.php?id=61594360375703",
    ig: "https://www.instagram.com/ub_tsetseg_chimeglel/",
  },
];

describe("prepareLogo", () => {
  it("тунгалаг PNG: trim, брэндийн өнгө улаан", async () => {
    const l = await prepareLogo(await transparentPng());
    expect(l.transparent).toBe(true);
    expect(l.width).toBeLessThan(600); // хоосон ирмэг тайрагдсан
    expect(l.brand && l.brand.r > 150 && l.brand.g < 80).toBe(true);
  });
  it("цагаан JPG: тунгалаг биш, брэнд цэнхэр, ≤800px", async () => {
    const big = await sharp(await whiteJpg()).resize(2400).jpeg().toBuffer();
    const l = await prepareLogo(big);
    expect(l.transparent).toBe(false);
    expect(Math.max(l.width, l.height)).toBeLessThanOrEqual(800);
    expect(l.brand && l.brand.b > 150 && l.brand.r < 80).toBe(true);
  });
  it("хар лого: брэндийн өнгөгүй, бараан", async () => {
    const l = await prepareLogo(await monoPng());
    expect(l.brand).toBeNull();
    expect(l.lightness).toBeLessThan(0.1);
  });
});

describe("fitSize", () => {
  const o = { max: 96, min: 40, width: 1000, height: 230, em: 0.66 };
  it("богино нэр max, урт нэр багасна, min-ээс доош орохгүй", () => {
    expect(fitSize("Номин", o)).toBe(96);
    expect(fitSize("Улаанбаатар Цэцэг Чимэглэлийн Төв ХХК", o)).toBeLessThan(96);
    expect(fitSize("А".repeat(200), o)).toBe(40);
  });
  it("үгээр таслахад өндөрт багтана", () => {
    const name = "Улаанбаатар Цэцэг Чимэглэлийн Төв ХХК";
    const size = fitSize(name, o);
    const lines = wrapLines(name, Math.floor(o.width / (size * o.em)));
    expect(lines * size * 1.06).toBeLessThanOrEqual(o.height);
  });
});

describe("qrTarget", () => {
  it("FB тэргүүлнэ, байхгүй бол IG", () => {
    expect(qrTarget("fb", "ig")).toBe("fb");
    expect(qrTarget(null, "ig")).toBe("ig");
    expect(() => qrTarget(null, null)).toThrow();
  });
});

describe("renderDesigns", () => {
  for (const c of CASES) {
    for (const set of [1, 2]) {
      it(`${c.id} · багц ${set}: 3 загвар, хэмжээ зөв, QR линктэй таарна`, async () => {
        const logo = await prepareLogo(await c.logo());
        const out = await renderDesigns({ name: c.name, logo, fbUrl: c.fb, igUrl: c.ig, set });
        expect(out.map((d) => d.key)).toEqual(["A", "B", "C"]);
        for (const d of out) {
          const fm = await sharp(d.face).metadata();
          expect([fm.width, fm.height]).toEqual([1200, 1400]);
          const pm = await sharp(d.preview).metadata();
          expect([pm.width, pm.height]).toEqual([1600, 1600]);
          expect(await decodeQr(d.face)).toBe(c.fb ?? c.ig);
          if (SAMPLES) {
            mkdirSync(SAMPLES, { recursive: true });
            writeFileSync(path.join(SAMPLES, `${c.id}-s${set}-${d.key}-face.png`), d.face);
            writeFileSync(path.join(SAMPLES, `${c.id}-s${set}-${d.key}-stand.png`), d.preview);
          }
        }
        // Багц доторх 3 загвар бие биеэсээ ялгаатай
        expect(new Set(out.map((d) => d.face.toString("base64"))).size).toBe(3);
      }, 60_000);
    }
  }
});
