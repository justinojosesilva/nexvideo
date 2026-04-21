import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso — nexvideo",
  description:
    "Leia os Termos de Uso da nexvideo: condições de acesso, assinatura, uso aceitável e limitações de responsabilidade.",
};

const CURRENT_VERSION = "1.0";
const LAST_UPDATED = "19 de abril de 2026";
const LAST_UPDATED_ISO = "2026-04-19";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      {/* Navigation */}
      <nav className="border-b border-gray-800/30 bg-[#0E0E0E]/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black text-white font-headline"
            aria-label="Voltar para a página inicial"
          >
            nexvideo
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        {/* Header */}
        <header className="mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/15">
            <FileText className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#7C3AED]">
              Legal
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-white leading-tight">
            Termos de Uso
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-2xl">
            Estes Termos regulam o acesso e uso da plataforma{" "}
            <strong className="text-white">nexvideo</strong>. Ao criar uma conta
            ou utilizar nossos serviços, você concorda com estes Termos na sua
            totalidade. Leia com atenção antes de prosseguir.
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <p>
              Versão:{" "}
              <span className="text-gray-400 font-medium">
                {CURRENT_VERSION}
              </span>
            </p>
            <p>
              Última atualização:{" "}
              <time
                dateTime={LAST_UPDATED_ISO}
                className="text-gray-400 font-medium"
              >
                {LAST_UPDATED}
              </time>
            </p>
          </div>
        </header>

        {/* TOC */}
        <nav
          aria-label="Sumário"
          className="mb-16 p-6 rounded-xl border border-gray-800/50 bg-gray-900/30"
        >
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Sumário
          </h2>
          <ol className="space-y-2 text-sm text-gray-400">
            {[
              ["1", "Aceitação dos Termos", "#acceptance"],
              ["2", "Descrição do Serviço", "#service"],
              ["3", "Elegibilidade e Conta de Usuário", "#account"],
              ["4", "Assinatura e Faturamento", "#billing"],
              ["5", "Uso Aceitável", "#acceptable-use"],
              ["6", "Conteúdo do Usuário", "#user-content"],
              ["7", "Propriedade Intelectual", "#ip"],
              ["8", "Integrações de Terceiros", "#third-party"],
              ["9", "Limitação de Responsabilidade", "#liability"],
              ["10", "Rescisão", "#termination"],
              ["11", "Alterações nos Termos", "#changes"],
              ["12", "Histórico de Versões", "#version-history"],
              ["13", "Contato e Foro", "#contact"],
            ].map(([num, label, href]) => (
              <li key={href as string}>
                <a
                  href={href as string}
                  className="hover:text-white transition-colors"
                >
                  {num}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-16 text-gray-300 leading-relaxed">
          {/* 1. Aceitação */}
          <section id="acceptance">
            <SectionHeading number="1">Aceitação dos Termos</SectionHeading>
            <p className="mb-4">
              Ao acessar ou usar a plataforma nexvideo, você declara que leu,
              compreendeu e concorda em ficar vinculado a estes Termos de Uso e
              à nossa{" "}
              <Link
                href="/privacy"
                className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors underline"
              >
                Política de Privacidade
              </Link>
              , que é incorporada a estes Termos por referência.
            </p>
            <p>
              Se você está aceitando estes Termos em nome de uma organização,
              você declara ter autoridade legal para vinculá-la. Se não
              concordar com qualquer parte destes Termos, você não está
              autorizado a usar nosso serviço.
            </p>
          </section>

          {/* 2. Serviço */}
          <section id="service">
            <SectionHeading number="2">Descrição do Serviço</SectionHeading>
            <p className="mb-4">
              A nexvideo é uma plataforma SaaS de produção de conteúdo com
              inteligência artificial, que oferece:
            </p>
            <ul className="space-y-3 list-none pl-0 mb-6">
              {[
                "Geração automatizada de roteiros para vídeos com IA",
                "Análise de tendências e scoring de oportunidades de conteúdo",
                "Editor inteligente de blocos de conteúdo e timing",
                "Integração com YouTube para upload e análise de métricas",
                "Narração com texto-para-voz em múltiplas vozes",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Nos reservamos o direito de modificar, suspender ou descontinuar
              qualquer funcionalidade do serviço a qualquer momento, com aviso
              prévio razoável quando materialmente relevante.
            </p>
          </section>

          {/* 3. Conta */}
          <section id="account">
            <SectionHeading number="3">
              Elegibilidade e Conta de Usuário
            </SectionHeading>
            <p className="mb-4">Para usar a nexvideo você deve:</p>
            <ul className="space-y-3 list-none pl-0 mb-6">
              {[
                "Ter pelo menos 18 anos de idade",
                "Ter capacidade legal para celebrar contratos vinculantes",
                "Fornecer informações de cadastro precisas, completas e atualizadas",
                "Não ter sido previamente banido da plataforma",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mb-4">
              Você é responsável por manter a confidencialidade das suas
              credenciais e por toda a atividade realizada na sua conta.
              Notifique-nos imediatamente em caso de uso não autorizado em{" "}
              <a
                href="mailto:suporte@nexvideo.com"
                className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors underline"
              >
                suporte@nexvideo.com
              </a>
              .
            </p>
            <p>
              Cada conta está vinculada a uma organização. Os limites de uso
              dependem do plano contratado e são aplicados por organização.
            </p>
          </section>

          {/* 4. Faturamento */}
          <section id="billing">
            <SectionHeading number="4">Assinatura e Faturamento</SectionHeading>
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-2">
                  Planos e Cobrança
                </h3>
                <p>
                  A nexvideo oferece planos de assinatura mensais e anuais. Os
                  preços são exibidos em BRL (Real Brasileiro) e incluem os
                  impostos aplicáveis. O faturamento é processado via{" "}
                  <strong className="text-white">Stripe</strong> e ocorre
                  automaticamente no início de cada ciclo de cobrança.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">
                  Plano Gratuito
                </h3>
                <p>
                  O plano gratuito está sujeito a limites de uso definidos na
                  página de preços. Funcionalidades premium não estão
                  disponíveis no plano gratuito.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Cancelamento</h3>
                <p>
                  Você pode cancelar sua assinatura a qualquer momento pelo
                  painel da conta. O acesso ao plano pago permanece ativo até o
                  fim do período já pago. Não há reembolso proporcional por
                  período não utilizado, salvo exigência legal aplicável.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">
                  Falha de Pagamento
                </h3>
                <p>
                  Em caso de falha no pagamento, o plano será rebaixado para o
                  tier gratuito após um período de carência de 7 dias. Dados e
                  projetos são retidos por 90 dias após o cancelamento.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Uso Aceitável */}
          <section id="acceptable-use">
            <SectionHeading number="5">Uso Aceitável</SectionHeading>
            <p className="mb-6">Você concorda em não usar a plataforma para:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Violar leis, regulamentos ou direitos de terceiros",
                "Gerar, distribuir ou armazenar conteúdo ilegal, difamatório, obsceno ou fraudulento",
                "Infringir direitos autorais, marcas registradas ou outros direitos de propriedade intelectual",
                "Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma",
                "Realizar ataques de força bruta, scraping excessivo ou sobrecarga dolosa dos servidores",
                "Fazer uso das APIs para fins não autorizados ou que violem os termos dos provedores integrados",
                "Compartilhar credenciais de acesso com terceiros não autorizados",
                "Contornar mecanismos de segurança, limites de uso ou controles de acesso",
              ].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 p-3 rounded-lg border border-gray-800/50 bg-gray-900/30"
                >
                  <span
                    className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500/70 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-6">
              Violações desta seção podem resultar em suspensão ou encerramento
              imediato da conta, sem aviso prévio e sem direito a reembolso.
            </p>
          </section>

          {/* 6. Conteúdo do Usuário */}
          <section id="user-content">
            <SectionHeading number="6">Conteúdo do Usuário</SectionHeading>
            <p className="mb-4">
              {`
                Você retém a propriedade sobre todo o conteúdo que criar, fornecer ou gerar por meio
                da plataforma ("Conteúdo do Usuário"). Ao usar a nexvideo, você nos concede uma
                licença limitada, não exclusiva e revogável para processar seu Conteúdo exclusivamente
                para fins de prestação do serviço.
              `}
            </p>
            <p className="mb-4">
              <strong className="text-white">Conteúdo gerado por IA:</strong> os
              roteiros, títulos e narrações produzidos pela plataforma são
              gerados com base nos seus inputs e na nossa infraestrutura de IA.
              Você é responsável por revisar, editar e verificar a precisão de
              qualquer conteúdo antes de publicá-lo.
            </p>
            <p>
              Não utilizamos seu Conteúdo para treinar modelos de IA de
              terceiros sem seu consentimento explícito.
            </p>
          </section>

          {/* 7. Propriedade Intelectual */}
          <section id="ip">
            <SectionHeading number="7">Propriedade Intelectual</SectionHeading>
            <p className="mb-4">
              A plataforma nexvideo, incluindo seu código-fonte, design, marcas,
              logotipos, interfaces e documentação, é de propriedade exclusiva
              da nexvideo ou de seus licenciantes, protegida pelas leis de
              propriedade intelectual aplicáveis.
            </p>
            <p>
              Estes Termos não transferem nenhum direito de propriedade
              intelectual. Qualquer uso não autorizado da nossa propriedade
              intelectual é expressamente proibido e pode resultar em medidas
              legais.
            </p>
          </section>

          {/* 8. Integrações */}
          <section id="third-party">
            <SectionHeading number="8">Integrações de Terceiros</SectionHeading>
            <p className="mb-4">
              A nexvideo integra-se a serviços de terceiros (YouTube, Stripe,
              OpenAI, entre outros). O uso dessas integrações está sujeito aos
              termos e políticas de privacidade dos respectivos provedores.
            </p>
            <p className="mb-4">
              <strong className="text-white">Integração YouTube:</strong> ao
              conectar sua conta YouTube, você autoriza expressamente a nexvideo
              a acessar os scopes selecionados (leitura de canal, upload,
              analytics) conforme descrito durante o fluxo de autorização OAuth.
              Você pode revogar essa autorização a qualquer momento pelo painel
              da conta ou diretamente em{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors underline"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
            <p>
              Não somos responsáveis por interrupções, alterações de API ou
              mudanças de política dos serviços de terceiros integrados.
            </p>
          </section>

          {/* 9. Responsabilidade */}
          <section id="liability">
            <SectionHeading number="9">
              Limitação de Responsabilidade
            </SectionHeading>
            <p className="mb-4 text-sm uppercase tracking-wider text-gray-500 font-semibold">
              Leia com atenção
            </p>
            <p className="mb-4">
              Na máxima extensão permitida pela lei aplicável, a nexvideo e seus
              colaboradores, diretores e parceiros não serão responsáveis por
              danos indiretos, incidentais, especiais, consequenciais ou
              punitivos, incluindo perda de lucros, dados ou boa vontade,
              decorrentes de ou relacionados ao uso do serviço.
            </p>
            <p className="mb-4">
              A responsabilidade total da nexvideo perante você, por qualquer
              causa, não excederá o valor que você pagou pelo serviço nos{" "}
              <strong className="text-white">12 meses anteriores</strong> ao
              evento que deu origem à reclamação, ou R$&nbsp;100,00, o que for
              maior.
            </p>
            <p>
              O serviço é fornecido &quot;como está&quot; e &quot;conforme
              disponível&quot;, sem garantias de qualquer natureza, expressas ou
              implícitas. Não garantimos que o serviço será ininterrupto, livre
              de erros ou que os resultados gerados por IA serão precisos.
            </p>
          </section>

          {/* 10. Rescisão */}
          <section id="termination">
            <SectionHeading number="10">Rescisão</SectionHeading>
            <p className="mb-4">
              Você pode encerrar sua conta a qualquer momento pelo painel de
              configurações.
            </p>
            <p className="mb-4">
              Podemos suspender ou encerrar seu acesso imediatamente, sem aviso
              prévio, se:
            </p>
            <ul className="space-y-3 list-none pl-0 mb-4">
              {[
                "Você violar estes Termos ou nossa Política de Privacidade",
                "Houver suspeita fundamentada de fraude, abuso ou atividade ilegal",
                "Formos obrigados por lei ou ordem judicial",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Após o encerramento, seus dados serão retidos por 90 dias para
              fins de recuperação, após os quais serão permanentemente
              excluídos, exceto quando a retenção for exigida por lei (ex.:
              dados fiscais, conforme seção de retenção da Política de
              Privacidade).
            </p>
          </section>

          {/* 11. Alterações */}
          <section id="changes">
            <SectionHeading number="11">Alterações nos Termos</SectionHeading>
            <p className="mb-4">
              Podemos atualizar estes Termos a qualquer momento. Alterações
              materiais serão notificadas por e-mail ou por aviso em destaque na
              plataforma com pelo menos{" "}
              <strong className="text-white">15 dias de antecedência</strong>.
              Alterações não materiais (correções gramaticais, reformatação)
              podem ser feitas sem aviso prévio.
            </p>
            <p>
              O uso continuado da plataforma após a data de vigência das
              alterações constitui aceitação dos Termos atualizados. O número de
              versão e a data são sempre exibidos no topo desta página. Versões
              anteriores estão disponíveis no{" "}
              <a
                href="#version-history"
                className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors underline"
              >
                Histórico de Versões
              </a>
              .
            </p>
          </section>

          {/* 12. Histórico de Versões */}
          <section id="version-history">
            <SectionHeading number="12">Histórico de Versões</SectionHeading>
            <div className="overflow-x-auto rounded-xl border border-gray-800/50">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-gray-800/50 bg-gray-900/50">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-gray-400 font-medium w-24"
                    >
                      Versão
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-gray-400 font-medium w-40"
                    >
                      Data
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-gray-400 font-medium"
                    >
                      Alterações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800/30 last:border-0">
                    <td className="px-4 py-3 font-mono text-[#7C3AED] font-medium align-top">
                      1.0
                    </td>
                    <td className="px-4 py-3 text-gray-300 align-top">
                      <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED}</time>
                    </td>
                    <td className="px-4 py-3 text-gray-400 align-top">
                      Versão inicial publicada. Cobre aceitação, serviço, conta,
                      faturamento, uso aceitável, conteúdo, propriedade
                      intelectual, integrações, responsabilidade, rescisão e
                      alterações.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 13. Contato */}
          <section id="contact">
            <SectionHeading number="13">Contato e Foro</SectionHeading>
            <p className="mb-6">
              Para dúvidas sobre estes Termos ou questões jurídicas relacionadas
              ao serviço:
            </p>
            <div className="p-6 rounded-xl border border-gray-800/50 bg-gray-900/30 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">E-mail jurídico</p>
                <a
                  href="mailto:legal@nexvideo.com"
                  className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors"
                >
                  legal@nexvideo.com
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Suporte geral</p>
                <a
                  href="mailto:suporte@nexvideo.com"
                  className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors"
                >
                  suporte@nexvideo.com
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Lei aplicável e foro
                </p>
                <p className="text-white">
                  Estes Termos são regidos pelas leis da República Federativa do
                  Brasil. Fica eleito o foro da Comarca de São Paulo/SP para
                  dirimir quaisquer controvérsias oriundas destes Termos, com
                  renúncia expressa a qualquer outro, por mais privilegiado que
                  seja.
                </p>
              </div>
            </div>

            <p className="mt-6 p-4 rounded-lg border border-amber-800/30 bg-amber-900/10 text-sm text-amber-300/80">
              <strong className="text-amber-200">Recomendação jurídica:</strong>{" "}
              este documento é um template elaborado com base nas melhores
              práticas para SaaS no Brasil. Recomenda-se revisão por advogado
              especializado antes do lançamento em produção.
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-24 pt-8 border-t border-gray-800/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <p className="text-sm text-gray-500">
            Versão {CURRENT_VERSION} —{" "}
            <time dateTime={LAST_UPDATED_ISO} className="text-gray-400">
              {LAST_UPDATED}
            </time>
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              Início
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-3 text-xl sm:text-2xl font-bold font-headline text-white mb-6">
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] text-sm font-mono flex-shrink-0"
        aria-hidden="true"
      >
        {number}
      </span>
      {children}
    </h2>
  );
}
