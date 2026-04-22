export type FontStyle = "serif" | "sans-serif" | "monospace";

import { WEB_SAFE_FONT_NAMES_BY_STYLE } from "@/logic/llm/webSafeFonts";

type GoogleFontStyleConfig = {
  family: string;
  promptExamples: string[];
  fallbackStack: string;
};

const GOOGLE_FONT_STYLE_CONFIG: Record<FontStyle, GoogleFontStyleConfig> = {
  serif: {
    family: "Merriweather",
    promptExamples: ["Merriweather", "Lora", "Cormorant Garamond", "Bitter"],
    fallbackStack: 'Georgia, "Times New Roman", serif',
  },
  "sans-serif": {
    family: "Space Grotesk",
    promptExamples: ["Space Grotesk", "Manrope", "Inter", "Plus Jakarta Sans"],
    fallbackStack: '"Avenir Next", "Segoe UI", Arial, sans-serif',
  },
  monospace: {
    family: "IBM Plex Mono",
    promptExamples: ["IBM Plex Mono", "Space Mono", "Roboto Mono", "JetBrains Mono"],
    fallbackStack: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
};

const GENERIC_CSS_FONT_NAMES = new Set([
  // Generic CSS families
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "cursive",
  "fantasy",
  "emoji",
]);

const SYSTEM_FONT_NAMES = new Set([
  // System fonts
  "arial",
  "courier new",
  "consolas",
  "garamond",
  "georgia",
  "helvetica",
  "lucida console",
  "monaco",
  "palatino",
  "segoe ui",
  "tahoma",
  "times new roman",
  "trebuchet ms",
  "verdana",
  // Platform-specific
  "-apple-system",
  "blinkmacsystemfont",
  "avenir",
  "liberation mono",
  "menlo",
]);

const GOOGLE_FONT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &'+\-/]{0,79}$/;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripOuterQuotes(value: string) {
  return value.replace(/^["']|["']$/g, "");
}

function firstFontName(value: string) {
  return value.split(",")[0]?.trim() ?? "";
}

function quoteFontFamily(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function looksMonospaceFamily(value: string) {
  return /\bmono\b|code|console|typewriter|courier|fixed/i.test(value);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFontFamilyCandidate(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = collapseWhitespace(stripOuterQuotes(firstFontName(value)));
  if (!normalized || !GOOGLE_FONT_NAME_PATTERN.test(normalized)) return null;
  return normalized;
}

const KNOWN_FONT_STYLE_BY_NAME = new Map<string, FontStyle>();
const KNOWN_FONT_NAME_SET = new Set<string>();

for (const style of Object.keys(GOOGLE_FONT_STYLE_CONFIG) as FontStyle[]) {
  const names = [
    GOOGLE_FONT_STYLE_CONFIG[style].family,
    ...GOOGLE_FONT_STYLE_CONFIG[style].promptExamples,
    ...WEB_SAFE_FONT_NAMES_BY_STYLE[style],
  ];

  for (const name of names) {
    const normalized = name.toLowerCase();
    if (!GENERIC_CSS_FONT_NAMES.has(normalized)) {
      KNOWN_FONT_STYLE_BY_NAME.set(normalized, style);
      KNOWN_FONT_NAME_SET.add(name);
    }
  }
}

const KNOWN_FONT_NAMES = [...KNOWN_FONT_NAME_SET].sort((a, b) => b.length - a.length);

export function genericFontForStyle(style: FontStyle): FontStyle {
  return style;
}

export function defaultGoogleFontForStyle(style: FontStyle): string {
  return GOOGLE_FONT_STYLE_CONFIG[style].family;
}

export function googleFontExamplesForStyle(style: FontStyle): string[] {
  return GOOGLE_FONT_STYLE_CONFIG[style].promptExamples;
}

export function normalizePreferredFontFamily(value: unknown): string | null {
  const normalized = normalizeFontFamilyCandidate(value);
  if (!normalized) return null;
  if (GENERIC_CSS_FONT_NAMES.has(normalized.toLowerCase())) return null;
  return normalized;
}

export function inferFontStyleFromFamily(value: unknown): FontStyle | null {
  const normalized = normalizePreferredFontFamily(value);
  if (!normalized) return null;

  const knownStyle = KNOWN_FONT_STYLE_BY_NAME.get(normalized.toLowerCase());
  if (knownStyle) return knownStyle;
  if (looksMonospaceFamily(normalized)) return "monospace";
  return null;
}

export function normalizeGoogleFontFamily(
  value: unknown,
  styleHint: FontStyle = "sans-serif"
): string | null {
  const normalized = normalizePreferredFontFamily(value);
  if (!normalized) return null;
  if (SYSTEM_FONT_NAMES.has(normalized.toLowerCase())) return null;

  // STRICT style matching: reject mismatches
  const isMonospace = looksMonospaceFamily(normalized);
  if (styleHint === "monospace" && !isMonospace) {
    // Requested monospace but got proportional
    return null;
  }

  if (styleHint !== "monospace" && isMonospace) {
    // Requested serif/sans-serif but got monospace
    return null;
  }

  return normalized;
}

export function extractFontFamilyFromText(value: string): string | null {
  const text = collapseWhitespace(value);
  if (!text) return null;

  const quotedMatch =
    text.match(/\b(?:font(?: family| face| name)?|typeface|typography)\b[^"'`]{0,24}["'`]([^"'`]{2,80})["'`]/i) ??
    text.match(/\b(?:use|using|with|set in)\s+["'`]([^"'`]{2,80})["'`]/i);
  const quotedCandidate = normalizePreferredFontFamily(quotedMatch?.[1]);
  if (quotedCandidate) return quotedCandidate;

  const heuristicPatterns = [
    /\b(?:something\s+like|like|such\s+as|inspired\s+by)\s+((?:[A-Z0-9][A-Za-z0-9&'+\-/]*)(?:\s+[A-Z0-9][A-Za-z0-9&'+\-/]*){0,3})\b/,
    /\b(?:font(?: family| face| name)?|typeface|typography)\b[^.]{0,40}?\b((?:[A-Z0-9][A-Za-z0-9&'+\-/]*)(?:\s+[A-Z0-9][A-Za-z0-9&'+\-/]*){0,3})\b/,
  ];

  for (const pattern of heuristicPatterns) {
    const match = pattern.exec(text);
    const candidate = normalizePreferredFontFamily(match?.[1]);
    if (candidate) return candidate;
  }

  let bestMatch: { name: string; index: number } | null = null;
  for (const fontName of KNOWN_FONT_NAMES) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(fontName)}(?=$|[^A-Za-z0-9])`, "i");
    const match = pattern.exec(text);
    if (!match) continue;

    const index = match.index + match[1].length;
    if (!bestMatch || index < bestMatch.index || (index === bestMatch.index && fontName.length > bestMatch.name.length)) {
      bestMatch = { name: fontName, index };
    }
  }

  return bestMatch ? normalizePreferredFontFamily(bestMatch.name) : null;
}

function resolvedFontFamily(value: unknown, styleHint: FontStyle) {
  return normalizePreferredFontFamily(value) ?? defaultGoogleFontForStyle(styleHint);
}

export function fontStackForName(value: unknown, styleHint: FontStyle = "sans-serif"): string {
  const family = resolvedFontFamily(value, styleHint);
  return `${quoteFontFamily(family)}, ${GOOGLE_FONT_STYLE_CONFIG[styleHint].fallbackStack}`;
}

export function googleFontCssUrl(value: unknown, styleHint: FontStyle = "sans-serif"): string {
  const family = normalizeGoogleFontFamily(value, styleHint) ?? defaultGoogleFontForStyle(styleHint);
  const encodedFamily = encodeURIComponent(family).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400;500;600;700&display=swap`;
}

export function ensureGoogleFontLoaded(value: unknown, styleHint: FontStyle = "sans-serif") {
  if (typeof document === "undefined") return;

  const existing = document.head.querySelector<HTMLLinkElement>('link[data-theme-google-font="true"]');
  const family = normalizeGoogleFontFamily(value, styleHint);

  if (!family) {
    existing?.remove();
    return;
  }

  const href = googleFontCssUrl(family, styleHint);
  if (existing) {
    if (existing.href !== href) {
      existing.href = href;
    }
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.themeGoogleFont = "true";
  document.head.appendChild(link);
}
