import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderStatus } from "@/lib/checkout.functions";
import { formatBRL } from "@/lib/format";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/checkout/pending")({
  validateSearch: (s: Record<string, unknown>) => ({ order: typeof s["order"] === "string" ? s["order"] : "" }),
  head: () => ({ meta: [{ title: "Aguardando pagamento" }, { name: "robots", content: "noindex" }] }),
  component: Pending,
});

function Pending() {
  const { order: orderId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderStatus({ data: { orderId } }),
    enabled: !!orderId,
    refetchInterval: (q) => (q.state.data?.status === "PENDING" ? 5000 : false),
  });

  useEffect(() => {
    if (!order) return;
    if (order.status === "APPROVED") {
      track("payment_approved");
      navigate({ to: "/checkout/success", replace: true });
    } else if (order.status !== "PENDING") {
      track("payment_declined");
      navigate({ to: "/checkout/error", search: { status: order.status }, replace: true });
    }
  }, [order, navigate]);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  if (!order) return <div className="p-10 text-center">Pedido não encontrado. <Link to="/account" className="underline">Minha conta</Link></div>;
  const pay = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copiado!"));

  return (
    <main className="mx-auto max-w-md px-5 py-12 text-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-sm text-warning">
        <Loader2 className="h-4 w-4 animate-spin" />
        {order.method === "pix" ? "PIX aguardando pagamento" : "Aguardando confirmação"}
      </span>
      <h1 className="mt-4 text-3xl">{formatBRL(order.amount)}</h1>
      <p className="text-muted-foreground">{(order.plans as { name: string } | null)?.name}</p>

      {order.method === "pix" && pay && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6">
          {pay.pix_qr_code && (
            <img
              src={pay.pix_qr_code.startsWith("http") || pay.pix_qr_code.startsWith("data:") ? pay.pix_qr_code : `data:image/png;base64,${pay.pix_qr_code}`}
              alt="QR Code PIX" className="mx-auto h-56 w-56 rounded-xl bg-foreground p-2" />
          )}
          {pay.pix_copy_paste && (
            <>
              <p className="mt-4 break-all rounded-xl bg-muted p-3 text-left text-xs">{pay.pix_copy_paste}</p>
              <Button className="mt-3 h-12 w-full" onClick={() => copy(pay.pix_copy_paste!)}><Copy className="mr-2 h-4 w-4" /> Copiar código PIX</Button>
            </>
          )}
        </div>
      )}
      {order.method === "boleto" && pay && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-left">
          {pay.boleto_line && <><p className="break-all rounded-xl bg-muted p-3 text-xs">{pay.boleto_line}</p>
            <Button className="mt-3 h-12 w-full" onClick={() => copy(pay.boleto_line!)}>Copiar linha digitável</Button></>}
          {pay.boleto_url && <Button asChild variant="secondary" className="mt-3 h-12 w-full"><a href={pay.boleto_url} target="_blank" rel="noreferrer">Abrir boleto</a></Button>}
          <p className="mt-3 text-xs text-muted-foreground">Após o pagamento, a compensação pode levar até 3 dias úteis. Seu acesso será liberado automaticamente.</p>
        </div>
      )}
      <p className="mt-6 text-sm text-muted-foreground">Esta página atualiza sozinha quando o pagamento for confirmado.</p>
    </main>
  );
}
