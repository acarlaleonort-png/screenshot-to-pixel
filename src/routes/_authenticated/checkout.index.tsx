import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, FileText, QrCode, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCheckout } from "@/lib/checkout.functions";
import { formatBRL, PERIOD_LABEL, type BillingPeriod } from "@/lib/format";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/checkout/")({
  validateSearch: (s: Record<string, unknown>) => ({ plan: typeof s.plan === "string" ? s.plan : undefined }),
  head: () => ({
    meta: [
      { title: "Finalizar compra" },
      { name: "description", content: "Revise seu plano e escolha a forma de pagamento." },
      { property: "og:title", content: "Finalizar compra" },
      { property: "og:description", content: "Checkout seguro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

const METHODS = [
  { id: "pix", label: "PIX", icon: QrCode, note: "Aprovação em instantes" },
  { id: "card", label: "Cartão de crédito", icon: CreditCard, note: "" },
  { id: "boleto", label: "Boleto", icon: FileText, note: "Compensação em até 3 dias úteis" },
] as const;

function Checkout() {
  const { plan: planId } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["checkout", planId],
    queryFn: async () => {
      const [plans, settings, profile] = await Promise.all([
        supabase.from("plans").select("*").eq("active", true).order("sort_order"),
        supabase.from("site_settings").select("methods_enabled").eq("id", 1).single(),
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      ]);
      return { plans: plans.data ?? [], methods: (settings.data?.methods_enabled ?? {}) as Record<string, boolean>, profile: profile.data };
    },
  });
  const [selected, setSelected] = useState<string | undefined>(planId);
  const [method, setMethod] = useState<"pix" | "card" | "boleto">("pix");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doc, setDoc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setName((n) => n || data.profile?.full_name || "");
      setPhone((p) => p || data.profile?.phone || "");
    }
    if (!selected && data?.plans[0]) setSelected(data.plans[0].id);
  }, [data, selected]);
  useEffect(() => track("checkout_started", { plan_id: planId }), [planId]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  const plan = data?.plans.find((p) => p.id === selected);
  const methods = METHODS.filter((m) => data?.methods[m.id]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setBusy(true);
    try {
      const res = await createCheckout({ data: { planId: plan.id, name, phone, document: doc, method } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      track("payment_pending", { plan_id: plan.id });
      navigate({ to: "/checkout/pending", search: { order: res.orderId } });
    } catch {
      toast.error("Verifique seus dados e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link to="/" className="text-sm text-muted-foreground">← Voltar</Link>
      <h1 className="mt-4 text-3xl">Finalizar compra</h1>
      <form onSubmit={pay} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">1. Plano</h2>
            <div className="mt-3 grid gap-3">
              {data?.plans.map((p) => (
                <button type="button" key={p.id} onClick={() => setSelected(p.id)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left ${selected === p.id ? "border-primary bg-card" : "border-border"}`}>
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{PERIOD_LABEL[p.billing_period as BillingPeriod]}</span>
                  </span>
                  <span className="font-display text-xl">{formatBRL(p.price)}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Seus dados</h2>
            <div className="space-y-1.5"><Label htmlFor="n">Nome completo</Label><Input id="n" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="h-12" /></div>
            <div className="space-y-1.5"><Label>E-mail</Label><Input value={user.email ?? ""} disabled className="h-12" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="p">Celular</Label><Input id="p" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" /></div>
              <div className="space-y-1.5"><Label htmlFor="d">CPF</Label><Input id="d" inputMode="numeric" required={method !== "pix" || true} value={doc} onChange={(e) => setDoc(e.target.value.replace(/\D/g, "").slice(0, 14))} className="h-12" /></div>
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">3. Pagamento</h2>
            {methods.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma forma de pagamento disponível.</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {methods.map((m) => (
                <button type="button" key={m.id} onClick={() => setMethod(m.id)}
                  className={`rounded-2xl border p-4 text-left ${method === m.id ? "border-primary bg-card" : "border-border"}`}>
                  <m.icon className="h-5 w-5 text-primary" />
                  <span className="mt-2 block font-medium">{m.label}</span>
                  {m.note && <span className="text-xs text-muted-foreground">{m.note}</span>}
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="h-fit rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Resumo</h2>
          {plan ? (
            <>
              <p className="mt-3 font-display text-2xl">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{PERIOD_LABEL[plan.billing_period as BillingPeriod]}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {(Array.isArray(plan.benefits) ? (plan.benefits as string[]) : []).map((b) => (
                  <li key={b} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{b}</li>
                ))}
              </ul>
              <div className="mt-5 flex justify-between border-t border-border pt-4">
                <span>Total</span><span className="font-display text-2xl">{formatBRL(plan.price)}</span>
              </div>
            </>
          ) : <p className="mt-3 text-sm text-muted-foreground">Selecione um plano.</p>}
          <Button type="submit" disabled={busy || !plan || !methods.length} className="mt-6 h-14 w-full rounded-2xl bg-gradient-gold text-base font-semibold">
            {busy ? "Processando..." : "Ir para pagamento"}
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Seus dados de pagamento não ficam armazenados aqui.</p>
        </aside>
      </form>
    </main>
  );
}
