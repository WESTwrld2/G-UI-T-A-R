export type FontStyle = "serif" | "sans-serif" | "monospace";

type FontOption = {
  name: string;
  style: FontStyle;
  stack: string;
};

const WEB_SAFE_FONT_OPTIONS: FontOption[] = [
  { name: "Arial", style: "sans-serif", stack: '"Arial", "Helvetica Neue", Helvetica, sans-serif' },
  { name: "Verdana", style: "sans-serif", stack: "Verdana, Geneva, sans-serif" },
  { name: "Tahoma", style: "sans-serif", stack: "Tahoma, Geneva, sans-serif" },
  {
    name: "Trebuchet MS",
    style: "sans-serif",
    stack: '"Trebuchet MS", "Helvetica Neue", Helvetica, sans-serif',
  },
  { name: "Helvetica", style: "sans-serif", stack: "Helvetica, Arial, sans-serif" },
  { name: "Segoe UI", style: "sans-serif", stack: '"Segoe UI", Tahoma, Geneva, sans-serif' },
  { name: "Times New Roman", style: "serif", stack: '"Times New Roman", Times, serif' },
  { name: "Georgia", style: "serif", stack: 'Georgia, "Times New Roman", Times, serif' },
  { name: "Garamond", style: "serif", stack: 'Garamond, "Times New Roman", serif' },
  {
    name: "Palatino",
    style: "serif",
    stack: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  },
  { name: "Courier New", style: "monospace", stack: '"Courier New", Courier, monospace' },
  { name: "Consolas", style: "monospace", stack: 'Consolas, "Lucida Console", Monaco, monospace' },
  {
    name: "Lucida Console",
    style: "monospace",
    stack: '"Lucida Console", Monaco, monospace',
  },
  { name: "serif", style: "serif", stack: "serif" },
  { name: "sans-serif", style: "sans-serif", stack: "sans-serif" },
  { name: "monospace", style: "monospace", stack: "monospace" },
];

const FONT_BY_KEY = new Map(WEB_SAFE_FONT_OPTIONS.map((font) => [font.name.toLowerCase(), font] as const));

export const WEB_SAFE_FONT_NAMES = WEB_SAFE_FONT_OPTIONS.map((font) => font.name);

export const WEB_SAFE_FONT_NAMES_BY_STYLE: Record<FontStyle, string[]> = {
  serif: WEB_SAFE_FONT_OPTIONS.filter((font) => font.style === "serif").map((font) => font.name),
  "sans-serif": WEB_SAFE_FONT_OPTIONS.filter((font) => font.style === "sans-serif").map((font) => font.name),
  monospace: WEB_SAFE_FONT_OPTIONS.filter((font) => font.style === "monospace").map((font) => font.name),
};

export function genericFontForStyle(style: FontStyle): "serif" | "sans-serif" | "monospace" {
  if (style === "serif") return "serif";
  if (style === "monospace") return "monospace";
  return "sans-serif";
}

export function normalizeWebSafeFontName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^["']|["']$/g, "");
  if (!normalized) return null;
  const found = FONT_BY_KEY.get(normalized.toLowerCase());
  return found?.name ?? null;
}

export function fontStackForName(value: unknown, styleHint: FontStyle = "sans-serif"): string {
  const normalized = normalizeWebSafeFontName(value);
  if (!normalized) return genericFontForStyle(styleHint);
  return FONT_BY_KEY.get(normalized.toLowerCase())?.stack ?? genericFontForStyle(styleHint);
}
