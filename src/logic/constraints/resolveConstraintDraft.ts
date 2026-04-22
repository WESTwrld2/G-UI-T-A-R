import {
  HEX_COLOR,
  type ConstraintDraft,
  type UserConstraints,
} from "@/logic/schema/userConstraints.zod";
import {
  defaultGoogleFontForStyle,
  extractFontFamilyFromText,
  inferFontStyleFromFamily,
} from "@/logic/llm/googleFonts";

type PaletteHint = {
  patterns: RegExp[];
  primary: `#${string}`;
  secondary?: `#${string}`;
  neutralPreference?: UserConstraints["brand"]["neutralPreference"];
  styleTags?: string[];
};

const PALETTE_HINTS: PaletteHint[] = [
  {
    patterns: [/\bwarm\b/i, /\bearthy\b/i, /\bterracotta\b/i, /\bclay\b/i, /\bsunset\b/i],
    primary: "#C56B47",
    secondary: "#6D8A4F",
    neutralPreference: "warm",
    styleTags: ["warm", "earthy", "sunset"],
  },
  {
    patterns: [/\bcool\b/i, /\bocean\b/i, /\bicy\b/i, /\bmarine\b/i, /\bteal\b/i],
    primary: "#2C7DA0",
    secondary: "#7B9ACC",
    neutralPreference: "cool",
    styleTags: ["cool", "ocean", "clean"],
  },
  {
    patterns: [/\bforest\b/i, /\bnature\b/i, /\bbotanical\b/i, /\borganic\b/i],
    primary: "#4F7D57",
    secondary: "#C2A878",
    neutralPreference: "warm",
    styleTags: ["nature", "grounded", "botanical"],
  },
  {
    patterns: [/\bluxury\b/i, /\beditorial\b/i, /\belegant\b/i, /\bpremium\b/i],
    primary: "#7C5C99",
    secondary: "#D4B483",
    neutralPreference: "neutral",
    styleTags: ["editorial", "premium", "elegant"],
  },
  {
    patterns: [/\bneon\b/i, /\bplayful\b/i, /\bvibrant\b/i, /\benergetic\b/i],
    primary: "#FF5C7A",
    secondary: "#3BC9A7",
    neutralPreference: "neutral",
    styleTags: ["vibrant", "playful", "bold"],
  },
  {
    patterns: [/\bnight\b/i, /\bnoir\b/i, /\bmoody\b/i, /\bcyber\b/i, /\bdark\b/i],
    primary: "#6C63FF",
    secondary: "#00C2A8",
    neutralPreference: "cool",
    styleTags: ["moody", "dark", "futuristic"],
  },
];

const STYLE_TAG_CANDIDATES = [
  "earthy",
  "warm",
  "cool",
  "minimal",
  "clean",
  "editorial",
  "playful",
  "bold",
  "calm",
  "soft",
  "luxury",
  "futuristic",
  "nature",
  "moody",
  "spacious",
  "compact",
];

function extractHexColors(description: string) {
  const matches = description.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g) ?? [];
  return matches.filter((value): value is `#${string}` => HEX_COLOR.test(value));
}

function firstMatchingPalette(description: string) {
  return PALETTE_HINTS.find((hint) => hint.patterns.some((pattern) => pattern.test(description)));
}

function inferThemeMode(description: string): UserConstraints["themeMode"] {
  if (/\bdark\b/i.test(description) || /\bnight\b/i.test(description) || /\bmoody\b/i.test(description)) {
    return "dark";
  }
  return "light";
}

function inferAccessibility(description: string): UserConstraints["accessibilityTarget"] {
  if (/\baccessible\b/i.test(description) || /\blegible\b/i.test(description) || /\bhigh contrast\b/i.test(description)) {
    return "AAA";
  }
  return "AA";
}

function inferNeutralPreference(
  description: string,
  palette?: PaletteHint
): UserConstraints["brand"]["neutralPreference"] {
  if (palette?.neutralPreference) return palette.neutralPreference;
  if (/\bwarm\b/i.test(description) || /\bearthy\b/i.test(description)) return "warm";
  if (/\bcool\b/i.test(description) || /\bicy\b/i.test(description) || /\bocean\b/i.test(description)) return "cool";
  return "neutral";
}

function inferFontStyle(description: string): NonNullable<UserConstraints["typography"]["fontFamily"]>["style"] {
  if (/\bmono(space)?\b/i.test(description) || /\bcode\b/i.test(description) || /\bterminal\b/i.test(description)) {
    return "monospace";
  }
  if (/\bserif\b/i.test(description) || /\beditorial\b/i.test(description) || /\bluxury\b/i.test(description)) {
    return "serif";
  }
  return "sans-serif";
}

