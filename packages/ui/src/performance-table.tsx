import { type ReactNode, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface PerformanceTableColumn<T> {
  key: string;
  header: ReactNode;
  accessor: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface PerformanceTableProps<T> {
  data: T[];
  columns: PerformanceTableColumn<T>[];
  rowKey: (row: T) => string | number;
  pageSize?: number;
  initialSort?: { key: string; direction: SortDirection };
  loading?: boolean;
  emptyState?: ReactNode;
  caption?: ReactNode;
  ariaLabel?: string;
}

export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

const alignClass: Record<NonNullable<PerformanceTableColumn<unknown>["align"]>, string> = {
  left: "ui:text-left",
  right: "ui:text-right",
  center: "ui:text-center",
};

export function PerformanceTable<T>({
  data,
  columns,
  rowKey,
  pageSize = 10,
  initialSort,
  loading = false,
  emptyState,
  caption,
  ariaLabel,
}: PerformanceTableProps<T>) {
  const [sort, setSort] = useState<
    { key: string; direction: SortDirection } | null
  >(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const result = compareValues(column.accessor(a), column.accessor(b));
      return sort.direction === "asc" ? result : -result;
    });
    return copy;
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * pageSize;
  const pageRows = sortedData.slice(pageStart, pageStart + pageSize);

  const toggleSort = (column: PerformanceTableColumn<T>) => {
    if (column.sortable === false) return;
    setPage(0);
    setSort((current) => {
      if (!current || current.key !== column.key) {
        return { key: column.key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key: column.key, direction: "desc" };
      }
      return null;
    });
  };

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(0, next), totalPages - 1));
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="ui:flex ui:flex-col ui:gap-3 ui:rounded-xl ui:border ui:border-neutral-200 ui:bg-white ui:p-5 dark:ui:border-neutral-800 dark:ui:bg-neutral-900"
        data-testid="performance-table-loading"
      >
        <span className="ui:sr-only">Carregando dados...</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="ui:h-4 ui:w-full ui:animate-pulse ui:rounded ui:bg-neutral-200 dark:ui:bg-neutral-800"
          />
        ))}
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div
        role="status"
        className="ui:flex ui:min-h-40 ui:items-center ui:justify-center ui:rounded-xl ui:border ui:border-dashed ui:border-neutral-300 ui:bg-neutral-50 ui:p-8 ui:text-sm ui:text-neutral-500 dark:ui:border-neutral-700 dark:ui:bg-neutral-900 dark:ui:text-neutral-400"
        data-testid="performance-table-empty"
      >
        {emptyState ?? "Sem dados para exibir."}
      </div>
    );
  }

  return (
    <div className="ui:flex ui:flex-col ui:gap-3">
      <div className="ui:overflow-x-auto ui:rounded-xl ui:border ui:border-neutral-200 dark:ui:border-neutral-800">
        <table
          className="ui:w-full ui:border-collapse ui:text-sm"
          aria-label={ariaLabel}
        >
          {caption ? (
            <caption className="ui:p-3 ui:text-left ui:text-sm ui:text-neutral-600 dark:ui:text-neutral-400">
              {caption}
            </caption>
          ) : null}
          <thead className="ui:bg-neutral-50 dark:ui:bg-neutral-900">
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                const ariaSort: "ascending" | "descending" | "none" = isSorted
                  ? sort?.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                const sortable = column.sortable !== false;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sortable ? ariaSort : undefined}
                    style={column.width ? { width: column.width } : undefined}
                    className={`ui:px-4 ui:py-3 ui:text-xs ui:font-semibold ui:uppercase ui:tracking-wide ui:text-neutral-600 dark:ui:text-neutral-300 ${alignClass[column.align ?? "left"]}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="ui:inline-flex ui:items-center ui:gap-1 ui:rounded ui:px-1 ui:py-0.5 hover:ui:text-neutral-900 focus:ui:outline-none focus-visible:ui:ring-2 focus-visible:ui:ring-blue-500 dark:hover:ui:text-neutral-50"
                        data-testid={`sort-${column.key}`}
                      >
                        <span>{column.header}</span>
                        <span aria-hidden="true" className="ui:text-neutral-400">
                          {isSorted
                            ? sort?.direction === "asc"
                              ? "▲"
                              : "▼"
                            : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                className="ui:border-t ui:border-neutral-100 hover:ui:bg-neutral-50 dark:ui:border-neutral-800 dark:hover:ui:bg-neutral-800/40"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`ui:px-4 ui:py-3 ui:text-neutral-800 ui:tabular-nums dark:ui:text-neutral-100 ${alignClass[column.align ?? "left"]}`}
                  >
                    {column.render
                      ? column.render(row)
                      : (column.accessor(row) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        className="ui:flex ui:items-center ui:justify-between ui:gap-3 ui:text-sm ui:text-neutral-600 dark:ui:text-neutral-400"
        aria-label="Paginação"
      >
        <span data-testid="page-info">
          {pageStart + 1}–{Math.min(pageStart + pageSize, sortedData.length)} de{" "}
          {sortedData.length}
        </span>
        <div className="ui:flex ui:items-center ui:gap-2">
          <button
            type="button"
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 0}
            className="ui:inline-flex ui:h-11 ui:min-w-11 ui:items-center ui:justify-center ui:rounded-md ui:border ui:border-neutral-200 ui:bg-white ui:px-3 ui:text-sm ui:font-medium ui:text-neutral-700 hover:ui:bg-neutral-50 disabled:ui:cursor-not-allowed disabled:ui:opacity-50 focus-visible:ui:outline-none focus-visible:ui:ring-2 focus-visible:ui:ring-blue-500 dark:ui:border-neutral-700 dark:ui:bg-neutral-900 dark:ui:text-neutral-200 dark:hover:ui:bg-neutral-800"
            data-testid="page-prev"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          <span className="ui:tabular-nums" data-testid="page-current">
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage >= totalPages - 1}
            className="ui:inline-flex ui:h-11 ui:min-w-11 ui:items-center ui:justify-center ui:rounded-md ui:border ui:border-neutral-200 ui:bg-white ui:px-3 ui:text-sm ui:font-medium ui:text-neutral-700 hover:ui:bg-neutral-50 disabled:ui:cursor-not-allowed disabled:ui:opacity-50 focus-visible:ui:outline-none focus-visible:ui:ring-2 focus-visible:ui:ring-blue-500 dark:ui:border-neutral-700 dark:ui:bg-neutral-900 dark:ui:text-neutral-200 dark:hover:ui:bg-neutral-800"
            data-testid="page-next"
            aria-label="Próxima página"
          >
            Próxima
          </button>
        </div>
      </nav>
    </div>
  );
}

export function sortRows<T>(
  data: T[],
  columns: PerformanceTableColumn<T>[],
  sort: { key: string; direction: SortDirection } | null,
): T[] {
  if (!sort) return data;
  const column = columns.find((c) => c.key === sort.key);
  if (!column) return data;
  const copy = [...data];
  copy.sort((a, b) => {
    const result = compareValues(column.accessor(a), column.accessor(b));
    return sort.direction === "asc" ? result : -result;
  });
  return copy;
}

export function paginateRows<T>(
  data: T[],
  page: number,
  pageSize: number,
): { rows: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * pageSize;
  return {
    rows: data.slice(start, start + pageSize),
    totalPages,
    page: safePage,
  };
}
