import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeSavings, formatBRL, PERIOD_LABEL, type BillingPeriod } from "@/lib/format";
import { track } from "@/lib/analytics";

export type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_period: BillingPeriod;
  benefits: unknown;
  highlighted: boolean;
  highlight_label: string | null;
  cta_label: string;
};

export function PlanCards({ plans }: { plans: Plan[] }) {
  if (!plans.length)
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        Nenhum plano disponível no momento.
      </p>
    );
  const monthly = plans.find((p) => p.billing_period === "monthly");
  const monthlyPrice = monthly ? Number(monthly.price) : null;
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => {
        const savings = computeSavings(p, monthlyPrice);
        const benefits = Array.isArray(p.benefits) ? (p.benefits as string[]) : [];
        return (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-3xl border p-6 ${
              p.highlighted ? "border-primary bg-card shadow-elegant" : "border-border bg-card/60"
            }`}
          >
            {p.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-primary-foreground">
                {p.highlight_label || "Destaque"}
              </span>
            )}
            <h3 className="text-2xl">{p.name}</h3>
            {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-4xl">{formatBRL(p.price)}</span>
              <span className="text-sm text-muted-foreground">{PERIOD_LABEL[p.billing_period]}</span>
            </div>
            {savings && <p className="mt-1 text-sm font-medium text-success">Economia de {formatBRL(savings)}</p>}
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {benefits.map((b) => (
                <li key={b} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {b}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              variant={p.highlighted ? "default" : "secondary"}
              className="mt-6 h-12 w-full rounded-xl text-base"
            >
              <Link to="/checkout" search={{ plan: p.id }} onClick={() => track("plan_selected", { plan_id: p.id })}>
                {p.cta_label}
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
