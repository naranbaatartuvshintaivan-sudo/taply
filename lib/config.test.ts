import { describe, expect, it } from "vitest";
import { CONTACT, MESSENGER_URL, messengerUrl } from "./config";

describe("Messenger холбоос", () => {
  it("CONTACT.facebook-ийн id-аас m.me (шинэ id зохиохгүй)", () => {
    const id = new URL(CONTACT.facebook).searchParams.get("id");
    expect(MESSENGER_URL).toBe(`https://m.me/${id}`);
    expect(MESSENGER_URL).toBe("https://m.me/61594360375703");
  });
  it("id байхгүй бол алдаа (буруу холбоос гаргахгүй)", () => {
    expect(() => messengerUrl("https://www.facebook.com/taply")).toThrow();
  });
});
