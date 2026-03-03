import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade - MyNewStyle",
  description:
    "Política de privacidade do MyNewStyle. Saiba como coletamos, usamos e protegemos os seus dados pessoais, incluindo dados biométricos, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-[800px] px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display mb-8 text-3xl font-bold text-foreground md:text-4xl">
        Política de Privacidade
      </h1>

      <div className="font-body space-y-8 text-base leading-relaxed text-foreground">
        <p className="text-muted-foreground">
          Última atualização: 3 de março de 2026
        </p>

        {/* 1. Controlador de dados e Encarregado (DPO) */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            1. Controlador de Dados e Encarregado (DPO)
          </h2>
          <p className="mb-3">
            O <strong>MyNewStyle</strong> é o controlador dos seus dados
            pessoais. Comprometemo-nos a proteger a sua privacidade em
            conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei
            nº&nbsp;13.709/2018).
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Razão social:</strong> MyNewStyle
            </li>
            <li>
              <strong>Encarregado de Proteção de Dados (DPO):</strong>{" "}
              <a
                href="mailto:privacidade@mynewstyle.com.br"
                className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                privacidade@mynewstyle.com.br
              </a>
            </li>
            <li>
              <strong>Prazo de resposta:</strong> Até 15 dias úteis para
              solicitações de titulares de dados (Art.&nbsp;18 da LGPD)
            </li>
          </ul>
        </section>

        {/* 2. Dados Coletados */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            2. Dados Coletados
          </h2>
          <p className="mb-3">
            Para fornecer o serviço de consultoria de visagismo com IA,
            coletamos os seguintes dados pessoais:
          </p>

          <h3 className="font-display mb-2 text-base font-semibold text-foreground">
            Dados cadastrais (usuários registrados)
          </h3>
          <ul className="mb-4 ml-6 list-disc space-y-2">
            <li>
              <strong>Nome completo</strong> (nome e sobrenome)
            </li>
            <li>
              <strong>E-mail</strong> (endereço de correio eletrônico)
            </li>
            <li>
              <strong>Nome de exibição</strong> (display_name)
            </li>
            <li>
              <strong>Preferência de gênero</strong> (gender_preference) —
              utilizada para personalizar as recomendações de estilo
            </li>
          </ul>

          <h3 className="font-display mb-2 text-base font-semibold text-foreground">
            Dados de sessão (usuários visitantes)
          </h3>
          <ul className="mb-4 ml-6 list-disc space-y-2">
            <li>
              <strong>Identificador de sessão de visitante</strong>{" "}
              (guest_session_id) — armazenado localmente no navegador para
              recuperação de sessão
            </li>
            <li>
              <strong>Informações do dispositivo</strong> (device_info) —
              tipo de dispositivo, sistema operacional, navegador
            </li>
          </ul>

          <h3 className="font-display mb-2 text-base font-semibold text-foreground">
            Dados biométricos
          </h3>
          <ul className="mb-4 ml-6 list-disc space-y-2">
            <li>
              <strong>Foto do rosto</strong> — enviada para análise facial por
              inteligência artificial (dado biométrico — ver Seção 4)
            </li>
          </ul>

          <h3 className="font-display mb-2 text-base font-semibold text-foreground">
            Dados do questionário
          </h3>
          <ul className="mb-4 ml-6 list-disc space-y-2">
            <li>
              Preferências de estilo, rotina de cuidados pessoais e informações
              relevantes fornecidas ao responder o questionário de consultoria
            </li>
          </ul>

          <h3 className="font-display mb-2 text-base font-semibold text-foreground">
            Dados de uso e analytics
          </h3>
          <ul className="mb-4 ml-6 list-disc space-y-2">
            <li>
              <strong>Eventos de analytics</strong> (analytics_events) —
              interações com a plataforma, páginas visitadas, funil de
              conversão
            </li>
            <li>
              <strong>Informações técnicas</strong> — endereço IP (processado
              pelo provedor de hospedagem), logs de requisição
            </li>
          </ul>

          <h3 className="font-display mb-2 text-base font-semibold text-foreground">
            Dados de pagamento
          </h3>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Processados exclusivamente pelo Stripe. Não armazenamos dados de
              cartão de crédito em nossos servidores.
            </li>
          </ul>
        </section>

        {/* 3. Finalidade do Tratamento */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            3. Finalidade do Tratamento
          </h2>
          <p className="mb-3">
            Os seus dados são tratados para as seguintes finalidades
            específicas:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Consultoria de visagismo:</strong> análise da forma do
              rosto e geração de recomendações personalizadas de cortes de
              cabelo e estilos utilizando inteligência artificial
            </li>
            <li>
              <strong>Gerenciamento de perfil:</strong> criação e manutenção
              da sua conta, autenticação e histórico de consultorias
            </li>
            <li>
              <strong>Processamento de pagamento:</strong> cobrança pelo acesso
              às consultorias completas, processada via Stripe
            </li>
            <li>
              <strong>Analytics e otimização:</strong> análise do funil de
              conversão, melhoria da experiência do usuário e da qualidade das
              recomendações
            </li>
            <li>
              <strong>Geração de cards de compartilhamento:</strong> criação
              de imagens de resultado para compartilhamento em redes sociais,
              conforme solicitação do usuário
            </li>
            <li>
              <strong>Geração de prévias de estilo:</strong> criação de imagens
              de prévia visual do estilo recomendado via Kie.ai
            </li>
          </ul>
        </section>

        {/* 4. Dados Biométricos */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            4. Dados Biométricos
          </h2>
          <p className="mb-3">
            A análise facial realizada pelo MyNewStyle constitui tratamento de
            dados biométricos conforme o Art.&nbsp;5,&nbsp;II da LGPD.
            Informamos que:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              A sua foto é analisada por modelos de inteligência artificial
              (Google Gemini e, como alternativa, OpenAI) para identificar a
              forma do rosto
            </li>
            <li>
              O tratamento de dados biométricos é realizado exclusivamente com
              base no seu <strong>consentimento explícito</strong>, nos termos
              do Art.&nbsp;11,&nbsp;II,&nbsp;"a" da LGPD
            </li>
            <li>
              A foto é enviada em formato base64 para os provedores de IA
              externos durante o processamento; esses provedores atuam como
              operadores de dados sob nossa instrução
            </li>
            <li>
              <strong>
                Não armazenamos modelos biométricos, embeddings ou templates
              </strong>{" "}
              derivados da sua face. O resultado da análise é armazenado como
              dado derivado (forma do rosto, proporções) — não como dado
              biométrico bruto
            </li>
            <li>
              Os dados biométricos extraídos são utilizados exclusivamente para
              gerar recomendações de estilo
            </li>
            <li>
              Não compartilhamos dados biométricos com terceiros para
              finalidades distintas das descritas nesta política
            </li>
          </ul>
        </section>

        {/* 5. Retenção de Dados */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            5. Retenção de Dados
          </h2>
          <p className="mb-3">
            Os dados são retidos pelos seguintes períodos, conforme a
            finalidade do tratamento:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Fotos de rosto:</strong> excluídas automaticamente após
              90 dias de inatividade (bucket{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">
                consultation-photos
              </code>
              )
            </li>
            <li>
              <strong>Imagens de prévia:</strong> excluídas automaticamente
              após 90 dias de inatividade (bucket{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">
                preview-images
              </code>
              )
            </li>
            <li>
              <strong>Cards de compartilhamento:</strong> excluídos
              automaticamente após 30 dias (bucket{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">
                share-cards
              </code>
              )
            </li>
            <li>
              <strong>Resultados de consultoria:</strong> mantidos enquanto a
              sua conta estiver ativa
            </li>
            <li>
              <strong>Dados cadastrais:</strong> mantidos enquanto a conta
              estiver ativa ou até solicitação de exclusão
            </li>
            <li>
              <strong>Eventos de analytics:</strong> agregados e anonimizados
              após 12 meses
            </li>
          </ul>
          <p className="mt-3">
            Você pode solicitar a exclusão dos seus dados a qualquer momento
            pelo e-mail{" "}
            <a
              href="mailto:privacidade@mynewstyle.com.br"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              privacidade@mynewstyle.com.br
            </a>
            .
          </p>
        </section>

        {/* 6. Seus Direitos */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            6. Seus Direitos (Art. 18 da LGPD)
          </h2>
          <p className="mb-3">
            De acordo com o Art.&nbsp;18 da LGPD, você tem os seguintes
            direitos sobre os seus dados pessoais:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Acesso:</strong> solicitar uma cópia dos seus dados
              pessoais que possuímos
            </li>
            <li>
              <strong>Correção:</strong> corrigir dados incompletos, inexatos
              ou desatualizados
            </li>
            <li>
              <strong>Exclusão:</strong> solicitar a eliminação dos seus dados
              pessoais (direito à exclusão de conta — em breve disponível
              diretamente na plataforma)
            </li>
            <li>
              <strong>Portabilidade:</strong> receber os seus dados em formato
              estruturado para transferência a outro controlador (exportação de
              dados — em breve disponível diretamente na plataforma)
            </li>
            <li>
              <strong>Revogação do consentimento:</strong> retirar o
              consentimento para o tratamento a qualquer momento, sem prejuízo
              da licitude do tratamento anterior
            </li>
            <li>
              <strong>Anonimização ou bloqueio:</strong> solicitar a
              anonimização ou bloqueio de dados desnecessários, excessivos ou
              tratados em desconformidade com a LGPD
            </li>
            <li>
              <strong>Informação sobre compartilhamento:</strong> obter
              informações sobre as entidades públicas e privadas com as quais
              compartilhamos os seus dados
            </li>
            <li>
              <strong>Oposição ao tratamento:</strong> opor-se ao tratamento
              realizado com fundamento em hipótese legal diversa do
              consentimento
            </li>
            <li>
              <strong>Revisão de decisões automatizadas:</strong> solicitar a
              revisão de decisões tomadas exclusivamente com base em tratamento
              automatizado (Art.&nbsp;20 da LGPD)
            </li>
          </ul>
        </section>

        {/* 7. Como Exercer Seus Direitos */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            7. Como Exercer Seus Direitos
          </h2>
          <p>
            Para exercer qualquer um dos seus direitos, entre em contato
            conosco pelo e-mail:{" "}
            <a
              href="mailto:privacidade@mynewstyle.com.br"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              privacidade@mynewstyle.com.br
            </a>
            . Responderemos à sua solicitação em até 15 dias úteis, conforme
            exigido pelo Art.&nbsp;18 da LGPD.
          </p>
        </section>

        {/* 8. Compartilhamento com Terceiros */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            8. Compartilhamento com Terceiros
          </h2>
          <p className="mb-3">
            Os seus dados podem ser compartilhados com os seguintes operadores
            e suboperadores, exclusivamente para as finalidades descritas:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Google (Gemini AI):</strong> recebe foto (base64) e
              respostas do questionário para análise facial e geração de
              consultoria de estilo.{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Política de privacidade do Google
              </a>
            </li>
            <li>
              <strong>OpenAI:</strong> provedor de IA alternativo; recebe foto
              (base64) e respostas do questionário quando o Google Gemini não
              está disponível.{" "}
              <a
                href="https://openai.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Política de privacidade da OpenAI
              </a>
            </li>
            <li>
              <strong>Kie.ai (Nano Banana 2):</strong> recebe a URL da foto e
              descrição do estilo para geração de imagens de prévia visual.{" "}
              <a
                href="https://kie.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Política de privacidade da Kie.ai
              </a>
            </li>
            <li>
              <strong>Stripe:</strong> recebe dados da intenção de pagamento e
              valor para processamento seguro de transações. Dados de cartão
              não passam pelos nossos servidores.{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Política de privacidade do Stripe
              </a>
            </li>
            <li>
              <strong>Supabase:</strong> provedor de banco de dados,
              autenticação e armazenamento de arquivos. Todos os dados de
              usuário são armazenados na infraestrutura do Supabase.{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Política de privacidade do Supabase
              </a>
            </li>
            <li>
              <strong>Vercel:</strong> provedor de hospedagem e funções
              serverless; processa logs de requisição e analytics de acesso.{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Política de privacidade da Vercel
              </a>
            </li>
          </ul>
          <p className="mt-3 text-muted-foreground text-sm">
            Todos os terceiros acima atuam como operadores de dados sob nossa
            instrução e estão obrigados contratualmente a proteger as suas
            informações.
          </p>
        </section>

        {/* 9. Transferências Internacionais */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            9. Transferências Internacionais de Dados
          </h2>
          <p className="mb-3">
            Nos termos do Art.&nbsp;33 da LGPD, informamos que os dados podem
            ser transferidos para fora do Brasil:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Os provedores de IA (Google Gemini, OpenAI) e de hospedagem
              (Vercel) podem processar dados em servidores localizados nos
              Estados Unidos e em outros países fora do Brasil ou da União
              Europeia
            </li>
            <li>
              Essas transferências são realizadas com base em cláusulas
              contratuais padrão e nas políticas de privacidade dos respectivos
              provedores, que adotam medidas adequadas de proteção de dados
            </li>
            <li>
              Ao utilizar o MyNewStyle e fornecer o seu consentimento, você
              está ciente e concorda com essas transferências internacionais
            </li>
          </ul>
        </section>

        {/* 10. Segurança dos Dados */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            10. Segurança dos Dados
          </h2>
          <p className="mb-3">
            Adotamos medidas técnicas e organizacionais para proteger os seus
            dados pessoais:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Criptografia em trânsito:</strong> todas as comunicações
              utilizam TLS/SSL
            </li>
            <li>
              <strong>Criptografia em repouso:</strong> dados armazenados no
              Supabase são criptografados em repouso
            </li>
            <li>
              <strong>Controle de acesso a dados (RLS):</strong>{" "}
              Row-Level&nbsp;Security no banco de dados garante que cada
              usuário acessa apenas seus próprios dados
            </li>
            <li>
              <strong>URLs assinadas:</strong> o acesso a fotos e imagens é
              protegido por URLs temporárias e assinadas
            </li>
            <li>
              <strong>Chaves de API server-side:</strong> as chaves de acesso
              aos provedores de IA nunca são expostas ao cliente
            </li>
          </ul>
        </section>

        {/* 11. Menores de Idade */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            11. Menores de Idade
          </h2>
          <p>
            O MyNewStyle não é destinado a pessoas com menos de 18 anos de
            idade. Não coletamos intencionalmente dados pessoais de menores de
            18 anos. Caso identifiquemos que um menor forneceu dados sem
            consentimento dos responsáveis legais, eliminaremos esses dados
            imediatamente. Se você suspeitar que um menor cadastrou-se no
            serviço, entre em contato pelo e-mail{" "}
            <a
              href="mailto:privacidade@mynewstyle.com.br"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              privacidade@mynewstyle.com.br
            </a>
            .
          </p>
        </section>

        {/* 12. Decisões Automatizadas */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            12. Decisões Automatizadas (Art. 20 da LGPD)
          </h2>
          <p className="mb-3">
            O MyNewStyle utiliza inteligência artificial e algoritmos
            automatizados para:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Analisar a forma do rosto a partir da foto fornecida
            </li>
            <li>
              Gerar recomendações personalizadas de cortes de cabelo e estilos
              com base na análise facial e nas respostas ao questionário
            </li>
            <li>
              Gerar imagens de prévia visual do estilo recomendado
            </li>
          </ul>
          <p className="mt-3">
            Nos termos do Art.&nbsp;20 da LGPD, você tem o direito de solicitar
            a revisão de decisões tomadas exclusivamente com base nesses
            processos automatizados. Para exercer esse direito, entre em
            contato pelo e-mail{" "}
            <a
              href="mailto:privacidade@mynewstyle.com.br"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              privacidade@mynewstyle.com.br
            </a>
            .
          </p>
        </section>

        {/* 13. Política de Cookies */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            13. Política de Cookies e Armazenamento Local
          </h2>
          <p className="mb-3">
            Utilizamos as seguintes tecnologias de armazenamento local:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Cookies essenciais:</strong> necessários para o
              funcionamento da plataforma, incluindo autenticação (gerenciados
              pelo Supabase Auth)
            </li>
            <li>
              <strong>Vercel Analytics:</strong> cookies analíticos para
              monitoramento de desempenho e experiência do usuário; os dados
              são anonimizados
            </li>
            <li>
              <strong>sessionStorage:</strong> utilizado para persistência
              temporária do estado da consultoria (dados de sessão durante a
              navegação)
            </li>
            <li>
              <strong>localStorage:</strong> utilizado para armazenamento do
              identificador de sessão de visitante (guest_session_id) para
              recuperação de sessão
            </li>
          </ul>
          <p className="mt-3">
            Você pode gerenciar as suas preferências de cookies nas
            configurações do navegador. A desativação de cookies essenciais
            pode impedir o uso de funcionalidades da plataforma.
          </p>
        </section>

        {/* 14. Atualizações da Política */}
        <section>
          <h2 className="font-display mb-4 text-xl font-semibold text-foreground">
            14. Atualizações desta Política
          </h2>
          <p>
            Esta política pode ser atualizada periodicamente para refletir
            alterações em nossos serviços ou na legislação aplicável.
            Notificaremos você sobre alterações significativas por meio de aviso
            na plataforma ou por e-mail. A data da última atualização será
            sempre indicada no topo desta página.
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
