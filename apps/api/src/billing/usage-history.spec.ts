import {
  buildMonthRange,
  buildUsageHistory,
  type UsageLogRow,
} from './usage-history';

describe('buildMonthRange', () => {
  it('returns the requested number of months in chronological order', () => {
    const range = buildMonthRange(new Date(Date.UTC(2026, 4, 15)), 3);
    expect(range).toEqual(['2026-03', '2026-04', '2026-05']);
  });

  it('handles year boundaries', () => {
    const range = buildMonthRange(new Date(Date.UTC(2026, 1, 10)), 4);
    expect(range).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('returns a single month for count=1', () => {
    const range = buildMonthRange(new Date(Date.UTC(2026, 6, 1)), 1);
    expect(range).toEqual(['2026-07']);
  });

  it('returns empty for count <= 0', () => {
    expect(buildMonthRange(new Date(), 0)).toEqual([]);
    expect(buildMonthRange(new Date(), -3)).toEqual([]);
  });
});

describe('buildUsageHistory', () => {
  const range = ['2026-01', '2026-02', '2026-03'];

  it('fills missing months with zero usage', () => {
    const rows: UsageLogRow[] = [
      { month: '2026-02', scripts: 5, narrations: 2, exports: 1 },
    ];

    const result = buildUsageHistory(rows, range);

    expect(result.months).toHaveLength(3);
    expect(result.months[0]).toEqual({
      month: '2026-01',
      scripts: 0,
      narrations: 0,
      exports: 0,
      total: 0,
    });
    expect(result.months[1]).toEqual({
      month: '2026-02',
      scripts: 5,
      narrations: 2,
      exports: 1,
      total: 8,
    });
    expect(result.months[2]?.total).toBe(0);
  });

  it('preserves the requested month order', () => {
    const rows: UsageLogRow[] = [
      { month: '2026-03', scripts: 1, narrations: 0, exports: 0 },
      { month: '2026-01', scripts: 2, narrations: 0, exports: 0 },
    ];

    const result = buildUsageHistory(rows, range);

    expect(result.months.map((m) => m.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('aggregates totals across the range', () => {
    const rows: UsageLogRow[] = [
      { month: '2026-01', scripts: 3, narrations: 1, exports: 2 },
      { month: '2026-02', scripts: 4, narrations: 0, exports: 1 },
      { month: '2026-03', scripts: 1, narrations: 2, exports: 0 },
    ];

    const result = buildUsageHistory(rows, range);

    expect(result.totals).toEqual({
      scripts: 8,
      narrations: 3,
      exports: 3,
      total: 14,
    });
  });

  it('ignores rows outside the requested range', () => {
    const rows: UsageLogRow[] = [
      { month: '2025-12', scripts: 99, narrations: 99, exports: 99 },
      { month: '2026-02', scripts: 1, narrations: 1, exports: 1 },
    ];

    const result = buildUsageHistory(rows, range);

    expect(result.totals.total).toBe(3);
    expect(result.months.some((m) => m.month === '2025-12')).toBe(false);
  });

  it('returns zero totals for an empty range', () => {
    const result = buildUsageHistory([], []);
    expect(result.months).toEqual([]);
    expect(result.totals).toEqual({
      scripts: 0,
      narrations: 0,
      exports: 0,
      total: 0,
    });
  });
});
