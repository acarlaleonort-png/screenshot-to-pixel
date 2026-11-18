import { describe, expect, it } from "vitest";
import { displayTotal, formatCounter, isValidLinkUrl } from "./social-proof";

describe("social proof", () => {
  it("shown number is base + real (127 + 14 = 141)", () => {
    expect(displayTotal(127, 14)).toBe(141);
    expect(displayTotal(2450, 0)).toBe(2450);
  });
  it("formats with optional plus in pt-BR", () => {
    expect(formatCounter(2450, true)).toBe("+2.450");
    expect(formatCounter(843, false)).toBe("843");
  });
  it("validates link URLs", () => {
    expect(isValidLinkUrl("https://instagram.com/x")).toBe(true);
    expect(isValidLinkUrl("https://wa.me/5511999999999")).toBe(true);
    expect(isValidLinkUrl("instagram.com/x")).toBe(false);
    expect(isValidLinkUrl("javascript:alert(1)")).toBe(false);
  });
});
