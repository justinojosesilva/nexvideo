"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { TrendsWizard } from "@/components/trends-wizard";
import { getTrendAnalysis } from "@/lib/trends-client";

export default function CreateScriptPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const trendAnalysisId = searchParams.get("trendAnalysisId");

  // Fetch trend analysis data — endpoint is /trends/:projectId and returns
  // the latest analysis for that project, so we query by projectId.
  // trendAnalysisId from the URL is kept for forward compatibility / UX.
  const {
    data: analysis,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trendAnalysis", projectId, trendAnalysisId],
    queryFn: () =>
      trendAnalysisId
        ? getTrendAnalysis(projectId)
        : Promise.reject("No trendAnalysisId"),
    enabled: !!trendAnalysisId,
  });

  if (!trendAnalysisId) {
    return (
      <div className="min-h-screen bg-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        </div>

        {/* Error Content */}
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-400" />
              <div>
                <h3 className="font-headline font-semibold text-red-200">
                  Acesso Inválido
                </h3>
                <p className="mt-2 text-sm text-red-200">
                  É necessário fazer uma análise de tendência antes de gerar um
                  roteiro. Acesse a página de Tendências primeiro.
                </p>
                <button
                  onClick={() => router.push("/trends")}
                  className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600"
                >
                  Ir para Tendências
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-700" />
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-neutral-800"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        </div>

        {/* Error Content */}
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-400" />
              <div>
                <h3 className="font-headline font-semibold text-red-200">
                  Análise de Tendência não Encontrada
                </h3>
                <p className="mt-2 text-sm text-red-200">
                  A análise de tendência não pode ser carregada. Tente novamente
                  a partir da página de Tendências.
                </p>
                <button
                  onClick={() => router.push("/trends")}
                  className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600"
                >
                  Ir para Tendências
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <TrendsWizard analysis={analysis} projectId={projectId} />;
}
