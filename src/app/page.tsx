"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { GenerationReport } from "@/logic/schema/generationReport.types";
import { HEX_COLOR, userConstraintsSchema, type UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";

const CONSTRAINT_DRAFT_STORAGE_KEY = "constraintDraft.v1";

const DEFAULT_FORM: UserConstraints = {
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

function loadDraftFromStorage(): { form: UserConstraints; styleTagsInput: string } {
  if (typeof window === "undefined") {
    return { form: DEFAULT_FORM, styleTagsInput: "earthy, warm, nature" };
  }

  try {
    const raw = localStorage.getItem(CONSTRAINT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return { form: DEFAULT_FORM, styleTagsInput: "earthy, warm, nature" };
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

    const tagsInput =
      typeof parsed.styleTagsInput === "string"
        ? parsed.styleTagsInput
        : (restored.styleTags ?? []).join(", ");

    return { form: restored, styleTagsInput: tagsInput };
  } catch {
    return { form: DEFAULT_FORM, styleTagsInput: "earthy, warm, nature" };
  }
}

function parseStyleTags(input: string): string[] | undefined {
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

function defaultFontNameForStyle(style: "serif" | "sans-serif" | "monospace") {
  if (style === "serif") return "Georgia";
  if (style === "monospace") return "Consolas";
  return "Arial";
}

export default function Home() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft] = useState(loadDraftFromStorage);
  const [form, setForm] = useState<UserConstraints>(draft.form);
  const [styleTagsInput, setStyleTagsInput] = useState(draft.styleTagsInput);

  useEffect(() => {
    try {
      localStorage.setItem(CONSTRAINT_DRAFT_STORAGE_KEY, JSON.stringify({ form, styleTagsInput }));
    } catch {
      // ignore storage errors
    }
  }, [form, styleTagsInput]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErrors([]);

    const normalized = {
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

    const parsed = userConstraintsSchema.safeParse(normalized);
    if (!parsed.success) {
      setFormErrors(
        parsed.error.issues.map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`)
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const response = await res.json();
      if (!response.ok) {
        const apiIssues = Array.isArray(response.issues)
          ? response.issues.map((issue: { path?: string; message?: string }) =>
              `${issue.path ?? "form"}: ${issue.message ?? "Invalid value"}`
            )
          : [];
        setFormErrors(apiIssues.length > 0 ? apiIssues : [response.error ?? "Failed to generate theme"]);
        return;
      }

      // extract the pieces we care about; our context only tracks vars/tokens
      const themeData = {
        cssVars: response.cssVars as Record<string, string>,
        tokens: response.tokens as DesignTokens,
        constraints: parsed.data,
        themeDescriptionAssessment:
          (response.descriptionAssessment as ThemeDescriptionAssessment | null | undefined) ?? null,
        report: response.report as ValidationReport,
        generationReport:
          (response.generationReport as GenerationReport | undefined) ?? undefined,
        repair: response.repair as { applied: boolean; changes: string[] } | undefined,
      };

      setTheme(themeData);
      router.push("/preview");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setFormErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="generator-shell">
      <h1>Generate UI Theme</h1>
      <p className="generator-intro">
        Define your base token constraints. Keep core fields simple and open advanced only when needed.
      </p>

      <form onSubmit={handleSubmit} className="generator-form">
        <section className="generator-section">
          <h2>Core Constraints</h2>

          <label>Theme Description</label>
          <textarea
            rows={4}
            value={form.themeDescription}
            onChange={(e) =>
              setForm({
                ...form,
                themeDescription: e.target.value,
              })
            }
          />

          <div className="generator-grid">
            <div>
              <label>Theme Mode</label>
              <select
                value={form.themeMode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    themeMode: e.target.value as "light" | "dark",
                  })
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label>Accessibility Target</label>
              <select
                value={form.accessibilityTarget}
                onChange={(e) =>
                  setForm({
                    ...form,
                    accessibilityTarget: e.target.value as "AA" | "AAA",
                  })
                }
              >
                <option value="AA">AA</option>
                <option value="AAA">AAA</option>
              </select>
            </div>
          </div>

          <div className="generator-grid">
            <div>
              <label>Brand Color (Primary)</label>
              <input
                type="color"
                value={form.brand.primary}
                onChange={(e) =>
                  setForm({
                    ...form,
                    brand: { ...form.brand, primary: e.target.value }
                  })
                }
              />
            </div>
            <div>
              <label>Brand Color (Secondary)</label>
              <input
                type="color"
                value={form.brand.secondary}
                onChange={(e) =>
                  setForm({
                    ...form,
                    brand: { ...form.brand, secondary: e.target.value }
                  })
                }
              />
            </div>
          </div>

          <div className="generator-grid">
            <div>
              <label>Base Font Size</label>
              <input
                type="number"
                value={form.typography.baseFontSize}
                onChange={(e) =>
                  setForm({
                    ...form,
                    typography: {
                      ...form.typography,
                      baseFontSize: Number(e.target.value)
                    }
                  })
                }
              />
            </div>
            <div>
              <label>Scale Preset</label>
              <select
                value={form.typography.scalePreset}
                onChange={(e) =>
                  setForm({
                    ...form,
                    typography: {
                      ...form.typography,
                      scalePreset: e.target.value as "compact" | "balanced" | "expressive" | "loose"
                    }
                  })
                }
              >
                <option value="balanced">Balanced</option>
                <option value="compact">Compact</option>
                <option value="expressive">Expressive</option>
                <option value="loose">Loose</option>
              </select>
            </div>
          </div>
        </section>

        <details className="generator-section generator-advanced">
          <summary>Advanced Constraints</summary>
          <div className="generator-grid">
            <div>
              <label>Neutral Preference (Optional)</label>
          <select
            value={form.brand.neutralPreference ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                brand: {
                  ...form.brand,
                  neutralPreference:
                    e.target.value === ""
                      ? undefined
                      : (e.target.value as "cool" | "warm" | "neutral"),
                },
              })
            }
          >
            <option value="">None</option>
            <option value="cool">Cool</option>
            <option value="warm">Warm</option>
            <option value="neutral">Neutral</option>
          </select>
            </div>
            <div>
              <label>Font Family Style</label>
          <select
            value={form.typography.fontFamily?.style ?? "sans-serif"}
            onChange={(e) =>
              setForm({
                ...form,
                typography: {
                  ...form.typography,
                  fontFamily: {
                    style: e.target.value as "serif" | "sans-serif" | "monospace",
                    name:
                      form.typography.fontFamily?.name ??
                      defaultFontNameForStyle(
                        e.target.value as "serif" | "sans-serif" | "monospace"
                      ),
                  },
                }
              })
            }
          >
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="monospace">Monospace</option>
          </select>
            </div>
            <div>
              <label>Font Name (Optional)</label>
          <input
            type="text"
            value={form.typography.fontFamily?.name ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                typography: {
                  ...form.typography,
                  fontFamily: {
                    style: form.typography.fontFamily?.style ?? "sans-serif",
                    name: e.target.value,
                  },
                },
              })
            }
            placeholder="Arial, Georgia, Consolas..."
          />
            </div>
            <div>
              <label>Spacing Density</label>
          <select
            value={form.spacing.density}
            onChange={(e) =>
              setForm({
                ...form,
                spacing: {
                  density: e.target.value as "condensed" | "normal" | "spacious",
                },
              })
            }
          >
            <option value="condensed">Condensed</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
            </div>
            <div>
              <label>Style Tags (comma-separated, optional)</label>
          <input
            type="text"
            value={styleTagsInput}
            onChange={(e) => setStyleTagsInput(e.target.value)}
            placeholder="earthy, warm, nature"
          />
            </div>
          </div>
        </details>

        {formErrors.length > 0 && (
          <ul className="generator-errors">
            {formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <button type="submit" disabled={isSubmitting} className="btn">
          {isSubmitting ? "Generating..." : "Generate Theme"}
        </button>
      </form>
    </div>
  );
}
