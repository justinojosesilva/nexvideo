"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { fetchProjects } from "@/lib/projects-client";
import {
  DEFAULT_FILTERS,
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  filterProjects,
  paginate,
  sortProjects,
  type ProjectFilters,
  type ProjectSort,
} from "@/lib/projects-filter";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PROJECT_STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => [
    o.value,
    o.label,
  ]),
);

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-500/15 text-blue-300",
  in_development: "bg-amber-500/15 text-amber-300",
  in_review: "bg-purple-500/15 text-purple-300",
  active: "bg-emerald-500/15 text-emerald-300",
  paused: "bg-neutral-500/20 text-neutral-300",
  archived: "bg-neutral-500/10 text-neutral-500",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function ProjectsHistoryPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<ProjectSort>("createdAt_desc");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const filtered = useMemo(
    () => (data ? filterProjects(data, filters) : []),
    [data, filters],
  );
  const sorted = useMemo(() => sortProjects(filtered, sort), [filtered, sort]);
  const pageResult = useMemo(
    () => paginate(sorted, page, PAGE_SIZE),
    [sorted, page],
  );

  const setFilter = <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSort("createdAt_desc");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <header className="border-b border-gray-800/50 bg-[#0E0E0E]/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-gray-300 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Voltar para o dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <h1 className="font-headline text-2xl font-bold text-white sm:text-3xl">
            Histórico de projetos
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 sm:py-12">
        <section
          aria-label="Filtros"
          className="rounded-xl border border-gray-700/30 bg-gray-900/50 p-4 sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label
                htmlFor="filter-search"
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Buscar
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  aria-hidden="true"
                />
                <input
                  id="filter-search"
                  type="search"
                  value={filters.search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  placeholder="Título, keyword, canal..."
                  className="h-11 w-full rounded-md border border-gray-700 bg-gray-900 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus-visible:border-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                  data-testid="filter-search"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="filter-status"
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Status
              </label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) =>
                  setFilter(
                    "status",
                    e.target.value as ProjectFilters["status"],
                  )
                }
                className="h-11 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white focus-visible:border-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                data-testid="filter-status"
              >
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-from"
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                De
              </label>
              <input
                id="filter-from"
                type="date"
                value={filters.from ?? ""}
                onChange={(e) => setFilter("from", e.target.value || null)}
                className="h-11 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white focus-visible:border-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                data-testid="filter-from"
              />
            </div>

            <div>
              <label
                htmlFor="filter-to"
                className="mb-1 block text-xs font-medium text-gray-400"
              >
                Até
              </label>
              <input
                id="filter-to"
                type="date"
                value={filters.to ?? ""}
                onChange={(e) => setFilter("to", e.target.value || null)}
                className="h-11 w-full rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white focus-visible:border-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                data-testid="filter-to"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label
                htmlFor="filter-sort"
                className="text-xs font-medium text-gray-400"
              >
                Ordenar por
              </label>
              <select
                id="filter-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as ProjectSort)}
                className="h-11 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white focus-visible:border-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                data-testid="filter-sort"
              >
                {PROJECT_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-gray-200 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              Limpar filtros
            </button>
          </div>
        </section>

        {isError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-200"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Não foi possível carregar os projetos.
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-red-500/20 px-4 text-sm font-medium text-red-100 hover:bg-red-500/30"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
            <span className="sr-only">Carregando projetos...</span>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50"
              />
            ))}
          </div>
        ) : pageResult.total === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-10 text-center text-sm text-gray-400">
            Nenhum projeto encontrado com os filtros atuais.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-700/40">
              <table
                className="w-full border-collapse text-sm"
                aria-label="Projetos filtrados"
              >
                <thead className="bg-gray-900/60">
                  <tr>
                    {[
                      { label: "Projeto", align: "text-left" },
                      { label: "Canal", align: "text-left" },
                      { label: "Status", align: "text-left" },
                      { label: "Criado em", align: "text-right" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        scope="col"
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${col.align}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageResult.rows.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-gray-800 hover:bg-gray-800/40"
                      data-testid={`project-row-${p.id}`}
                    >
                      <td className="px-4 py-3 text-white">
                        <button
                          type="button"
                          onClick={() => router.push(`/projects/${p.id}`)}
                          className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                        >
                          {p.title}
                        </button>
                        <div className="text-xs text-gray-500">
                          {p.keyword} · {p.niche}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {p.channelProfile.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            STATUS_COLORS[p.status] ?? STATUS_COLORS.planning
                          }`}
                        >
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                        {dateFmt.format(new Date(p.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav
              className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400"
              aria-label="Paginação"
            >
              <span data-testid="page-info">
                {pageResult.page * PAGE_SIZE + 1}–
                {Math.min(
                  (pageResult.page + 1) * PAGE_SIZE,
                  pageResult.total,
                )}{" "}
                de {pageResult.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(pageResult.page - 1)}
                  disabled={pageResult.page === 0}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                  aria-label="Página anterior"
                  data-testid="page-prev"
                >
                  Anterior
                </button>
                <span className="tabular-nums">
                  {pageResult.page + 1} / {pageResult.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(pageResult.page + 1)}
                  disabled={pageResult.page >= pageResult.totalPages - 1}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                  aria-label="Próxima página"
                  data-testid="page-next"
                >
                  Próxima
                </button>
              </div>
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
