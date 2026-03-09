import { NextResponse } from "next/server";
import {
  HEX_COLOR,
  expandUserConstraints,
  userConstraintsSchema,
  type UserConstraints,
} from "@/logic/schema/userConstraints.zod";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import { generateWithOpenAI } from "@/logic/llm/openai"; // You can switch to generateWithGemini if you want to use Gemini instead
import { validateTokens } from "@/logic/validate/validateTokens";
import { compileTokens } from "@/logic/compile/compileTokens";
import { repairTokens } from "@/logic/repair/repairTokens";
import { contrastThreshold } from "@/logic/constraints/systemSpec";
import { contrastRatio } from "@/logic/validate/color";

const SAFE_FONTS = new Set(
  [
    "arial",
    "verdana",
    "tahoma",
    "trebuchet ms",
    "times new roman",
    "georgia",
    "garamond",
    "palatino",
    "bookman",
    "courier new",
    "consolas",
    "lucida console",
    "helvetica",
    "segoe ui",
    "roboto",
    "open sans",
    "lato",
    "poppins",
    "manrope",
    "nunito sans",
    "work sans",
    "source sans 3",
    "merriweather",
    "lora",
    "libre baskerville",
    "source serif 4",
    "eb garamond",
    "jetbrains mono",
    "ibm plex mono",
    "fira code",
    "source code pro",
    "space mono",
    "serif",
    "sans-serif",
    "monospace",
  ]
);

const GENERIC_FONT_BY_STYLE: Record<"serif" | "sans-serif" | "monospace", "serif" | "sans-serif" | "monospace"> = {
  serif: "serif",
  "sans-serif": "sans-serif",
  monospace: "monospace",
};

function isHexColor(value: unknown): value is `#${string}` {
  return typeof value === "string" && HEX_COLOR.test(value);
}

function pickHex(value: unknown, fallback: `#${string}`): `#${string}` {
  return isHexColor(value) ? value : fallback;
}

function pickTint(value: unknown, fallback: "brand" | "cool" | "warm" | "neutral"): "brand" | "cool" | "warm" | "neutral" {
  if (value === "brand" || value === "cool" || value === "warm" || value === "neutral") {
    return value;
  }
  return fallback;
}

function hexToRgb(hex: `#${string}`) {
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): `#${string}` {
  const toHex = (value: number) => {
    const safe = Math.max(0, Math.min(255, Math.round(value)));
    return safe.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}` as `#${string}`;
}

function mixHex(a: `#${string}`, b: `#${string}`, ratio: number): `#${string}` {
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  return rgbToHex(
    aa.r * (1 - ratio) + bb.r * ratio,
    aa.g * (1 - ratio) + bb.g * ratio,
    aa.b * (1 - ratio) + bb.b * ratio
  );
}

function chromaValue(hex: `#${string}`): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) / 255;
}

function pickBestTextColor(background: `#${string}`): `#${string}` {
  const black = "#000000";
  const white = "#FFFFFF";
  return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

function pickReadableText(
  backgrounds: Array<`#${string}`>,
  preferred: `#${string}`,
  threshold: number
): `#${string}` {
  const candidates: Array<`#${string}`> = [
    preferred,
    pickBestTextColor(backgrounds[0]),
    backgrounds.length > 1 ? pickBestTextColor(backgrounds[1]) : preferred,
    "#101010",
    "#F4F4F4",
    "#000000",
    "#FFFFFF",
  ];

  let best = candidates[0];
  let bestRatio = 0;
  for (const candidate of candidates) {
    const ratio = Math.min(...backgrounds.map((bg) => contrastRatio(candidate, bg)));
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= threshold) return candidate;
  }
  return best;
}

function deriveSecondaryFromPrimary(
  primary: `#${string}`,
  preference: UserConstraints["brand"]["neutralPreference"]
): `#${string}` {
  if (preference === "warm") return mixHex(primary, "#FF7A42", 0.5);
  if (preference === "cool") return mixHex(primary, "#4D8DFF", 0.5);
  return mixHex(primary, "#7E7A85", 0.4);
}

