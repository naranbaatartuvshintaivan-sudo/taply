import { describe, expect, it } from "vitest";
import { customerAlt, distribute } from "./customers";

describe("distribute", () => {
  it("цөөн зураг → багана бүрт бүгд, өөр эхлэлтэй", () => {
    const cols = distribute(["a", "b", "c"], 3, 3);
    expect(cols).toEqual([
      ["a", "b", "c"],
      ["b", "c", "a"],
      ["c", "a", "b"],
    ]);
  });

  it("олон зураг → ээлжлэн, давхардалгүй хуваана", () => {
    const cols = distribute(["a", "b", "c", "d", "e", "f"], 2, 1);
    expect(cols).toEqual([
      ["a", "c", "e"],
      ["b", "d", "f"],
    ]);
  });

  it("баганыг minPerCol хүртэл давтана", () => {
    const cols = distribute(["a", "b", "c", "d"], 2, 5);
    expect(cols[0]).toEqual(["a", "c", "a", "c", "a", "c"]);
    expect(cols.every((c) => c.length >= 5)).toBe(true);
  });

  it("хоосон жагсаалт → хоосон баганууд", () => {
    expect(distribute([], 3)).toEqual([[], [], []]);
  });
});

describe("customerAlt", () => {
  it("нэртэй / нэргүй", () => {
    expect(customerAlt({ src: "", name: "Maral" })).toBe("Maral-ийн NFC стенд");
    expect(customerAlt({ src: "", name: null })).toBe("Харилцагчийн NFC стенд");
  });
});
