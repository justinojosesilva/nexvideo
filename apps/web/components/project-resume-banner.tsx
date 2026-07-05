"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { fetchScriptsByProject } from "@/lib/scripts-client";
import { fetchPublicationMetadata } from "@/lib/publication-client";
import {
  RESUME_STEPS,
  getResumeStep,
  getCompletedStepIds,
} from "@/lib/project-resume";

export function ProjectResumeBanner({ projectId }: { projectId: string }) {
  const { data: scripts, isLoading: loadingScripts } = useQuery({
    queryKey: ["scripts", projectId],
    queryFn: () => fetchScriptsByProject(projectId),
  });

  const { data: publication, isLoading: loadingPub } = useQuery({
    queryKey: ["publication", projectId],
    queryFn: () => fetchPublicationMetadata(projectId),
  });

  if (loadingScripts || loadingPub) {
    return (
      <div className="mb-6 h-24 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50" />
    );
  }

  const ctx = { scripts, publication };
  const nextStep = getResumeStep(ctx);
  const completed = new Set(getCompletedStepIds(ctx));

  const isComplete = nextStep === null;

  return (
    <div
      className={`mb-6 overflow-hidden rounded-xl border ${
        isComplete
          ? "border-[#4EDEA3]/30 bg-[#4EDEA3]/5"
          : "border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 to-transparent"
      }`}
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              isComplete
                ? "bg-[#4EDEA3]/15 text-[#4EDEA3]"
                : "bg-[#7C3AED]/15 text-[#A78BFA]"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="font-headline text-sm font-semibold text-white">
              {isComplete
                ? "Projeto pronto para exportação"
                : `Continuar: ${nextStep.label}`}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {isComplete
                ? "Todas as etapas foram concluídas."
                : nextStep.description}
            </p>
          </div>
        </div>

        {!isComplete && (
          <Link
            href={nextStep.href(projectId)}
            className="btn-primary flex items-center gap-2 self-start text-sm sm:self-auto"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Stepper */}
      <div className="border-t border-gray-700/30 px-5 py-3">
        <ol
          aria-label="Progresso do projeto"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"
        >
          {RESUME_STEPS.map((step, idx) => {
            const isDone = completed.has(step.id);
            const isCurrent = !isComplete && nextStep.id === step.id;
            return (
              <li key={step.id} className="flex items-center gap-2">
                <Link
                  href={step.href(projectId)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                    isCurrent
                      ? "bg-[#7C3AED]/15 text-[#A78BFA]"
                      : isDone
                        ? "text-[#4EDEA3] hover:text-[#4EDEA3]"
                        : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  <span className="font-medium">{step.label}</span>
                </Link>
                {idx < RESUME_STEPS.length - 1 && (
                  <span aria-hidden="true" className="text-gray-700">
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
