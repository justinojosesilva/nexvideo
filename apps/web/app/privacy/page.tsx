import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — nexvideo",
  description:
    "Entenda como a nexvideo coleta, utiliza e protege seus dados pessoais em conformidade com a LGPD e o GDPR.",
};

const LAST_UPDATED = "19 de abril de 2026";

export default function PrivacyPage() {
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
            <Shield className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#7C3AED]">
              Legal
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-white leading-tight">
            Política de Privacidade
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-2xl">
            Esta Política descreve como a <strong className="text-white">nexvideo</strong> coleta,
            utiliza, armazena e protege seus dados pessoais, em conformidade com a Lei Geral de
            Proteção de Dados (<strong className="text-white">LGPD</strong> — Lei nº 13.709/2018) e
            o Regulamento Geral de Proteção de Dados da União Europeia (
            <strong className="text-white">GDPR</strong> — Regulamento UE 2016/679).
          </p>
          <p className="text-sm text-gray-500">
            Última atualização:{" "}
            <time dateTime="2026-04-19" className="text-gray-400 font-medium">
              {LAST_UPDATED}
            </time>
          </p>
        </header>

        {/* TOC */}
        <nav aria-label="Sumário" className="mb-16 p-6 rounded-xl border border-gray-800/50 bg-gray-900/30">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Sumário
          </h2>
          <ol className="space-y-2 text-sm text-gray-400">
            {[
              ["1", "Controlador dos Dados", "#controller"],
              ["2", "Dados que Coletamos", "#data-collected"],
              ["3", "Como Usamos seus Dados", "#data-use"],
              ["4", "Cookies e Tecnologias Similares", "#cookies"],
              ["5", "Compartilhamento com Terceiros", "#third-parties"],
              ["6", "Retenção de Dados", "#retention"],
              ["7", "Seus Direitos (LGPD e GDPR)", "#rights"],
              ["8", "Transferências Internacionais", "#transfers"],
              ["9", "Segurança", "#security"],
              ["10", "Crianças e Adolescentes", "#minors"],
              ["11", "Alterações nesta Política", "#changes"],
              ["12", "Contato", "#contact"],
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

        <div className="prose-privacy space-y-16 text-gray-300 leading-relaxed">

          {/* 1. Controlador */}
          <section id="controller">
            <SectionHeading number="1">Controlador dos Dados</SectionHeading>
            <p>
              O controlador responsável pelo tratamento dos seus dados pessoais é a{" "}
              <strong className="text-white">nexvideo</strong> (doravante "nexvideo", "nós" ou
              "nosso"). Para exercer seus direitos ou tirar dúvidas, consulte a{" "}
              <a href="#contact" className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors underline">
                seção de Contato
              </a>
              .
            </p>
          </section>

          {/* 2. Dados coletados */}
          <section id="data-collected">
            <SectionHeading number="2">Dados que Coletamos</SectionHeading>
            <p className="mb-6">
              Coletamos apenas os dados necessários para fornecer e melhorar nossos serviços:
            </p>
            <DataTable
              rows={[
                {
                  category: "Dados de Cadastro",
                  examples: "Nome completo, endereço de e-mail, senha (hash bcrypt)",
                  basis: "Execução de contrato",
                },
                {
                  category: "Dados de Faturamento",
                  examples: "Token de pagamento Stripe (não armazenamos número de cartão)",
                  basis: "Execução de contrato",
                },
                {
                  category: "Dados de Uso",
                  examples: "Scripts gerados, projetos criados, logs de ação na plataforma",
                  basis: "Interesse legítimo / contrato",
                },
                {
                  category: "Dados Técnicos",
                  examples: "Endereço IP, agente de navegação, fuso horário, logs de erro",
                  basis: "Interesse legítimo",
                },
                {
                  category: "Dados de Integração YouTube",
                  examples:
                    "Token OAuth, metadados de canal e vídeos (quando o usuário conecta a conta)",
                  basis: "Consentimento explícito",
                },
                {
                  category: "Cookies e Analytics",
                  examples: "Sessão autenticada, preferências de interface",
                  basis: "Consentimento / interesse legítimo",
                },
              ]}
            />
            <p className="mt-4 text-sm text-gray-500">
              Dados sensíveis (saúde, origem racial, crenças religiosas etc.) não são coletados.
            </p>
          </section>

          {/* 3. Como usamos */}
          <section id="data-use">
            <SectionHeading number="3">Como Usamos seus Dados</SectionHeading>
            <ul className="space-y-3 list-none pl-0">
              {[
                "Criar e gerenciar sua conta e organização",
                "Processar pagamentos e emitir faturas via Stripe",
                "Gerar roteiros, narrações e análises com IA",
                "Conectar e sincronizar com sua conta YouTube (somente com autorização explícita)",
                "Enviar comunicações transacionais (confirmação de cadastro, alertas de segurança)",
                "Detectar fraudes e garantir a segurança da plataforma",
                "Melhorar nossos serviços com base em dados agregados e anonimizados",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <strong className="text-white">Não</strong> vendemos, alugamos ou compartilhamos seus
              dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          {/* 4. Cookies */}
          <section id="cookies">
            <SectionHeading number="4">Cookies e Tecnologias Similares</SectionHeading>
            <p className="mb-6">
              Utilizamos cookies e armazenamento local para as finalidades descritas abaixo:
            </p>
            <DataTable
              rows={[
                {
                  category: "Essenciais",
                  examples: "Token JWT de autenticação (localStorage), sessão de formulário",
                  basis: "Necessário para o serviço",
                },
                {
                  category: "Funcionais",
                  examples: "Preferências de idioma e tema",
                  basis: "Interesse legítimo",
                },
                {
                  category: "Analytics",
                  examples: "Sentry (rastreamento de erros), sem cookies de rastreamento cross-site",
                  basis: "Interesse legítimo",
                },
              ]}
            />
            <p className="mt-4">
              Não utilizamos cookies de rastreamento publicitário ou de perfil comportamental. Você
              pode desativar cookies nas configurações do seu navegador; isso pode impactar o
              funcionamento da plataforma.
            </p>
          </section>

          {/* 5. Terceiros */}
          <section id="third-parties">
            <SectionHeading number="5">Compartilhamento com Terceiros</SectionHeading>
            <p className="mb-6">
              Compartilhamos dados apenas com os fornecedores necessários para operar nosso serviço,
              todos sujeitos a acordos de processamento de dados (DPA):
            </p>
            <DataTable
              rows={[
                {
                  category: "Stripe",
                  examples: "Processamento de pagamentos e assinaturas",
                  basis: "EUA — SCCs / Privacy Shield successor",
                },
                {
                  category: "OpenAI",
                  examples: "Geração de roteiros e narrações com IA",
                  basis: "EUA — SCCs",
                },
                {
                  category: "Render",
                  examples: "Hospedagem de infraestrutura (API, banco de dados)",
                  basis: "EUA — SCCs",
                },
                {
                  category: "Resend",
                  examples: "Envio de e-mails transacionais",
                  basis: "EUA — SCCs",
                },
                {
                  category: "Sentry",
                  examples: "Monitoramento de erros e performance",
                  basis: "EUA — SCCs",
                },
                {
                  category: "Google (YouTube APIs)",
                  examples: "Integração OAuth e upload de vídeos (somente com consentimento)",
                  basis: "EUA — SCCs / Google DPA",
                },
              ]}
            />
          </section>

          {/* 6. Retenção */}
          <section id="retention">
            <SectionHeading number="6">Retenção de Dados</SectionHeading>
            <DataTable
              rows={[
                {
                  category: "Dados de conta ativa",
                  examples: "Mantidos enquanto a conta estiver ativa",
                  basis: "—",
                },
                {
                  category: "Dados após cancelamento",
                  examples: "Anonimizados ou excluídos em até 90 dias",
                  basis: "—",
                },
                {
                  category: "Dados de faturamento",
                  examples: "7 anos (obrigação fiscal brasileira — Código Tributário Nacional)",
                  basis: "Obrigação legal",
                },
                {
                  category: "Logs de segurança",
                  examples: "90 dias",
                  basis: "Interesse legítimo",
                },
                {
                  category: "Tokens OAuth YouTube",
                  examples: "Até revogação explícita pelo usuário ou exclusão da conta",
                  basis: "Consentimento",
                },
                {
                  category: "Backups de banco de dados",
                  examples: "7 dias de retenção de backup rotativo",
                  basis: "Interesse legítimo",
                },
              ]}
            />
          </section>

          {/* 7. Direitos */}
          <section id="rights">
            <SectionHeading number="7">Seus Direitos (LGPD e GDPR)</SectionHeading>
            <p className="mb-6">
              Dependendo da sua localização, você possui os seguintes direitos sobre seus dados:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Acesso",
                  desc: "Solicitar uma cópia dos dados que mantemos sobre você.",
                  lgpd: true,
                  gdpr: true,
                },
                {
                  title: "Retificação",
                  desc: "Corrigir dados imprecisos ou incompletos.",
                  lgpd: true,
                  gdpr: true,
                },
                {
                  title: "Exclusão",
                  desc: 'Solicitar a exclusão dos seus dados ("direito ao esquecimento").',
                  lgpd: true,
                  gdpr: true,
                },
                {
                  title: "Portabilidade",
                  desc: "Receber seus dados em formato estruturado e legível por máquina.",
                  lgpd: true,
                  gdpr: true,
                },
                {
                  title: "Oposição / Revogação",
                  desc: "Opor-se ao tratamento ou revogar consentimento a qualquer momento.",
                  lgpd: true,
                  gdpr: true,
                },
                {
                  title: "Limitação",
                  desc: "Solicitar a limitação do tratamento em determinadas circunstâncias.",
                  lgpd: false,
                  gdpr: true,
                },
                {
                  title: "Não decisão automatizada",
                  desc: "Não ser objeto de decisão baseada unicamente em tratamento automatizado.",
                  lgpd: true,
                  gdpr: true,
                },
                {
                  title: "Reclamação à ANPD",
                  desc: "Apresentar reclamação à Autoridade Nacional de Proteção de Dados (BR) ou à supervisory authority local (UE).",
                  lgpd: true,
                  gdpr: true,
                },
              ].map((right) => (
                <div
                  key={right.title}
                  className="p-4 rounded-lg border border-gray-800/50 bg-gray-900/30 space-y-2"
                >
                  <div className="flex items-center gap-2 justify-between">
                    <span className="font-semibold text-white text-sm">{right.title}</span>
                    <div className="flex gap-1.5">
                      {right.lgpd && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7C3AED]/20 text-[#a78bfa] font-mono">
                          LGPD
                        </span>
                      )}
                      {right.gdpr && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 font-mono">
                          GDPR
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{right.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm">
              Para exercer qualquer destes direitos, entre em contato pelo e-mail{" "}
              <a
                href="mailto:privacidade@nexvideo.com"
                className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors underline"
              >
                privacidade@nexvideo.com
              </a>
              . Responderemos em até <strong className="text-white">15 dias úteis</strong>.
            </p>
          </section>

          {/* 8. Transferências */}
          <section id="transfers">
            <SectionHeading number="8">Transferências Internacionais</SectionHeading>
            <p>
              Alguns dos nossos fornecedores estão sediados nos Estados Unidos. Garantimos que essas
              transferências são realizadas com salvaguardas adequadas, incluindo{" "}
              <strong className="text-white">Cláusulas Contratuais Padrão (SCCs)</strong> aprovadas
              pela Comissão Europeia e conformidade com a LGPD (art. 33), que permite transferências
              internacionais quando o país destinatário oferece grau de proteção equivalente ou
              mediante o uso de cláusulas-padrão.
            </p>
          </section>

          {/* 9. Segurança */}
          <section id="security">
            <SectionHeading number="9">Segurança</SectionHeading>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="mt-4 space-y-3 list-none pl-0">
              {[
                "Senhas armazenadas com hash bcrypt (custo ≥ 12)",
                "Comunicações cifradas com TLS 1.2+ em trânsito",
                "Banco de dados em rede privada (sem exposição pública direta)",
                "Tokens OAuth armazenados no banco de dados, nunca em logs",
                "Backups diários cifrados com retenção de 7 dias",
                "Acesso administrativo restrito por chave de API e autenticação multifator",
                "Auditoria de dependências via Dependabot e análise de segredos com Gitleaks",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4EDEA3] flex-shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              Em caso de incidente de segurança que afete seus dados, notificaremos você e a ANPD
              (ou autoridade competente) dentro dos prazos legais previstos na LGPD (art. 48) e no
              GDPR (art. 33–34).
            </p>
          </section>

          {/* 10. Menores */}
          <section id="minors">
            <SectionHeading number="10">Crianças e Adolescentes</SectionHeading>
            <p>
              Nosso serviço não é direcionado a menores de{" "}
              <strong className="text-white">18 anos</strong>. Não coletamos intencionalmente dados
              de crianças ou adolescentes. Se identificarmos que coletamos dados de um menor sem
              consentimento do responsável legal, excluiremos essas informações imediatamente.
              Caso você acredite que coletamos dados de um menor, entre em contato conosco
              imediatamente.
            </p>
          </section>

          {/* 11. Alterações */}
          <section id="changes">
            <SectionHeading number="11">Alterações nesta Política</SectionHeading>
            <p>
              Podemos atualizar esta Política periodicamente. Quando fizermos alterações materiais,
              notificaremos você por e-mail ou por aviso em destaque na plataforma com pelo menos{" "}
              <strong className="text-white">15 dias de antecedência</strong> antes da entrada em
              vigor. O uso continuado da plataforma após esse prazo implica aceitação da Política
              atualizada. A data da última atualização sempre estará indicada no topo desta página.
            </p>
          </section>

          {/* 12. Contato */}
          <section id="contact">
            <SectionHeading number="12">Contato</SectionHeading>
            <p className="mb-6">
              Para dúvidas sobre esta Política ou para exercer seus direitos de privacidade:
            </p>
            <div className="p-6 rounded-xl border border-gray-800/50 bg-gray-900/30 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Encarregado de Proteção de Dados (DPO)</p>
                <p className="text-white font-medium">nexvideo — Privacidade</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">E-mail</p>
                <a
                  href="mailto:privacidade@nexvideo.com"
                  className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors"
                >
                  privacidade@nexvideo.com
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Tempo de resposta</p>
                <p className="text-white">Até 15 dias úteis</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Autoridade reguladora (Brasil)</p>
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7C3AED] hover:text-[#a78bfa] transition-colors"
                >
                  Autoridade Nacional de Proteção de Dados (ANPD)
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-24 pt-8 border-t border-gray-800/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <p className="text-sm text-gray-500">
            Última atualização:{" "}
            <time dateTime="2026-04-19" className="text-gray-400">
              {LAST_UPDATED}
            </time>
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              Início
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Termos de Uso
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

interface DataRow {
  category: string;
  examples: string;
  basis: string;
}

function DataTable({ rows }: { rows: DataRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800/50">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-gray-800/50 bg-gray-900/50">
            <th
              scope="col"
              className="px-4 py-3 text-left text-gray-400 font-medium w-1/4"
            >
              Categoria
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-gray-400 font-medium"
            >
              Exemplos / Detalhes
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-gray-400 font-medium w-1/4 hidden sm:table-cell"
            >
              Base Legal
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.category}
              className={`border-b border-gray-800/30 last:border-0 ${
                i % 2 === 0 ? "bg-transparent" : "bg-gray-900/20"
              }`}
            >
              <td className="px-4 py-3 font-medium text-white align-top">
                {row.category}
              </td>
              <td className="px-4 py-3 text-gray-300 align-top">{row.examples}</td>
              <td className="px-4 py-3 text-gray-400 align-top hidden sm:table-cell">
                {row.basis}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
