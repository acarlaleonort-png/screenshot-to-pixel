import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, Field, PageHeader } from "@/components/admin/shared";
import { PROTECTED_BUCKET, PUBLIC_BUCKET, pickMediaSource, resolveSources, uploadMedia, type MediaBucket } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/admin/content")({ component: ContentPage });

type Picked = { id: string; name: string } | null;
type CForm = { id?: string; title: string; description: string; media_type: string; media_url: string; thumbnail_url: string; published: boolean; is_preview: boolean; media: Picked; thumb: Picked; plans: string[] };
type PForm = { id?: string; title: string; description: string; thumbnail_url: string; locked: boolean; active: boolean; thumb: Picked };
type MediaRow = { id: string; bucket: string; storage_path: string; file_name: string } | null;

function FilePick({ label, bucket, folder, accept, value, onChange }: { label: string; bucket: MediaBucket; folder: string; accept: string; value: Picked; onChange: (v: Picked) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Field label={label} hint={bucket === PROTECTED_BUCKET ? "Arquivo protegido: só assinantes com acesso veem." : "Arquivo exibido na página de vendas."}>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <span className="flex-1 truncate">{value.name}</span>
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(null)} aria-label="Remover arquivo"><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:bg-muted/40">
          <Upload className="h-4 w-4" />{busy ? "Enviando..." : "Escolher arquivo"}
          <input type="file" accept={accept} className="sr-only" disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            setBusy(true);
            try { const m = await uploadMedia(f, bucket, folder); onChange({ id: m.id, name: m.file_name }); toast.success("Arquivo enviado"); }
            catch (err) { toast.error(err instanceof Error ? err.message : "Falha no envio"); }
            finally { setBusy(false); }
          }} />
        </label>
      )}
    </Field>
  );
}

