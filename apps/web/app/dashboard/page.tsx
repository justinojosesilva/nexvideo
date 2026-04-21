"use client";

import type { ContentProjectWithChannelProfile } from "@/lib/projects-client";
import type { GetSubscriptionResponse } from "@/lib/billing-client";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { removeToken, getStoredToken } from "@/lib/auth-client";
import { fetchProjects } from "@/lib/projects-client";
import { fetchSubscription } from "@/lib/billing-client";
import { Plus, Zap, ArrowRight, X } from "lucide-react";
import { useState } from "react";

function ProjectSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50 p-6">
      <div className="mb-4 h-6 w-2/3 rounded bg-gray-800" />
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-800" />
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-800" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-gray-800" />
        <div className="h-6 w-20 rounded-full bg-gray-800" />
      </div>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-500/30 px-12 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED]/20 to-[#7C3AED]/10">
        <Zap className="h-8 w-8 text-[#7C3AED]" />
      </div>
      <h3 className="mb-2 text-xl font-headline font-bold text-white">
        Nenhum projeto criado
      </h3>
      <p className="mb-6 max-w-sm text-gray-400">
        Crie seu primeiro projeto de conteúdo com IA e comece a produzir
        scripts, títulos e roteiros automaticamente.
      </p>
      <button
        onClick={() => router.push("/projects/new")}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Novo Projeto
      </button>
    </div>
  );
}

function ProjectCard({
  project,
}: {
  project: ContentProjectWithChannelProfile;
}) {
  const statusColors: Record<string, string> = {
    planning: "bg-blue-500/20 text-blue-300",
    in_development: "bg-orange-500/20 text-orange-300",
    in_review: "bg-[#7C3AED]/20 text-[#A78BFA]",
    active: "bg-[#4EDEA3]/20 text-[#4EDEA3]",
  };

  const statusLabels: Record<string, string> = {
    planning: "Planejamento",
    in_development: "Em Desenvolvimento",
    in_review: "Em Revisão",
    active: "Ativo",
  };

  const statusColor = statusColors[project.status] || statusColors.planning;
  const statusLabel = statusLabels[project.status] || project.status;

  const createdAt = new Date(project.createdAt).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group card cursor-pointer">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="flex-1 font-headline text-lg font-semibold text-white transition-colors group-hover:text-[#7C3AED]">
          {project.title}
        </h3>
      </div>

      <div className="mb-4 space-y-2 text-sm text-gray-400">
        <p>
          <span className="text-gray-500">Canal:</span>{" "}
          {project.channelProfile.name}
        </p>
        <p>
          <span className="text-gray-500">Palavra-chave:</span>{" "}
          {project.keyword}
        </p>
        <p>
          <span className="text-gray-500">Duração:</span>{" "}
          {project.durationMinutes ? `${project.durationMinutes} min` : "—"}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
        <span className="inline-flex rounded-full bg-gray-700/50 px-3 py-1 text-xs font-medium text-gray-300">
          {project.format.replace(/_/g, " ")}
        </span>
        <span className="inline-flex rounded-full bg-gray-700/50 px-3 py-1 text-xs font-medium text-gray-300">
          {project.niche}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-gray-700/50 pt-4">
        <span className="text-xs text-gray-500">{createdAt}</span>
        <button className="text-xs font-medium text-[#7C3AED] transition-colors hover:text-[#A78BFA] cursor-pointer">
          Ver Detalhes →
        </button>
      </div>
    </div>
  );
}

function UsageWidget({
  subscription,
}: {
  subscription: GetSubscriptionResponse;
}) {
  const router = useRouter();

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
          <button
            onClick={() => router.push("/plans")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED]/10 px-4 py-2.5 text-sm font-semibold text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/20 cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            Fazer upgrade
          </button>
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
  const router = useRouter();

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
            <button
              onClick={() => router.push("/plans")}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Ver planos
              <ArrowRight className="h-3 w-3" />
            </button>
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

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = !!getStoredToken();
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("nexvideo_upgrade_banner_dismissed") === "1";
  });

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
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

  const maxPercent = subscription
    ? Math.max(
        subscription.percentUsed.scripts,
        subscription.percentUsed.narrations,
        subscription.percentUsed.exports,
      )
    : 0;
  const showBanner = maxPercent >= 80 && !bannerDismissed;

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      {/* Upgrade banner */}
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold text-white sm:text-4xl">
                Projetos
              </h1>
              <p className="mt-2 text-gray-400">
                Gerencia seus projetos de conteúdo com IA
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/projects/new")}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Projeto
              </button>
              <button onClick={handleLogout} className="btn-secondary">
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        {/* Usage Widget */}
        {subscription && (
          <div className="mb-8">
            <UsageWidget subscription={subscription} />
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-300">
              Erro ao carregar projetos. Por favor, tente novamente.
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <ProjectSkeleton key={i} />
            ))}
          </div>
        ) : !hasProjects ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max">
            {projects.map((project) => (
              <div key={project.id}>
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
