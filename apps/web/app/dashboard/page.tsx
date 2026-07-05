"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Zap,
  ArrowRight,
  X,
  FolderKanban,
  Sparkles,
  TrendingUp,
  FileText,
  Clock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { fetchProjects } from "@/lib/projects-client";
import { fetchSubscription, type GetSubscriptionResponse } from "@/lib/billing-client";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planejamento",
  in_development: "Em Desenvolvimento",
  in_review: "Em Revisão",
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-500/20 text-blue-300",
  in_development: "bg-orange-500/20 text-orange-300",
  in_review: "bg-[#7C3AED]/20 text-[#A78BFA]",
  active: "bg-[#4EDEA3]/20 text-[#4EDEA3]",
};

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "purple",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "purple" | "emerald" | "blue" | "amber";
}) {
  const accentMap = {
    purple: "text-[#A78BFA] bg-[#7C3AED]/10",
    emerald: "text-[#4EDEA3] bg-[#4EDEA3]/10",
    blue: "text-blue-300 bg-blue-500/10",
    amber: "text-amber-300 bg-amber-500/10",
  } as const;

  return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-900/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentMap[accent]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-headline text-3xl font-bold tabular-nums text-white">
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function UsageWidget({
  subscription,
}: {
  subscription: GetSubscriptionResponse;
}) {
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDateFormatted = resetDate.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });

  const metrics = [
    {
      label: "Scripts",
      used: subscription.usage.scripts,
      limit: subscription.limits.scripts,
      percent: subscription.percentUsed.scripts,
    },
    {
      label: "Narrações",
      used: subscription.usage.narrations,
      limit: subscription.limits.narrations,
      percent: subscription.percentUsed.narrations,
    },
    {
      label: "Exports",
      used: subscription.usage.exports,
      limit: subscription.limits.exports,
      percent: subscription.percentUsed.exports,
    },
  ];

  const maxPercent = Math.max(...metrics.map((m) => m.percent));
  const showUpgradeCta = maxPercent >= 80;

  function getBarColor(percent: number): string {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 60) return "bg-amber-400";
    return "bg-[#4EDEA3]";
  }

  function getValueColor(percent: number): string {
    if (percent >= 90) return "text-red-400";
    if (percent >= 60) return "text-amber-400";
    return "text-[#4EDEA3]";
  }

  return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-headline text-sm font-semibold text-white">
          Uso mensal
        </h2>
        <span className="text-xs text-gray-500">
          Reinicia em {resetDateFormatted}
        </span>
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => {
          const clampedPercent = Math.min(metric.percent, 100);
          const isUnlimited = metric.limit === null;

          return (
            <div key={metric.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-400">{metric.label}</span>
                <span
                  className={
                    isUnlimited ? "text-gray-500" : getValueColor(metric.percent)
                  }
                >
                  {isUnlimited
                    ? `${metric.used} / ∞`
                    : `${metric.used} / ${metric.limit}`}
                </span>
              </div>
              {!isUnlimited && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getBarColor(metric.percent)}`}
                    style={{ width: `${clampedPercent}%` }}
                    role="progressbar"
                    aria-valuenow={metric.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${metric.label}: ${metric.percent}% usado`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showUpgradeCta && (
        <div className="mt-4 border-t border-gray-700/30 pt-4">
          <Link
            href="/plans"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED]/10 px-4 py-2.5 text-sm font-semibold text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/20"
          >
            <Zap className="h-4 w-4" />
            Fazer upgrade
          </Link>
        </div>
      )}
    </div>
  );
}

