"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchProject } from "@/lib/projects-client";
import { ScriptsList } from "@/components/scripts-list";
import { ComplianceBadge } from "@/components/compliance-badge";
import { ExportFlow } from "@/components/export-flow";
import { ProjectResumeBanner } from "@/components/project-resume-banner";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-500/20 text-blue-300",
  in_development: "bg-yellow-500/20 text-yellow-300",
  in_review: "bg-purple-500/20 text-purple-300",
  active: "bg-green-500/20 text-green-300",
  paused: "bg-neutral-500/20 text-neutral-300",
  archived: "bg-neutral-500/10 text-neutral-500",
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planejamento",
  in_development: "Em Desenvolvimento",
  in_review: "Em Revisão",
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

const FORMAT_LABELS: Record<string, string> = {
  long_form: "Long Form",
  medium_form: "Medium Form",
  short_form: "Short Form",
  carousel: "Carousel",
  podcast: "Podcast",
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="mx-auto max-w-4xl animate-pulse px-6 py-12">
          <div className="mb-8 h-8 w-48 rounded bg-neutral-800" />
          <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-8">
            <div className="mb-4 h-8 w-2/3 rounded bg-neutral-700" />
            <div className="h-4 w-1/3 rounded bg-neutral-700" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
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

  const statusColor = STATUS_COLORS[project.status] ?? STATUS_COLORS.planning;
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Projetos
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Resume Banner */}
        <ProjectResumeBanner projectId={id} />

        {/* Project Header */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
            <span className="inline-flex rounded-full bg-neutral-700/50 px-3 py-1 text-xs font-medium text-neutral-300">
              {FORMAT_LABELS[project.format] ?? project.format}
            </span>
            <span className="inline-flex rounded-full bg-neutral-700/50 px-3 py-1 text-xs font-medium text-neutral-300">
              {project.niche}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            {project.title}
          </h1>
          <p className="mt-2 text-neutral-400">
            Palavra-chave:{" "}
            <span className="font-medium text-neutral-200">
              {project.keyword}
            </span>
          </p>
        </div>

        {/* Project Info Card */}
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-white">
              Informações
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/projects/${id}/publication`)}
                className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
              >
                📝 Título e Tags
              </button>
              <button
                onClick={() => router.push(`/projects/${id}/media`)}
                className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
              >
                🎬 Buscar Mídia
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Canal
              </p>
              <p className="mt-1 text-white">{project.channelProfile.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Plataforma
              </p>
              <p className="mt-1 text-white">
                {project.channelProfile.platform}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Duração estimada
              </p>
              <p className="mt-1 text-white">
                {project.durationMinutes
                  ? `${project.durationMinutes} min`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Criado em
              </p>
              <p className="mt-1 text-white">
                {new Date(project.createdAt).toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Badge */}
        <div className="mb-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Conformidade
          </h2>
          <ComplianceBadge projectId={id} />
        </div>

        {/* Export Flow */}
        <div className="mb-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Exportação
          </h2>
          <ExportFlow projectId={id} />
        </div>

        {/* Scripts List Section */}
        <ScriptsList
          projectId={id}
          onGenerateClick={() =>
            router.push(
              `/trends?projectId=${id}&keyword=${encodeURIComponent(project.keyword)}`,
            )
          }
        />
      </div>
    </div>
  );
}
