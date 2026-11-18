import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { pickMediaSource, resolveSources } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/account/content")({
  head: () => ({ meta: [{ title: "Conteúdo exclusivo" }, { name: "robots", content: "noindex" }] }),
  component: Content,
});

function Content() {
  // The database only returns content linked to the plan of the user's active subscription.
  const { data, isLoading } = useQuery({
    queryKey: ["member-content"],
    queryFn: async () => {
      const rows = (await supabase.from("content")
        .select("*, media:media!content_media_id_fkey(bucket,storage_path), thumb:media!content_thumbnail_media_id_fkey(bucket,storage_path)")
        .eq("published", true).order("sort_order")).data ?? [];
      const urls = await resolveSources(rows.flatMap((c) => [pickMediaSource(c.media, c.media_url), pickMediaSource(c.thumb, c.thumbnail_url)]));
      return rows.map((c, i) => ({ ...c, src: urls[i * 2], poster: urls[i * 2 + 1] }));
    },
  });
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link to="/account" className="text-sm text-muted-foreground">← Minha conta</Link>
      <h1 className="mt-4 text-3xl">Conteúdo exclusivo</h1>
      {isLoading ? <p className="mt-6 text-muted-foreground">Carregando...</p> : !data?.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">Nenhum conteúdo disponível. Se você ainda não tem acesso ativo, escolha um plano.</p>
          <Button asChild className="mt-5"><Link to="/checkout" search={{ plan: undefined }}>Ver planos</Link></Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              {c.media_type === "video" && c.src ? (
                <video src={c.src} poster={c.poster ?? undefined} controls controlsList="nodownload" className="aspect-video w-full bg-muted" />
              ) : c.media_type === "link" && c.src ? (
                <a href={c.src} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-muted">
                  {c.poster && <img src={c.poster} alt={c.title} className="h-full w-full object-cover" />}
                </a>
              ) : c.src ? (
                <img src={c.src} alt={c.title} loading="lazy" className="aspect-[4/5] w-full object-cover" />
              ) : null}
              <div className="p-4"><h2 className="text-lg">{c.title}</h2><p className="text-sm text-muted-foreground">{c.description}</p></div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
