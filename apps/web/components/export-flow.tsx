"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { fetchProject } from "@/lib/projects-client";
import { fetchCompliance } from "@/lib/compliance-client";
import {
  createExport,
  getExportStatus,
  fetchExportChecklist,
  type CreateExportError,
} from "@/lib/export-client";
import { ExportChecklist } from "./export-checklist";

interface ExportFlowProps {
  projectId: string;
}

export function ExportFlow({ projectId }: ExportFlowProps) {
  const router = useRouter();
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<CreateExportError | null>(null);
  const [isPlanLimitError, setIsPlanLimitError] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);

  // Fetch project data
  const {
    data: project,
    isLoading: isLoadingProject,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
  });

  // Fetch compliance data to check prerequisites
  const {
    data: compliance,
    isLoading: isLoadingCompliance,
  } = useQuery({
    queryKey: ["compliance", projectId],
    queryFn: () => fetchCompliance(projectId),
  });

  // Check prerequisites
  const prerequisites = {
    scriptReady: project?.status ? ["approved", "active", "in_review", "exported"].includes(project.status) : false,
    narrationDone: compliance?.complianceScore !== null, // If compliance data exists, narration was completed
    mediaSelected: compliance?.complianceScore !== null, // Same check
    titleChosen: compliance?.complianceScore !== null, // Same check
  };

  const legacyPrerequisitesMet = Object.values(prerequisites).every(Boolean);

  // Source-of-truth checklist from backend (compliance, thumbnail, tags, etc.)
  const { data: checklist } = useQuery({
    queryKey: ["export-checklist", projectId],
    queryFn: () => fetchExportChecklist(projectId),
  });

  const allPrerequisitesMet = legacyPrerequisitesMet && (checklist?.canExport ?? false);

  // Status polling - only enabled while we have an export job ID
  const isPolling =
    !!exportJobId && exportJobId !== "error";

  const {
    data: jobStatus,
  } = useQuery({
    queryKey: ["exportStatus", exportJobId],
    queryFn: () => getExportStatus(exportJobId!),
    enabled: isPolling,
    refetchInterval: 2000,
    retry: false,
  });

  // Create export mutation
  const createExportMutation = useMutation({
    mutationFn: () => createExport(projectId),
    onSuccess: (data) => {
      setExportJobId(data.exportJobId);
      setExportError(null);
      setPollingError(null);
    },
    onError: (error: { response?: { status: number; data: CreateExportError } } | null) => {
      const status = error?.response?.status;
      if (status === 402) {
        setIsPlanLimitError(true);
        setExportError({
          message: "Você atingiu o limite do plano Free — faça upgrade para continuar.",
        });
      } else {
        setIsPlanLimitError(false);
        const errorData = error?.response?.data;
        setExportError(errorData || { message: "Failed to create export" });
      }
      setExportJobId("error");
    },
  });

  // Handle job completion
  useEffect(() => {
    if (jobStatus?.status === "completed" && jobStatus.exportUrl) {
      setExportUrl(jobStatus.exportUrl);
    } else if (jobStatus?.status === "failed") {
      setPollingError("Export failed. Please try again.");
    }
  }, [jobStatus]);

  const isLoading = isLoadingProject || isLoadingCompliance;

  const handleExport = () => {
    createExportMutation.mutate();
  };

  const handleDownload = () => {
    if (exportUrl) {
      window.open(exportUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-lg border border-neutral-700 bg-neutral-800/50 p-6 animate-pulse">
        <div className="h-6 w-1/3 rounded bg-neutral-700" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-neutral-700" />
              <div className="flex-1 h-4 rounded bg-neutral-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Prerequisites Checklist */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-white">
          Pré-requisitos da Exportação
        </h3>

        <div className="space-y-3">
          {/* Script Ready */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                prerequisites.scriptReady
                  ? "border-green-500 bg-green-500/10"
                  : "border-neutral-600 bg-neutral-800"
              }`}
            >
              {prerequisites.scriptReady && (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
            </div>
            <span className="text-sm text-neutral-300">Roteiro pronto (status: Aprovado)</span>
          </div>

          {/* Narration Done */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                prerequisites.narrationDone
                  ? "border-green-500 bg-green-500/10"
                  : "border-neutral-600 bg-neutral-800"
              }`}
            >
              {prerequisites.narrationDone && (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
            </div>
            <span className="text-sm text-neutral-300">Narração concluída</span>
          </div>

          {/* Media Selected */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                prerequisites.mediaSelected
                  ? "border-green-500 bg-green-500/10"
                  : "border-neutral-600 bg-neutral-800"
              }`}
            >
              {prerequisites.mediaSelected && (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
            </div>
            <span className="text-sm text-neutral-300">Mídia selecionada</span>
          </div>

          {/* Title Chosen */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                prerequisites.titleChosen
                  ? "border-green-500 bg-green-500/10"
                  : "border-neutral-600 bg-neutral-800"
              }`}
            >
              {prerequisites.titleChosen && (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
            </div>
            <span className="text-sm text-neutral-300">Título escolhido</span>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {exportError && (
        <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-300">{exportError.message}</p>
            {!isPlanLimitError && exportError.missing && exportError.missing.length > 0 && (
              <p className="mt-1 text-red-200/70">
                Faltam: {exportError.missing.join(", ")}
              </p>
            )}
            {isPlanLimitError && (
              <button
                onClick={() => router.push("/plans")}
                className="mt-2 text-xs font-semibold text-[#A78BFA] transition-colors hover:text-[#7C3AED] cursor-pointer"
              >
                Ver planos →
              </button>
            )}
          </div>
        </div>
      )}

      {pollingError && (
        <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-red-300">{pollingError}</p>
        </div>
      )}

      {/* Pre-publication checklist */}
      <ExportChecklist projectId={projectId} />

      {/* Export Button or Status */}
      {!exportJobId ? (
        <button
          onClick={handleExport}
          disabled={!allPrerequisitesMet || createExportMutation.isPending}
          className={`w-full rounded-lg px-4 py-3 font-medium transition-all ${
            allPrerequisitesMet
              ? "bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
              : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
          }`}
        >
          {createExportMutation.isPending ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Exportando...
            </div>
          ) : (
            "Exportar Projeto"
          )}
        </button>
      ) : (
        <>
          {/* Status Display */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">
                Status da Exportação
              </h3>
              {jobStatus?.status === "completed" && (
                <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Concluído
                </div>
              )}
              {jobStatus?.status === "processing" && (
                <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processando
                </div>
              )}
              {jobStatus?.status === "pending" && (
                <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pendente
                </div>
              )}
              {jobStatus?.status === "failed" && (
                <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                  <AlertCircle className="h-3 w-3" />
                  Falhou
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4 h-2 w-full rounded-full bg-neutral-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                  width:
                    jobStatus?.status === "pending"
                      ? "25%"
                      : jobStatus?.status === "processing"
                        ? "75%"
                        : jobStatus?.status === "completed"
                          ? "100%"
                          : "0%",
                }}
              />
            </div>

            <p className="text-xs text-neutral-400">
              {jobStatus?.status === "pending" && "Aguardando processamento..."}
              {jobStatus?.status === "processing" && "Gerando arquivo ZIP..."}
              {jobStatus?.status === "completed" && "Pronto para download"}
              {jobStatus?.status === "failed" && "Ocorreu um erro durante a exportação"}
            </p>
          </div>

          {/* Download Button */}
          {jobStatus?.status === "completed" && exportUrl && (
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-600"
            >
              <Download className="h-4 w-4" />
              Download ZIP
            </button>
          )}

          {/* Reset Button */}
          {(jobStatus?.status === "completed" || jobStatus?.status === "failed") && (
            <button
              onClick={() => {
                setExportJobId(null);
                setExportUrl(null);
                setExportError(null);
                setIsPlanLimitError(false);
                setPollingError(null);
              }}
              className="w-full rounded-lg border border-neutral-700 px-4 py-3 font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-800"
            >
              Nova Exportação
            </button>
          )}
        </>
      )}
    </div>
  );
}
