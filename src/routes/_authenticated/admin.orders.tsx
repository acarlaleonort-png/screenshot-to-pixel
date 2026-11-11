import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Empty, METHOD_LABEL, PageHeader, StatusBadge } from "@/components/admin/shared";
import { formatBRL, formatDate, STATUS_LABEL, type PaymentStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: OrdersPage });

const FILTERS: (PaymentStatus | "ALL")[] = ["ALL", "APPROVED", "PENDING", "DECLINED", "CANCELED", "REFUNDED"];

function OrdersPage() {
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, customers(name, email), plans(name)").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const term = q.trim().toLowerCase();
  const rows = data.filter((o) => (status === "ALL" || o.status === status) &&
    (!term || [o.customers?.name, o.customers?.email, o.transaction_id].some((v) => v?.toLowerCase().includes(term))));
  return (
    <div>
      <PageHeader title="Pedidos" desc="Atualizados automaticamente pela confirmação do pagamento." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Buscar cliente ou transação" value={q} onChange={(e) => setQ(e.target.value)} />
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setStatus(f)} className={`rounded-full px-3 py-1.5 text-sm ${status === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {f === "ALL" ? "Todos" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {!rows.length ? <Empty>Nenhum pedido encontrado.</Empty> : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["Cliente", "Plano", "Valor", "Método", "Gateway", "Transação", "Status", "Data"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2">{o.customers?.name}<div className="text-xs text-muted-foreground">{o.customers?.email}</div></td>
                  <td className="px-3 py-2">{o.plans?.name}</td><td className="px-3 py-2">{formatBRL(o.amount)}</td>
                  <td className="px-3 py-2">{METHOD_LABEL[o.method]}</td><td className="px-3 py-2">{o.gateway}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.transaction_id ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={o.status} /></td><td className="px-3 py-2">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