function ContentPage() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["admin-plans-min"], queryFn: async () => (await supabase.from("plans").select("id,name,active").order("sort_order")).data ?? [] });
  const { data: items = [] } = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const rows = (await supabase.from("content")
        .select("*, media:media!content_media_id_fkey(id,bucket,storage_path,file_name), thumb:media!content_thumbnail_media_id_fkey(id,bucket,storage_path,file_name), content_plans(plan_id)")
        .order("sort_order")).data ?? [];
      const urls = await resolveSources(rows.map((r) => pickMediaSource(r.thumb as MediaRow, r.thumbnail_url)));
      return rows.map((r, i) => ({ ...r, thumbSrc: urls[i] }));
    },
  });
  const { data: previews = [] } = useQuery({
    queryKey: ["admin-previews"],
    queryFn: async () => {
      const rows = (await supabase.from("content_previews").select("*, thumb:media!content_previews_thumbnail_media_id_fkey(id,bucket,storage_path,file_name)").order("sort_order")).data ?? [];
      const urls = await resolveSources(rows.map((r) => pickMediaSource(r.thumb as MediaRow, r.thumbnail_url)));
      return rows.map((r, i) => ({ ...r, thumbSrc: urls[i] }));
    },
  });
  const [c, setC] = useState<CForm | null>(null);
  const [p, setP] = useState<PForm | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-content"] }); qc.invalidateQueries({ queryKey: ["admin-previews"] }); };
  const planName = (id: string) => plans.find((x) => x.id === id)?.name ?? "Plano";

  async function saveC() {
    if (!c?.title.trim()) { toast.error("Informe um título."); return; }
    if (c.published && !c.plans.length) { toast.error("Escolha pelo menos um plano com acesso, ou salve como rascunho."); return; }
    const row = { title: c.title.trim(), description: c.description, media_type: c.media_type, media_url: c.media_url || null, thumbnail_url: c.thumbnail_url || null, media_id: c.media?.id ?? null, thumbnail_media_id: c.thumb?.id ?? null, published: c.published, is_preview: c.is_preview };
    const res = c.id ? await supabase.from("content").update(row).eq("id", c.id).select("id").single() : await supabase.from("content").insert({ ...row, sort_order: items.length }).select("id").single();
    if (res.error) { toast.error(res.error.message); return; }
    const id = res.data.id;
    const del = await supabase.from("content_plans").delete().eq("content_id", id);
    if (del.error) { toast.error(del.error.message); return; }
    if (c.plans.length) {
      const ins = await supabase.from("content_plans").insert(c.plans.map((plan_id) => ({ content_id: id, plan_id })));
      if (ins.error) { toast.error(ins.error.message); return; }
    }
    toast.success("Conteúdo salvo"); setC(null); refresh();
  }
  async function saveP() {
    if (!p?.title.trim()) { toast.error("Informe um título."); return; }
    const row = { title: p.title.trim(), description: p.description, thumbnail_url: p.thumbnail_url || null, thumbnail_media_id: p.thumb?.id ?? null, locked: p.locked, active: p.active };
    const { error } = p.id ? await supabase.from("content_previews").update(row).eq("id", p.id) : await supabase.from("content_previews").insert({ ...row, sort_order: previews.length });
    if (error) { toast.error(error.message); return; }
    toast.success("Prévia salva"); setP(null); refresh();
  }
  async function del(table: "content" | "content_previews", id: string) {
    if (!confirm("Excluir definitivamente?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  const pick = (m: MediaRow): Picked => (m ? { id: m.id, name: m.file_name || m.storage_path } : null);

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Conteúdo exclusivo" desc="Cada conteúdo é liberado só para os planos escolhidos." action={<Button onClick={() => setC({ title: "", description: "", media_type: "image", media_url: "", thumbnail_url: "", published: true, is_preview: false, media: null, thumb: null, plans: plans.filter((x) => x.active).map((x) => x.id) })}><Plus className="mr-1 h-4 w-4" />Novo conteúdo</Button>} />
        {!items.length ? <Empty>Nenhum conteúdo cadastrado.</Empty> : (
          <div className="space-y-3">{items.map((i) => {
            const ids = (i.content_plans ?? []).map((x) => x.plan_id);
            return (
              <div key={i.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                {i.thumbSrc ? <img src={i.thumbSrc} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{i.media_type === "video" ? "Vídeo" : i.media_type === "link" ? "Link" : "Imagem"} · {i.published ? "Publicado" : "Rascunho"}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ids.length ? ids.map((pid) => <span key={pid} className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{planName(pid)}</span>)
                      : <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">Sem plano — ninguém vê</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setC({ id: i.id, title: i.title, description: i.description, media_type: i.media_type, media_url: i.media_url ?? "", thumbnail_url: i.thumbnail_url ?? "", published: i.published, is_preview: i.is_preview, media: pick(i.media as MediaRow), thumb: pick(i.thumb as MediaRow), plans: ids })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => del("content", i.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}</div>
        )}
      </section>
      <section>
        <PageHeader title="Prévias da página de vendas" desc="Aparecem com desfoque para quem ainda não assinou." action={<Button variant="outline" onClick={() => setP({ title: "", description: "", thumbnail_url: "", locked: true, active: true, thumb: null })}><Plus className="mr-1 h-4 w-4" />Nova prévia</Button>} />
        {!previews.length ? <Empty>Nenhuma prévia cadastrada.</Empty> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{previews.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border bg-card p-3">
              {i.thumbSrc ? <img src={i.thumbSrc} alt="" className={`aspect-square w-full rounded-lg object-cover ${i.locked ? "blur-sm" : ""}`} /> : <div className="aspect-square rounded-lg bg-muted" />}
              <p className="mt-2 text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.active ? "Visível" : "Oculta"} · {i.locked ? "Com desfoque" : "Aberta"}</p>
              <div className="mt-1 flex justify-end">
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setP({ id: i.id, title: i.title, description: i.description, thumbnail_url: i.thumbnail_url ?? "", locked: i.locked, active: i.active, thumb: pick(i.thumb as MediaRow) })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => del("content_previews", i.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>))}</div>
        )}
      </section>

      <Dialog open={!!c} onOpenChange={(o) => !o && setC(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{c?.id ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle></DialogHeader>
          {c && <div className="space-y-3">
            <Field label="Título"><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={c.media_type} onValueChange={(v) => setC({ ...c, media_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem><SelectItem value="link">Link</SelectItem></SelectContent></Select></Field>
            {c.media_type !== "link" && <FilePick label="Arquivo" bucket={PROTECTED_BUCKET} folder="content" accept={c.media_type === "video" ? "video/*" : "image/*"} value={c.media} onChange={(v) => setC({ ...c, media: v })} />}
            {(c.media_type === "link" || (!c.media && c.media_url)) && (
              <Field label={c.media_type === "link" ? "Endereço do link" : "Endereço antigo (usado se não houver arquivo)"}><Input value={c.media_url} onChange={(e) => setC({ ...c, media_url: e.target.value })} placeholder="https://" /></Field>
            )}
            <FilePick label="Miniatura" bucket={PROTECTED_BUCKET} folder="thumbnails" accept="image/*" value={c.thumb} onChange={(v) => setC({ ...c, thumb: v })} />
            {!c.thumb && c.thumbnail_url && <Field label="Miniatura antiga (link)"><Input value={c.thumbnail_url} onChange={(e) => setC({ ...c, thumbnail_url: e.target.value })} /></Field>}
            <Field label="Planos com acesso" hint="Só assinantes ativos destes planos verão este conteúdo.">
              <div className="space-y-2 rounded-md border border-border p-3">
                {!plans.length && <p className="text-sm text-muted-foreground">Cadastre planos primeiro.</p>}
                {plans.map((pl) => (
                  <label key={pl.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={c.plans.includes(pl.id)} onCheckedChange={(v) => setC({ ...c, plans: v ? [...c.plans, pl.id] : c.plans.filter((x) => x !== pl.id) })} />
                    {pl.name}{!pl.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                  </label>
                ))}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={c.published} onCheckedChange={(v) => setC({ ...c, published: v })} />Publicado</label>
          </div>}
          <DialogFooter><Button onClick={saveC}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!p} onOpenChange={(o) => !o && setP(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{p?.id ? "Editar prévia" : "Nova prévia"}</DialogTitle></DialogHeader>
          {p && <div className="space-y-3">
            <Field label="Título"><Input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
            <FilePick label="Imagem" bucket={PUBLIC_BUCKET} folder="previews" accept="image/*" value={p.thumb} onChange={(v) => setP({ ...p, thumb: v })} />
            {!p.thumb && p.thumbnail_url && <Field label="Imagem antiga (link)"><Input value={p.thumbnail_url} onChange={(e) => setP({ ...p, thumbnail_url: e.target.value })} /></Field>}
            <label className="flex items-center gap-2 text-sm"><Switch checked={p.locked} onCheckedChange={(v) => setP({ ...p, locked: v })} />Mostrar com desfoque</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} />Visível na página</label>
          </div>}
          <DialogFooter><Button onClick={saveP}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
