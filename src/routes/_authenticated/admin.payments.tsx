import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Empty, METHOD_LABEL, PageHeader, StatusBadge } from "@/components/admin/shared";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { data } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const [p, w] = await Promise.all([
        supabase.from("payments").select("*, orders(customers(name))").order("created_at", { ascending: false }).limit(500),
        supabase.from("webhook_events").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      return { payments: p.data ?? [], hooks: w.data ?? [] };
    },
  });
  const payments = data?.payments ?? [];
  const hooks = data?.hooks ?? [];
  return (
    <div>
      <PageHeader title="Pagamentos" desc="Cobranças geradas e avisos recebidos da VW Pay." />
      {!payments.length ? <Empty>Nenhum pagamento registrado ainda.</Empty> : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["Cliente", "Valor", "Método", "Transação", "Status", "Criado", "Pago em"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">{p.orders?.customers?.name ?? "—"}</td><td className="px-3 py-2">{formatBRL(p.amount)}</td>
                  <td className="px-3 py-2">{METHOD_LABEL[p.method]}</td><td className="px-3 py-2 font-mono text-xs">{p.transaction_id ?? "—"}</td>
                  <td className="px-3 py-2"><StatusBadge status={p.status} /></td><td className="px-3 py-2">{formatDate(p.created_at)}</td>
                  <td className="px-3 py-2">{p.paid_at ? formatDate(p.paid_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="mt-10 mb-3 text-xl">Avisos recebidos</h2>
      {!hooks.length ? <Empty>Nenhum aviso recebido ainda.</Empty> : (
        <div className="space-y-2">
          {hooks.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 text-sm">
              <span className="font-mono text-xs">{h.event_type ?? "evento"}</span>
              <span className={h.signature_valid ? "text-primary" : "text-destructive"}>{h.signature_valid ? "Assinatura válida" : "Assinatura inválida"}</span>
              <span className="text-muted-foreground">{h.processed ? "Processado" : "Não processado"}</span>
              {h.error && <span className="text-destructive">{h.error}</span>}
              <span className="ml-auto text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
