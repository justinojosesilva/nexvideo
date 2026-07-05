"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchProject } from "@/lib/projects-client";
import { fetchPublicationMetadata } from "@/lib/publication-client";
import {
  previewThumbnails,
  selectThumbnail,
} from "@/lib/thumbnails-client";
import { ThumbnailPreview } from "./thumbnail-preview";

export default function ThumbnailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });

  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ["publication", id],
    queryFn: () => fetchPublicationMetadata(id),
    enabled: !!id,
  });

  const loading = projectLoading || metaLoading;

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <header className="border-b border-gray-800/50 bg-[#0E0E0E]/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-5">
          <button
            type="button"
            onClick={() => router.push(`/projects/${id}`)}
            className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-gray-300 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Voltar para o projeto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para o projeto
          </button>
          <h1 className="font-headline text-2xl font-bold text-white sm:text-3xl">
            Thumbnail
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10 sm:py-12">
        {loading ? (
          <div
            className="h-80 animate-pulse rounded-xl border border-gray-700/30 bg-gray-900/50"
            role="status"
            aria-busy="true"
          />
        ) : project ? (
          <ThumbnailPreview
            projectId={id}
            initialThumbnailUrl={metadata?.thumbnailUrl ?? null}
            defaults={{
              topic: project.keyword,
              niche: project.niche,
              primaryText:
                metadata?.title || project.title.slice(0, 40) || project.keyword.slice(0, 40),
            }}
            generateVariants={previewThumbnails}
            saveSelection={selectThumbnail}
          />
        ) : (
          <p className="text-sm text-gray-400">Projeto não encontrado.</p>
        )}
      </main>
    </div>
  );
}
