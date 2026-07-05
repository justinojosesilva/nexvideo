import type { ThumbnailVariant } from "./thumbnails-client";

export interface ThumbnailSelectionState {
  variants: ThumbnailVariant[];
  selectedUrl: string | null;
  savedUrl: string | null;
}

export type ThumbnailSelectionEvent =
  | { type: "variants-generated"; variants: ThumbnailVariant[] }
  | { type: "select"; url: string }
  | { type: "saved"; url: string }
  | { type: "reset" };

export function initThumbnailState(
  initialSavedUrl: string | null,
): ThumbnailSelectionState {
  return {
    variants: [],
    selectedUrl: initialSavedUrl,
    savedUrl: initialSavedUrl,
  };
}

export function thumbnailReducer(
  state: ThumbnailSelectionState,
  event: ThumbnailSelectionEvent,
): ThumbnailSelectionState {
  switch (event.type) {
    case "variants-generated": {
      const first = event.variants[0]?.url ?? null;
      return {
        ...state,
        variants: event.variants,
        selectedUrl: state.selectedUrl ?? first,
      };
    }
    case "select":
      return { ...state, selectedUrl: event.url };
    case "saved":
      return { ...state, savedUrl: event.url, selectedUrl: event.url };
    case "reset":
      return initThumbnailState(null);
    default:
      return state;
  }
}

export function canConfirmSelection(state: ThumbnailSelectionState): boolean {
  return (
    state.selectedUrl !== null &&
    state.selectedUrl !== state.savedUrl
  );
}
