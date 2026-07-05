"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchProject } from "@/lib/projects-client";
import {
  fetchPublicationMetadata,
  generatePublicationMetadata,
  selectTitle,
  type TitleVariant,
} from "@/lib/publication-client";
import { fetchScriptsByProject } from "@/lib/scripts-client";

const TAG_CATEGORY_LABELS: Record<string, string> = {
  primary: "Primárias",
  secondary: "Secundárias",
  niche: "Nicho",
  trend: "Tendência",
};

const TAG_CATEGORY_COLORS: Record<string, string> = {
  primary: "bg-purple-500/20 text-purple-200 border-purple-500/30",
  secondary: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  niche: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  trend: "bg-pink-500/20 text-pink-200 border-pink-500/30",
};

export default function PublicationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [selectedTitleText, setSelectedTitleText] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Fetch project
  const {
    data: project,
    isLoading: isLoadingProject,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
  });

  // Fetch project scripts (to pick latest for generation)
  const { data: scripts = [] } = useQuery({
    queryKey: ["scripts", projectId],
    queryFn: () => fetchScriptsByProject(projectId),
    enabled: !!projectId,
  });

  // Fetch publication metadata — poll while generating
  const {
    data: publication,
    isLoading: isLoadingPublication,
    refetch: refetchPublication,
  } = useQuery({
    queryKey: ["publication", projectId],
    queryFn: () => fetchPublicationMetadata(projectId),
    enabled: !!projectId,
    refetchInterval: isGenerating ? 3000 : false,
  });

  // Stop polling once results arrive
  useEffect(() => {
    if (!isGenerating) return;
    const hasResults =
      publication &&
      ((publication.titleVariants?.length ?? 0) > 0 ||
        publication.tags.length > 0);
    if (hasResults) setIsGenerating(false);
  }, [publication, isGenerating]);

  const latestScript = scripts[0];
  const canGenerate = !!latestScript && !isGenerating;

  const generateMutation = useMutation({
    mutationFn: () =>
      generatePublicationMetadata(projectId, latestScript!.id),
    onSuccess: () => {
      setGenerateError(null);
      setIsGenerating(true);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao iniciar a geração. Tente novamente.";
      setGenerateError(msg);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!latestScript) return;
    setGenerateError(null);
    generateMutation.mutate();
  };

  // Select title mutation
  const selectTitleMutation = useMutation({
    mutationFn: (title: string) => selectTitle(projectId, title),
    onSuccess: () => {
      refetchPublication();
    },
  });

  const handleSelectTitle = (title: string) => {
    setSelectedTitleText(title);
    selectTitleMutation.mutate(title);
  };

  const handleCopyTags = async () => {
    if (!publication?.tags || publication.tags.length === 0) return;

    const tagText = publication.tags.join(", ");
    try {
      await navigator.clipboard.writeText(tagText);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error("Failed to copy tags:", err);
    }
  };

  if (isLoadingProject || isLoadingPublication) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6 py-5">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="mb-8 h-8 w-48 animate-pulse rounded bg-neutral-800" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900">
        <div className="text-center">
          <p className="text-red-400">Projeto não encontrado.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-secondary mt-4"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const titleVariants = publication?.titleVariants || [];
  const tags = publication?.tags || [];

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {project.title}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Page Title */}
        <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Título e Tags
            </h1>
            <p className="mt-2 text-neutral-400">
              Selecione o melhor título para sua publicação e gerencie as tags
            </p>
          </div>
          {publication &&
            (titleVariants.length > 0 || tags.length > 0) &&
            latestScript && (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generateMutation.isPending}
                className="btn-secondary inline-flex items-center gap-2 self-start px-3 py-2 text-xs disabled:opacity-50 sm:self-auto"
              >
                {isGenerating || generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Gerando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerar
                  </>
                )}
              </button>
            )}
        </div>

        {/* Error feedback */}
        {generateError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-red-200">
                Não foi possível gerar
              </p>
              <p className="mt-1 text-red-300/80">{generateError}</p>
            </div>
            <button
              onClick={handleGenerate}
              className="text-xs font-semibold text-red-200 underline hover:text-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* No Data State */}
        {!publication || (titleVariants.length === 0 && tags.length === 0) ? (
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-800/30 p-12 text-center">
            {isGenerating ? (
              <>
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#A78BFA]" />
                <p className="font-medium text-white">
                  Gerando títulos e tags…
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Isso pode levar até um minuto. Você pode aguardar aqui ou
                  voltar mais tarde.
                </p>
              </>
            ) : !latestScript ? (
              <>
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                <p className="mb-4 text-neutral-400">
                  Crie um roteiro primeiro para poder gerar títulos e tags.
                </p>
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Ir para o projeto
                </button>
              </>
            ) : (
              <>
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#A78BFA]" />
                <p className="mb-4 text-neutral-300">
                  Gere variações de título com score de CTR e tags relevantes
                  baseadas no seu roteiro.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generateMutation.isPending}
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Iniciando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Gerar Títulos e Tags
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Title Variants Section */}
            {titleVariants.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-xl font-semibold text-white">
                  Variações de Título
                </h2>
                <div className="space-y-3">
                  {titleVariants.map((variant: TitleVariant, idx: number) => {
                    const isSelected =
                      publication?.title === variant.title ||
                      selectedTitleText === variant.title;

                    return (
                      <button
                        key={`${variant.title}-${idx}`}
                        onClick={() => handleSelectTitle(variant.title)}
                        disabled={selectTitleMutation.isPending}
                        className={`group w-full transition-all ${
                          isSelected
                            ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20"
                            : "ring-1 ring-neutral-700 hover:ring-purple-500/50"
                        }`}
                      >
                        <div className="card relative !cursor-pointer p-4 text-left">
                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute right-4 top-4 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-300">
                                Selecionado
                              </span>
                            </div>
                          )}

                          {/* Title Content */}
                          <div className="pr-32">
                            <h3 className="font-display text-lg font-semibold text-white">
                              {variant.title}
                            </h3>
                            <p className="mt-2 text-sm text-neutral-400">
                              {variant.ctReason}
                            </p>
                          </div>

                          {/* Score Badge */}
                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1.5">
                              <span className="text-xs font-medium text-purple-200">
                                CTR Score
                              </span>
                              <div className="h-6 w-12 rounded-full bg-neutral-900 flex items-center justify-center">
                                <span className="font-display text-sm font-bold text-purple-300">
                                  {variant.score}%
                                </span>
                              </div>
                            </div>

                            {/* Character Count */}
                            <span className="text-xs text-neutral-500">
                              {variant.title.length} caracteres
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tags Section */}
            {tags.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-white">
                    Tags
                  </h2>
                  <button
                    onClick={handleCopyTags}
                    className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    {copiedToClipboard ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copiadas!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar todas
                      </>
                    )}
                  </button>
                </div>

                {/* Tags by Category */}
                <div className="space-y-4">
                  {Object.entries(TAG_CATEGORY_LABELS).map(([category, label]) => {
                    // For now, distribute tags evenly among categories
                    // In production, this would come from the backend
                    const tagsPerCategory = Math.ceil(tags.length / 4);
                    const startIdx =
                      Object.keys(TAG_CATEGORY_LABELS).indexOf(category) *
                      tagsPerCategory;
                    const categoryTags = tags.slice(
                      startIdx,
                      startIdx + tagsPerCategory,
                    );

                    if (categoryTags.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          {label}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {categoryTags.map((tag: string) => (
                            <span
                              key={tag}
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                                TAG_CATEGORY_COLORS[category]
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* All Tags Info */}
                <div className="mt-6 rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
                  <p className="text-xs text-neutral-400">
                    {tags.length} tag{tags.length !== 1 ? "s" : ""} gerada
                    {tags.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