function deriveNeutralPalette(
  primary: `#${string}`,
  secondary: `#${string}`,
  themeMode: UserConstraints["themeMode"],
  threshold: number
) {
  const blend = mixHex(primary, secondary, 0.5);
  if (themeMode === "dark") {
    const background = mixHex("#0F1117", blend, 0.18);
    const surface = mixHex("#171A22", blend, 0.26);
    const border = mixHex("#394150", blend, 0.42);
    const preferredPrimary = mixHex("#F2F5FF", blend, 0.16);
    const textPrimary = pickReadableText([background, surface], preferredPrimary, threshold);
    const preferredSecondary = mixHex(textPrimary, background, 0.22);
    let textSecondary = pickReadableText([background], preferredSecondary, threshold);
    if (contrastRatio(textSecondary, background) < threshold) textSecondary = textPrimary;
    return { background, surface, border, textPrimary, textSecondary };
  }

  const background = mixHex("#FFFFFF", blend, 0.08);
  const surface = mixHex("#FFFFFF", blend, 0.15);
  const border = mixHex("#D6D9E1", blend, 0.46);
  const preferredPrimary = mixHex("#101217", blend, 0.2);
  const textPrimary = pickReadableText([background, surface], preferredPrimary, threshold);
  const preferredSecondary = mixHex(textPrimary, background, 0.18);
  let textSecondary = pickReadableText([background], preferredSecondary, threshold);
  if (contrastRatio(textSecondary, background) < threshold) textSecondary = textPrimary;
  return { background, surface, border, textPrimary, textSecondary };
}

function isMonochromeNeutral(neutral: {
  background: `#${string}`;
  surface: `#${string}`;
  textPrimary: `#${string}`;
  textSecondary: `#${string}`;
  border: `#${string}`;
}) {
  const values = Object.values(neutral);
  const averageChroma = values.reduce((sum, color) => sum + chromaValue(color), 0) / values.length;
  return averageChroma < 0.08;
}

