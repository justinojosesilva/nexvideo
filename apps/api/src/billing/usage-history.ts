export interface UsageLogRow {
  month: string;
  scripts: number;
  narrations: number;
  exports: number;
}

export interface UsageHistoryEntry extends UsageLogRow {
  total: number;
}

export interface UsageHistoryTotals {
  scripts: number;
  narrations: number;
  exports: number;
  total: number;
}

export interface UsageHistoryResult {
  months: UsageHistoryEntry[];
  totals: UsageHistoryTotals;
}

/**
 * Build a list of YYYY-MM strings going backwards from `reference`, inclusive,
 * for `count` months in chronological (oldest → newest) order.
 */
export function buildMonthRange(reference: Date, count: number): string[] {
  if (count <= 0) return [];
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - i, 1),
    );
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push(month);
  }
  return out;
}

/**
 * Aggregate stored UsageLog rows into a fully-filled monthly history.
 * Missing months are returned as zero-usage entries so the timeline is dense.
 */
export function buildUsageHistory(
  rows: UsageLogRow[],
  range: string[],
): UsageHistoryResult {
  const byMonth = new Map<string, UsageLogRow>(
    rows.map((r) => [r.month, r]),
  );

  const months: UsageHistoryEntry[] = range.map((month) => {
    const row = byMonth.get(month);
    const scripts = row?.scripts ?? 0;
    const narrations = row?.narrations ?? 0;
    const exports = row?.exports ?? 0;
    return {
      month,
      scripts,
      narrations,
      exports,
      total: scripts + narrations + exports,
    };
  });

  const totals = months.reduce<UsageHistoryTotals>(
    (acc, m) => ({
      scripts: acc.scripts + m.scripts,
      narrations: acc.narrations + m.narrations,
      exports: acc.exports + m.exports,
      total: acc.total + m.total,
    }),
    { scripts: 0, narrations: 0, exports: 0, total: 0 },
  );

  return { months, totals };
}
