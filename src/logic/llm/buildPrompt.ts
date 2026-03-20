import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { genericFontForStyle, WEB_SAFE_FONT_NAMES_BY_STYLE } from "@/logic/llm/webSafeFonts";

export function buildPrompt(user: UserConstraints) {
  const styleTags = user.styleTags?.length ? user.styleTags.join(", ") : "Not provided";
  const secondary = user.brand.secondary ?? "Not provided";
  const neutralPreference = user.brand.neutralPreference ?? "Not provided";
  const fontStyle = user.typography.fontFamily?.style ?? "sans-serif";
  const fontName = user.typography.fontFamily?.name ?? "Not provided";
  const allowedFonts = WEB_SAFE_FONT_NAMES_BY_STYLE[fontStyle].join(", ");
  const fallbackFont = genericFontForStyle(fontStyle);

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
Use the exact user brand primary as colors.brand.primary.
Use the exact user brand secondary as colors.brand.secondary when provided.
Derive the neutral palette from a tasteful blend of brand primary and secondary.
Avoid plain grayscale-only output for background/surface/border/text unless required for contrast.
Select typography.fontFamily from this allowed list: ${allowedFonts}.
Return exactly one font name from the list (no comma-separated stack).
If uncertain, return ${fallbackFont}.

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

Ensure colors provide readable contrast (at least 4.5:1 for AA and 7:1 for AAA).
Allowed tint values: brand, cool, warm, neutral.
`;
}
