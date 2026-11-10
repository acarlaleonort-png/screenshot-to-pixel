import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/checkout/success")({
  head: () => ({ meta: [{ title: "Pagamento confirmado" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
      <h1 className="mt-4 text-3xl">Pagamento confirmado</h1>
      <p className="mt-2 text-muted-foreground">Seu acesso já está liberado.</p>
      <Button asChild className="mt-8 h-12 w-full"><Link to="/account/content">Acessar conteúdo</Link></Button>
    </main>
  ),
});
