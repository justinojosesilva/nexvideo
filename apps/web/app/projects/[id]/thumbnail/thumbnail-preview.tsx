"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { RefreshCw, Check, AlertTriangle } from "lucide-react";
import type {
  PreviewThumbnailsRequest,
  PreviewThumbnailsResponse,
  ThumbnailVariant,
} from "@/lib/thumbnails-client";

export interface ThumbnailPreviewProps {
  projectId: string;
  initialThumbnailUrl?: string | null;
  defaults: Omit<PreviewThumbnailsRequest, "count">;
  generateVariants: (
    projectId: string,
    body: PreviewThumbnailsRequest,
  ) => Promise<PreviewThumbnailsResponse>;
  saveSelection: (
    projectId: string,
    thumbnailUrl: string,
  ) => Promise<{ thumbnailUrl: string }>;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; variants: ThumbnailVariant[] }
  | { kind: "error"; message: string };

export function ThumbnailPreview({
  projectId,
  initialThumbnailUrl,
  defaults,
  generateVariants,
  saveSelection,
}: ThumbnailPreviewProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [selectedUrl, setSelectedUrl] = useState<string | null>(
    initialThumbnailUrl ?? null,
  );
  const [savedUrl, setSavedUrl] = useState<string | null>(
    initialThumbnailUrl ?? null,
  );
  const [saving, setSaving] = useState(false);

  const generate = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      const result = await generateVariants(projectId, {
        ...defaults,
        count: 3,
      });
      setStatus({ kind: "success", variants: result.variants });
      if (result.variants[0] && !selectedUrl) {
        setSelectedUrl(result.variants[0].url);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      setStatus({ kind: "error", message });
    }
  }, [projectId, defaults, generateVariants, selectedUrl]);

  const confirm = useCallback(async () => {
    if (!selectedUrl) return;
    setSaving(true);
    try {
      const result = await saveSelection(projectId, selectedUrl);
      setSavedUrl(result.thumbnailUrl);
    } finally {
      setSaving(false);
    }
  }, [projectId, selectedUrl, saveSelection]);

  const variants =
    status.kind === "success" ? status.variants : ([] as ThumbnailVariant[]);
  const loading = status.kind === "loading";
  const error = status.kind === "error" ? status.message : null;

  return (
    <section className="flex flex-col gap-6" aria-label="Preview de thumbnail">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-semibold text-white">
            Preview de Thumbnail
          </h2>
          <p className="text-sm text-gray-400">
            Gere variações e escolha a sua favorita antes de exportar.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          aria-busy={loading}
          aria-label={
            variants.length > 0 ? "Regenerar variações" : "Gerar variações"
          }
          data-testid="generate-button"
          className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {variants.length > 0 ? "Regenerar" : "Gerar variações"}
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200"
          data-testid="error-message"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Gerando thumbnails...</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video animate-pulse rounded-xl border border-gray-700/40 bg-gray-900/50"
            />
          ))}
        </div>
      ) : variants.length > 0 ? (
        <div
          role="radiogroup"
          aria-label="Variações de thumbnail"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {variants.map((variant, index) => {
            const isSelected = selectedUrl === variant.url;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Variação ${index + 1}: ${variant.template}, estilo ${variant.style}`}
                onClick={() => setSelectedUrl(variant.url)}
                data-testid={`variant-${index}`}
                className={`group relative overflow-hidden rounded-xl border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                  isSelected
                    ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/40"
                    : "border-gray-700/40 hover:border-gray-500"
                }`}
              >
                <div className="relative aspect-video bg-black">
                  <Image
                    src={variant.url}
                    alt={`Variação de thumbnail ${index + 1}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                  {isSelected ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#7C3AED] text-white"
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 bg-gray-900/70 px-3 py-2 text-xs">
                  <span className="text-gray-300">
                    {variant.template}
                    <span className="text-gray-500"> · </span>
                    {variant.style}
                  </span>
                  {variant.fallbackUsed ? (
                    <span
                      className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300"
                      title="Provedor primário indisponível — variação gerada por fallback"
                    >
                      fallback
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : initialThumbnailUrl ? (
        <div className="flex items-center gap-4 rounded-xl border border-gray-700/40 bg-gray-900/50 p-4">
          <div className="relative aspect-video w-48 overflow-hidden rounded-lg bg-black">
            <Image
              src={initialThumbnailUrl}
              alt="Thumbnail atual do projeto"
              fill
              sizes="192px"
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="text-sm text-gray-300">
            Thumbnail atual do projeto. Clique em <strong>Gerar variações</strong>{" "}
            para experimentar novas opções.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-8 text-center text-sm text-gray-400">
          Nenhuma thumbnail gerada ainda. Clique em <strong>Gerar variações</strong>{" "}
          para criar 3 opções.
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-xs text-gray-400"
          role="status"
          aria-live="polite"
          data-testid="save-status"
        >
          {savedUrl
            ? "Thumbnail selecionada salva no projeto."
            : "Nenhuma seleção salva ainda."}
        </p>
        <button
          type="button"
          onClick={confirm}
          disabled={!selectedUrl || saving || selectedUrl === savedUrl}
          aria-busy={saving}
          data-testid="confirm-button"
          className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-[#4EDEA3] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#3DBF8B] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EDEA3]"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {saving ? "Salvando..." : "Confirmar seleção"}
        </button>
      </footer>
    </section>
  );
}
