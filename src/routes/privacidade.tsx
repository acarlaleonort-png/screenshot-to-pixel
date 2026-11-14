import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLinks } from "@/components/legal/legal-footer";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade e Cookies (LGPD)" },
      { name: "description", content: "Como tratamos seus dados pessoais, cookies e seus direitos conforme a LGPD." },
      { property: "og:title", content: "Política de Privacidade e Cookies" },
      { property: "og:description", content: "Tratamento de dados pessoais e direitos do titular conforme a LGPD." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <Link to="/" className="text-muted-foreground">← Voltar</Link>
      <h1 className="mt-4 text-3xl">Política de Privacidade e Cookies</h1>
      <p className="text-muted-foreground">Em conformidade com a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados (LGPD).</p>

      <h2>1. Quem é o controlador</h2>
      <p>O controlador dos dados é a titular deste site. Para qualquer assunto de privacidade, fale com nosso encarregado (DPO) pelo e-mail <strong>[e-mail do encarregado]</strong>.</p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail, celular e senha (criptografada).</li>
        <li><strong>Compra:</strong> CPF ou CNPJ, plano escolhido, valor, forma e status do pagamento.</li>
        <li><strong>Cartão:</strong> os dados do cartão são enviados direto à processadora de pagamento e <strong>não ficam armazenados</strong> aqui.</li>
        <li><strong>Navegação:</strong> páginas visitadas e etapas da compra, apenas se você permitir a medição de uso.</li>
        <li><strong>Técnicos:</strong> endereço IP e dados do navegador, para segurança e prevenção a fraudes.</li>
      </ul>

      <h2>3. Para que usamos e bases legais (art. 7º)</h2>
      <ul>
        <li>Criar sua conta e liberar o conteúdo contratado — <em>execução de contrato</em>.</li>
        <li>Processar pagamentos e emitir comprovantes — <em>execução de contrato</em> e <em>obrigação legal</em>.</li>
        <li>Prevenir fraudes e garantir a segurança — <em>legítimo interesse</em>.</li>
        <li>Confirmar que você é maior de 18 anos — <em>obrigação legal</em> e <em>legítimo interesse</em>.</li>
        <li>Medir o uso do site — <em>consentimento</em>, que você pode retirar a qualquer momento.</li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>Compartilhamos dados apenas com quem é necessário para prestar o serviço: a processadora de pagamentos (VW Pay) e os provedores de hospedagem e banco de dados. Não vendemos seus dados.</p>

      <h2>5. Cookies e armazenamento local</h2>
      <ul>
        <li><strong>Necessários (sempre ativos):</strong> sessão de login, segurança, confirmação de idade e suas escolhas de privacidade.</li>
        <li><strong>Medição de uso (opcional):</strong> estatísticas de visitas e do funil de compra. Só funcionam se você aceitar.</li>
      </ul>
      <p>Você pode mudar sua escolha quando quiser em “Configurar cookies”, no rodapé.</p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>Dados de conta enquanto ela existir. Dados de pagamento pelo prazo exigido pela legislação fiscal (em geral 5 anos). Dados de medição por até 12 meses.</p>

      <h2>7. Seus direitos (art. 18)</h2>
      <ul>
        <li>Confirmar se tratamos seus dados e acessá-los;</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>Pedir anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade dos dados a outro fornecedor;</li>
        <li>Eliminar dados tratados com base no consentimento;</li>
        <li>Saber com quem compartilhamos seus dados;</li>
        <li>Ser informado sobre a possibilidade de não consentir e suas consequências;</li>
        <li>Revogar o consentimento a qualquer momento;</li>
        <li>Reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>
      <p>Para exercer seus direitos, escreva para o encarregado. Respondemos em até 15 dias.</p>

      <h2>8. Segurança</h2>
      <p>Usamos conexão criptografada, controle de acesso e senhas protegidas. Em caso de incidente relevante, avisaremos os titulares e a ANPD.</p>

      <h2>9. Menores de idade</h2>
      <p>Este site é exclusivo para maiores de 18 anos. Não coletamos conscientemente dados de menores; se identificarmos, a conta será excluída.</p>

      <h2>10. Alterações</h2>
      <p>Esta política pode ser atualizada. A data da última versão fica abaixo.</p>
      <p className="text-muted-foreground">Última atualização: novembro de 2026.</p>
      <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground"><LegalLinks /></footer>
    </main>
  );
}
