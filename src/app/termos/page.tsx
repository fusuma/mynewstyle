import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso - MyNewStyle",
  description:
    "Termos de uso do MyNewStyle. Entenda as condições de uso da nossa plataforma de consultoria de visagismo com IA.",
};

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-[800px] px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display mb-8 text-3xl font-bold text-foreground md:text-4xl">
        Termos de Uso
      </h1>

      <div className="font-body space-y-8 text-base leading-relaxed text-foreground">
        <p className="text-muted-foreground">
          Última atualização: 1 de março de 2026
        </p>

        {/* 1. Descrição do serviço */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            1. Descrição do Serviço
          </h2>
          <p>
            O MyNewStyle é uma plataforma de consultoria de visagismo que utiliza
            inteligência artificial para analisar a forma do rosto e fornecer
            recomendações personalizadas de cortes de cabelo e estilos. O serviço
            inclui análise facial por IA, questionário de preferências e geração
            de recomendações visuais.
          </p>
        </section>

        {/* 2. Disclaimer de IA */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            2. Natureza das Recomendações de IA
          </h2>
          <p className="mb-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
            <strong>Importante:</strong> As recomendações fornecidas pelo
            MyNewStyle são sugestões artísticas para inspiração e
            entretenimento. Não constituem aconselhamento profissional de
            visagismo, estética ou saúde. Os resultados gerados por inteligência
            artificial são de natureza inspiradora e devem ser considerados como
            ponto de partida para as suas decisões de estilo pessoal.
          </p>
          <p>
            O MyNewStyle não garante que os resultados da consultoria serão
            adequados para todas as pessoas. Recomendamos que consulte um
            profissional de visagismo para orientação personalizada.
          </p>
        </section>

        {/* 3. Limitação de responsabilidade */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            3. Limitação de Responsabilidade
          </h2>
          <p>
            O MyNewStyle não se responsabiliza por decisões tomadas com base nas
            recomendações geradas pela inteligência artificial. Os resultados são
            inspiracionais e não constituem garantia de resultado estético. A
            utilização do serviço é por conta e risco do usuário.
          </p>
        </section>

        {/* 4. Responsabilidades do usuário */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            4. Responsabilidades do Usuário
          </h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Enviar apenas fotos próprias e que representem fielmente a sua
              aparência atual
            </li>
            <li>
              Fornecer informações precisas no questionário de preferências
            </li>
            <li>
              Não utilizar o serviço para finalidades ilegais ou não autorizadas
            </li>
            <li>
              Manter a confidencialidade das suas credenciais de acesso
            </li>
          </ul>
        </section>

        {/* 5. Pagamento */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            5. Condições de Pagamento
          </h2>
          <p>
            O MyNewStyle opera no modelo de pagamento por consulta. Cada
            consultoria de visagismo é cobrada individualmente. Os pagamentos são
            processados de forma segura pelo Stripe. Os preços são apresentados
            em Reais (BRL) e incluem todos os impostos aplicáveis.
          </p>
        </section>

        {/* 6. Reembolso */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            6. Política de Reembolso
          </h2>
          <p>
            Caso o processamento de IA falhe e não seja possível gerar os
            resultados da consultoria, o reembolso será efetuado
            automaticamente. Em caso de insatisfação com os resultados, entre em
            contato conosco em até 7 dias após a compra para avaliarmos o seu
            caso.
          </p>
        </section>

        {/* 7. Propriedade intelectual */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            7. Propriedade Intelectual
          </h2>
          <p>
            As imagens geradas por IA como parte da consultoria pertencem ao
            usuário para uso pessoal. A plataforma MyNewStyle, incluindo o seu
            design, código, marca e conteúdo original, é propriedade dos seus
            criadores e protegida por direitos autorais.
          </p>
        </section>

        {/* 8. Encerramento de conta */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            8. Encerramento de Conta
          </h2>
          <p>
            Reservamo-nos o direito de suspender ou encerrar contas que violem
            estes termos de uso, incluindo: envio de conteúdo inapropriado, uso
            abusivo do serviço, tentativas de fraude ou qualquer atividade que
            comprometa a segurança da plataforma.
          </p>
        </section>

        {/* 9. Legislação aplicável */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            9. Legislação Aplicável
          </h2>
          <p>
            Estes termos são regidos pela legislação brasileira, incluindo a Lei
            Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e o Código
            de Defesa do Consumidor (Lei nº 8.078/1990). Qualquer disputa será
            resolvida no foro da comarca do domicílio do usuário.
          </p>
        </section>

        {/* 10. Contato */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            10. Contato
          </h2>
          <p>
            Para dúvidas ou reclamações sobre estes termos, entre em contato
            conosco pelo e-mail:{" "}
            <a
              href="mailto:contato@mynewstyle.com.br"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              contato@mynewstyle.com.br
            </a>
            .
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
