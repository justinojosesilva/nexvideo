import { type ReactNode, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface LineChartSeries {
  key: string;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}

export interface LineChartPoint {
  date: string | number | Date;
  [seriesKey: string]: string | number | Date | null | undefined;
}

export interface LineChartProps {
  data: LineChartPoint[];
  series: LineChartSeries[];
  height?: number;
  xAxisFormatter?: (value: string | number | Date) => string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, label: string) => string;
  renderLegend?: (items: { key: string; label: string; color: string }[]) => ReactNode;
  ariaLabel: string;
  ariaDescription?: string;
  emptyState?: ReactNode;
}

const DEFAULT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

const defaultDateFormatter = (value: string | number | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
};

const defaultNumberFormatter = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  xAxisFormatter: NonNullable<LineChartProps["xAxisFormatter"]>;
  tooltipFormatter: (value: number, label: string) => string;
  resolvedSeries: { key: string; label: string; color: string }[];
}

function CustomTooltip({
  active,
  payload,
  label,
  xAxisFormatter,
  tooltipFormatter,
  resolvedSeries,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      role="tooltip"
      className="ui:rounded-md ui:border ui:border-neutral-200 ui:bg-white ui:px-3 ui:py-2 ui:text-xs ui:shadow-md dark:ui:border-neutral-700 dark:ui:bg-neutral-900"
    >
      <div className="ui:mb-1 ui:font-medium ui:text-neutral-700 dark:ui:text-neutral-200">
        {label !== undefined ? xAxisFormatter(label) : null}
      </div>
      <ul className="ui:flex ui:flex-col ui:gap-1">
        {payload.map((entry) => {
          const meta = resolvedSeries.find((s) => s.key === entry.dataKey);
          if (!meta) return null;
          return (
            <li
              key={meta.key}
              className="ui:flex ui:items-center ui:gap-2 ui:text-neutral-600 dark:ui:text-neutral-300"
            >
              <span
                aria-hidden="true"
                className="ui:inline-block ui:h-2 ui:w-2 ui:rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <span className="ui:flex-1">{meta.label}</span>
              <span className="ui:font-medium ui:tabular-nums ui:text-neutral-900 dark:ui:text-neutral-50">
                {tooltipFormatter(Number(entry.value ?? 0), meta.label)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LineChart({
  data,
  series,
  height = 280,
  xAxisFormatter = defaultDateFormatter,
  yAxisFormatter = defaultNumberFormatter,
  tooltipFormatter,
  renderLegend,
  ariaLabel,
  ariaDescription,
  emptyState,
}: LineChartProps) {
  const resolvedSeries = useMemo(
    () =>
      series.map((s, i) => ({
        key: s.key,
        label: s.label ?? s.key,
        color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]!,
        strokeDasharray: s.strokeDasharray,
      })),
    [series],
  );

  const resolvedTooltipFormatter = useMemo(
    () =>
      tooltipFormatter ??
      ((value: number) => defaultNumberFormatter(value)),
    [tooltipFormatter],
  );

  if (!data || data.length === 0) {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        className="ui:flex ui:items-center ui:justify-center ui:rounded-xl ui:border ui:border-dashed ui:border-neutral-300 ui:bg-neutral-50 ui:p-8 ui:text-sm ui:text-neutral-500 dark:ui:border-neutral-700 dark:ui:bg-neutral-900 dark:ui:text-neutral-400"
        style={{ minHeight: height }}
      >
        {emptyState ?? "Sem dados para exibir."}
      </div>
    );
  }

  const summary =
    ariaDescription ??
    `Gráfico de linhas com ${resolvedSeries.length} série(s) e ${data.length} ponto(s) ao longo do tempo.`;

  return (
    <figure
      role="img"
      aria-label={ariaLabel}
      aria-describedby={undefined}
      className="ui:flex ui:w-full ui:flex-col ui:gap-3"
    >
      <span className="ui:sr-only">{summary}</span>
      <div className="ui:w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="ui:text-neutral-200 dark:ui:text-neutral-800"
            />
            <XAxis
              dataKey="date"
              tickFormatter={xAxisFormatter}
              stroke="currentColor"
              className="ui:text-xs ui:text-neutral-500 dark:ui:text-neutral-400"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={yAxisFormatter}
              stroke="currentColor"
              className="ui:text-xs ui:text-neutral-500 dark:ui:text-neutral-400"
              tick={{ fontSize: 12 }}
              tickMargin={8}
              width={48}
            />
            <Tooltip
              content={
                <CustomTooltip
                  xAxisFormatter={xAxisFormatter}
                  tooltipFormatter={resolvedTooltipFormatter}
                  resolvedSeries={resolvedSeries}
                />
              }
              cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
            />
            {renderLegend ? null : (
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 8, fontSize: 12 }}
                formatter={(value) =>
                  resolvedSeries.find((s) => s.key === value)?.label ?? value
                }
              />
            )}
            {resolvedSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      {renderLegend ? <div>{renderLegend(resolvedSeries)}</div> : null}
    </figure>
  );
}
