import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type PaymentStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/checkout/error")({
  validateSearch: (s: Record<string, unknown>) => ({ status: typeof s["status"] === "string" ? s["status"] : undefined }),
  head: () => ({ meta: [{ title: "Pagamento não concluído" }, { name: "robots", content: "noindex" }] }),
  component: ErrorPage,
});

function ErrorPage() {
  const { status } = Route.useSearch();
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <XCircle className="mx-auto h-14 w-14 text-destructive" />
      <h1 className="mt-4 text-3xl">Pagamento não concluído</h1>
      {status && <p className="mt-2 text-muted-foreground">Status: {STATUS_LABEL[status as PaymentStatus] ?? status}</p>}
      <Button asChild className="mt-8 h-12 w-full"><Link to="/checkout" search={{ plan: undefined }}>Tentar novamente</Link></Button>
    </main>
  );
}
