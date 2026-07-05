// Scripts - Types
export type {
  ScriptPromptInput,
  ScriptBlockOutput,
  ScriptOutput,
} from "./scripts/script-prompt.template.js";
export { scriptPromptTemplate } from "./scripts/script-prompt.template.js";
export {
  genericScriptPrompt,
  type GenericScriptInput,
} from "./scripts/generic-script.prompt.js";
export {
  scriptGapBasedPrompt,
  type ScriptGapBasedInput,
  type ScriptGapBasedOutput,
} from "./scripts/gap-based-script.prompt.js";

// Other scripts
export * from "./scripts/finance-script.prompt.js";
export * from "./scripts/ai-script.prompt.js";
export * from "./scripts/productivity-script.prompt.js";

// Titles
export * from "./titles/youtube-title.prompt.js";
export * from "./titles/shorts-title.prompt.js";
export {
  titleVariantsPrompt,
  type TitleVariantsInput,
  type TitleVariant,
  type TitleVariantsOutput,
} from "./titles/title-variants.prompt.js";

// Thumbnails
export * from "./thumbnails/thumbnail-copy.prompt.js";
export {
  thumbnailImagePrompt,
  type ThumbnailImageInput,
  type ThumbnailTemplate,
  type ThumbnailStyle,
} from "./thumbnails/thumbnail-image.prompt.js";

// SEO
export * from "./seo/youtube-description.prompt.js";
export {
  tagsPrompt,
  type YoutubeTagsInput,
  type YoutubeTagsOutput,
} from "./seo/youtube-tags.prompt.js";

// Scoring
export * from "./scoring/monetization-risk.prompt.js";
export * from "./scoring/gap-analysis.prompt.js";

// Narration
export {
  narrationPromptTemplate,
  type NarrationPromptInput,
  type NarrationBlock,
  type NarrationTone,
  type NarrationSpeed,
  type VoiceStyle,
  type NarrationOutput,
} from "./narration/narration.prompt.js";
export {
  narrationPrompt,
  type NarrationInput,
} from "./narration/narration-legacy.prompt.js";

// Media
export {
  mediaQueryPrompt,
  type MediaQueryInput,
} from "./media/media-query.prompt.js";

// Version Control
export {
  PROMPT_VERSIONS,
  getPromptVersion,
  getAllPromptVersions,
  type PromptVersion,
} from "./version-registry.js";
