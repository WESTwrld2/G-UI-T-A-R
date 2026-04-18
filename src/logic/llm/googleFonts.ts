export type FontStyle = "serif" | "sans-serif" | "monospace";

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

const BLOCKED_SYSTEM_FONT_NAMES = new Set([
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

export function genericFontForStyle(style: FontStyle): FontStyle {
  return style;
}

export function defaultGoogleFontForStyle(style: FontStyle): string {
  return GOOGLE_FONT_STYLE_CONFIG[style].family;
}

export function googleFontExamplesForStyle(style: FontStyle): string[] {
  return GOOGLE_FONT_STYLE_CONFIG[style].promptExamples;
}

export function normalizeGoogleFontFamily(
  value: unknown,
  styleHint: FontStyle = "sans-serif"
): string | null {
  if (typeof value !== "string") return null;

  const normalized = collapseWhitespace(stripOuterQuotes(firstFontName(value)));
  if (!normalized || !GOOGLE_FONT_NAME_PATTERN.test(normalized)) return null;
  if (BLOCKED_SYSTEM_FONT_NAMES.has(normalized.toLowerCase())) return null;

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

function resolvedFontFamily(value: unknown, styleHint: FontStyle) {
  return normalizeGoogleFontFamily(value, styleHint) ?? defaultGoogleFontForStyle(styleHint);
}

export function fontStackForName(value: unknown, styleHint: FontStyle = "sans-serif"): string {
  const family = resolvedFontFamily(value, styleHint);
  return `${quoteFontFamily(family)}, ${GOOGLE_FONT_STYLE_CONFIG[styleHint].fallbackStack}`;
}

export function googleFontCssUrl(value: unknown, styleHint: FontStyle = "sans-serif"): string {
  const family = resolvedFontFamily(value, styleHint);
  const encodedFamily = encodeURIComponent(family).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400;500;600;700&display=swap`;
}

export function ensureGoogleFontLoaded(value: unknown, styleHint: FontStyle = "sans-serif") {
  if (typeof document === "undefined") return;

  const href = googleFontCssUrl(value, styleHint);
  const existing = document.head.querySelector<HTMLLinkElement>('link[data-theme-google-font="true"]');
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
