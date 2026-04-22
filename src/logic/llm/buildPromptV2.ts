import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { contrastThreshold } from "@/logic/constraints/systemSpec";
import {
  defaultGoogleFontForStyle,
  googleFontExamplesForStyle,
} from "@/logic/llm/googleFonts";

// Build prompt for LLM token generation
// Supports 'structured' (comprehensive) and 'naive' (minimal) modes
export function buildPrompt(user: UserConstraints, mode: "structured" | "naive" = "structured"): string {
  if (mode === "naive") {
    return buildNaivePrompt(user);
  }
  return buildStructuredPrompt(user);
}

// Naive mode: minimal, open-ended prompt for creative LLM choices
function buildNaivePrompt(user: UserConstraints): string {
  const secondary = user.brand.secondary ? `and ${user.brand.secondary}` : "";
  const description = user.themeDescription ?? "Create a nice design system";

  return `
Generate a design token set for a ${user.themeMode} mode UI theme. 

Theme: ${description}
Primary brand color: ${user.brand.primary} ${secondary}
Accessibility: ${user.accessibilityTarget}
Font size base: ${user.typography.baseFontSize}px
Scale: ${user.typography.scalePreset}
Spacing: ${user.spacing.density}

Return only a valid JSON with colors (brand with primary/secondary/onPrimary/onSecondary, neutral with background/surface/textPrimary/textSecondary/border/tint), typography (fontFamily), and meta (generatedBy, method, timestamp).
`;
}

// Structured mode: comprehensive prompt with detailed requirements
function buildStructuredPrompt(user: UserConstraints): string {
  const styleTags = user.styleTags?.length ? user.styleTags.join(", ") : "Not provided";
  const contrastMin = contrastThreshold(user.accessibilityTarget);
  const secondary = user.brand.secondary ?? "Not provided";
  const neutralPreference = user.brand.neutralPreference ?? "Not provided";
  const fontStyle = user.typography.fontFamily?.style ?? "sans-serif";
  const fontName = user.typography.fontFamily?.name ?? "Not provided";
  const fontExamples = googleFontExamplesForStyle(fontStyle).join(", ");
  const fallbackFont = defaultGoogleFontForStyle(fontStyle);
  const fontInstructions =
    user.typography.fontFamily?.name
      ? `Respect the explicit Typography Font Name exactly.
Return exactly one font family name only (no comma-separated stack, no fallback list).
Do not replace the requested font with a different Google Fonts alternative.
If the requested font is a legacy/system/web-safe font, still return that exact family name.`
      : `Select typography.fontFamily as a valid Google Fonts family that EXACTLY matches the requested font style.
Return exactly one font family name only (no comma-separated stack, no fallback list).
Do not include explanations or multiple options.
Do not return generic CSS families or legacy default faces like Arial, Times New Roman, Georgia, Consolas, Courier New, Helvetica, Verdana, or Trebuchet.
For serif style: Must be a Google Fonts serif family (e.g., ${fontExamples}).
For sans-serif style: Must be a Google Fonts sans-serif family (e.g., ${fontExamples}).
For monospace style: Must be a Google Fonts monospace family designed for code/terminals (e.g., ${fontExamples}).
If the requested style is monospace, ONLY return a true monospace Google Fonts family - never a proportional font.
If the requested style is serif or sans-serif, ONLY return fonts matching that style - never monospace.
Verify the selected font exists in Google Fonts library.
If uncertain or cannot match the style exactly, return: ${fallbackFont}`;

  return `
You are a UI design system generator.

Generate a PARTIAL token set that satisfies the following constraints.

USER PREFERENCES
Theme Description: ${user.themeDescription ?? "Not provided"}
Theme Mode: ${user.themeMode}
Accessibility Target: ${user.accessibilityTarget}
Brand Primary: ${user.brand.primary}
Brand Secondary: ${secondary}
Neutral Preference: ${neutralPreference}
Typography Base Size: ${user.typography.baseFontSize}px
Scale Preset: ${user.typography.scalePreset}
Typography Font Style: ${fontStyle}
Typography Font Name: ${fontName}
Spacing Density: ${user.spacing.density}
Style Tags: ${styleTags}

OUTPUT REQUIREMENTS
Return STRICT JSON only.
Do not include explanations.
Treat the theme description as the primary creative direction for mood, feeling, and aesthetic tone.
When a constraint feels broad or auto-derived, follow the theme description more strongly than the generic default.
Use the exact user brand primary as colors.brand.primary.
Use the exact user brand secondary as colors.brand.secondary when provided.
Derive the neutral palette from a tasteful blend of brand primary and secondary.
Avoid plain grayscale-only output for background/surface/border/text unless required for contrast.
${fontInstructions}

JSON SCHEMA
{
  "colors": {
    "brand": {
      "primary": "#RRGGBB",
      "secondary": "#RRGGBB",
      "onPrimary": "#RRGGBB",
      "onSecondary": "#RRGGBB"
    },
    "neutral": {
      "background": "#RRGGBB",
      "surface": "#RRGGBB",
      "textPrimary": "#RRGGBB",
      "textSecondary": "#RRGGBB",
      "border": "#RRGGBB",
      "tint": "brand"
    }
  },
  "typography": {
    "fontFamily": "Font Name"
  },
  "meta": {
    "generatedBy": "llm",
    "method": "generation-partial",
    "timestamp": "ISO_DATE"
  }
}

CONTRAST REQUIREMENTS
Ensure colors provide readable contrast with a minimum of ${contrastMin}:1 for all color pairs.
If the user requested AAA, the minimum target is 7:1; otherwise use 4.5:1 as the baseline.
Test specifically: textPrimary vs background, textSecondary vs surface, and all brand colors vs their onColor counterparts.
Pay special attention to neutral colors to ensure sufficient contrast in the theme mode (${user.themeMode}).

TINT REQUIREMENT
Allowed tint values: brand, cool, warm, neutral.
The tint should harmonize with the theme's overall mood and the user's neutralPreference (${neutralPreference}).
`;
}

/**
 * Get the current prompt builder implementation
 * This allows external code to retrieve the prompt without calling the LLM
 */
export function getPromptMode(): "structured" | "naive" {
  // This can be controlled via environment variable or config
  const mode = process.env.PROMPT_MODE as "structured" | "naive" | undefined;
  return mode ?? "structured";
}
