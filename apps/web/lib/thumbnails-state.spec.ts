import {
  canConfirmSelection,
  initThumbnailState,
  thumbnailReducer,
  type ThumbnailSelectionState,
} from "./thumbnails-state";
import type { ThumbnailVariant } from "./thumbnails-client";

const variant = (id: string, url: string): ThumbnailVariant => ({
  id,
  url,
  template: "text-only",
  style: "dark",
  provider: "openai:dall-e-3",
  estimatedCostUsd: 0.04,
  fallbackUsed: false,
});

describe("thumbnailReducer", () => {
  it("starts empty when no initial url", () => {
    const state = initThumbnailState(null);
    expect(state).toEqual({
      variants: [],
      selectedUrl: null,
      savedUrl: null,
    });
  });

  it("uses initial url as both selected and saved when present", () => {
    const state = initThumbnailState("https://cdn/initial.png");
    expect(state.selectedUrl).toBe("https://cdn/initial.png");
    expect(state.savedUrl).toBe("https://cdn/initial.png");
  });

  it("auto-selects first variant when none is selected yet", () => {
    const state = initThumbnailState(null);
    const next = thumbnailReducer(state, {
      type: "variants-generated",
      variants: [variant("a", "https://cdn/a.png"), variant("b", "https://cdn/b.png")],
    });
    expect(next.variants).toHaveLength(2);
    expect(next.selectedUrl).toBe("https://cdn/a.png");
  });

  it("keeps the existing selection when regenerating", () => {
    const state: ThumbnailSelectionState = {
      variants: [variant("a", "https://cdn/a.png")],
      selectedUrl: "https://cdn/saved.png",
      savedUrl: "https://cdn/saved.png",
    };
    const next = thumbnailReducer(state, {
      type: "variants-generated",
      variants: [variant("c", "https://cdn/c.png")],
    });
    expect(next.selectedUrl).toBe("https://cdn/saved.png");
    expect(next.variants[0]?.id).toBe("c");
  });

  it("updates selectedUrl on select", () => {
    const state = initThumbnailState(null);
    const next = thumbnailReducer(state, {
      type: "select",
      url: "https://cdn/new.png",
    });
    expect(next.selectedUrl).toBe("https://cdn/new.png");
    expect(next.savedUrl).toBeNull();
  });

  it("commits saved url on saved event", () => {
    const state: ThumbnailSelectionState = {
      variants: [],
      selectedUrl: "https://cdn/sel.png",
      savedUrl: null,
    };
    const next = thumbnailReducer(state, {
      type: "saved",
      url: "https://cdn/sel.png",
    });
    expect(next.savedUrl).toBe("https://cdn/sel.png");
    expect(next.selectedUrl).toBe("https://cdn/sel.png");
  });

  it("reset clears everything", () => {
    const state: ThumbnailSelectionState = {
      variants: [variant("a", "https://cdn/a.png")],
      selectedUrl: "https://cdn/a.png",
      savedUrl: "https://cdn/a.png",
    };
    const next = thumbnailReducer(state, { type: "reset" });
    expect(next).toEqual(initThumbnailState(null));
  });
});

describe("canConfirmSelection", () => {
  it("is false without a selection", () => {
    expect(canConfirmSelection(initThumbnailState(null))).toBe(false);
  });

  it("is false when selection equals saved", () => {
    expect(
      canConfirmSelection({
        variants: [],
        selectedUrl: "https://cdn/a.png",
        savedUrl: "https://cdn/a.png",
      }),
    ).toBe(false);
  });

  it("is true when selection differs from saved", () => {
    expect(
      canConfirmSelection({
        variants: [],
        selectedUrl: "https://cdn/b.png",
        savedUrl: "https://cdn/a.png",
      }),
    ).toBe(true);
  });
});
