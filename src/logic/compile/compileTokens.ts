import type { DesignTokens, CompiledTokens, HexColor } from "@/logic/schema/tokens.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { SYSTEM_SPEC } from "@/logic/constraints/systemSpec";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}
function round2(n: number) {
    return Math.round(n * 100) / 100;
}


function deriveTypography(base: number, ratio: number) {
    const md = base;
    return {
        xs: round2(md / ratio / ratio),
        sm: round2(md / ratio),
        md,
        lg: round2(md * ratio),
        xl: round2(md * ratio * ratio),
        h3: round2(md * ratio * ratio),
        h2: round2(md * ratio * ratio * ratio),
        h1: round2(md * ratio * ratio * ratio * ratio),
    };
}// This is a simple modular scale with 5 steps, but it could be swapped out for a more complex scale or a custom set of sizes if desired.

function deriveSpacing(baseUnit: number, densityMultiplier: number) {
    const stepSize = baseUnit * densityMultiplier;
    return {
        xs: round2(baseUnit),
        sm: round2(baseUnit + stepSize),
        md: round2(baseUnit + stepSize * 2),
        lg: round2(baseUnit + stepSize * 3),
        xl: round2(baseUnit + stepSize * 4),
    };
}

function toRGBA(hex: HexColor, alpha: number): string {
    const raw = hex.slice(1); // remove '#'
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw; // convert 3-digit to 6-digit
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function deriveBrandStates(primary: HexColor) {
    return {
        primaryHover: toRGBA(primary, 0.85),
        primaryActive: toRGBA(primary, 0.65),
        focusRing: toRGBA(primary, 0.35),
    };
}

function densityMultiplierFromPreviewToggle(toggle: "compact" | "normal" | "spacious" | "condensed" ) {
    if (toggle === "compact") return 0.75;
    if (toggle === "spacious") return 1.25;
    if (toggle === "condensed") return 0.5;
    return 1; // normal
}
export type CompileOptions = {
    previewDensity?: "compact" | "normal" | "spacious" | "condensed";
};

export function compileTokens(
    tokens: DesignTokens, 
    constraints: UserConstraints, 
    opts: CompileOptions = {}
): {
    compiled: CompiledTokens;
    cssVars: Record<string, string>;
    tailwindConfig: Record<string, unknown>;
} {
    // Apply system constraints to user tokens
    const baseFontSize = clamp(tokens.typography.baseFontSize, SYSTEM_SPEC.typography.minBaseFontSize, SYSTEM_SPEC.typography.maxBaseFontSize);
    const scaleRatio = clamp(tokens.typography.scaleRatio, SYSTEM_SPEC.typography.minScaleRatio, SYSTEM_SPEC.typography.maxScaleRatio);
    const baseUnit = clamp(tokens.spacing.baseUnit, SYSTEM_SPEC.spacing.minBaseUnit, SYSTEM_SPEC.spacing.maxBaseUnit);

    const densityToggle = opts.previewDensity ?? constraints.spacing.density;
    const densityMultiplier = densityMultiplierFromPreviewToggle(densityToggle);

    const sizesPx = deriveTypography(baseFontSize, scaleRatio);
    const scalePx = deriveSpacing(baseUnit, densityMultiplier);
    
    const states = {
        brand: deriveBrandStates(tokens.colors.brand.primary),
    };

    const compiled: CompiledTokens = {
        ...tokens,
        typography: { ...tokens.typography, baseFontSize: baseFontSize, scaleRatio },
        spacing: { ...tokens.spacing, baseUnit: baseUnit },
        derived: {
            typography: { sizesPx},
            spacing: { scalePx, densityMultiplier },
            states
        }
    } as CompiledTokens;

    // Generate CSS variables
    const cssVars: Record<string, string> = {
        "--color-brand-primary": compiled.colors.brand.primary,
        "--color-brand-onPrimary": compiled.colors.brand.onPrimary,

        "--color-neutral-background": compiled.colors.neutral.background,
        "--color-neutral-surface": compiled.colors.neutral.surface,
        "--color-neutral-textPrimary": compiled.colors.neutral.textPrimary,
        "--color-neutral-textSecondary": compiled.colors.neutral.textSecondary,
        "--color-neutral-border": compiled.colors.neutral.border,

        "--font-family-base": compiled.typography.fontFamily,
        "--font-size-xs": `${compiled.derived.typography.sizesPx.xs}px`,
        "--font-size-sm": `${compiled.derived.typography.sizesPx.sm}px`,
        "--font-size-md": `${compiled.derived.typography.sizesPx.md}px`,
        "--font-size-lg": `${compiled.derived.typography.sizesPx.lg}px`,
        "--font-size-xl": `${compiled.derived.typography.sizesPx.xl}px`,
        "--font-size-h1": `${compiled.derived.typography.sizesPx.h1}px`,
        "--font-size-h2": `${compiled.derived.typography.sizesPx.h2}px`,
        "--font-size-h3": `${compiled.derived.typography.sizesPx.h3}px`,

        "--spacing-xs": `${compiled.derived.spacing.scalePx.xs}px`,
        "--spacing-sm": `${compiled.derived.spacing.scalePx.sm}px`,
        "--spacing-md": `${compiled.derived.spacing.scalePx.md}px`,
        "--spacing-lg": `${compiled.derived.spacing.scalePx.lg}px`,
        "--spacing-xl": `${compiled.derived.spacing.scalePx.xl}px`,

        "--state-primary-hover": compiled.derived.states.brand.primaryHover,
        "--state-primary-active": compiled.derived.states.brand.primaryActive,
        "--state-focus-ring": compiled.derived.states.brand.focusRing,
    };

    // Generate Tailwind config
    const tailwindConfig = {
        theme: {
            extend: {
                colors: {
                    brand: {
                        primary: "var(--color-brand-primary)",
                        onPrimary: "var(--color-brand-onPrimary)",
                    },
                    neutral: {
                        background: "var(--color-neutral-background)",
                        surface: "var(--color-neutral-surface)",
                        textPrimary: "var(--color-neutral-textPrimary)",
                        textSecondary: "var(--color-neutral-textSecondary)",
                        border: "var(--color-neutral-border)",
                    }
                },
                fontFamily: {
                    base: "var(--font-family-base)",
                },
                fontSize: {
                    xs: "var(--font-size-xs)",
                    sm: "var(--font-size-sm)",
                    md: "var(--font-size-md)",
                    lg: "var(--font-size-lg)",
                    xl: "var(--font-size-xl)",
                    "2xl": "var(--font-size-h3)",
                    "3xl": "var(--font-size-h2)",
                    "4xl": "var(--font-size-h1)",
                },
                spacing: {
                    xs: "var(--spacing-xs)",
                    sm: "var(--spacing-sm)",
                    md: "var(--spacing-md)",
                    lg: "var(--spacing-lg)",
                    xl: "var(--spacing-xl)",
                },
                ringColor: {
                    DEFAULT: "var(--state-focus-ring)",
                }
            }
        }
    };

    return { compiled, cssVars, tailwindConfig };
}