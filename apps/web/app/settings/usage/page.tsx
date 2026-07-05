"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  fetchUsageHistory,
  type UsageHistoryEntry,
} from "@/lib/billing-client";

const PERIOD_OPTIONS: { label: string; months: number }[] = [
  { label: "6 meses", months: 6 },
  { label: "12 meses", months: 12 },
  { label: "24 meses", months: 24 },
];

const numberFmt = new Intl.NumberFormat("pt-BR");

function formatMonth(value: string): string {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return value;
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function UsageTable({ rows }: { rows: UsageHistoryEntry[] }) {
  const reversed = useMemo(() => [...rows].reverse(), [rows]);

  if (reversed.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-8 text-center text-sm text-gray-400">
        Sem registros de uso no período.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700/40">
      <table
        className="w-full border-collapse text-sm"
        aria-label="Histórico mensal de uso"
      >
        <thead className="bg-gray-900/60">
          <tr>
            {[
              { label: "Mês", align: "text-left" },
              { label: "Scripts", align: "text-right" },
              { label: "Narrações", align: "text-right" },
              { label: "Exports", align: "text-right" },
              { label: "Total", align: "text-right" },
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
          {reversed.map((row) => (
            <tr
              key={row.month}
              className="border-t border-gray-800 hover:bg-gray-800/40"
              data-testid={`usage-row-${row.month}`}
            >
              <td className="px-4 py-3 text-white">{formatMonth(row.month)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                {numberFmt.format(row.scripts)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                {numberFmt.format(row.narrations)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                {numberFmt.format(row.exports)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">
                {numberFmt.format(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsageHistoryPage() {
  const router = useRouter();
  const [months, setMonths] = useState(12);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["billing", "usage-history", months],
    queryFn: () => fetchUsageHistory(months),
  });

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <header className="border-b border-gray-800/50 bg-[#0E0E0E]/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-5">
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
            Histórico de uso
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            Consumo mensal da sua organização (scripts, narrações e exports).
          </p>
          <div
            role="group"
            aria-label="Período do histórico"
            className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1"
          >
            {PERIOD_OPTIONS.map((opt) => {
              const active = months === opt.months;
              return (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setMonths(opt.months)}
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

        {isError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-200"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Não foi possível carregar o histórico de uso.
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-red-500/20 px-4 text-sm font-medium text-red-100 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="space-y-3"
          >
            <span className="sr-only">Carregando histórico...</span>
            <div className="h-24 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50" />
            <div className="h-72 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50" />
          </div>
        ) : data ? (
          <>
            <section
              aria-label="Totais do período"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                { label: "Scripts", value: data.totals.scripts },
                { label: "Narrações", value: data.totals.narrations },
                { label: "Exports", value: data.totals.exports },
                { label: "Total", value: data.totals.total, emphasis: true },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-gray-700/30 bg-gray-900/50 p-4"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {kpi.label}
                  </div>
                  <div
                    className={`mt-1 text-2xl font-semibold tabular-nums ${
                      kpi.emphasis ? "text-[#A78BFA]" : "text-white"
                    }`}
                  >
                    {numberFmt.format(kpi.value)}
                  </div>
                </div>
              ))}
            </section>

            <UsageTable rows={data.months} />
          </>
        ) : null}
      </main>
    </div>
  );
}
