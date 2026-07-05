import { LineChart, type LineChartPoint } from "./line-chart";

const baseData: LineChartPoint[] = Array.from({ length: 14 }).map((_, i) => {
  const date = new Date(2026, 4, 1 + i);
  return {
    date: date.toISOString(),
    views: 1000 + Math.round(Math.sin(i / 2) * 300 + i * 80),
    subscribers: 200 + Math.round(Math.cos(i / 3) * 50 + i * 12),
  };
});

const meta = {
  title: "Components/LineChart",
  component: LineChart,
};
export default meta;

export const SingleSeries = {
  args: {
    ariaLabel: "Visualizações ao longo do tempo",
    data: baseData,
    series: [{ key: "views", label: "Visualizações" }],
  },
};

export const MultiSeries = {
  args: {
    ariaLabel: "Engajamento ao longo do tempo",
    data: baseData,
    series: [
      { key: "views", label: "Visualizações", color: "#2563eb" },
      { key: "subscribers", label: "Inscritos", color: "#16a34a" },
    ],
  },
};

export const WithCustomFormatters = {
  args: {
    ariaLabel: "Receita diária",
    data: baseData.map((d) => ({ date: d.date, revenue: Number(d.views) * 0.12 })),
    series: [{ key: "revenue", label: "Receita", color: "#7c3aed" }],
    yAxisFormatter: (v: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v),
    tooltipFormatter: (v: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v),
  },
};

export const WithCustomLegend = {
  args: {
    ariaLabel: "Comparativo com legenda customizada",
    data: baseData,
    series: [
      { key: "views", label: "Visualizações" },
      { key: "subscribers", label: "Inscritos", strokeDasharray: "4 4" },
    ],
    renderLegend: (
      items: { key: string; label: string; color: string }[],
    ) => (
      <ul className="ui:flex ui:flex-wrap ui:gap-4 ui:text-sm">
        {items.map((item) => (
          <li key={item.key} className="ui:flex ui:items-center ui:gap-2">
            <span
              aria-hidden="true"
              className="ui:inline-block ui:h-3 ui:w-3 ui:rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    ),
  },
};

export const Empty = {
  args: {
    ariaLabel: "Sem dados",
    data: [],
    series: [{ key: "views", label: "Visualizações" }],
  },
};
