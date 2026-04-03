export type GenerationSource = "user" | "llm" | "derived" | "default" | "repair";

export type GenerationSourceItem = {
  path: string;
  source: GenerationSource;
  detail?: string;
};

export type GenerationReport = {
  inferred: string[];
  defaults: string[];
  sources: GenerationSourceItem[];
  repairs: string[];
};

