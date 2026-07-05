"use client";

import { useEffect } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { getJobStatus } from "@/lib/trends-client";

export default function ScriptPollingPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["jobStatus", jobId],
    queryFn: () =>
      jobId ? getJobStatus(jobId) : Promise.reject("No jobId"),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "DONE" || status === "FAILED" ? false : 2000;
    },
    retry: false,
  });

  // Redirect to script editor when done
  useEffect(() => {
    if (job?.status === "DONE") {
      const scriptId = job.result?.scriptId as string | undefined;
      if (scriptId) {
        router.replace(`/scripts/${scriptId}`);
      } else {
        // Fallback: back to project
        router.replace(`/projects/${projectId}`);
      }
    }
  }, [job, projectId, router]);

  if (!jobId) {
    return (
      <ErrorState
        title="Job não informado"
        message="Não foi possível identificar a tarefa de geração."
        onBack={() => router.push(`/projects/${projectId}`)}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Erro ao consultar status"
        message="Não foi possível obter o status da geração. Tente novamente."
        onBack={() => router.push(`/projects/${projectId}`)}
      />
    );
  }

  if (job?.status === "FAILED") {
    return (
      <ErrorState
        title="Falha na geração do roteiro"
        message={
          job.errorMessage ||
          job.failedReason ||
          "Houve um erro durante a geração. Tente novamente em alguns instantes."
        }
        onBack={() => router.push(`/projects/${projectId}`)}
      />
    );
  }

  const progress = job?.progress ?? 0;
  const statusLabel =
    job?.status === "PROCESSING"
      ? "Gerando roteiro…"
      : isLoading || !job
        ? "Iniciando…"
        : "Aguardando processamento…";

  return (
    <div>
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao projeto
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 to-transparent p-8">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/20">
              {job?.status === "PROCESSING" ? (
                <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA]" />
              ) : (
                <Sparkles className="h-6 w-6 text-[#A78BFA]" />
              )}
            </span>
            <div>
              <h1 className="font-headline text-2xl font-bold text-white">
                {statusLabel}
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Você será redirecionado automaticamente quando o roteiro
                estiver pronto.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-400">Progresso</span>
              <span className="font-medium tabular-nums text-[#A78BFA]">
                {progress}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-gray-800"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all duration-500"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            A geração pode levar de 30 a 90 segundos. Você pode fechar esta
            página — o roteiro estará disponível em{" "}
            <span className="text-gray-300">Projetos → este projeto</span>{" "}
            quando ficar pronto.
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onBack,
}: {
  title: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-400" />
            <div>
              <h3 className="font-headline font-semibold text-red-200">
                {title}
              </h3>
              <p className="mt-2 text-sm text-red-200/80">{message}</p>
              <button
                onClick={onBack}
                className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Voltar ao projeto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
