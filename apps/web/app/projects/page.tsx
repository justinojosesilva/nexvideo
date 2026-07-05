"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Zap, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchProjects,
  type ContentProjectWithChannelProfile,
} from "@/lib/projects-client";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-500/20 text-blue-300",
  in_development: "bg-orange-500/20 text-orange-300",
  in_review: "bg-[#7C3AED]/20 text-[#A78BFA]",
  active: "bg-[#4EDEA3]/20 text-[#4EDEA3]",
  paused: "bg-gray-500/20 text-gray-300",
  archived: "bg-gray-500/10 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planejamento",
  in_development: "Em Desenvolvimento",
  in_review: "Em Revisão",
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "planning", label: "Planejamento" },
  { value: "in_development", label: "Em Desenvolvimento" },
  { value: "in_review", label: "Em Revisão" },
  { value: "active", label: "Ativo" },
];

function ProjectSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50 p-6">
      <div className="mb-4 h-6 w-2/3 rounded bg-gray-800" />
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-800" />
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-800" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-gray-800" />
        <div className="h-6 w-20 rounded-full bg-gray-800" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-500/30 px-12 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED]/20 to-[#7C3AED]/10">
        <Zap className="h-8 w-8 text-[#7C3AED]" />
      </div>
      <h3 className="mb-2 font-headline text-xl font-bold text-white">
        Nenhum projeto criado
      </h3>
      <p className="mb-6 max-w-sm text-gray-400">
        Crie seu primeiro projeto de conteúdo com IA e comece a produzir
        scripts, títulos e roteiros automaticamente.
      </p>
      <Link
        href="/projects/new"
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Novo Projeto
      </Link>
    </div>
  );
}

function ProjectCard({
  project,
}: {
  project: ContentProjectWithChannelProfile;
}) {
  const statusColor =
    STATUS_COLORS[project.status] ?? STATUS_COLORS.planning;
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;

  const createdAt = new Date(project.createdAt).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`Abrir projeto ${project.title}`}
      className="group card block cursor-pointer transition-all hover:border-[#7C3AED]/40 hover:shadow-lg hover:shadow-[#7C3AED]/5"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="flex-1 font-headline text-lg font-semibold text-white transition-colors group-hover:text-[#A78BFA]">
          {project.title}
        </h3>
      </div>

      <div className="mb-4 space-y-2 text-sm text-gray-400">
        <p>
          <span className="text-gray-500">Canal:</span>{" "}
          {project.channelProfile.name}
        </p>
        <p>
          <span className="text-gray-500">Palavra-chave:</span>{" "}
          {project.keyword}
        </p>
        <p>
          <span className="text-gray-500">Duração:</span>{" "}
          {project.durationMinutes ? `${project.durationMinutes} min` : "—"}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
        <span className="inline-flex rounded-full bg-gray-700/50 px-3 py-1 text-xs font-medium text-gray-300">
          {project.format.replace(/_/g, " ")}
        </span>
        <span className="inline-flex rounded-full bg-gray-700/50 px-3 py-1 text-xs font-medium text-gray-300">
          {project.niche}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-gray-700/50 pt-4">
        <span className="text-xs text-gray-500">{createdAt}</span>
        <span className="text-xs font-medium text-[#7C3AED] transition-colors group-hover:text-[#A78BFA]">
          Ver Detalhes →
        </span>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const router = useRouter();

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.keyword.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, search]);

  const hasProjects = projects.length > 0;

  return (
    <div>
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold text-white sm:text-4xl">
                Projetos
              </h1>
              <p className="mt-2 text-gray-400">
                Gerencie seus projetos de conteúdo com IA
              </p>
            </div>
            <button
              onClick={() => router.push("/projects/new")}
              className="btn-primary flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Novo Projeto
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters */}
        {hasProjects && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? "bg-[#7C3AED] text-white"
                      : "bg-gray-800/60 text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                  style={{ minHeight: 32 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou palavra-chave"
                aria-label="Buscar projetos"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-[#7C3AED] focus:outline-none"
              />
            </label>
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-300">
              Erro ao carregar projetos. Por favor, tente novamente.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid auto-rows-max gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <ProjectSkeleton key={i} />
            ))}
          </div>
        ) : !hasProjects ? (
          <EmptyState />
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-12 text-center">
            <p className="text-gray-400">
              Nenhum projeto encontrado com os filtros atuais.
            </p>
          </div>
        ) : (
          <div className="grid auto-rows-max gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
