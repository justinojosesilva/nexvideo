"use client";

import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Sparkles, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createScript } from "@/lib/scripts-client";
import type { TrendAnalysis } from "@/lib/trends-client";

interface TrendsWizardProps {
  analysis: TrendAnalysis;
  projectId: string;
}

const FORMAT_OPTIONS = [
  { value: "long_form", label: "Long Form", description: "10-20 minutos" },
  { value: "medium_form", label: "Medium Form", description: "5-10 minutos" },
  { value: "short_form", label: "Short Form", description: "<1 minuto" },
  { value: "carousel", label: "Carousel", description: "5-7 slides" },
  { value: "podcast", label: "Podcast", description: "Áudio" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Profissional", emoji: "💼" },
  { value: "casual", label: "Casual", emoji: "😄" },
  { value: "educational", label: "Educacional", emoji: "📚" },
  { value: "entertaining", label: "Entretenimento", emoji: "🎬" },
  { value: "inspiring", label: "Inspiracional", emoji: "✨" },
];

type Step = 1 | 2;

export function TrendsWizard({ analysis, projectId }: TrendsWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFormat, setSelectedFormat] = useState("long_form");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [keywordEditable, setKeywordEditable] = useState(analysis.keyword);

  // Mutation to create script
  const createScriptMutation = useMutation({
    mutationFn: async () => {
      const trimmedKeyword = keywordEditable.trim();
      return createScript({
        projectId,
        formatType: selectedFormat,
        tone: selectedTone,
        trendAnalysisId: analysis.id,
        ...(trimmedKeyword && trimmedKeyword !== analysis.keyword
          ? { keyword: trimmedKeyword }
          : {}),
      });
    },
    onSuccess: (data) => {
      // Redirect to polling page with jobId or scriptId
      const redirectUrl = data.jobId
        ? `/projects/${projectId}/polling?jobId=${data.jobId}`
        : `/projects/${projectId}`;
      router.push(redirectUrl);
    },
  });

  // Memoize score colors for consistent styling
  const scoreColor = useMemo(() => {
    const score = analysis.data.finalScore;
    if (score >= 75) return "text-[var(--tertiary)]";
    if (score >= 50) return "text-[var(--secondary)]";
    return "text-[var(--error)]";
  }, [analysis.data.finalScore]);

  const scoreBackgroundColor = useMemo(() => {
    const score = analysis.data.finalScore;
    if (score >= 75) return "bg-[var(--tertiary)]/20";
    if (score >= 50) return "bg-[var(--secondary)]/20";
    return "bg-[var(--error)]/20";
  }, [analysis.data.finalScore]);

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    createScriptMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
            <h1 className="font-headline text-2xl font-bold text-white">
              Gerar Roteiro a partir de Tendência
            </h1>
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            Passe {currentStep} de {2} – Configure seu roteiro
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Progress indicator */}
        <div className="mb-8 flex gap-2">
          {[1, 2].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step <= currentStep ? "bg-[var(--primary)]" : "bg-neutral-700"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Theme Confirmation */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="font-headline text-xl font-semibold text-white">
                Confirme o Tema Selecionado
              </h2>

              {/* Theme Card */}
              <div className="rounded-lg border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Keyword */}
                    <div className="mb-4 space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Palavra-chave
                      </label>
                      <input
                        type="text"
                        value={keywordEditable}
                        onChange={(e) => setKeywordEditable(e.target.value)}
                        className="input-field w-full"
                      />
                    </div>

                    {/* Classification */}
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Classificação
                      </p>
                      <div>
                        {analysis.data.classification === "PUBLISH" && (
                          <span className="inline-flex rounded-full bg-[var(--tertiary)]/20 px-3 py-1 text-xs font-semibold text-[var(--tertiary)]">
                            ✨ Publicar
                          </span>
                        )}
                        {analysis.data.classification === "EVALUATE" && (
                          <span className="inline-flex rounded-full bg-[var(--secondary)]/20 px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
                            📊 Avaliar
                          </span>
                        )}
                        {analysis.data.classification === "AVOID" && (
                          <span className="inline-flex rounded-full bg-[var(--error)]/20 px-3 py-1 text-xs font-semibold text-[var(--error)]">
                            ⚠️ Evitar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div
                    className={`rounded-lg ${scoreBackgroundColor} px-4 py-3 text-center`}
                  >
                    <div
                      className={`text-3xl font-bold font-headline ${scoreColor}`}
                    >
                      {Math.round(analysis.data.finalScore)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      Score Final
                    </div>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="mt-6 border-t border-neutral-700 pt-6">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Métricas-chave
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        label: "Demanda",
                        value: analysis.data.scores.demand,
                        icon: "📊",
                      },
                      {
                        label: "Saturação",
                        value: analysis.data.scores.saturation,
                        icon: "📈",
                      },
                      {
                        label: "Monetização",
                        value: analysis.data.scores.monetization,
                        icon: "💰",
                      },
                      {
                        label: "Quality Gap",
                        value: analysis.data.scores.qualityGap,
                        icon: "✨",
                      },
                    ].map(({ label, value, icon }) => (
                      <div
                        key={label}
                        className="rounded-lg bg-neutral-700/30 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{icon}</span>
                            <span className="text-sm text-neutral-300">
                              {label}
                            </span>
                          </div>
                          <span className="font-headline font-semibold text-[var(--primary)]">
                            {Math.round(value)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-700">
                          <div
                            className="h-full bg-[var(--primary)]"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                  <p className="text-sm text-blue-200">
                    Você pode editar a palavra-chave acima. O roteiro será
                    gerado com base neste tema e suas métricas.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleNext}
                disabled={!keywordEditable.trim()}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-headline font-semibold text-[var(--on-primary)] transition-all hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Format and Tone Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="font-headline text-xl font-semibold text-white">
                Selecione Formato e Tom
              </h2>

              {/* Format Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  Formato do Roteiro
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FORMAT_OPTIONS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        selectedFormat === format.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
                      }`}
                    >
                      <h4 className="font-headline font-semibold text-white">
                        {format.label}
                      </h4>
                      <p className="mt-1 text-xs text-neutral-400">
                        {format.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  Tom do Conteúdo
                </p>
                <div className="grid gap-3 sm:grid-cols-5">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setSelectedTone(tone.value)}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all ${
                        selectedTone === tone.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
                      }`}
                    >
                      <span className="text-2xl">{tone.emoji}</span>
                      <p className="text-xs font-semibold text-white">
                        {tone.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Resumo da Configuração
                </p>
                <div className="mt-3 space-y-2 text-sm text-neutral-300">
                  <p>
                    <span className="font-semibold text-white">Tema:</span>{" "}
                    {keywordEditable}
                  </p>
                  <p>
                    <span className="font-semibold text-white">Formato:</span>{" "}
                    {
                      FORMAT_OPTIONS.find((f) => f.value === selectedFormat)
                        ?.label
                    }
                  </p>
                  <p>
                    <span className="font-semibold text-white">Tom:</span>{" "}
                    {TONE_OPTIONS.find((t) => t.value === selectedTone)?.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Error State */}
            {createScriptMutation.isError && (() => {
              const is402 =
                (createScriptMutation.error as { response?: { status: number } })
                  ?.response?.status === 402;
              return (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm text-red-200">
                        {is402
                          ? "Você atingiu o limite do plano Free — faça upgrade para continuar."
                          : "Erro ao criar roteiro. Tente novamente."}
                      </p>
                      {is402 && (
                        <button
                          onClick={() => router.push("/plans")}
                          className="mt-2 text-xs font-semibold text-[#A78BFA] transition-colors hover:text-[#7C3AED] cursor-pointer"
                        >
                          Ver planos →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Navigation */}
            <div className="flex justify-between gap-3">
              <button
                onClick={handleBack}
                disabled={createScriptMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 px-6 py-3 font-headline font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                disabled={createScriptMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-headline font-semibold text-[var(--on-primary)] transition-all hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createScriptMutation.isPending ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Criando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Roteiro
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
