import { describe, it, expect } from "vitest";
import { isMethodEnabled } from "./payment-methods";
const all = ["pix", "card", "boleto"] as const;
const check = (cfg: unknown) => all.map((m) => isMethodEnabled(cfg, m));
describe("meios de pagamento no servidor", () => {
  it("A: sem configuração libera todos", () => { expect(check(null)).toEqual([true, true, true]); expect(check(undefined)).toEqual([true, true, true]); expect(check({})).toEqual([true, true, true]); });
  it("B: PIX desligado", () => expect(check({ pix: false, card: true, boleto: true })).toEqual([false, true, true]));
  it("C: Cartão desligado", () => expect(check({ pix: true, card: false, boleto: true })).toEqual([true, false, true]));
  it("D: Boleto desligado", () => expect(check({ pix: true, card: true, boleto: false })).toEqual([true, true, false]));
  it("E: todos ligados", () => expect(check({ pix: true, card: true, boleto: true })).toEqual([true, true, true]));
});
