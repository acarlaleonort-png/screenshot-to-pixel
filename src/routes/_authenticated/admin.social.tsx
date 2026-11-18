import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, PageHeader } from "@/components/admin/shared";
import { LINK_ICONS, displayTotal, formatCounter, isValidLinkUrl } from "@/lib/social-proof";

export const Route = createFileRoute("/_authenticated/admin/social")({ component: SocialPage });

type L = { id?: string; title: string; description: string; url: string; icon: string; active: boolean; highlighted: boolean };
type C = { id: string; counter_key: string; label: string; display_base: number; active: boolean; show_plus: boolean };

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d; if (j < 0 || j >= arr.length) return arr;
  const c = [...arr]; [c[i], c[j]] = [c[j]!, c[i]!]; return c;
}

function SocialPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-social"],
    queryFn: async () => {
      const [l, c, r] = await Promise.all([
        supabase.from("social_links").select("*").order("sort_order"),
        supabase.from("social_proof_counters").select("*").order("sort_order"),
        supabase.rpc("social_proof_real_counts"),
      ]);
      return { l: l.data ?? [], c: c.data ?? [], r: new Map((r.data ?? []).map((x) => [x.counter_key, Number(x.real_count)])) };
    },
  });
  const [links, setLinks] = useState<L[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [counters, setCounters] = useState<C[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLinks(data.l.map((x) => ({ id: x.id, title: x.title, description: x.description, url: x.url, icon: x.icon, active: x.active, highlighted: x.highlighted })));
    setCounters(data.c.map((x) => ({ id: x.id, counter_key: x.counter_key, label: x.label, display_base: x.display_base, active: x.active, show_plus: x.show_plus })));
    setRemoved([]);
  }, [data]);

  const upd = (i: number, p: Partial<L>) => setLinks(links.map((y, j) => (j === i ? { ...y, ...p } : y)));
  const updC = (i: number, p: Partial<C>) => setCounters(counters.map((y, j) => (j === i ? { ...y, ...p } : y)));

  async function save() {
    const bad = links.find((l) => !l.title.trim() || !isValidLinkUrl(l.url));
    if (bad) return void toast.error(`Verifique o link "${bad.title || "sem título"}": título e endereço válido (https://) são obrigatórios.`);
    setSaving(true);
    const errs: string[] = [];
    if (removed.length) { const r = await supabase.from("social_links").delete().in("id", removed); if (r.error) errs.push(r.error.message); }
    for (const [i, l] of links.entries()) {
      const row = { title: l.title.trim(), description: l.description.trim(), url: l.url.trim(), icon: l.icon, active: l.active, highlighted: l.highlighted, sort_order: i };
      const r = l.id ? await supabase.from("social_links").update(row).eq("id", l.id) : await supabase.from("social_links").insert(row);
      if (r.error) errs.push(r.error.message);
    }
    for (const [i, c] of counters.entries()) {
      const r = await supabase.from("social_proof_counters").update({ label: c.label, display_base: Math.max(0, Math.floor(c.display_base || 0)), active: c.active, show_plus: c.show_plus, sort_order: i }).eq("id", c.id);
      if (r.error) errs.push(r.error.message);
    }
    setSaving(false);
    if (errs.length) toast.error("Algumas alterações falharam: " + errs[0]); else toast.success("Salvo");
    qc.invalidateQueries();
  }

  if (!data) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="max-w-3xl space-y-8 pb-24">
      <PageHeader title="Links e Prova Social" desc="Links da página inicial e números exibidos aos visitantes." action={<Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar tudo"}</Button>} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl">Links e Redes</h2>
        {links.length === 0 && <p className="text-sm text-muted-foreground">Nenhum link cadastrado.</p>}
        {links.map((l, i) => (
          <div key={l.id ?? `n${i}`} className="space-y-2 rounded-xl border border-border p-3">
            <div className="grid gap-2 md:grid-cols-[10rem_1fr]">
              <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={l.icon}
                onChange={(e) => { const icon = e.target.value; const lab = LINK_ICONS.find((x) => x.id === icon)?.label; upd(i, { icon, title: l.title || (icon !== "link" ? lab ?? "" : "") }); }}>
                {LINK_ICONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
              <Input placeholder="Título" value={l.title} onChange={(e) => upd(i, { title: e.target.value })} />
            </div>
            <Input placeholder="Descrição (opcional)" value={l.description} onChange={(e) => upd(i, { description: e.target.value })} />
            <Input placeholder="https://" inputMode="url" value={l.url} onChange={(e) => upd(i, { url: e.target.value })}
              aria-invalid={!!l.url && !isValidLinkUrl(l.url)} />
            {l.url && !isValidLinkUrl(l.url) && <p className="text-xs text-destructive">Endereço inválido. Use o link completo, começando com https://</p>}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2"><Switch checked={l.active} onCheckedChange={(v) => upd(i, { active: v })} />Ativo</label>
              <label className="flex items-center gap-2"><Switch checked={l.highlighted} onCheckedChange={(v) => upd(i, { highlighted: v })} />Destaque</label>
              <div className="ml-auto flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => setLinks(move(links, i, -1))}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => setLinks(move(links, i, 1))}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Abrir link" disabled={!isValidLinkUrl(l.url)} onClick={() => window.open(l.url, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => { if (l.id) setRemoved([...removed, l.id]); setLinks(links.filter((_, j) => j !== i)); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setLinks([...links, { title: "", description: "", url: "", icon: "link", active: true, highlighted: false }])}><Plus className="mr-1 h-4 w-4" />Adicionar link</Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl">Prova Social</h2>
        <p className="text-xs text-muted-foreground">Número exibido = valor base + eventos reais. Assinantes reais contam só com pagamento aprovado.</p>
        {counters.map((c, i) => {
          const real = data.r.get(c.counter_key) ?? 0;
          return (
            <div key={c.id} className="space-y-2 rounded-xl border border-border p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Rótulo"><Input value={c.label} onChange={(e) => updC(i, { label: e.target.value })} /></Field>
                <Field label="Valor base"><Input inputMode="numeric" value={String(c.display_base)} onChange={(e) => updC(i, { display_base: Number(e.target.value.replace(/\D/g, "").slice(0, 9)) || 0 })} /></Field>
              </div>
              <p className="text-xs text-muted-foreground">Base {c.display_base.toLocaleString("pt-BR")} + reais {real.toLocaleString("pt-BR")} = exibido <strong className="text-foreground">{formatCounter(displayTotal(c.display_base, real), c.show_plus)} {c.label}</strong></p>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2"><Switch checked={c.active} onCheckedChange={(v) => updC(i, { active: v })} />Ativo</label>
                <label className="flex items-center gap-2"><Switch checked={c.show_plus} onCheckedChange={(v) => updC(i, { show_plus: v })} />Mostrar "+"</label>
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => setCounters(move(counters, i, -1))}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => setCounters(move(counters, i, 1))}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
