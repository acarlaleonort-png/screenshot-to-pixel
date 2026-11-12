import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, PageHeader } from "@/components/admin/shared";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: SettingsPage });

type Social = { label: string; url: string };
type S = { display_name: string; handle: string; bio: string; headline: string; subheadline: string; cta_label: string; avatar_url: string; cover_url: string; social_proof: string; payment_info: string; socials: Social[]; methods: Record<string, boolean> };
type Benefit = { id?: string; title: string; description: string; icon: string; active: boolean };
type Faq = { id?: string; question: string; answer: string; active: boolean };

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const [s, b, f] = await Promise.all([
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("benefits").select("*").order("sort_order"),
        supabase.from("faqs").select("*").order("sort_order"),
      ]);
      return { s: s.data, b: b.data ?? [], f: f.data ?? [] };
    },
  });
  const [s, setS] = useState<S | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [removedB, setRemovedB] = useState<string[]>([]);
  const [removedF, setRemovedF] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const r = data.s;
    setS({
      display_name: r?.display_name ?? "", handle: r?.handle ?? "", bio: r?.bio ?? "", headline: r?.headline ?? "", subheadline: r?.subheadline ?? "",
      cta_label: r?.cta_label ?? "Assinar agora", avatar_url: r?.avatar_url ?? "", cover_url: r?.cover_url ?? "", social_proof: r?.social_proof ?? "", payment_info: r?.payment_info ?? "",
      socials: Array.isArray(r?.social_links) ? (r!.social_links as Social[]) : [],
      methods: { pix: true, card: true, boleto: true, ...((r?.methods_enabled ?? {}) as Record<string, boolean>) },
    });
    setBenefits(data.b.map((x) => ({ id: x.id, title: x.title, description: x.description, icon: x.icon, active: x.active })));
    setFaqs(data.f.map((x) => ({ id: x.id, question: x.question, answer: x.answer, active: x.active })));
    setRemovedB([]); setRemovedF([]);
  }, [data]);

  if (!s) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const set = (k: keyof S, v: string) => setS({ ...s, [k]: v });

  async function save() {
    if (!s) return;
    setSaving(true);
    const errs: string[] = [];
    const settings = {
      id: 1, display_name: s.display_name, handle: s.handle, bio: s.bio, headline: s.headline, subheadline: s.subheadline, cta_label: s.cta_label || "Assinar agora",
      avatar_url: s.avatar_url || null, cover_url: s.cover_url || null, social_proof: s.social_proof || null, payment_info: s.payment_info,
      social_links: s.socials.filter((x) => x.url.trim()), methods_enabled: s.methods,
    };
    const r1 = await supabase.from("site_settings").upsert(settings);
    if (r1.error) errs.push(r1.error.message);
    if (removedB.length) { const r = await supabase.from("benefits").delete().in("id", removedB); if (r.error) errs.push(r.error.message); }
    if (removedF.length) { const r = await supabase.from("faqs").delete().in("id", removedF); if (r.error) errs.push(r.error.message); }
    for (const [i, b] of benefits.entries()) {
      if (!b.title.trim()) continue;
      const row = { title: b.title, description: b.description, icon: b.icon || "star", active: b.active, sort_order: i };
      const r = b.id ? await supabase.from("benefits").update(row).eq("id", b.id) : await supabase.from("benefits").insert(row);
      if (r.error) errs.push(r.error.message);
    }
    for (const [i, f] of faqs.entries()) {
      if (!f.question.trim()) continue;
      const row = { question: f.question, answer: f.answer, active: f.active, sort_order: i };
      const r = f.id ? await supabase.from("faqs").update(row).eq("id", f.id) : await supabase.from("faqs").insert(row);
      if (r.error) errs.push(r.error.message);
    }
    setSaving(false);
    if (errs.length) toast.error("Algumas alterações falharam: " + errs[0]); else toast.success("Configurações salvas");
    qc.invalidateQueries();
  }

  return (
    <div className="max-w-3xl space-y-8 pb-24">
      <PageHeader title="Configurações" desc="Textos, imagens e informações da página de vendas." action={<Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar tudo"}</Button>} />

      <Card title="Perfil">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome"><Input value={s.display_name} onChange={(e) => set("display_name", e.target.value)} /></Field>
          <Field label="@ (usuário)"><Input value={s.handle} onChange={(e) => set("handle", e.target.value)} /></Field>
          <Field label="Foto de perfil" hint="Link da imagem"><Input value={s.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://" /></Field>
          <Field label="Imagem de capa" hint="Link da imagem"><Input value={s.cover_url} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://" /></Field>
        </div>
        <Field label="Bio"><Textarea value={s.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
      </Card>

      <Card title="Textos da página">
        <Field label="Título principal"><Input value={s.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
        <Field label="Subtítulo"><Textarea value={s.subheadline} onChange={(e) => set("subheadline", e.target.value)} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Texto do botão"><Input value={s.cta_label} onChange={(e) => set("cta_label", e.target.value)} /></Field>
          <Field label="Prova social" hint="Ex.: +2.000 assinantes"><Input value={s.social_proof} onChange={(e) => set("social_proof", e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="Redes sociais">
        {s.socials.map((x, i) => (
          <div key={i} className="flex gap-2">
            <Input className="w-36" placeholder="Instagram" value={x.label} onChange={(e) => setS({ ...s, socials: s.socials.map((y, j) => j === i ? { ...y, label: e.target.value } : y) })} />
            <Input placeholder="https://" value={x.url} onChange={(e) => setS({ ...s, socials: s.socials.map((y, j) => j === i ? { ...y, url: e.target.value } : y) })} />
            <Button size="icon" variant="ghost" onClick={() => setS({ ...s, socials: s.socials.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setS({ ...s, socials: [...s.socials, { label: "", url: "" }] })}><Plus className="mr-1 h-4 w-4" />Adicionar rede</Button>
      </Card>

      <Card title="Formas de pagamento">
        {(["pix", "card", "boleto"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm"><Switch checked={!!s.methods[m]} onCheckedChange={(v) => setS({ ...s, methods: { ...s.methods, [m]: v } })} />{m === "pix" ? "PIX" : m === "card" ? "Cartão de crédito" : "Boleto"}</label>
        ))}
        <Field label="Informações de pagamento" hint="Aparece no checkout."><Textarea value={s.payment_info} onChange={(e) => set("payment_info", e.target.value)} /></Field>
      </Card>

      <Card title="Benefícios">
        {benefits.map((b, i) => (
          <div key={b.id ?? `n${i}`} className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex gap-2">
              <Input placeholder="Título" value={b.title} onChange={(e) => setBenefits(benefits.map((y, j) => j === i ? { ...y, title: e.target.value } : y))} />
              <Input className="w-32" placeholder="Ícone" value={b.icon} onChange={(e) => setBenefits(benefits.map((y, j) => j === i ? { ...y, icon: e.target.value } : y))} />
              <Button size="icon" variant="ghost" onClick={() => { if (b.id) setRemovedB([...removedB, b.id]); setBenefits(benefits.filter((_, j) => j !== i)); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea placeholder="Descrição" value={b.description} onChange={(e) => setBenefits(benefits.map((y, j) => j === i ? { ...y, description: e.target.value } : y))} />
            <label className="flex items-center gap-2 text-xs"><Switch checked={b.active} onCheckedChange={(v) => setBenefits(benefits.map((y, j) => j === i ? { ...y, active: v } : y))} />Visível</label>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setBenefits([...benefits, { title: "", description: "", icon: "star", active: true }])}><Plus className="mr-1 h-4 w-4" />Adicionar benefício</Button>
      </Card>

      <Card title="Perguntas frequentes">
        {faqs.map((f, i) => (
          <div key={f.id ?? `n${i}`} className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex gap-2">
              <Input placeholder="Pergunta" value={f.question} onChange={(e) => setFaqs(faqs.map((y, j) => j === i ? { ...y, question: e.target.value } : y))} />
              <Button size="icon" variant="ghost" onClick={() => { if (f.id) setRemovedF([...removedF, f.id]); setFaqs(faqs.filter((_, j) => j !== i)); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea placeholder="Resposta" value={f.answer} onChange={(e) => setFaqs(faqs.map((y, j) => j === i ? { ...y, answer: e.target.value } : y))} />
            <label className="flex items-center gap-2 text-xs"><Switch checked={f.active} onCheckedChange={(v) => setFaqs(faqs.map((y, j) => j === i ? { ...y, active: v } : y))} />Visível</label>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setFaqs([...faqs, { question: "", answer: "", active: true }])}><Plus className="mr-1 h-4 w-4" />Adicionar pergunta</Button>
      </Card>

      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar tudo"}</Button></div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="text-xl">{title}</h2>{children}</section>;
}
