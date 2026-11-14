import { describe, expect, it } from "vitest";
import { isValidCNPJ, isValidCPF, isValidExpiry, isValidLuhn, maskCNPJ, maskCPF, maskPhone } from "./masks";

describe("masks", () => {
  it("phone stops at 11 digits", () => expect(maskPhone("119876543211234")).toBe("(11) 98765-4321"));
  it("CPF mask and check digits", () => {
    expect(maskCPF("52998224725")).toBe("529.982.247-25");
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("529.982.247-26")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });
  it("numeric CNPJ", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
  });
  it("alphanumeric CNPJ (Receita example 12ABC34501DE35)", () => {
    expect(maskCNPJ("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(isValidCNPJ("12.ABC.345/01DE-35")).toBe(true);
    expect(isValidCNPJ("12.ABC.345/01DE-36")).toBe(false);
  });
  it("card Luhn and expiry", () => {
    expect(isValidLuhn("4111 1111 1111 1111")).toBe(true);
    expect(isValidLuhn("4111 1111 1111 1112")).toBe(false);
    expect(isValidExpiry("12/30", new Date(2026, 10, 1))).toBe(true);
    expect(isValidExpiry("10/26", new Date(2026, 10, 1))).toBe(false);
  });
});
