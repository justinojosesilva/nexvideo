"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TrendAnalysis } from "@/lib/trends-client";

interface DimensionScore {
  label: string;
  value: number;
  key: "demand" | "saturation" | "monetization" | "qualityGap";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-[#4EDEA3]";
  if (score >= 50) return "bg-[#7C3AED]";
  return "bg-red-600";
}

function getScoreLabelColor(score: number): string {
  if (score >= 75) return "text-[#4EDEA3]";
  if (score >= 50) return "text-[#7C3AED]";
  return "text-red-400";
}

function DimensionBar({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {typeof icon === "string" ? (
            <span className="text-base">{icon}</span>
          ) : (
            <div className="flex h-5 w-5 items-center justify-center text-gray-400">
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <span className={`text-sm font-bold ${getScoreLabelColor(score)}`}>
          {Math.round(score)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreDimensionBreakdown({
  analysis,
  projectId,
}: {
  analysis: TrendAnalysis;
  projectId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const isPreview = !projectId || projectId === "temp-project";

  // Handle "Usar este tema" button click
  const handleUseTheme = () => {
    if (isPreview) {
      // No persisted project in preview mode — script generation requires
      // a real project + trend analysis, so send the user to create one.
      router.push("/projects/new");
      return;
    }

    router.push(
      `/projects/${projectId}/scripts/new?trendAnalysisId=${analysis.id}`,
    );
  };

  const dimensions: DimensionScore[] = [
    { label: "Demanda", value: analysis.data.scores.demand, key: "demand" },
    {
      label: "Saturação",
      value: analysis.data.scores.saturation,
      key: "saturation",
    },
    {
      label: "Monetização",
      value: analysis.data.scores.monetization,
      key: "monetization",
    },
    {
      label: "Quality Gap",
      value: analysis.data.scores.qualityGap,
      key: "qualityGap",
    },
  ];

  const icons = ["📊", "📈", "💰", "✨"];

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-headline text-lg font-semibold text-white">
            {analysis.keyword}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Analisado em{" "}
            {new Date(analysis.analyzedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div
              className={`text-3xl font-bold font-headline ${getScoreLabelColor(analysis.data.finalScore)}`}
            >
              {Math.round(analysis.data.finalScore)}
            </div>
            <div className="text-xs text-gray-400">Score Final</div>
          </div>
        </div>
      </div>

      {/* Classification Badge */}
      <div className="flex items-center justify-between border-t border-gray-800/30 pt-4">
        <div>
          {analysis.data.classification === "PUBLISH" && (
            <span className="inline-flex rounded-full bg-[#4EDEA3]/20 px-3 py-1 text-xs font-semibold text-[#4EDEA3]">
              ✓ Publicar
            </span>
          )}
          {analysis.data.classification === "EVALUATE" && (
            <span className="inline-flex rounded-full bg-[#7C3AED]/20 px-3 py-1 text-xs font-semibold text-[#7C3AED]">
              ⊙ Avaliar
            </span>
          )}
          {analysis.data.classification === "AVOID" && (
            <span className="inline-flex rounded-full bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-400">
              ✕ Evitar
            </span>
          )}
        </div>

        <button
          onClick={handleUseTheme}
          className="btn-primary px-4 py-2 text-xs font-bold"
        >
          {isPreview ? "Criar projeto com este tema" : "Usar este tema"}
        </button>
      </div>

      {/* Expandable Dimensions */}
      <div className="border-t border-gray-800/30 pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between rounded-lg bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-900 cursor-pointer"
        >
          <span className="text-sm font-semibold text-white">
            Detalhes das Dimensões
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-4 pt-4">
            {dimensions.map((dim, idx) => (
              <DimensionBar
                key={dim.key}
                label={dim.label}
                score={dim.value}
                icon={icons[idx] || "📊"}
              />
            ))}

            {/* Weights Info */}
            <div className="rounded-lg bg-gray-900/50 p-3 text-xs text-gray-400 border border-gray-800/30">
              <p className="mb-2 font-medium text-gray-300">
                Pesos Utilizados
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  Demanda: {Math.round(analysis.data.weights.dimension1 * 100)}%
                </div>
                <div>
                  Saturação:{" "}
                  {Math.round(analysis.data.weights.dimension2 * 100)}%
                </div>
                <div>
                  Monetização:{" "}
                  {Math.round(analysis.data.weights.dimension3 * 100)}%
                </div>
                <div>
                  Gap: {Math.round(analysis.data.weights.dimension4 * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
