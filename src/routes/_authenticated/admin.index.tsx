import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

const FUNNEL = [
  ["page_view", "Visitas"], ["click_cta", "CTA"], ["plan_selected", "Plano"],
  ["checkout_started", "Checkout"], ["payment_pending", "Pagamento"], ["payment_approved", "Aprovação"],
] as const;

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dash"],
    queryFn: async () => {
      const [orders, customers, ...funnel] = await Promise.all([
        supabase.from("orders").select("amount, status, plans(name)").limit(1000),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        ...FUNNEL.map(([e]) => supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event", e)),
      ]);
      return { orders: orders.data ?? [], customers: customers.count ?? 0, funnel: funnel.map((f) => f.count ?? 0) };
    },
  });
  const o = data?.orders ?? [];
  const approved = o.filter((x) => x.status === "APPROVED");
  const revenue = approved.reduce((s, x) => s + Number(x.amount), 0);
  const byPlan = new Map<string, number>();
  approved.forEach((x) => { const n = (x.plans as { name: string } | null)?.name ?? "—"; byPlan.set(n, (byPlan.get(n) ?? 0) + 1); });
  const top = [...byPlan.entries()].sort((a, b) => b[1] - a[1])[0];
  const visits = data?.funnel[0] ?? 0;
  const conv = visits ? ((approved.length / visits) * 100).toFixed(1) + "%" : "—";

  const cards = [
    ["Faturamento", formatBRL(revenue)], ["Vendas", approved.length], ["Clientes", data?.customers ?? 0],
    ["Pedidos", o.length], ["Pendentes", o.filter((x) => x.status === "PENDING").length],
    ["Recusados", o.filter((x) => x.status === "DECLINED").length], ["Conversão", conv], ["Plano mais vendido", top?.[0] ?? "—"],
  ];
  return (
    <div>
      <h1 className="text-3xl">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-display text-2xl">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 text-xl">Funil</h2>
      {visits === 0 ? <p className="mt-2 text-sm text-muted-foreground">Ainda não há dados suficientes.</p> : (
        <div className="mt-4 h-64 rounded-2xl border border-border bg-card p-4">
          <ResponsiveContainer>
            <BarChart data={FUNNEL.map(([, l], i) => ({ l, v: data?.funnel[i] ?? 0 }))}>
              <XAxis dataKey="l" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
