import { type ReactNode } from "react";

export type KPICardVariant = "positive" | "neutral" | "negative";

export interface KPICardProps {
  title: string;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  variant?: KPICardVariant;
}

const variantStyles: Record<KPICardVariant, string> = {
  positive: "ui:text-emerald-600 dark:ui:text-emerald-400",
  neutral: "ui:text-neutral-500 dark:ui:text-neutral-400",
  negative: "ui:text-rose-600 dark:ui:text-rose-400",
};

const variantSymbol: Record<KPICardVariant, string> = {
  positive: "▲",
  neutral: "■",
  negative: "▼",
};

export function KPICard({
  title,
  value,
  delta,
  icon,
  variant = "neutral",
}: KPICardProps) {
  return (
    <div
      className="ui:flex ui:flex-col ui:gap-3 ui:rounded-xl ui:border ui:border-neutral-200 ui:bg-white ui:p-5 ui:shadow-sm dark:ui:border-neutral-800 dark:ui:bg-neutral-900"
      role="group"
      aria-label={title}
    >
      <div className="ui:flex ui:items-center ui:justify-between">
        <h3 className="ui:text-sm ui:font-medium ui:text-neutral-600 dark:ui:text-neutral-400">
          {title}
        </h3>
        {icon ? (
          <span
            aria-hidden="true"
            className="ui:flex ui:h-8 ui:w-8 ui:items-center ui:justify-center ui:rounded-md ui:bg-neutral-100 ui:text-neutral-700 dark:ui:bg-neutral-800 dark:ui:text-neutral-200"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="ui:text-3xl ui:font-semibold ui:tabular-nums ui:text-neutral-900 dark:ui:text-neutral-50">
        {value}
      </div>
      {delta !== undefined && delta !== null ? (
        <div
          className={`ui:flex ui:items-center ui:gap-1 ui:text-sm ui:font-medium ${variantStyles[variant]}`}
          data-variant={variant}
        >
          <span aria-hidden="true">{variantSymbol[variant]}</span>
          <span>{delta}</span>
        </div>
      ) : null}
    </div>
  );
}
