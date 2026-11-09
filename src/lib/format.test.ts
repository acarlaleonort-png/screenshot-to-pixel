import { describe, it, expect } from "vitest";
import { computeSavings } from "./format";

describe("computeSavings", () => {
  it("annual R$239,90 vs monthly R$29,90 saves R$118,90", () => {
    expect(computeSavings({ price: 239.9, billing_period: "annual" }, 29.9)).toBe(118.9);
  });
  it("no saving shown when there is no monthly plan", () => {
    expect(computeSavings({ price: 239.9, billing_period: "annual" }, null)).toBeNull();
  });
  it("no saving shown when longer plan is not cheaper", () => {
    expect(computeSavings({ price: 100, billing_period: "quarterly" }, 30)).toBeNull();
  });
});
