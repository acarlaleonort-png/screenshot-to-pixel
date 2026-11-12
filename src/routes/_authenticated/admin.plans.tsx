import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, Field, PageHeader } from "@/components/admin/shared";
import { formatBRL, PERIOD_NAME, type BillingPeriod } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/plans")({ component: PlansPage });

const DAYS: Record<BillingPeriod, number> = { monthly: 30, quarterly: 90, semiannual: 180, annual: 365, custom: 30 };

type Form = {
  id?: string; name: string; description: string; price: string; billing_period: BillingPeriod; duration_days: string;
  benefits: string; highlighted: boolean; highlight_label: string; cta_label: string; active: boolean;
};
const blank: Form = { name: "", description: "", price: "", billing_period: "monthly", duration_days: "30", benefits: "", highlighted: false, highlight_label: "", cta_label: "Assinar agora", active: true };

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function PlansPage() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await supabase.from("plans").select("*").order("sort_order")).data ?? [],
  });
  const [form, setForm] = useState<Form | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-plans"] });

  async function save() {
    if (!form) return;
    const price = Number(form.price.replace(",", "."));
    if (!form.name.trim() || !(price > 0)) { toast.error("Informe nome e um preço válido."); return; }
    const row = {
      name: form.name.trim(), description: form.description, price, billing_period: form.billing_period,
      duration_days: Number(form.duration_days) || DAYS[form.billing_period],
      benefits: form.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
      highlighted: form.highlighted, highlight_label: form.highlight_label || null, cta_label: form.cta_label || "Assinar agora", active: form.active,
    };
    const { error } = form.id
      ? await supabase.from("plans").update(row).eq("id", form.id)
      : await supabase.from("plans").insert({ ...row, slug: `${slugify(row.name)}-${Date.now().toString(36)}`, sort_order: plans.length });
    if (error) { toast.error("Não foi possível salvar: " + error.message); return; }
    toast.success("Plano salvo"); setForm(null); refresh();
  }

  async function patch(id: string, values: { highlighted?: boolean; active?: boolean }) {
    const { error } = await supabase.from("plans").update(values).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }

  async function move(i: number, dir: -1 | 1) {
    const a = plans[i], b = plans[i + dir];
    if (!a || !b) return;
    await Promise.all([supabase.from("plans").update({ sort_order: i + dir }).eq("id", a.id), supabase.from("plans").update({ sort_order: i }).eq("id", b.id)]);
    refresh();
  }

  async function remove(id: string) {
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("plan_id", id);
    if (count) { toast.error("Este plano já tem pedidos. Desative-o em vez de excluir."); return; }
    if (!confirm("Excluir este plano definitivamente?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Plano excluído"); refresh(); }
  }

  return (
    <div>
      <PageHeader title="Planos" desc="Preços e benefícios exibidos na página de vendas." action={<Button onClick={() => setForm(blank)}><Plus className="mr-1 h-4 w-4" />Novo plano</Button>} />
      {!plans.length ? <Empty>Nenhum plano ainda. Crie o primeiro para liberar as vendas.</Empty> : (
        <div className="space-y-3">
          {plans.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col">
                <button aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button aria-label="Descer" disabled={i === plans.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              </div>
              <div className="min-w-40 flex-1">
                <p className="font-medium">{p.name} {p.highlighted && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{p.highlight_label || "Destaque"}</span>}</p>
                <p className="text-sm text-muted-foreground">{formatBRL(p.price)} · {PERIOD_NAME[p.billing_period]} · {p.duration_days} dias</p>
              </div>
              <label className="flex items-center gap-2 text-sm">Destaque <Switch checked={p.highlighted} onCheckedChange={(v) => patch(p.id, { highlighted: v })} /></label>
              <label className="flex items-center gap-2 text-sm">Ativo <Switch checked={p.active} onCheckedChange={(v) => patch(p.id, { active: v })} /></label>
              <Button variant="outline" size="sm" onClick={() => setForm({
                id: p.id, name: p.name, description: p.description, price: String(p.price), billing_period: p.billing_period,
                duration_days: String(p.duration_days), benefits: (Array.isArray(p.benefits) ? (p.benefits as string[]) : []).join("\n"),
                highlighted: p.highlighted, highlight_label: p.highlight_label ?? "", cta_label: p.cta_label, active: p.active,
              })}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
              <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Descrição"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço (R$)"><Input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
                <Field label="Periodicidade">
                  <Select value={form.billing_period} onValueChange={(v: BillingPeriod) => setForm({ ...form, billing_period: v, duration_days: String(DAYS[v]) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(PERIOD_NAME) as BillingPeriod[]).map((k) => <SelectItem key={k} value={k}>{PERIOD_NAME[k]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Dias de acesso"><Input inputMode="numeric" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></Field>
              <Field label="Benefícios" hint="Um por linha."><Textarea rows={4} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></Field>
              <Field label="Texto do botão"><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></Field>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.highlighted} onCheckedChange={(v) => setForm({ ...form, highlighted: v })} />Destacar</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />Ativo</label>
              </div>
              {form.highlighted && <Field label="Selo do destaque"><Input placeholder="Mais escolhido" value={form.highlight_label} onChange={(e) => setForm({ ...form, highlight_label: e.target.value })} /></Field>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
