"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Clock, MousePointerClick, Film, RefreshCw, AlertTriangle } from "lucide-react";
import {
  fetchVideoPerformance,
  type AnalyticsPeriodDays,
  type AnalyticsProjectRow,
} from "@/lib/analytics-client";

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriodDays }[] = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

const numberFmt = new Intl.NumberFormat("pt-BR");
const percentFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0min";
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
}

function formatDateLabel(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function KPI({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-3 rounded-xl border border-gray-700/30 bg-gray-900/50 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">{label}</h3>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#7C3AED]/15 text-[#A78BFA]"
        >
          {icon}
        </span>
      </div>
      <div className="text-3xl font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

function PerformanceTable({ rows }: { rows: AnalyticsProjectRow[] }) {
  type SortKey = "projectTitle" | "views" | "watchTime" | "impressions" | "ctr";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "views",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const toggleSort = (key: SortKey) => {
    setPage(0);
    setSort((curr) =>
      curr.key === key
        ? { key, dir: curr.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const sortIndicator = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "↕";

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-8 text-center text-sm text-gray-400">
        Nenhum projeto com dados no período selecionado.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-gray-700/40">
        <table className="w-full border-collapse text-sm" aria-label="Performance por projeto">
          <thead className="bg-gray-900/60">
            <tr>
              {[
                { key: "projectTitle" as const, label: "Projeto", align: "text-left" },
                { key: "views" as const, label: "Views", align: "text-right" },
                { key: "watchTime" as const, label: "Watch time", align: "text-right" },
                { key: "impressions" as const, label: "Impressões", align: "text-right" },
                { key: "ctr" as const, label: "CTR médio", align: "text-right" },
              ].map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    sort.key === col.key
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${col.align}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                  >
                    <span>{col.label}</span>
                    <span aria-hidden="true" className="text-gray-500">
                      {sortIndicator(col.key)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.projectId}
                className="border-t border-gray-800 hover:bg-gray-800/40"
              >
                <td className="px-4 py-3 text-white">{row.projectTitle}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                  {numberFmt.format(row.views)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                  {formatDuration(row.watchTime)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                  {numberFmt.format(row.impressions)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                  {percentFmt.format(row.ctr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        className="flex items-center justify-between text-sm text-gray-400"
        aria-label="Paginação"
      >
        <span>
          {start + 1}–{Math.min(start + pageSize, sorted.length)} de{" "}
          {sorted.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          <span className="tabular-nums">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Próxima página"
          >
            Próxima
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<AnalyticsPeriodDays>(30);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["analytics", "video-performance", days],
    queryFn: () => fetchVideoPerformance(days),
  });

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl font-bold text-white sm:text-4xl">
                Analytics
              </h1>
              <p className="mt-2 text-gray-400">
                Desempenho dos seus vídeos no período selecionado.
              </p>
            </div>
            <div
              role="group"
              aria-label="Filtro de período"
              className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1"
            >
              {PERIOD_OPTIONS.map((opt) => {
                const active = days === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDays(opt.value)}
                    aria-pressed={active}
                    className={`inline-flex h-11 min-w-20 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                      active
                        ? "bg-[#7C3AED] text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 sm:py-12">
        {isError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-200"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Não foi possível carregar os dados de analytics.
            </div>
            <p className="text-sm text-red-200/80">
              Verifique sua conexão e tente novamente.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-red-500/20 px-4 text-sm font-medium text-red-100 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-6" role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">Carregando dados de analytics...</span>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50"
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50" />
            <div className="h-96 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50" />
          </div>
        ) : data ? (
          <>
            <section
              aria-label="Indicadores principais"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KPI
                label="Views"
                value={numberFmt.format(data.totals.views)}
                icon={<Eye className="h-4 w-4" />}
              />
              <KPI
                label="Watch time"
                value={formatDuration(data.totals.watchTime)}
                icon={<Clock className="h-4 w-4" />}
              />
              <KPI
                label="CTR médio"
                value={percentFmt.format(data.totals.ctr)}
                icon={<MousePointerClick className="h-4 w-4" />}
              />
              <KPI
                label="Vídeos ativos"
                value={numberFmt.format(data.totals.videos)}
                icon={<Film className="h-4 w-4" />}
              />
            </section>

            <section
              aria-label="Evolução das views"
              className="rounded-xl border border-gray-700/30 bg-gray-900/50 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline text-lg font-semibold text-white">
                  Evolução
                </h2>
                {isFetching ? (
                  <span className="text-xs text-gray-400">Atualizando...</span>
                ) : null}
              </div>
              {data.series.length === 0 ? (
                <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-700 text-sm text-gray-400">
                  Sem dados para exibir no período selecionado.
                </div>
              ) : (
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.series}
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateLabel}
                        stroke="#6b7280"
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="#6b7280"
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                        width={48}
                        tickFormatter={(v) => numberFmt.format(Number(v))}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#111827",
                          border: "1px solid #374151",
                          borderRadius: 8,
                          color: "#e5e7eb",
                          fontSize: 12,
                        }}
                        labelFormatter={(l) => formatDateLabel(String(l))}
                        formatter={(value, name) => {
                          const n = Number(value);
                          if (name === "Watch time")
                            return [formatDuration(n), name];
                          if (name === "CTR")
                            return [percentFmt.format(n), name];
                          return [numberFmt.format(n), name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                      <Line
                        type="monotone"
                        dataKey="views"
                        name="Views"
                        stroke="#7C3AED"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="impressions"
                        name="Impressões"
                        stroke="#4EDEA3"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section
              aria-label="Performance por projeto"
              className="rounded-xl border border-gray-700/30 bg-gray-900/50 p-5"
            >
              <h2 className="mb-4 font-headline text-lg font-semibold text-white">
                Performance por projeto
              </h2>
              <PerformanceTable rows={data.byProject} />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
