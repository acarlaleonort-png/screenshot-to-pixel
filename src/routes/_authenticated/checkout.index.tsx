import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, FileText, QrCode, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCheckout } from "@/lib/checkout.functions";
import { formatBRL, PERIOD_LABEL, type BillingPeriod } from "@/lib/format";
import { track } from "@/lib/analytics";
import { Checkbox } from "@/components/ui/checkbox";
import { isValidCNPJ, isValidCPF, isValidExpiry, isValidLuhn, isValidPhone, maskCardNumber, maskCNPJ, maskCPF, maskCVV, maskExpiry, maskPhone } from "@/lib/masks";

export const Route = createFileRoute("/_authenticated/checkout/")({
  validateSearch: (s: Record<string, unknown>) => ({ plan: typeof s["plan"] === "string" ? s["plan"] : undefined }),
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
  const [docType, setDocType] = useState<"CPF" | "CNPJ">("CPF");
  const [cardNumber, setCardNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const sending = useRef(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setName((n) => n || data.profile?.full_name || "");
      setPhone((p) => p || maskPhone(data.profile?.phone || ""));
    }
    if (!selected && data?.plans[0]) setSelected(data.plans[0].id);
  }, [data, selected]);
  useEffect(() => track("checkout_started", planId ? { plan_id: planId } : {}), [planId]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  const plan = data?.plans.find((p) => p.id === selected);
  const methods = METHODS.filter((m) => data?.methods[m.id]);
  const activeMethod = methods.some((m) => m.id === method) ? method : methods[0]?.id ?? method;
  const errors = {
    name: name.trim().length < 2 ? "Informe seu nome completo" : "",
    phone: !isValidPhone(phone) ? "Telefone inválido. Ex.: (11) 98765-4321 ou (11) 3456-7890" : "",
    doc: !(docType === "CPF" ? isValidCPF(doc) : isValidCNPJ(doc)) ? `${docType} inválido` : "",
    cardNumber: activeMethod === "card" && !isValidLuhn(cardNumber) ? "Número do cartão inválido" : "",
    holder: activeMethod === "card" && holder.trim().length < 3 ? "Nome como está no cartão" : "",
    expiry: activeMethod === "card" && !isValidExpiry(expiry) ? "Validade inválida" : "",
    cvv: activeMethod === "card" && !/^\d{3,4}$/.test(cvv) ? "CVV inválido" : "",
    installments: activeMethod === "card" && !(Number.isInteger(installments) && installments >= 1 && installments <= 12) ? "Parcelas inválidas" : "",
    adult: !adult ? "Confirme que você é maior de 18 anos" : "",
    terms: !terms ? "Aceite os Termos de Uso" : "",
    privacy: !privacy ? "Aceite a Política de Privacidade" : "",
  };
  const show = (k: keyof typeof errors) => (touched[k] || touched["all"]) && errors[k];

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || sending.current) return;
    if (Object.values(errors).some(Boolean)) {
      setTouched({ all: true });
      toast.error("Confira os campos destacados.");
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      const res = await createCheckout({
        data: {
          planId: plan.id, name, phone, document: doc, documentType: docType, method: activeMethod, adult: true, terms: true, privacy: true,
          card: activeMethod === "card" ? { number: cardNumber, holderName: holder, expiry, cvv, installments } : undefined,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      track("payment_pending", { plan_id: plan.id });
      navigate({ to: "/checkout/pending", search: { order: res.orderId } });
    } catch {
      toast.error("Verifique seus dados e tente novamente.");
    } finally {
      sending.current = false;
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
            <FieldBox id="n" label="Nome completo" error={show("name")}>
              <Input id="n" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={touch("name")} className="h-12" />
            </FieldBox>
            <FieldBox id="e" label="E-mail"><Input id="e" value={user.email ?? ""} disabled className="h-12" /></FieldBox>
            <FieldBox id="p" label="Telefone com DDD (celular ou fixo)" error={show("phone")}>
              <Input id="p" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 98765-4321" value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))} onBlur={touch("phone")} className="h-12" />
            </FieldBox>
            <div className="space-y-1.5">
              <Label>Tipo de documento</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["CPF", "CNPJ"] as const).map((t) => (
                  <button type="button" key={t} onClick={() => { setDocType(t); setDoc(""); }}
                    className={`h-11 rounded-xl border text-sm ${docType === t ? "border-primary bg-card font-semibold" : "border-border text-muted-foreground"}`}>
                    {t === "CPF" ? "Pessoa física (CPF)" : "Empresa (CNPJ)"}
                  </button>
                ))}
              </div>
            </div>
            <FieldBox id="d" label={docType} error={show("doc")}>
              {docType === "CPF" ? (
                <Input id="d" inputMode="numeric" placeholder="000.000.000-00" value={doc}
                  onChange={(e) => setDoc(maskCPF(e.target.value))} onBlur={touch("doc")} className="h-12" />
              ) : (
                <Input id="d" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="AB.123.CDE/0001-00" value={doc}
                  onChange={(e) => setDoc(maskCNPJ(e.target.value) ?? "")} onBlur={touch("doc")} className="h-12 uppercase" />
              )}
            </FieldBox>
          </section>
          <section>
            <h2 className="text-lg font-semibold">3. Pagamento</h2>
            {methods.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma forma de pagamento disponível.</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {methods.map((m) => (
                <button type="button" key={m.id} onClick={() => setMethod(m.id)}
                  className={`rounded-2xl border p-4 text-left ${activeMethod === m.id ? "border-primary bg-card" : "border-border"}`}>
                  <m.icon className="h-5 w-5 text-primary" />
                  <span className="mt-2 block font-medium">{m.label}</span>
                  {m.note && <span className="text-xs text-muted-foreground">{m.note}</span>}
                </button>
              ))}
            </div>
            {activeMethod === "card" && (
              <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card/60 p-4">
                <FieldBox id="cn" label="Número do cartão" error={show("cardNumber")}>
                  <Input id="cn" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={cardNumber}
                    onChange={(e) => setCardNumber(maskCardNumber(e.target.value))} onBlur={touch("cardNumber")} className="h-12" />
                </FieldBox>
                <FieldBox id="ch" label="Nome impresso no cartão" error={show("holder")}>
                  <Input id="ch" autoComplete="cc-name" autoCapitalize="characters" value={holder}
                    onChange={(e) => setHolder(e.target.value.toUpperCase().replace(/[^A-ZÀ-Ú ]/g, "").slice(0, 60))} onBlur={touch("holder")} className="h-12 uppercase" />
                </FieldBox>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBox id="cx" label="Validade" error={show("expiry")}>
                    <Input id="cx" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expiry}
                      onChange={(e) => setExpiry(maskExpiry(e.target.value))} onBlur={touch("expiry")} className="h-12" />
                  </FieldBox>
                  <FieldBox id="cv" label="CVV" error={show("cvv")}>
                    <Input id="cv" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={cvv}
                      onChange={(e) => setCvv(maskCVV(e.target.value))} onBlur={touch("cvv")} className="h-12" />
                  </FieldBox>
                </div>
                {plan && (
                  <FieldBox id="ci" label="Parcelas" error={show("installments")}>
                    <select id="ci" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                      className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}x de {formatBRL(Number(plan.price) / n)}</option>
                      ))}
                    </select>
                  </FieldBox>
                )}
              </div>
            )}
          </section>
          <section className="space-y-2">
            {([
              ["adult", adult, setAdult, <>Declaro que tenho <strong>18 anos ou mais</strong>.</>],
              ["terms", terms, setTerms, <>Li e aceito os <Link to="/termos" target="_blank" rel="noopener" className="underline">Termos de Uso</Link>.</>],
              ["privacy", privacy, setPrivacy, <>Li e aceito a <Link to="/privacidade" target="_blank" rel="noopener" className="underline">Política de Privacidade</Link>.</>],
            ] as const).map(([k, val, set, text]) => (
              <div key={k}>
                <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
                  <Checkbox aria-label={k} checked={val} onCheckedChange={(v) => { set(v === true); touch(k)(); }} className="mt-0.5" />
                  <span>{text}</span>
                </label>
                {show(k) && <p className="mt-1.5 text-xs text-destructive">{errors[k]}</p>}
              </div>
            ))}
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
          <Button type="submit" disabled={busy || !plan || !methods.length || !adult || !terms || !privacy} className="mt-6 h-14 w-full rounded-2xl bg-gradient-gold text-base font-semibold">
            {busy ? "Processando..." : "Ir para pagamento"}
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Seus dados de pagamento não ficam armazenados aqui.</p>
        </aside>
      </form>
    </main>
  );
}

function FieldBox({ id, label, error, children }: { id: string; label: string; error?: string | false | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
