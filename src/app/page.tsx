"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import { userConstraintsSchema, type UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";

function parseStyleTags(input: string): string[] | undefined {
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

export default function Home() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<UserConstraints>({
    themeDescription:
      "Earthy vibes for a lifestyle app: warm neutrals, soft contrast, grounded and calm.",
    themeMode: "light",
    accessibilityTarget: "AA",
    brand: { primary: "#e4b424", secondary: "#6a994e", neutralPreference: "warm" },
    typography: {
      baseFontSize: 16,
      scalePreset: "balanced",
      fontFamily: { style: "serif", name: "Lora" },
    },
    spacing: { density: "normal" },
    styleTags: ["earthy", "warm", "nature"],
  });
  const [styleTagsInput, setStyleTagsInput] = useState("earthy, warm, nature");

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
        report: response.report as ValidationReport,
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
    <div style={{ padding: 40 }}>
      <h1>Generate UI Theme</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}
      >
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
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

        <label>Font Family</label>
        <select
          value={form.typography.fontFamily?.style ?? "sans-serif"}
          onChange={(e) =>
            setForm({
              ...form,
              typography: {
                ...form.typography,
                fontFamily: {
                  style: e.target.value as "serif" | "sans-serif" | "monospace",
                  name: form.typography.fontFamily?.name ?? "Inter",
                },
              }
            })
          }
        >
          <option value="serif">Serif</option>
          <option value="sans-serif">Sans-serif</option>
          <option value="monospace">Monospace</option>
        </select>

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
          placeholder="Inter, Lora, JetBrains Mono..."
        />

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

        <label>Style Tags (comma-separated, optional)</label>
        <input
          type="text"
          value={styleTagsInput}
          onChange={(e) => setStyleTagsInput(e.target.value)}
          placeholder="earthy, warm, nature"
        />

        {formErrors.length > 0 && (
          <ul style={{ color: "red", margin: 0 }}>
            {formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Generating..." : "Generate Theme"}
        </button>

      </form>
    </div>
  );
}
