import {
  HEX_COLOR,
  constraintDraftSchema,
  type ConstraintDraft as ConstraintDraftForm,
} from "@/logic/schema/userConstraints.zod";

export const CONSTRAINT_DRAFT_STORAGE_KEY = "constraintDraft.v2";
export const DEFAULT_STYLE_TAGS_INPUT = "";
export const THEME_DESCRIPTION_PLACEHOLDER =
  "Example: A warm editorial wellness app with earthy olive and terracotta accents, soft contrast, generous spacing, readable text, and elegant serif typography.";

export type ConstraintFormIssue = {
  path: string;
  message: string;
};

export type ConstraintDraftState = {
  form: ConstraintDraftForm;
  styleTagsInput: string;
};

export const DEFAULT_FORM: ConstraintDraftForm = {
  themeDescription: "",
  brand: {},
  typography: {
    fontFamily: {},
  },
  spacing: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readHex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;
}

export function toColorPickerValue(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

export function parseStyleTags(input: string): string[] | undefined {
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

export function defaultFontNameForStyle(style: "serif" | "sans-serif" | "monospace") {
  if (style === "serif") return "Merriweather";
  if (style === "monospace") return "IBM Plex Mono";
  return "Space Grotesk";
}

export function buildNormalizedConstraints(
  form: ConstraintDraftForm,
  styleTagsInput: string
): ConstraintDraftForm {
  return {
    ...form,
    themeDescription: form.themeDescription.trim(),
    brand: {
      ...form.brand,
      secondary: form.brand.secondary?.trim() || undefined,
      primary: form.brand.primary?.trim() || undefined,
      neutralPreference: form.brand.neutralPreference || undefined,
    },
    typography: {
      ...form.typography,
      fontFamily:
        form.typography.fontFamily?.name?.trim() || form.typography.fontFamily?.style
          ? {
              style: form.typography.fontFamily?.style,
              name: form.typography.fontFamily?.name?.trim() || undefined,
            }
          : undefined,
    },
    styleTags: parseStyleTags(styleTagsInput),
  };
}

export function collectConstraintIssues(
  form: ConstraintDraftForm,
  styleTagsInput: string
): ConstraintFormIssue[] {
  const normalized = buildNormalizedConstraints(form, styleTagsInput);
  const parsed = constraintDraftSchema.safeParse(normalized);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: issue.path.join(".") || "form",
    message: issue.message,
  }));
}

export function loadConstraintDraft(): ConstraintDraftState {
  if (typeof window === "undefined") {
    return { form: DEFAULT_FORM, styleTagsInput: DEFAULT_STYLE_TAGS_INPUT };
  }

  try {
    const raw = localStorage.getItem(CONSTRAINT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return { form: DEFAULT_FORM, styleTagsInput: DEFAULT_STYLE_TAGS_INPUT };
    }

    const parsed = JSON.parse(raw) as { form?: unknown; styleTagsInput?: unknown };
    const draft = isRecord(parsed.form) ? parsed.form : {};

    const brandDraft = isRecord(draft.brand) ? draft.brand : {};
    const typographyDraft = isRecord(draft.typography) ? draft.typography : {};
    const fontFamilyDraft = isRecord(typographyDraft.fontFamily) ? typographyDraft.fontFamily : {};
    const spacingDraft = isRecord(draft.spacing) ? draft.spacing : {};

    const styleTags =
      Array.isArray(draft.styleTags) && draft.styleTags.every((item) => typeof item === "string")
        ? (draft.styleTags as string[])
        : DEFAULT_FORM.styleTags;

    const themeMode = readString(draft.themeMode, "");
    const accessibilityTarget = readString(draft.accessibilityTarget, "");
    const neutralPreference = readString(brandDraft.neutralPreference, "");
    const scalePreset = readString(typographyDraft.scalePreset, "");
    const fontStyle = readString(fontFamilyDraft.style, "");
    const density = readString(spacingDraft.density, "");

    const restored: ConstraintDraftForm = {
      themeDescription: readString(draft.themeDescription, DEFAULT_FORM.themeDescription ?? ""),
      themeMode: themeMode === "" ? undefined : readEnum(themeMode, ["light", "dark"] as const, "light"),
      accessibilityTarget:
        accessibilityTarget === ""
          ? undefined
          : readEnum(accessibilityTarget, ["AA", "AAA"] as const, "AA"),
      brand: {
        primary: typeof brandDraft.primary === "string" ? readHex(brandDraft.primary, "") : undefined,
        secondary: typeof brandDraft.secondary === "string" ? readHex(brandDraft.secondary, "") : undefined,
        neutralPreference:
          neutralPreference === ""
            ? undefined
            : readEnum(neutralPreference, ["cool", "warm", "neutral"] as const, "neutral"),
      },
      typography: {
        baseFontSize:
          typeof typographyDraft.baseFontSize === "number"
            ? readNumber(typographyDraft.baseFontSize, 16)
            : undefined,
        scalePreset:
          scalePreset === ""
            ? undefined
            : readEnum(scalePreset, ["compact", "balanced", "expressive", "loose"] as const, "balanced"),
        fontFamily: {
          style:
            fontStyle === ""
              ? undefined
              : readEnum(fontStyle, ["serif", "sans-serif", "monospace"] as const, "sans-serif"),
          name: readString(fontFamilyDraft.name, ""),
        },
      },
      spacing: {
        density:
          density === ""
            ? undefined
            : readEnum(density, ["condensed", "normal", "spacious"] as const, "normal"),
      },
      styleTags,
    };

    const styleTagsInput =
      typeof parsed.styleTagsInput === "string"
        ? parsed.styleTagsInput
        : (restored.styleTags ?? []).join(", ");

    return { form: restored, styleTagsInput };
  } catch {
    return { form: DEFAULT_FORM, styleTagsInput: DEFAULT_STYLE_TAGS_INPUT };
  }
}
