"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth-client";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Lock,
  BarChart3,
  Wand2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      {/* Navigation */}
      <nav className="border-b border-gray-800/30 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-5 flex items-center justify-between">
          <div className="text-xl font-black text-white font-headline">
            nexvideo
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-bold bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(78, 222, 163, 0.08) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/15">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#7C3AED]">
                Produção de conteúdo alimentada por IA
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-headline leading-tight tracking-tighter text-white">
                Transforme ideias em{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #7C3AED 0%, #4EDEA3 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  scripts virais
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-body">
                A plataforma inteligente para criadores que buscam precisão
                editorial e escala automatizada. Gere conteúdo profissional em
                segundos.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-headline font-bold rounded-lg hover:shadow-lg hover:shadow-[#7C3AED]/30 transition-all duration-200"
              >
                Começar Grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 border border-gray-800/30 bg-gray-900/50 text-white font-headline font-bold rounded-lg hover:bg-gray-900 transition-colors"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#4EDEA3]" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#4EDEA3]" />
                <span>Setup em segundos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#4EDEA3]" />
                <span>Suporte em PT-BR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-32 border-t border-gray-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold font-headline text-white mb-4">
              Tudo que você precisa para criar
            </h2>
            <p className="text-lg text-gray-400">
              Ferramentas poderosas integradas em uma plataforma
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <h3 className="text-lg font-bold text-white font-headline">
                Geração de Roteiros
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Crie roteiros estruturados e persuasivos com inteligência
                artificial. Customizável para qualquer nicho e duração.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#4EDEA3]/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#4EDEA3]" />
              </div>
              <h3 className="text-lg font-bold text-white font-headline">
                Análise de Tendências
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Descubra oportunidades virais com análise profunda de dados.
                Identifique gaps de qualidade no seu nicho.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <h3 className="text-lg font-bold text-white font-headline">
                Editor Inteligente
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Edite com precisão. Controle cada bloco de conteúdo com
                ferramentas avançadas de timing e estrutura.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#4EDEA3]/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[#4EDEA3]" />
              </div>
              <h3 className="text-lg font-bold text-white font-headline">
                Scoring & Insights
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Receba análise detalhada de demanda, saturação e potencial de
                monetização para cada tema.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#7C3AED]" />
              </div>
              <h3 className="text-lg font-bold text-white font-headline">
                Narração com IA
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Gere áudio profissional com múltiplas vozes e acentos. Pronto
                para seus vídeos.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-[#4EDEA3]/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#4EDEA3]" />
              </div>
              <h3 className="text-lg font-bold text-white font-headline">
                Segurança & Privacidade
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Seus dados são criptografados com AES-256. Sem compartilhamento
                com terceiros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-32 border-t border-gray-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-12">
            <div className="text-center">
              <div className="text-4xl font-bold font-headline text-[#7C3AED] mb-2">
                10x
              </div>
              <p className="text-gray-400">
                Mais rápido que escrever manualmente
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold font-headline text-[#4EDEA3] mb-2">
                50+
              </div>
              <p className="text-gray-400">Nichos profissionais suportados</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold font-headline text-[#7C3AED] mb-2">
                99.9%
              </div>
              <p className="text-gray-400">Uptime garantido</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold font-headline text-[#4EDEA3] mb-2">
                &lt;1s
              </div>
              <p className="text-gray-400">Latência global média</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-32 border-t border-gray-800/30">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold font-headline text-white mb-4">
              Pronto para criar conteúdo como profissional?
            </h2>
            <p className="text-lg text-gray-400">
              Comece gratuitamente. Sem cartão de crédito necessário.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-headline font-bold rounded-lg hover:shadow-lg hover:shadow-[#7C3AED]/30 transition-all duration-200"
          >
            Começar Grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/30 bg-[#0E0E0E]/50 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-white font-headline font-bold mb-4">
                nexvideo
              </h3>
              <p className="text-sm text-gray-400">
                Plataforma de produção de conteúdo com IA.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Preços
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contato
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Termos
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800/30 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>&copy; 2024 nexvideo. Todos os direitos reservados.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-gray-400 transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-gray-400 transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-gray-400 transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