function resolveFontFamily(rawFontFamily: unknown, userConstraints: UserConstraints): string {
  const userName = userConstraints.typography.fontFamily?.name?.trim();
  if (userName) return userName;
  const style = userConstraints.typography.fontFamily?.style ?? "sans-serif";
  const genericFallback = GENERIC_FONT_BY_STYLE[style];
  if (typeof rawFontFamily !== "string" || rawFontFamily.trim().length === 0) {
    return genericFallback;
  }

  const normalized = rawFontFamily.trim().replace(/^["']|["']$/g, "");
  const key = normalized.toLowerCase();
  return SAFE_FONTS.has(key) ? normalized : genericFallback;
}

function buildFinalTokens(generated: unknown, userConstraints: UserConstraints): DesignTokens {
  const expanded = expandUserConstraints(userConstraints);
  const threshold = contrastThreshold(userConstraints.accessibilityTarget);
  const llm = (typeof generated === "object" && generated !== null
    ? generated
    : {}) as Record<string, unknown>;

  const llmColors =
    typeof llm.colors === "object" && llm.colors !== null
      ? (llm.colors as Record<string, unknown>)
      : {};
  const llmBrand =
    typeof llmColors.brand === "object" && llmColors.brand !== null
      ? (llmColors.brand as Record<string, unknown>)
      : {};
  const llmNeutral =
    typeof llmColors.neutral === "object" && llmColors.neutral !== null
      ? (llmColors.neutral as Record<string, unknown>)
      : {};
  const llmTypography =
    typeof llm.typography === "object" && llm.typography !== null
      ? (llm.typography as Record<string, unknown>)
      : {};
  const llmMeta = typeof llm.meta === "object" && llm.meta !== null ? llm.meta : {};

  const primary = pickHex(userConstraints.brand.primary, "#0057FF");
  const secondaryFromUser = userConstraints.brand.secondary;
  let secondary = secondaryFromUser
    ? pickHex(secondaryFromUser, deriveSecondaryFromPrimary(primary, userConstraints.brand.neutralPreference))
    : pickHex(
        llmBrand.secondary,
        deriveSecondaryFromPrimary(primary, userConstraints.brand.neutralPreference)
      );
  if (secondary.toLowerCase() === primary.toLowerCase()) {
    secondary = deriveSecondaryFromPrimary(primary, userConstraints.brand.neutralPreference);
  }

  const derivedNeutral = deriveNeutralPalette(primary, secondary, userConstraints.themeMode, threshold);
  const llmNeutralCandidate = {
    background: isHexColor(llmNeutral.background) ? llmNeutral.background : derivedNeutral.background,
    surface: isHexColor(llmNeutral.surface) ? llmNeutral.surface : derivedNeutral.surface,
    textPrimary: isHexColor(llmNeutral.textPrimary) ? llmNeutral.textPrimary : derivedNeutral.textPrimary,
    textSecondary: isHexColor(llmNeutral.textSecondary) ? llmNeutral.textSecondary : derivedNeutral.textSecondary,
    border: isHexColor(llmNeutral.border) ? llmNeutral.border : derivedNeutral.border,
  };

  const useLlmNeutral = !isMonochromeNeutral(llmNeutralCandidate);
  const background = useLlmNeutral ? llmNeutralCandidate.background : derivedNeutral.background;
  const surface = useLlmNeutral ? llmNeutralCandidate.surface : derivedNeutral.surface;
  const border = useLlmNeutral ? llmNeutralCandidate.border : derivedNeutral.border;
  const preferredTextPrimary = useLlmNeutral ? llmNeutralCandidate.textPrimary : derivedNeutral.textPrimary;
  const textPrimary = pickReadableText([background, surface], preferredTextPrimary, threshold);
  const preferredTextSecondary = useLlmNeutral ? llmNeutralCandidate.textSecondary : derivedNeutral.textSecondary;
  let textSecondary = pickReadableText([background], preferredTextSecondary, threshold);
  if (contrastRatio(textSecondary, background) < threshold) {
    textSecondary = textPrimary;
  }

  const preferredOnPrimary = pickHex(llmBrand.onPrimary, pickBestTextColor(primary));
  const preferredOnSecondary = pickHex(llmBrand.onSecondary, pickBestTextColor(secondary));
  const onPrimary = pickReadableText([primary], preferredOnPrimary, threshold);
  const onSecondary = pickReadableText([secondary], preferredOnSecondary, threshold);

  return {
    colors: {
      brand: {
        primary,
        secondary,
        onPrimary,
        onSecondary,
      },
      neutral: {
        background,
        surface,
        textPrimary,
        textSecondary,
        border,
        tint: pickTint(
          llmNeutral.tint,
          userConstraints.brand.neutralPreference
            ? userConstraints.brand.neutralPreference
            : "brand"
        ),
      },
    },
    typography: {
      fontFamily: resolveFontFamily(llmTypography.fontFamily, userConstraints),
      baseFontSize: userConstraints.typography.baseFontSize,
      scaleRatio: expanded.derived.typography.scaleRatio,
    },
    spacing: {
      baseUnit: expanded.derived.spacing.baseUnit,
    },
    meta: {
      generatedBy: "llm",
      method: "generation+constraints-merge",
      timestamp: new Date().toISOString(),
      sourceMeta: llmMeta,
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = userConstraintsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid user constraints",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const userConstraints = parsed.data;

    const generated = await generateWithOpenAI(userConstraints);
    const generatedTokens = buildFinalTokens(generated, userConstraints);

    let tokens = generatedTokens;
    let report = validateTokens(tokens, userConstraints);
    let repairs: string[] = [];

    if (!report.summary.systemPass && report.summary.repairable) {
      const repaired = repairTokens(tokens, userConstraints, report);
      tokens = repaired.tokens;
      repairs = repaired.changes;
      report = validateTokens(tokens, userConstraints);
    }

    const {cssVars} = compileTokens(tokens, userConstraints);

    return NextResponse.json({
      ok: true,
      tokens,
      report,
      cssVars,
      repair: {
        applied: repairs.length > 0,
        changes: repairs,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
