"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import {
  fetchExportChecklist,
  type ChecklistItem,
  type ChecklistResponse,
} from "@/lib/export-client";

export interface ExportChecklistProps {
  projectId: string;
  onReady?: (canExport: boolean) => void;
  children?: (state: {
    data: ChecklistResponse | undefined;
    isLoading: boolean;
    error: unknown;
    canExport: boolean;
  }) => React.ReactNode;
}

function StatusIcon({ status }: { status: ChecklistItem["status"] }) {
  if (status === "pass") {
    return (
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"
      >
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-300"
      >
        <AlertTriangle className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-red-300"
    >
      <X className="h-4 w-4" />
    </span>
  );
}

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  pass: "OK",
  warn: "Atenção",
  fail: "Pendente",
};

export function ExportChecklist({
  projectId,
  onReady,
  children,
}: ExportChecklistProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["export-checklist", projectId],
    queryFn: () => fetchExportChecklist(projectId),
  });

  const canExport = !!data?.canExport;

  // Notify parent without effects: cheap because data is referentially stable per query
  if (onReady && data) onReady(canExport);

  return (
    <section
      aria-label="Checklist de pré-publicação"
      className="flex flex-col gap-4 rounded-xl border border-gray-700/40 bg-gray-900/50 p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-white">
            Checklist de pré-publicação
          </h2>
          <p className="text-sm text-gray-400">
            Itens marcados como críticos precisam estar OK antes de exportar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Reavaliar checklist"
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Reavaliar
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Não foi possível carregar o checklist.
        </div>
      ) : null}

      {isLoading ? (
        <div
          className="space-y-2"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Carregando checklist...</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-gray-700/40 bg-gray-900/40"
            />
          ))}
        </div>
      ) : data ? (
        <ul className="flex flex-col gap-2" data-testid="checklist-items">
          {data.items.map((item) => (
            <li
              key={item.id}
              data-testid={`checklist-${item.id}`}
              data-status={item.status}
              data-critical={item.critical}
              className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm ${
                item.status === "pass"
                  ? "border-gray-700/40 bg-gray-900/30"
                  : item.status === "warn"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <StatusIcon status={item.status} />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{item.label}</span>
                  {item.critical ? (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                      crítico
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-700/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                      opcional
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.message ? (
                  <p className="text-xs text-gray-400">{item.message}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {children
        ? children({ data, isLoading, error, canExport })
        : null}
    </section>
  );
}
