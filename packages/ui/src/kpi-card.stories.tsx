import { KPICard } from "./kpi-card";

const ChartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 4 4 5-6" />
  </svg>
);

const meta = {
  title: "Components/KPICard",
  component: KPICard,
};
export default meta;

export const Positive = {
  args: {
    title: "Receita Mensal",
    value: "R$ 48.230",
    delta: "+12,4% vs mês anterior",
    icon: <ChartIcon />,
    variant: "positive" as const,
  },
};

export const Neutral = {
  args: {
    title: "Usuários Ativos",
    value: "1.204",
    delta: "Sem variação",
    icon: <ChartIcon />,
    variant: "neutral" as const,
  },
};

export const Negative = {
  args: {
    title: "Churn",
    value: "3,8%",
    delta: "+0,6 p.p. vs mês anterior",
    icon: <ChartIcon />,
    variant: "negative" as const,
  },
};

export const WithoutDelta = {
  args: {
    title: "Vídeos Publicados",
    value: 87,
    icon: <ChartIcon />,
  },
};

export const WithoutIcon = {
  args: {
    title: "Taxa de Conversão",
    value: "4,2%",
    delta: "+0,3 p.p.",
    variant: "positive" as const,
  },
};
