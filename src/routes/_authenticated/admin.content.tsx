import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, Field, PageHeader } from "@/components/admin/shared";

export const Route = createFileRoute("/_authenticated/admin/content")({ component: ContentPage });

type CForm = { id?: string; title: string; description: string; media_type: string; media_url: string; thumbnail_url: string; published: boolean; is_preview: boolean };
type PForm = { id?: string; title: string; description: string; thumbnail_url: string; locked: boolean; active: boolean };

function ContentPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["admin-content"], queryFn: async () => (await supabase.from("content").select("*").order("sort_order")).data ?? [] });
  const { data: previews = [] } = useQuery({ queryKey: ["admin-previews"], queryFn: async () => (await supabase.from("content_previews").select("*").order("sort_order")).data ?? [] });
  const [c, setC] = useState<CForm | null>(null);
  const [p, setP] = useState<PForm | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-content"] }); qc.invalidateQueries({ queryKey: ["admin-previews"] }); };

  async function saveC() {
    if (!c?.title.trim()) { toast.error("Informe um título."); return; }
    const row = { title: c.title.trim(), description: c.description, media_type: c.media_type, media_url: c.media_url || null, thumbnail_url: c.thumbnail_url || null, published: c.published, is_preview: c.is_preview };
    const { error } = c.id ? await supabase.from("content").update(row).eq("id", c.id) : await supabase.from("content").insert({ ...row, sort_order: items.length });
    if (error) { toast.error(error.message); return; }
    toast.success("Conteúdo salvo"); setC(null); refresh();
  }
  async function saveP() {
    if (!p?.title.trim()) { toast.error("Informe um título."); return; }
    const row = { title: p.title.trim(), description: p.description, thumbnail_url: p.thumbnail_url || null, locked: p.locked, active: p.active };
    const { error } = p.id ? await supabase.from("content_previews").update(row).eq("id", p.id) : await supabase.from("content_previews").insert({ ...row, sort_order: previews.length });
    if (error) { toast.error(error.message); return; }
    toast.success("Prévia salva"); setP(null); refresh();
  }
  async function del(table: "content" | "content_previews", id: string) {
    if (!confirm("Excluir definitivamente?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Conteúdo exclusivo" desc="Liberado apenas para assinantes ativos." action={<Button onClick={() => setC({ title: "", description: "", media_type: "image", media_url: "", thumbnail_url: "", published: true, is_preview: false })}><Plus className="mr-1 h-4 w-4" />Novo conteúdo</Button>} />
        {!items.length ? <Empty>Nenhum conteúdo cadastrado.</Empty> : (
          <div className="space-y-3">{items.map((i) => (
            <div key={i.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              {i.thumbnail_url ? <img src={i.thumbnail_url} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-muted" />}
              <div className="flex-1"><p className="font-medium">{i.title}</p><p className="text-xs text-muted-foreground">{i.media_type === "video" ? "Vídeo" : i.media_type === "link" ? "Link" : "Imagem"} · {i.published ? "Publicado" : "Rascunho"}</p></div>
              <Button size="icon" variant="ghost" onClick={() => setC({ id: i.id, title: i.title, description: i.description, media_type: i.media_type, media_url: i.media_url ?? "", thumbnail_url: i.thumbnail_url ?? "", published: i.published, is_preview: i.is_preview })}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del("content", i.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>))}</div>
        )}
      </section>
      <section>
        <PageHeader title="Prévias da página de vendas" desc="Aparecem com desfoque para quem ainda não assinou." action={<Button variant="outline" onClick={() => setP({ title: "", description: "", thumbnail_url: "", locked: true, active: true })}><Plus className="mr-1 h-4 w-4" />Nova prévia</Button>} />
        {!previews.length ? <Empty>Nenhuma prévia cadastrada.</Empty> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{previews.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border bg-card p-3">
              {i.thumbnail_url ? <img src={i.thumbnail_url} alt="" className={`aspect-square w-full rounded-lg object-cover ${i.locked ? "blur-sm" : ""}`} /> : <div className="aspect-square rounded-lg bg-muted" />}
              <p className="mt-2 text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.active ? "Visível" : "Oculta"} · {i.locked ? "Com desfoque" : "Aberta"}</p>
              <div className="mt-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => setP({ id: i.id, title: i.title, description: i.description, thumbnail_url: i.thumbnail_url ?? "", locked: i.locked, active: i.active })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del("content_previews", i.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>))}</div>
        )}
      </section>

      <Dialog open={!!c} onOpenChange={(o) => !o && setC(null)}>
        <DialogContent><DialogHeader><DialogTitle>{c?.id ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle></DialogHeader>
          {c && <div className="space-y-3">
            <Field label="Título"><Input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={c.media_type} onValueChange={(v) => setC({ ...c, media_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem><SelectItem value="link">Link</SelectItem></SelectContent></Select></Field>
            <Field label="Endereço da mídia" hint="Link da foto, vídeo ou página."><Input value={c.media_url} onChange={(e) => setC({ ...c, media_url: e.target.value })} placeholder="https://" /></Field>
            <Field label="Miniatura"><Input value={c.thumbnail_url} onChange={(e) => setC({ ...c, thumbnail_url: e.target.value })} placeholder="https://" /></Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={c.published} onCheckedChange={(v) => setC({ ...c, published: v })} />Publicado</label>
          </div>}
          <DialogFooter><Button onClick={saveC}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!p} onOpenChange={(o) => !o && setP(null)}>
        <DialogContent><DialogHeader><DialogTitle>{p?.id ? "Editar prévia" : "Nova prévia"}</DialogTitle></DialogHeader>
          {p && <div className="space-y-3">
            <Field label="Título"><Input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
            <Field label="Descrição"><Textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
            <Field label="Imagem"><Input value={p.thumbnail_url} onChange={(e) => setP({ ...p, thumbnail_url: e.target.value })} placeholder="https://" /></Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={p.locked} onCheckedChange={(v) => setP({ ...p, locked: v })} />Mostrar com desfoque</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} />Visível na página</label>
          </div>}
          <DialogFooter><Button onClick={saveP}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
