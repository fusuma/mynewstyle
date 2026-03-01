import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade - MyNewStyle",
  description:
    "Política de privacidade do MyNewStyle. Saiba como coletamos, usamos e protegemos os seus dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-[800px] px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display mb-8 text-3xl font-bold text-foreground md:text-4xl">
        Política de Privacidade
      </h1>

      <div className="font-body space-y-8 text-base leading-relaxed text-foreground">
        <p className="text-muted-foreground">
          Última atualização: 1 de março de 2026
        </p>

        {/* 1. Controlador de dados */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            1. Controlador de Dados
          </h2>
          <p>
            O MyNewStyle é o controlador dos seus dados pessoais. Nós
            comprometemo-nos a proteger a sua privacidade em conformidade com a
            Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
        </section>

        {/* 2. Dados coletados */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            2. Dados Coletados
          </h2>
          <p className="mb-3">
            Para fornecer o serviço de consultoria de visagismo com IA,
            coletamos os seguintes dados:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Fotos:</strong> imagens do rosto enviadas para análise
              facial
            </li>
            <li>
              <strong>Respostas ao questionário:</strong> preferências de estilo,
              rotina de cuidados e informações relevantes
            </li>
            <li>
              <strong>Dados de uso:</strong> interações com a plataforma,
              dispositivo utilizado e dados de navegação
            </li>
            <li>
              <strong>Dados de pagamento:</strong> processados de forma segura
              pelo Stripe (não armazenamos dados de cartão)
            </li>
          </ul>
        </section>

        {/* 3. Finalidade do tratamento */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            3. Finalidade do Tratamento
          </h2>
          <p>
            Os seus dados são processados para fornecer consultorias de
            visagismo personalizadas utilizando inteligência artificial,
            incluindo análise da forma do rosto e recomendações de cortes de
            cabelo e estilos.
          </p>
        </section>

        {/* 4. Dados biométricos */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            4. Dados Biométricos
          </h2>
          <p className="mb-3">
            A análise facial realizada pelo MyNewStyle constitui tratamento de
            dados biométricos conforme a LGPD. Informamos que:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              A sua foto é analisada por modelos de inteligência artificial para
              identificar a forma do rosto
            </li>
            <li>
              O tratamento de dados biométricos é realizado com base no seu
              consentimento explícito
            </li>
            <li>
              Os dados biométricos extraídos são utilizados exclusivamente para
              gerar recomendações de estilo
            </li>
            <li>
              Não compartilhamos dados biométricos com terceiros para finalidades
              distintas
            </li>
          </ul>
        </section>

        {/* 5. Retenção de dados */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            5. Retenção de Dados
          </h2>
          <p>
            As fotos enviadas são armazenadas de forma segura e eliminadas
            automaticamente após 90 dias de inatividade. Os resultados da
            consultoria são mantidos enquanto a sua conta estiver ativa. Você
            pode solicitar a exclusão dos seus dados a qualquer momento.
          </p>
        </section>

        {/* 6. Seus direitos */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            6. Seus Direitos
          </h2>
          <p className="mb-3">
            De acordo com a LGPD, você tem os seguintes direitos sobre os seus
            dados pessoais:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Acesso:</strong> solicitar uma cópia dos seus dados
              pessoais
            </li>
            <li>
              <strong>Correção:</strong> corrigir dados incompletos ou
              desatualizados
            </li>
            <li>
              <strong>Exclusão:</strong> solicitar a exclusão dos seus dados
              pessoais
            </li>
            <li>
              <strong>Portabilidade:</strong> receber os seus dados em formato
              estruturado para transferência
            </li>
            <li>
              <strong>Revogação do consentimento:</strong> retirar o
              consentimento para o tratamento a qualquer momento
            </li>
          </ul>
        </section>

        {/* 7. Como exercer seus direitos */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            7. Como Exercer Seus Direitos
          </h2>
          <p>
            Para exercer qualquer um dos seus direitos, entre em contato conosco
            pelo e-mail:{" "}
            <a
              href="mailto:privacidade@mynewstyle.com.br"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              privacidade@mynewstyle.com.br
            </a>
            . Responderemos à sua solicitação em até 15 dias úteis.
          </p>
        </section>

        {/* 8. Compartilhamento com terceiros */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            8. Compartilhamento com Terceiros
          </h2>
          <p>
            As suas fotos e dados do questionário são enviados para provedores
            de inteligência artificial (como Google Gemini e OpenAI)
            exclusivamente para o processamento da análise facial e geração de
            recomendações. Esses provedores atuam como operadores de dados e
            estão obrigados a proteger as suas informações conforme as suas
            respectivas políticas de privacidade.
          </p>
        </section>

        {/* 9. Cookies */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            9. Política de Cookies
          </h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento da plataforma e
            cookies analíticos para melhorar a experiência do usuário. Você pode
            gerenciar as suas preferências de cookies nas configurações do
            navegador.
          </p>
        </section>

        {/* 10. Atualizações da política */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            10. Atualizações desta Política
          </h2>
          <p>
            Esta política pode ser atualizada periodicamente. Notificaremos você
            sobre alterações significativas por meio de aviso na plataforma ou
            por e-mail. A data da última atualização será sempre indicada no
            topo desta página.
          </p>
        </section>

        {/* Back to home */}
        <div className="pt-8">
          <Link
            href="/"
            className="font-body text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            &larr; Voltar para a página inicial
          </Link>
        </div>
      </div>
    </article>
  );
}
