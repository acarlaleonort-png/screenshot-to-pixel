import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Empty, PageHeader } from "@/components/admin/shared";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: CustomersPage });

function CustomersPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const { data = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [c, s] = await Promise.all([
        supabase.from("customers").select("*, orders(amount, status, created_at, plans(name))").order("created_at", { ascending: false }).limit(1000),
        supabase.from("subscriptions").select("user_id, expires_at, status, plans(name)"),
      ]);
      const now = Date.now();
      return (c.data ?? []).map((x) => {
        const approved = (x.orders ?? []).filter((o) => o.status === "APPROVED");
        const sub = (s.data ?? []).filter((y) => y.user_id === x.user_id && y.status === "active" && new Date(y.expires_at).getTime() > now)
          .sort((a, b) => b.expires_at.localeCompare(a.expires_at))[0];
        const last = [...(x.orders ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return {
          ...x, spent: approved.reduce((t, o) => t + Number(o.amount), 0), last: last?.created_at ?? null,
          plan: (sub?.plans as { name: string } | null)?.name ?? (last?.plans as { name: string } | null)?.name ?? "—", active: !!sub,
        };
      });
    },
  });
  const term = q.trim().toLowerCase();
  const rows = data.filter((r) => (filter === "all" || (filter === "active") === r.active) &&
    (!term || [r.name, r.email, r.phone ?? ""].some((v) => v.toLowerCase().includes(term))));

  return (
    <div>
      <PageHeader title="Clientes" desc={`${data.length} cadastrados`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Buscar nome, e-mail ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
        {(["all", "active", "inactive"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-sm ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {{ all: "Todos", active: "Com acesso", inactive: "Sem acesso" }[f]}
          </button>
        ))}
      </div>
      {!rows.length ? <Empty>Nenhum cliente encontrado.</Empty> : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["Nome", "E-mail", "Telefone", "Plano", "Status", "Total gasto", "Última compra", "Cadastro"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.email}</td><td className="px-3 py-2">{r.phone ?? "—"}</td>
                  <td className="px-3 py-2">{r.plan}</td>
                  <td className="px-3 py-2">{r.active ? <span className="text-primary">Ativo</span> : <span className="text-muted-foreground">Inativo</span>}</td>
                  <td className="px-3 py-2">{formatBRL(r.spent)}</td><td className="px-3 py-2">{r.last ? formatDate(r.last) : "—"}</td><td className="px-3 py-2">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
