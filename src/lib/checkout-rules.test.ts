import { describe, it, expect } from "vitest";
import { isValidCPF, isValidCNPJ, isValidPhone, isValidLuhn, isValidExpiry, cleanCNPJ } from "./masks";
describe("checkout rules", () => {
  it("CPF", () => { expect(isValidCPF("529.982.247-25")).toBe(true); expect(isValidCPF("111.111.111-11")).toBe(false); expect(isValidCPF("529.982.247-24")).toBe(false); });
  it("CNPJ numérico", () => { expect(isValidCNPJ("11.222.333/0001-81")).toBe(true); expect(isValidCNPJ("11.222.333/0001-80")).toBe(false); });
  it("CNPJ alfanumérico", () => { expect(isValidCNPJ("12.ABC.345/01DE-35")).toBe(true); expect(cleanCNPJ("12.abc.345/01de-35")).toBe("12ABC34501DE35"); });
  it("Telefone celular e fixo", () => { expect(isValidPhone("(11) 98765-4321")).toBe(true); expect(isValidPhone("(11) 3456-7890")).toBe(true); expect(isValidPhone("(11) 1234")).toBe(false); });
  it("Cartão/validade", () => { expect(isValidLuhn("4111 1111 1111 1112")).toBe(false); expect(isValidLuhn("4111 1111 1111 1111")).toBe(true); expect(isValidExpiry("13/30")).toBe(false); expect(isValidExpiry("01/20")).toBe(false); });
});
