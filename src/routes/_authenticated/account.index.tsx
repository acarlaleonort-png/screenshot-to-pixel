import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate, STATUS_LABEL, type PaymentStatus } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({ meta: [{ title: "Minha conta" }, { name: "robots", content: "noindex" }] }),
  component: Account,
});

function Account() {
  const { user } = Route.useRouteContext();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["account", user.id],
    queryFn: async () => {
      const [subs, orders] = await Promise.all([
        supabase.from("subscriptions").select("*, plans(name)").eq("user_id", user.id).order("expires_at", { ascending: false }),
        supabase.from("orders").select("*, plans(name)").order("created_at", { ascending: false }),
      ]);
      return { subs: subs.data ?? [], orders: orders.data ?? [] };
    },
  });
  const active = data?.subs.find((s) => s.status === "active" && new Date(s.expires_at) > new Date());

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", search: { redirect: undefined, mode: undefined }, replace: true });
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground">← Início</Link>
        <div className="flex gap-2">
          {isAdmin && <Button asChild variant="secondary" size="sm"><Link to="/admin">Painel</Link></Button>}
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
        </div>
      </div>
      <h1 className="mt-6 text-3xl">Minha conta</h1>
      <p className="text-muted-foreground">{user.email}</p>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        {active ? (
          <>
            <p className="text-sm text-success">Acesso ativo</p>
            <p className="mt-1 font-display text-2xl">{(active.plans as { name: string } | null)?.name}</p>
            <p className="text-sm text-muted-foreground">Válido até {formatDate(active.expires_at)}</p>
            <Button asChild className="mt-5 h-12"><Link to="/account/content">Acessar conteúdo</Link></Button>
          </>
        ) : (
          <>
            <p className="font-display text-2xl">Você ainda não tem um acesso ativo</p>
            <Button asChild className="mt-5 h-12"><Link to="/checkout" search={{ plan: undefined }}>Escolher plano</Link></Button>
          </>
        )}
      </section>

      <h2 className="mt-10 text-xl">Pedidos</h2>
      <div className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {data?.orders.length ? data.orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{(o.plans as { name: string } | null)?.name}</p>
              <p className="text-muted-foreground">{formatDate(o.created_at)} · {formatBRL(o.amount)}</p>
            </div>
            {o.status === "PENDING" ? (
              <Link to="/checkout/pending" search={{ order: o.id }} className="text-primary underline">Ver pagamento</Link>
            ) : <Badge variant="secondary">{STATUS_LABEL[o.status as PaymentStatus]}</Badge>}
          </div>
        )) : <p className="p-4 text-sm text-muted-foreground">Nenhum pedido ainda.</p>}
      </div>
    </main>
  );
}
