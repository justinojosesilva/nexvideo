import type { ScriptData } from "./scripts-client";
import type { PublicationMetadata } from "./publication-client";

export type ResumeStepId =
  | "script"
  | "publication"
  | "thumbnail"
  | "media"
  | "complete";

export interface ResumeStep {
  id: ResumeStepId;
  label: string;
  description: string;
  href: (projectId: string) => string;
}

export const RESUME_STEPS: ResumeStep[] = [
  {
    id: "script",
    label: "Roteiro",
    description: "Gere o roteiro do seu conteúdo",
    href: (id) => `/projects/${id}`,
  },
  {
    id: "publication",
    label: "Título e Tags",
    description: "Gere e selecione título e tags",
    href: (id) => `/projects/${id}/publication`,
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    description: "Crie a thumbnail do vídeo",
    href: (id) => `/projects/${id}/thumbnail`,
  },
  {
    id: "media",
    label: "Mídia",
    description: "Busque imagens e vídeos de apoio",
    href: (id) => `/projects/${id}/media`,
  },
];

export interface ResumeContext {
  scripts: ScriptData[] | undefined;
  publication: PublicationMetadata | null | undefined;
  hasThumbnail?: boolean;
  hasMedia?: boolean;
}

export function getResumeStep(ctx: ResumeContext): ResumeStep | null {
  const hasScript = !!ctx.scripts && ctx.scripts.length > 0;
  if (!hasScript) return RESUME_STEPS[0]!;

  const hasPublicationData =
    !!ctx.publication &&
    (!!ctx.publication.title ||
      (ctx.publication.titleVariants?.length ?? 0) > 0);
  if (!hasPublicationData) return RESUME_STEPS[1]!;

  if (ctx.hasThumbnail === false) return RESUME_STEPS[2]!;
  if (ctx.hasMedia === false) return RESUME_STEPS[3]!;

  return null;
}

export function getCompletedStepIds(ctx: ResumeContext): ResumeStepId[] {
  const completed: ResumeStepId[] = [];
  if (ctx.scripts && ctx.scripts.length > 0) completed.push("script");
  if (
    ctx.publication &&
    (ctx.publication.title || (ctx.publication.titleVariants?.length ?? 0) > 0)
  )
    completed.push("publication");
  if (ctx.hasThumbnail) completed.push("thumbnail");
  if (ctx.hasMedia) completed.push("media");
  return completed;
}
