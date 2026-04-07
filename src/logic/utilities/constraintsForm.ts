import { HEX_COLOR, userConstraintsSchema, type UserConstraints } from "@/logic/schema/userConstraints.zod";

export const CONSTRAINT_DRAFT_STORAGE_KEY = "constraintDraft.v1";
export const DEFAULT_STYLE_TAGS_INPUT = "earthy, warm, nature";

export type ConstraintFormIssue = {
  path: string;
  message: string;
};

export type ConstraintDraft = {
  form: UserConstraints;
  styleTagsInput: string;
};

export const DEFAULT_FORM: UserConstraints = {
  themeDescription:
    "Earthy vibes for a lifestyle app: warm neutrals, soft contrast, grounded and calm.",
  themeMode: "light",
  accessibilityTarget: "AA",
  brand: { primary: "#e4b424", secondary: "#6a994e", neutralPreference: "warm" },
  typography: {
    baseFontSize: 16,
    scalePreset: "balanced",
    fontFamily: { style: "serif", name: "Georgia" },
  },
  spacing: { density: "normal" },
  styleTags: ["earthy", "warm", "nature"],
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
  if (style === "serif") return "Georgia";
  if (style === "monospace") return "Consolas";
  return "Arial";
}

export function buildNormalizedConstraints(form: UserConstraints, styleTagsInput: string) {
  return {
    ...form,
    themeDescription: form.themeDescription?.trim() || undefined,
    brand: {
      ...form.brand,
      secondary: form.brand.secondary?.trim() || undefined,
      neutralPreference: form.brand.neutralPreference || undefined,
    },
    typography: {
      ...form.typography,
      fontFamily: form.typography.fontFamily?.name.trim()
        ? { ...form.typography.fontFamily, name: form.typography.fontFamily.name.trim() }
        : undefined,
    },
    styleTags: parseStyleTags(styleTagsInput),
  };
}

export function collectConstraintIssues(
  form: UserConstraints,
  styleTagsInput: string
): ConstraintFormIssue[] {
  const normalized = buildNormalizedConstraints(form, styleTagsInput);
  const parsed = userConstraintsSchema.safeParse(normalized);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: issue.path.join(".") || "form",
    message: issue.message,
  }));
}

export function loadConstraintDraft(): ConstraintDraft {
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

    const restored: UserConstraints = {
      themeDescription: readString(draft.themeDescription, DEFAULT_FORM.themeDescription ?? ""),
      themeMode: readEnum(draft.themeMode, ["light", "dark"] as const, DEFAULT_FORM.themeMode),
      accessibilityTarget: readEnum(
        draft.accessibilityTarget,
        ["AA", "AAA"] as const,
        DEFAULT_FORM.accessibilityTarget
      ),
      brand: {
        primary: readHex(brandDraft.primary, DEFAULT_FORM.brand.primary),
        secondary: readHex(brandDraft.secondary, DEFAULT_FORM.brand.secondary ?? "#6a994e"),
        neutralPreference: readEnum(
          brandDraft.neutralPreference,
          ["cool", "warm", "neutral"] as const,
          DEFAULT_FORM.brand.neutralPreference ?? "neutral"
        ),
      },
      typography: {
        baseFontSize: readNumber(typographyDraft.baseFontSize, DEFAULT_FORM.typography.baseFontSize),
        scalePreset: readEnum(
          typographyDraft.scalePreset,
          ["compact", "balanced", "expressive", "loose"] as const,
          DEFAULT_FORM.typography.scalePreset
        ),
        fontFamily: {
          style: readEnum(
            fontFamilyDraft.style,
            ["serif", "sans-serif", "monospace"] as const,
            DEFAULT_FORM.typography.fontFamily?.style ?? "sans-serif"
          ),
          name: readString(
            fontFamilyDraft.name,
            DEFAULT_FORM.typography.fontFamily?.name ?? defaultFontNameForStyle("sans-serif")
          ),
        },
      },
      spacing: {
        density: readEnum(
          spacingDraft.density,
          ["condensed", "normal", "spacious"] as const,
          DEFAULT_FORM.spacing.density
        ),
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
