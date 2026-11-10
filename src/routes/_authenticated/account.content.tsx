import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account/content")({
  head: () => ({ meta: [{ title: "Conteúdo exclusivo" }, { name: "robots", content: "noindex" }] }),
  component: Content,
});

function Content() {
  // RLS only returns rows when the user has an active, backend-confirmed subscription.
  const { data, isLoading } = useQuery({
    queryKey: ["member-content"],
    queryFn: async () => (await supabase.from("content").select("*").eq("published", true).order("sort_order")).data ?? [],
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
              {c.media_type === "video" && c.media_url ? (
                <video src={c.media_url} poster={c.thumbnail_url ?? undefined} controls className="aspect-video w-full bg-muted" />
              ) : c.media_url ? (
                <img src={c.media_url} alt={c.title} loading="lazy" className="aspect-[4/5] w-full object-cover" />
              ) : null}
              <div className="p-4"><h2 className="text-lg">{c.title}</h2><p className="text-sm text-muted-foreground">{c.description}</p></div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