function UpgradeBanner({
  maxPercent,
  onDismiss,
}: {
  maxPercent: number;
  onDismiss: () => void;
}) {
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/5">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
            </span>
            <span className="text-amber-200">
              Você usou{" "}
              <span className="font-semibold text-amber-300">{maxPercent}%</span>{" "}
              do seu limite mensal.{" "}
              <span className="text-amber-100/70">
                Faça upgrade para continuar produzindo.
              </span>
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <Link
              href="/plans"
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Ver planos
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={onDismiss}
              className="text-amber-400/60 transition-colors hover:text-amber-400"
              aria-label="Fechar banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-700/30 bg-gray-900/50 p-4 transition-all hover:border-[#7C3AED]/40 hover:bg-gray-900/80"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/15 text-[#A78BFA] transition-colors group-hover:bg-[#7C3AED]/25">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-headline text-sm font-semibold text-white">
          {title}
        </p>
        <p className="truncate text-xs text-gray-400">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-500 transition-colors group-hover:text-[#A78BFA]" />
    </Link>
  );
}

export default function DashboardPage() {
  const isAuthenticated = !!getStoredToken();
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("nexvideo_upgrade_banner_dismissed") === "1";
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const { data: subscription } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: fetchSubscription,
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) =>
      ["planning", "in_development", "in_review"].includes(p.status),
    ).length;
    const active = projects.filter((p) => p.status === "active").length;
    return { total, inProgress, active };
  }, [projects]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 4),
    [projects],
  );

  const maxPercent = subscription
    ? Math.max(
        subscription.percentUsed.scripts,
        subscription.percentUsed.narrations,
        subscription.percentUsed.exports,
      )
    : 0;
  const showBanner = maxPercent >= 80 && !bannerDismissed;

  return (
    <div>
      {showBanner && (
        <UpgradeBanner
          maxPercent={Math.round(maxPercent)}
          onDismiss={() => {
            sessionStorage.setItem("nexvideo_upgrade_banner_dismissed", "1");
            setBannerDismissed(true);
          }}
        />
      )}

      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold text-white sm:text-4xl">
                Dashboard
              </h1>
              <p className="mt-2 text-gray-400">
                Visão geral da sua produção de conteúdo
              </p>
            </div>
            <Link
              href="/projects/new"
              className="btn-primary flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* KPI Tiles */}
        <section aria-label="Indicadores">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total de projetos"
              value={loadingProjects ? "—" : stats.total}
              icon={FolderKanban}
              accent="purple"
            />
            <KpiCard
              label="Em produção"
              value={loadingProjects ? "—" : stats.inProgress}
              hint="Planejamento, dev e revisão"
              icon={Sparkles}
              accent="blue"
            />
            <KpiCard
              label="Ativos"
              value={loadingProjects ? "—" : stats.active}
              icon={TrendingUp}
              accent="emerald"
            />
            <KpiCard
              label="Scripts no mês"
              value={subscription ? subscription.usage.scripts : "—"}
              hint={
                subscription?.limits.scripts != null
                  ? `de ${subscription.limits.scripts}`
                  : "Plano ilimitado"
              }
              icon={FileText}
              accent="amber"
            />
          </div>
        </section>

        {/* Quick actions + usage */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <h2 className="font-headline text-sm font-semibold uppercase tracking-wider text-gray-400">
              Atalhos rápidos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                href="/projects/new"
                title="Novo projeto"
                description="Comece um novo conteúdo com IA"
                icon={Plus}
              />
              <QuickAction
                href="/trends"
                title="Analisar Trends"
                description="Descubra tópicos em alta no seu nicho"
                icon={TrendingUp}
              />
              <QuickAction
                href="/projects"
                title="Ver projetos"
                description="Acompanhe todos os seus projetos"
                icon={FolderKanban}
              />
              <QuickAction
                href="/projects/history"
                title="Histórico"
                description="Veja scripts anteriores"
                icon={Clock}
              />
            </div>
          </div>

          {subscription && (
            <div>
              <h2 className="mb-3 font-headline text-sm font-semibold uppercase tracking-wider text-gray-400">
                Uso
              </h2>
              <UsageWidget subscription={subscription} />
            </div>
          )}
        </section>

        {/* Recent projects */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-sm font-semibold uppercase tracking-wider text-gray-400">
              Projetos recentes
            </h2>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-medium text-[#A78BFA] hover:text-white"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingProjects ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50"
                />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-purple-500/20 p-10 text-center">
              <p className="mb-4 text-gray-400">
                Você ainda não tem projetos. Crie o primeiro!
              </p>
              <Link
                href="/projects/new"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Projeto
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentProjects.map((p) => {
                const updatedAt = new Date(p.updatedAt).toLocaleDateString(
                  "pt-BR",
                  { day: "numeric", month: "short" },
                );
                const statusColor =
                  STATUS_COLORS[p.status] ?? "bg-gray-700/50 text-gray-300";
                const statusLabel = STATUS_LABELS[p.status] ?? p.status;
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-gray-700/30 bg-gray-900/50 p-4 transition-all hover:border-[#7C3AED]/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-headline text-sm font-semibold text-white group-hover:text-[#A78BFA]">
                        {p.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {p.channelProfile.name} · {updatedAt}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
