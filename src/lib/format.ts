export type BillingPeriod = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
export type PaymentStatus = "PENDING" | "APPROVED" | "DECLINED" | "CANCELED" | "REFUNDED" | "EXPIRED";

export const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: "por mês",
  quarterly: "por trimestre",
  semiannual: "por semestre",
  annual: "por ano",
  custom: "pagamento único",
};

export const PERIOD_NAME: Record<BillingPeriod, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizado",
};

export const PERIOD_MONTHS: Record<BillingPeriod, number | null> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
  custom: null,
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  DECLINED: "Recusado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
  EXPIRED: "Expirado",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (v: number | string) => brl.format(Number(v));
export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Savings of a longer plan versus paying the monthly plan for the same number of months.
 * Returns null when there is no monthly reference, the plan is not longer, or there is no saving.
 */
export function computeSavings(
  plan: { price: number | string; billing_period: BillingPeriod },
  monthlyPrice: number | null,
): number | null {
  const months = PERIOD_MONTHS[plan.billing_period];
  if (monthlyPrice == null || months == null || months <= 1) return null;
  const saving = Math.round((monthlyPrice * months - Number(plan.price)) * 100) / 100;
  return saving > 0 ? saving : null;
}
