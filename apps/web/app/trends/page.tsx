"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Zap,
  Lightbulb,
  Palette,
  BookOpen,
  Clapperboard,
  TrendingDown,
  Heart,
} from "lucide-react";
import { ScoreDimensionBreakdown } from "@/components/score-dimension-breakdown";
import { TrendsSidebar } from "@/components/trends-sidebar";
import {
  initiateTrendAnalysis,
  getJobStatus,
  getTrendAnalysis,
  type AnalyzeTrendsRequest,
} from "@/lib/trends-client";

const NICHE_OPTIONS = [
  { value: "finance", label: "Finanças", icon: DollarSign },
  { value: "technology", label: "Tecnologia", icon: Zap },
  { value: "productivity", label: "Produtividade", icon: Lightbulb },
  { value: "lifestyle", label: "Lifestyle", icon: Palette },
  { value: "education", label: "Educação", icon: BookOpen },
  { value: "entertainment", label: "Entretenimento", icon: Clapperboard },
  { value: "business", label: "Negócios", icon: TrendingDown },
  { value: "health", label: "Saúde", icon: Heart },
];

const GEO_OPTIONS = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "USA" },
  { value: "MX", label: "México" },
  { value: "AR", label: "Argentina" },
  { value: "ES", label: "Espanha" },
  { value: "DE", label: "Alemanha" },
];

function AnalysisSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-800/30 bg-gray-900/50 p-6">
      <div className="mb-4 h-6 w-1/3 rounded bg-gray-800" />
      <div className="mb-2 h-4 w-1/4 rounded bg-gray-800" />
      <div className="mb-4 h-24 w-full rounded bg-gray-800" />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

function TrendsSearchForm() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const keywordParam = searchParams.get("keyword");

  const [keyword, setKeyword] = useState(keywordParam ?? "");
  const [niche, setNiche] = useState("technology");
  const [geo, setGeo] = useState("BR");
  const [jobId, setJobId] = useState<string | null>(null);
  const [projectId] = useState(projectIdParam ?? "temp-project");
  const [isJobDone, setIsJobDone] = useState(false);

  // Mutation to initiate analysis
  const initiateMutation = useMutation({
    mutationFn: (request: AnalyzeTrendsRequest) =>
      initiateTrendAnalysis(request),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setIsJobDone(false);
    },
  });

  // Poll job status
  const { data: jobStatus, isLoading: isPolling } = useQuery({
    queryKey: ["jobStatus", jobId],
    queryFn: () => (jobId ? getJobStatus(jobId) : Promise.reject("No jobId")),
    enabled: !!jobId && !isJobDone,
    refetchInterval: 1000, // Poll every 1 second
    retry: false,
  });

  const isPreview = projectId.startsWith("temp-");

  // For preview mode (no persisted record), read from job result.
  // For real projects, fetch from the persisted TrendAnalysis.
  const { data: persistedAnalysis, isLoading: isLoadingResults } = useQuery({
    queryKey: ["trendAnalysis", projectId],
    queryFn: () => getTrendAnalysis(projectId),
    enabled: isJobDone && !isPreview,
  });

  const analysis = isPreview
    ? (jobStatus?.result?.trendAnalysis ?? null)
    : (persistedAnalysis ?? null);

  // Handle job completion
  useEffect(() => {
    if (jobStatus?.status === "DONE") {
      setIsJobDone(true);
    }
  }, [jobStatus?.status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    initiateMutation.mutate({
      projectId,
      keyword: keyword.trim(),
      geo,
      niche,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4 card">
        <div className="space-y-2">
          <label className="font-mono ml-1 font-medium text-gray-400">
            Palavra-chave
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Insira a palavra-chave para analisar"
            className="input-field"
            disabled={initiateMutation.isPending || isPolling}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-mono ml-1 font-medium text-gray-400">
              Nicho
            </label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="input-field cursor-pointer"
              disabled={initiateMutation.isPending || isPolling}
            >
              {NICHE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-mono ml-1 font-medium text-gray-400">
              Região
            </label>
            <select
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="input-field cursor-pointer"
              disabled={initiateMutation.isPending || isPolling}
            >
              {GEO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={initiateMutation.isPending || isPolling || !keyword.trim()}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4" />
          {initiateMutation.isPending || isPolling
            ? "Analisando tendências..."
            : "Analisar Tendência"}
        </button>
      </form>

      {/* Error State */}
      {initiateMutation.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">
            Erro ao iniciar análise. Tente novamente.
          </p>
        </div>
      )}

      {jobStatus?.status === "FAILED" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">
            A análise falhou: {jobStatus.failedReason || "Erro desconhecido"}
          </p>
        </div>
      )}

      {/* Loading State */}
      {isPolling && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <TrendingUp className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <p className="text-sm text-[#A78BFA]">Analisando tendências...</p>
            </div>
          </div>
          <AnalysisSkeleton />
        </div>
      )}

      {/* Results */}
      {isJobDone && isLoadingResults && <AnalysisSkeleton />}
      {isJobDone && analysis && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#4EDEA3]/30 bg-[#4EDEA3]/10 p-4">
            <p className="text-sm text-[#4EDEA3]">
              ✓ Análise concluída com sucesso!
            </p>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <ScoreDimensionBreakdown
                analysis={analysis}
                projectId={projectId}
              />
            </div>
            <div className="w-80">
              <TrendsSidebar analysis={analysis} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrendsPage() {
  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold text-white sm:text-4xl">
                Pesquisa de Tendências
              </h1>
              <p className="mt-2 text-gray-400">
                Analise palavras-chave e descubra oportunidades de conteúdo de
                alto impacto
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Suspense fallback={<AnalysisSkeleton />}>
          <TrendsSearchForm />
        </Suspense>
      </div>
    </div>
  );
}
