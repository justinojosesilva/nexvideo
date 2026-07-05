import {
  PerformanceTable,
  type PerformanceTableColumn,
} from "./performance-table";

interface VideoRow {
  id: string;
  title: string;
  views: number;
  ctr: number;
  publishedAt: string;
}

const rows: VideoRow[] = Array.from({ length: 27 }).map((_, i) => ({
  id: `vid-${i + 1}`,
  title: `Vídeo de exemplo #${i + 1}`,
  views: Math.round(Math.random() * 50_000),
  ctr: Math.round(Math.random() * 1000) / 100,
  publishedAt: new Date(2026, 3, (i % 28) + 1).toISOString().slice(0, 10),
}));

const columns: PerformanceTableColumn<VideoRow>[] = [
  { key: "title", header: "Título", accessor: (r) => r.title },
  {
    key: "views",
    header: "Views",
    accessor: (r) => r.views,
    align: "right",
    render: (r) => r.views.toLocaleString("pt-BR"),
  },
  {
    key: "ctr",
    header: "CTR",
    accessor: (r) => r.ctr,
    align: "right",
    render: (r) => `${r.ctr.toFixed(2)}%`,
  },
  {
    key: "publishedAt",
    header: "Publicado em",
    accessor: (r) => r.publishedAt,
  },
];

const meta = {
  title: "Components/PerformanceTable",
  component: PerformanceTable,
};
export default meta;

export const Default = {
  args: {
    data: rows,
    columns,
    rowKey: (r: VideoRow) => r.id,
    ariaLabel: "Performance de vídeos",
  },
};

export const WithInitialSort = {
  args: {
    data: rows,
    columns,
    rowKey: (r: VideoRow) => r.id,
    initialSort: { key: "views", direction: "desc" as const },
    ariaLabel: "Performance de vídeos por views",
  },
};

export const SmallPageSize = {
  args: {
    data: rows,
    columns,
    rowKey: (r: VideoRow) => r.id,
    pageSize: 5,
    ariaLabel: "Performance de vídeos compacta",
  },
};

export const Loading = {
  args: {
    data: [],
    columns,
    rowKey: (r: VideoRow) => r.id,
    loading: true,
  },
};

export const Empty = {
  args: {
    data: [],
    columns,
    rowKey: (r: VideoRow) => r.id,
    emptyState: "Nenhum vídeo publicado ainda.",
  },
};
