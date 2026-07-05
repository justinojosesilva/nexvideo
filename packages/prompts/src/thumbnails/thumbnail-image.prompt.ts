export type ThumbnailTemplate =
  | "face-reaction"
  | "text-only"
  | "split-screen"
  | "object-centric"
  | "before-after";

export type ThumbnailStyle =
  | "dark"
  | "bright"
  | "minimal"
  | "vibrant"
  | "cinematic";

export interface ThumbnailImageInput {
  topic: string;
  niche: string;
  primaryText: string;
  template: ThumbnailTemplate;
  style: ThumbnailStyle;
  secondaryText?: string;
  palette?: [string, string, string];
}

const TEMPLATE_HINTS: Record<ThumbnailTemplate, string> = {
  "face-reaction":
    "Foreground subject with expressive face reaction (surprise / shock / curiosity), big bold overlay text, dramatic lighting.",
  "text-only":
    "Bold giant typography filling the frame, no human face, strong color contrast, single keyword emphasis.",
  "split-screen":
    "Two contrasting halves separated by a sharp diagonal or vertical line, each half supporting opposite ideas.",
  "object-centric":
    "A single hero object centered with halo lighting, clean background, subtle drop shadow, dramatic angle.",
  "before-after":
    "Two stacked or side-by-side panels showing transformation (before vs after) with clear visual contrast.",
};

const STYLE_HINTS: Record<ThumbnailStyle, string> = {
  dark:
    "Dark mode aesthetic, deep blacks, neon accents, high contrast highlights.",
  bright:
    "Bright daylight palette, saturated colors, clean white background regions.",
  minimal:
    "Minimal flat design, large negative space, restricted 2-3 color palette, no clutter.",
  vibrant:
    "Vibrant gradient, energetic neon/pop colors, high-saturation accents.",
  cinematic:
    "Cinematic teal-and-orange lighting, film grain, shallow depth of field.",
};

export function thumbnailImagePrompt({
  topic,
  niche,
  primaryText,
  template,
  style,
  secondaryText,
  palette,
}: ThumbnailImageInput): string {
  return [
    "YouTube thumbnail, 16:9 aspect ratio, optimized for high CTR on mobile.",
    `Topic: ${topic}.`,
    `Niche: ${niche}.`,
    `Template: ${template}. ${TEMPLATE_HINTS[template]}`,
    `Style: ${style}. ${STYLE_HINTS[style]}`,
    `Primary headline overlay: "${primaryText}" — bold sans-serif, very large, high readability on small screens.`,
    secondaryText
      ? `Secondary tag overlay: "${secondaryText}" — smaller, complementary color.`
      : "",
    palette
      ? `Color palette: ${palette.join(", ")} (HEX). Use these for backgrounds and text accents.`
      : "",
    "Hard rules: no watermarks, no logos, no fake brand marks, no extra small captions, no lorem ipsum. Text must be spelled exactly as provided.",
  ]
    .filter(Boolean)
    .join("\n");
}
