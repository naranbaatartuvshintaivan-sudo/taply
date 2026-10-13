import { describe, expect, it } from "vitest";
import { displayLink, normalizeFacebook, normalizeInstagram } from "./links";

describe("normalizeFacebook", () => {
  it.each([
    ["facebook.com/taplymn", "https://www.facebook.com/taplymn"],
    ["https://www.facebook.com/taplymn/", "https://www.facebook.com/taplymn"],
    ["https://m.facebook.com/taplymn?ref=xyz", "https://www.facebook.com/taplymn"],
    [
      "https://www.facebook.com/profile.php?id=61594360375703&mibextid=abc",
      "https://www.facebook.com/profile.php?id=61594360375703",
    ],
    ["fb.com/share/abc123", "https://www.facebook.com/share/abc123"],
  ])("%s → %s", (input, out) => expect(normalizeFacebook(input)).toBe(out));

  it.each(["", "taplymn", "facebook.com", "https://evil.com/facebook.com/x", "facebook.com/profile.php", "face book.com/x"])(
    "%s → null",
    (input) => expect(normalizeFacebook(input)).toBeNull(),
  );
});

describe("normalizeInstagram", () => {
  it.each([
    ["@taply_mn", "https://www.instagram.com/taply_mn/"],
    ["taply_mn", "https://www.instagram.com/taply_mn/"],
    ["https://www.instagram.com/taply_mn/", "https://www.instagram.com/taply_mn/"],
    ["instagram.com/taply.mn?igsh=xyz", "https://www.instagram.com/taply.mn/"],
  ])("%s → %s", (input, out) => expect(normalizeInstagram(input)).toBe(out));

  it.each(["", "@", "@has space", "https://evil.com/taply", "instagram.com/p/abc", "a".repeat(31)])(
    "%s → null",
    (input) => expect(normalizeInstagram(input)).toBeNull(),
  );
});

describe("displayLink", () => {
  it("ig → @handle", () => expect(displayLink("https://www.instagram.com/taply_mn/")).toBe("@taply_mn"));
  it("fb → facebook.com/...", () => expect(displayLink("https://www.facebook.com/x")).toBe("facebook.com/x"));
});
