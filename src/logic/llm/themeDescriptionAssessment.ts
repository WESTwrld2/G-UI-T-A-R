export type ThemeDescriptionAssessment = {
  description: string;
  supportedSignals: string[];
  unsupportedSignals: Array<{
    request: string;
    reason: string;
  }>;
  guidance: string;
};

type SignalRule = {
  patterns: RegExp[];
  summary: string;
};

type UnsupportedRule = {
  patterns: RegExp[];
  request: string;
  reason: string;
};

const SUPPORTED_RULES: SignalRule[] = [
  {
    patterns: [/\bwarm\b/i, /\bearthy\b/i, /\bsunset\b/i],
    summary: "Warm color direction can be reflected via brand/neutral tint blending.",
  },
  {
    patterns: [/\bcool\b/i, /\bocean\b/i, /\bicy\b/i],
    summary: "Cool color direction can be reflected via brand/neutral tint blending.",
  },
  {
    patterns: [/\bneutral\b/i, /\bminimal\b/i, /\bclean\b/i],
    summary: "Neutral tone requests can be reflected in surface/background/text palette balance.",
  },
  {
    patterns: [/\bvibrant\b/i, /\bbold\b/i, /\bplayful\b/i, /\benergetic\b/i],
    summary: "Vibrancy can be influenced through stronger brand usage in generated colors.",
  },
  {
    patterns: [/\bsoft\b/i, /\bmuted\b/i, /\bsubtle\b/i, /\bcalm\b/i],
    summary: "Softer mood can be reflected by calmer neutral/background pairings.",
  },
  {
    patterns: [/\bcompact\b/i, /\bdense\b/i, /\btight\b/i, /\bspacious\b/i, /\bairy\b/i],
    summary: "Density-related intent can be captured through spacing density and derived spacing scale.",
  },
  {
    patterns: [/\breadable\b/i, /\blegible\b/i, /\baccessible\b/i, /\bcontrast\b/i],
    summary: "Readability intent is enforced through accessibility target and contrast repair rules.",
  },
  {
    patterns: [/\bserif\b/i, /\bsans\b/i, /\bmono(space)?\b/i, /\btypography\b/i],
    summary: "Typography direction can be reflected via font family/style and type scale constraints.",
  },
];

const UNSUPPORTED_RULES: UnsupportedRule[] = [
  {
    patterns: [/\banimat(e|ion)\b/i, /\bmicro.?interaction\b/i, /\bmotion\b/i, /\btransition\b/i],
    request: "Motion and animation behavior",
    reason: "The current token system does not include animation or timing tokens.",
  },
  {
    patterns: [/\blayout\b/i, /\bgrid\b/i, /\bsidebar\b/i, /\bbreakpoint\b/i, /\bresponsive\b/i],
    request: "Layout and responsive structure",
    reason: "Layout primitives are not generated as tokens in this system.",
  },
  {
    patterns: [/\bshadow\b/i, /\belevation\b/i, /\bblur\b/i, /\bglass(morphism)?\b/i],
    request: "Shadow, elevation, and blur styling",
    reason: "There are currently no shadow/elevation/blur tokens to control these effects.",
  },
  {
    patterns: [/\b(radius|rounded corners?)\b/i, /\bcorner\b/i],
    request: "Corner radius system",
    reason: "Radius values are hardcoded in preview components and not tokenized yet.",
  },
  {
    patterns: [/\bgradient\b/i, /\btexture\b/i, /\bpattern\b/i, /\billustration\b/i, /\bimagery\b/i],
    request: "Advanced visual treatments (gradients/textures/imagery)",
    reason: "The token model currently focuses on colors, typography, spacing, and state colors only.",
  },
  {
    patterns: [/\bsuccess\b/i, /\bwarning\b/i, /\bdanger\b/i, /\berror states?\b/i],
    request: "Semantic status color system",
    reason: "Status-specific color roles are not part of the current token schema.",
  },
];

function hasAnyMatch(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function assessThemeDescription(description?: string): ThemeDescriptionAssessment | null {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  const supportedSignals = SUPPORTED_RULES
    .filter((rule) => hasAnyMatch(trimmed, rule.patterns))
    .map((rule) => rule.summary);

  const unsupportedSignals = UNSUPPORTED_RULES
    .filter((rule) => hasAnyMatch(trimmed, rule.patterns))
    .map((rule) => ({ request: rule.request, reason: rule.reason }));

  const guidance =
    unsupportedSignals.length > 0
      ? "Some requests in your description are outside the current token capabilities. We still apply them as LLM guidance, but they are not enforceable by validation/repair yet."
      : "Your description is used as LLM guidance and aligns with tokenized capabilities. Final output can still vary because generation is probabilistic.";

  return {
    description: trimmed,
    supportedSignals,
    unsupportedSignals,
    guidance,
  };
}
