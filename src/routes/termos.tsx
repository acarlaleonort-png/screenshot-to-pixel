import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLinks } from "@/components/legal/legal-footer";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso" },
      { name: "description", content: "Regras de uso, assinatura, pagamento e acesso ao conteúdo exclusivo +18." },
      { property: "og:title", content: "Termos de Uso" },
      { property: "og:description", content: "Regras de assinatura e acesso ao conteúdo exclusivo." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_p]:mt-3">
      <Link to="/" className="text-muted-foreground">← Voltar</Link>
      <h1 className="mt-4 text-3xl">Termos de Uso</h1>
      <h2>1. Idade mínima</h2>
      <p>O acesso é permitido somente a maiores de 18 anos. Ao entrar e ao comprar, você declara ter 18 anos ou mais.</p>
      <h2>2. Assinatura</h2>
      <p>O plano dá acesso ao conteúdo exclusivo pelo período contratado, liberado após a confirmação do pagamento.</p>
      <h2>3. Pagamento</h2>
      <p>Pagamentos são processados pela VW Pay via PIX, cartão de crédito ou boleto. Estornos e contestações encerram o acesso.</p>
      <h2>4. Uso do conteúdo</h2>
      <p>O conteúdo é pessoal e intransferível. É proibido copiar, gravar, compartilhar ou revender qualquer material.</p>
      <h2>5. Direito de arrependimento</h2>
      <p>Você pode desistir em até 7 dias da compra, conforme o Código de Defesa do Consumidor (art. 49).</p>
      <h2>6. Privacidade</h2>
      <p>O tratamento de dados segue a nossa <Link to="/privacidade" className="underline">Política de Privacidade</Link>.</p>
      <p className="text-muted-foreground">Última atualização: novembro de 2026.</p>
      <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground"><LegalLinks /></footer>
    </main>
  );
}
