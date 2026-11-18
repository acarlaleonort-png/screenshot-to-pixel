export type PaymentMethodId = "pix" | "card" | "boleto";

/** Same rule as the checkout screen: missing config = enabled; only explicit false disables. */
export function isMethodEnabled(methods: unknown, method: PaymentMethodId): boolean {
  const m = methods && typeof methods === "object" ? (methods as Record<string, unknown>) : undefined;
  return m?.[method] !== false;
}
