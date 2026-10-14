import { describe, expect, it } from "vitest";
import { checkLogo, LOGO_MAX_BYTES, sniffImageType } from "./image-check";

const enc = (s: string) => new TextEncoder().encode(s);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const WEBP = Uint8Array.from([...enc("RIFF"), 0x24, 0, 0, 0, ...enc("WEBPVP8 ")]);
const SVG = enc('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const GIF = enc("GIF89a......");

describe("sniffImageType (magic bytes)", () => {
  it("PNG / JPEG / WEBP-г таньна", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPG)).toBe("image/jpeg");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("SVG, GIF, хоосон, тасархай, RIFF/WAVE → null", () => {
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(GIF)).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(sniffImageType(PNG.subarray(0, 4))).toBeNull();
    expect(sniffImageType(Uint8Array.from([...enc("RIFF"), 0, 0, 0, 0, ...enc("WAVE")]))).toBeNull();
  });
});

describe("checkLogo", () => {
  it("зарласан MIME-д итгэхгүй — байтаар нь шийднэ", () => {
    expect(checkLogo(PNG, "image/jpeg")).toEqual({ ok: true, type: "image/png" });
    expect(checkLogo(GIF, "image/png")).toMatchObject({ ok: false });
  });

  it("SVG-г (нэрийг нь png гэж өөрчилсөн ч) тусгай мессежээр татгалзана", () => {
    const r = checkLogo(SVG, "image/png");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.message).toContain("SVG");
    expect(checkLogo(PNG, "image/svg+xml")).toMatchObject({ ok: false });
  });

  it("хэмжээ: хоосон болон 4 MB-аас их бол татгалзана, яг 4 MB зөв", () => {
    expect(checkLogo(new Uint8Array(), "image/png")).toMatchObject({ ok: false });
    const big = new Uint8Array(LOGO_MAX_BYTES + 1);
    big.set(PNG);
    expect(checkLogo(big, "image/png")).toMatchObject({ ok: false, message: expect.stringContaining("4 MB") });
    const max = new Uint8Array(LOGO_MAX_BYTES);
    max.set(PNG);
    expect(checkLogo(max, "image/png")).toEqual({ ok: true, type: "image/png" });
  });
});
