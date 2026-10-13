import { describe, expect, it } from "vitest";
import { signWirePayload, verifyWireSignature } from "./wire-signature";

const secret = "whsec_test_secret_value";
const body = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded", data: { id: "pi_1" } });
const now = 1_791_774_042;

describe("Wire webhook signature", () => {
  it("зөв гарын үсэг → true", () => {
    expect(verifyWireSignature(body, signWirePayload(body, secret, now), secret, now)).toBe(true);
  });

  it("±300 сек дотор → true", () => {
    expect(verifyWireSignature(body, signWirePayload(body, secret, now - 299), secret, now)).toBe(true);
  });

  it("буруу secret → false", () => {
    expect(verifyWireSignature(body, signWirePayload(body, "whsec_other", now), secret, now)).toBe(false);
  });

  it("body өөрчлөгдсөн → false", () => {
    const h = signWirePayload(body, secret, now);
    expect(verifyWireSignature(body.replace("pi_1", "pi_2"), h, secret, now)).toBe(false);
  });

  it("хуучирсан timestamp (>300 сек) → false", () => {
    expect(verifyWireSignature(body, signWirePayload(body, secret, now - 301), secret, now)).toBe(false);
  });

  it("ирээдүйн timestamp (>300 сек) → false", () => {
    expect(verifyWireSignature(body, signWirePayload(body, secret, now + 301), secret, now)).toBe(false);
  });

  it("header байхгүй / эвдэрсэн → false", () => {
    expect(verifyWireSignature(body, null, secret, now)).toBe(false);
    expect(verifyWireSignature(body, "garbage", secret, now)).toBe(false);
    expect(verifyWireSignature(body, `t=${now}`, secret, now)).toBe(false);
    expect(verifyWireSignature(body, `t=${now},v1=zz`, secret, now)).toBe(false);
    expect(verifyWireSignature(body, `t=${now},v1=abcd`, secret, now)).toBe(false);
  });
});