function inferScalePreset(description: string): UserConstraints["typography"]["scalePreset"] {
  if (/\bcompact\b/i.test(description) || /\bdense\b/i.test(description) || /\btight\b/i.test(description)) {
    return "compact";
  }
  if (/\bspacious\b/i.test(description) || /\bairy\b/i.test(description) || /\bopen\b/i.test(description)) {
    return "loose";
  }
  if (/\bdramatic\b/i.test(description) || /\bexpressive\b/i.test(description) || /\beditorial\b/i.test(description)) {
    return "expressive";
  }
  return "balanced";
}

function inferSpacingDensity(description: string): UserConstraints["spacing"]["density"] {
  if (/\bcompact\b/i.test(description) || /\bdense\b/i.test(description) || /\btight\b/i.test(description)) {
    return "condensed";
  }
  if (/\bspacious\b/i.test(description) || /\bairy\b/i.test(description) || /\broomy\b/i.test(description)) {
    return "spacious";
  }
  return "normal";
}

function extractBaseFontSize(description: string): number | null {
  const patterns = [
    /\b(?:base\s+)?font(?:\s+size)?\s*(?:of|at|to|=|is|around)?\s*(1[2-9]|2[0-4])(?:\s*px)?\b/i,
    /\b(?:typography|text)\s+(?:base\s+)?size\s*(?:of|at|to|=|is|around)?\s*(1[2-9]|2[0-4])(?:\s*px)?\b/i,
    /\b(1[2-9]|2[0-4])(?:\s*px)?\s*(?:base\s+)?font(?:\s+size)?\b/i,
    /\b(1[2-9]|2[0-4])(?:\s*px)?\s+(?:typography|text)\s+size\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(description);
    if (!match) continue;

    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function inferBaseFontSize(description: string): number {
  const explicitSize = extractBaseFontSize(description);
  if (explicitSize !== null) return explicitSize;

  if (/\bcompact\b/i.test(description) || /\bdense\b/i.test(description)) return 14;
  if (/\baccessible\b/i.test(description) || /\breadable\b/i.test(description) || /\beditorial\b/i.test(description)) {
    return 17;
  }
  return 16;
}

function inferStyleTags(description: string, palette?: PaletteHint) {
  const found = STYLE_TAG_CANDIDATES.filter((tag) => new RegExp(`\\b${tag}\\b`, "i").test(description));
  const merged = [...(palette?.styleTags ?? []), ...found];
  const unique = merged.filter((item, index) => merged.indexOf(item) === index);
  return unique.length > 0 ? unique.slice(0, 5) : undefined;
}

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveConstraintDraft(draft: ConstraintDraft): UserConstraints {
  const description = draft.themeDescription.trim();
  const palette = firstMatchingPalette(description);
  const hexColors = extractHexColors(description);
  const explicitFontName =
    trimOptional(draft.typography.fontFamily?.name) ?? extractFontFamilyFromText(description);
  const inferredFontStyle =
    draft.typography.fontFamily?.style ??
    inferFontStyleFromFamily(explicitFontName) ??
    inferFontStyle(description);

  const primary =
    trimOptional(draft.brand.primary) ??
    hexColors[0] ??
    palette?.primary ??
    "#5B6CFF";

  const secondary =
    trimOptional(draft.brand.secondary) ??
    hexColors[1] ??
    palette?.secondary;

  const styleTags = draft.styleTags?.length ? draft.styleTags : inferStyleTags(description, palette);

  return {
    themeDescription: description,
    themeMode: draft.themeMode ?? inferThemeMode(description),
    accessibilityTarget: draft.accessibilityTarget ?? inferAccessibility(description),
    brand: {
      primary,
      secondary,
      neutralPreference: draft.brand.neutralPreference ?? inferNeutralPreference(description, palette),
    },
    typography: {
      baseFontSize: draft.typography.baseFontSize ?? inferBaseFontSize(description),
      scalePreset: draft.typography.scalePreset ?? inferScalePreset(description),
      fontFamily: {
        style: inferredFontStyle,
        name: explicitFontName ?? defaultGoogleFontForStyle(inferredFontStyle),
      },
    },
    spacing: {
      density: draft.spacing.density ?? inferSpacingDensity(description),
    },
    styleTags,
  };
}
