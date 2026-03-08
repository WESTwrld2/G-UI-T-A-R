import type { UserConstraints } from "@/logic/schema/userConstraints.zod";

export function buildPrompt(user: UserConstraints) {
  return `
You are a UI design system generator.

Generate design tokens that satisfy the following constraints.

USER PREFERENCES
Theme Mode: ${user.themeMode}
Brand Primary: ${user.brand.primary}
Typography Base Size: ${user.typography.baseFontSize}px
Scale Preset: ${user.typography.scalePreset}
Spacing Density: ${user.spacing.density}

OUTPUT REQUIREMENTS
Return STRICT JSON only.
Do not include explanations.

JSON SCHEMA

{
  "colors": {
    "brand": {
      "primary": "#RRGGBB",
      "onPrimary": "#RRGGBB"
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
    "fontFamily": "Inter", // or another web-safe font
    "baseFontSize": number,
    "scaleRatio": number
  },
  "spacing": {
    "baseUnit": number
  },
  "meta": {
    "generatedBy": "llm",
    "method": "generation",
    "timestamp": "ISO_DATE"
  }
}

Ensure colors provide readable contrast.
`;
}