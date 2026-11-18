import { LegalLinks } from "@/components/legal/legal-footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import * as Icons from "lucide-react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlanCards, type Plan } from "@/components/plan-cards";
import { getLandingData } from "@/lib/public.functions";
import { track } from "@/lib/analytics";
import { formatCounter } from "@/lib/social-proof";

export const Route = createFileRoute("/")({
  loader: () => getLandingData(),
  head: ({ loaderData }) => {
    const s = loaderData?.settings;
    const title = s ? `${s.display_name} — Acesso exclusivo` : "Acesso exclusivo";
    const desc = s?.subheadline ?? "Escolha seu plano e libere o acesso à área privada.";
    const meta = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (s?.cover_url?.startsWith("https://"))
      meta.push({ property: "og:image", content: s.cover_url }, { name: "twitter:image", content: s.cover_url });
    return { meta };
  },
  component: Landing,
});

function Cta({ label, className = "" }: { label: string; className?: string }) {
  return (
    <Button asChild size="lg" className={`h-14 rounded-2xl bg-gradient-gold px-8 text-base font-semibold shadow-elegant ${className}`}>
      <a href="#planos" onClick={() => track("click_cta")}>
        {label}
      </a>
    </Button>
  );
}

function PathCard({ emoji, title, desc, cta, url, path, tone }: { emoji: string; title: string; desc: string; cta: string; url?: string | undefined; path: string; tone: "mid" | "low" }) {
  const box = tone === "mid"
    ? "rounded-3xl border border-primary/40 bg-card/80 p-5"
    : "rounded-2xl border border-border bg-card/40 p-4";
  const btn = tone === "mid"
    ? "border border-primary text-primary"
    : "bg-secondary text-secondary-foreground";
  const body = (
    <>
      <span className={`block font-display ${tone === "mid" ? "text-xl" : "text-lg"}`}>{emoji} {title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
      <span className={`mt-3 flex h-12 items-center justify-center rounded-2xl text-sm font-semibold ${btn}`}>{url ? cta : "Em breve"}</span>
    </>
  );
  if (!url) return <div className={`${box} opacity-70`} aria-disabled="true">{body}</div>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title}: ${cta.replace(" →", "")}`}
      onClick={() => track("click_cta", { metadata: { path } })}
      className={`group block transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] ${box}`}>
      {body}
    </a>
  );
}

function Landing() {
  const { settings: s, benefits, faqs, plans, previews, links, counters } = Route.useLoaderData();
  useEffect(() => track("page_view"), []);
  const cta = s?.cta_label ?? "Escolher meu acesso";
  const isKind = (l: { icon: string | null; title: string }, k: string) => l.icon === k || new RegExp(`\\b${k}\\b`, "i").test(l.title);
  const vip = links.find((l) => isKind(l, "vip"));
  const free = links.find((l) => isKind(l, "free"));
  const otherLinks = links.filter((l) => l !== vip && l !== free);
  const exclusiveDesc = s?.subheadline || (plans.length ? `${plans.length} ${plans.length > 1 ? "planos disponíveis" : "plano disponível"} para acessar a área privada.` : "Acesso à área privada para assinantes.");
  const socials = Array.isArray(s?.social_links) ? (s!.social_links as { label: string; url: string }[]) : [];

  return (
    <main className="pb-24 md:pb-0">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-end gap-2 p-4">
        <Link to="/account" className="rounded-full bg-background/60 px-4 py-2 text-sm backdrop-blur hover:bg-background/80">
          Minha conta
        </Link>
        <Link
          to="/login"
          search={{ redirect: undefined, mode: "signup" }}
          className="cta-pulse rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:scale-105"
        >
          Criar conta grátis
        </Link>
      </header>

      <section className="relative">
        <div className="h-56 w-full overflow-hidden bg-secondary md:h-80">
          {s?.cover_url && <img src={s.cover_url} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-fade" />
        </div>
        <div className="relative mx-auto -mt-16 max-w-3xl px-5 text-center">
          <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-background bg-muted">
            {s?.avatar_url && <img src={s.avatar_url} alt={s.display_name} className="h-full w-full object-cover" />}
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl">{s?.display_name}</h1>
          <p className="text-sm text-primary">@{s?.handle}</p>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{s?.bio}</p>
          <h2 className="mx-auto mt-8 max-w-2xl text-3xl leading-tight md:text-5xl">{s?.headline}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{s?.subheadline}</p>
        </div>
        <div className="relative mx-auto mt-10 max-w-xl px-5">
          <h2 className="text-center text-2xl md:text-3xl">O que você quer acessar?</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">Escolha uma opção para continuar.</p>
          <div className="mt-6 flex flex-col gap-3">
            <a href="#planos" onClick={() => track("click_cta", { metadata: { path: "exclusive" } })}
              aria-label="Conteúdo Exclusivo: quero ter acesso"
              className="group block rounded-3xl border-2 border-primary bg-card p-6 shadow-elegant transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]">
              <span className="block font-display text-2xl">🔥 Conteúdo Exclusivo</span>
              <span className="mt-1 block text-sm text-muted-foreground">{exclusiveDesc}</span>
              <span className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-gradient-gold font-semibold text-primary-foreground">QUERO TER ACESSO →</span>
            </a>
            <PathCard emoji="💎" title="Grupo VIP" desc="Entre para a área exclusiva." cta="CONHECER O VIP →" url={vip?.url} path="vip" tone="mid" />
            <PathCard emoji="🆓" title="Grupo Free" desc="Comece gratuitamente." cta="ENTRAR GRÁTIS →" url={free?.url} path="free" tone="low" />
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Pagamento seguro · Acesso liberado após confirmação
          </p>
          {counters.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {counters.map((c) => (
                <li key={c.key}><span className="font-semibold text-foreground">{formatCounter(c.value, c.show_plus)}</span> {c.label}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {previews.length > 0 && (
        <section className="mx-auto mt-24 max-w-5xl px-5">
          <h2 className="text-center text-3xl md:text-4xl">Um pouco do que você pode encontrar por aqui</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
            {previews.map((p) => (
              <figure key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
                {p.thumbnail_url && (
                  <img src={p.thumbnail_url} alt={p.title} loading="lazy" className={`h-full w-full object-cover ${p.locked ? "scale-110 blur-xl" : ""}`} />
                )}
                {p.locked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 text-sm">
                    <Lock className="h-6 w-6 text-primary" /> Exclusivo para assinantes
                  </div>
                )}
                {p.title && <figcaption className="absolute inset-x-0 bottom-0 bg-fade p-3 text-xs">{p.title}</figcaption>}
              </figure>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Cta label={cta} />
          </div>
        </section>
      )}

      {benefits.length > 0 && (
        <section className="mx-auto mt-24 max-w-5xl px-5">
          <h2 className="text-center text-3xl md:text-4xl">O que você recebe</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => {
              const Icon = ((Icons as unknown as Record<string, Icons.LucideIcon>)[b.icon] ?? Icons.Sparkles) as Icons.LucideIcon;
              return (
                <div key={b.id} className="rounded-2xl border border-border bg-card/60 p-6">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 text-xl">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section id="planos" className="mx-auto mt-24 max-w-5xl scroll-mt-8 px-5">
        <h2 className="text-center text-3xl md:text-4xl">Escolha seu plano</h2>
        <div className="mt-10">
          <PlanCards plans={plans as Plan[]} />
        </div>
        {s?.payment_info && (
          <p className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> {s.payment_info}
          </p>
        )}
        {s?.social_proof && <p className="mt-4 text-center text-sm text-muted-foreground">{s.social_proof}</p>}
      </section>

      {faqs.length > 0 && (
        <section className="mx-auto mt-24 max-w-2xl px-5">
          <h2 className="text-center text-3xl md:text-4xl">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-10 text-center">
            <Cta label={cta} />
          </div>
        </section>
      )}

      {otherLinks.length > 0 ? (
        <section className="mx-auto mt-20 max-w-md px-5">
          <h2 className="text-center text-xl">Também estou por aqui</h2>
          <div className="mt-5 flex flex-col gap-2">
            {otherLinks.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => track("click_cta", { metadata: { path: "link", icon: l.icon } })}
                className={`rounded-2xl border px-5 py-3 text-center transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${l.highlighted ? "border-primary bg-card" : "border-border bg-card/50 hover:bg-card"}`}>
                <span className="block text-sm font-medium">{l.title}</span>
                {l.description && <span className="block text-xs text-muted-foreground">{l.description}</span>}
              </a>
            ))}
          </div>
        </section>
      ) : links.length === 0 && socials.length > 0 && (
        <div className="mt-16 flex flex-wrap justify-center gap-3 text-sm">
          {socials.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-muted-foreground underline-offset-4 hover:underline">{l.label}</a>
          ))}
        </div>
      )}

      <footer className="mt-24 border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {s?.display_name}
        <LegalLinks />
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 p-3 backdrop-blur md:hidden">
        <Cta label={cta} className="w-full" />
      </div>
    </main>
  );
}
