
export type ContrastTarget = "AA" | "AAA";

export type SystemConstraintSpec = {
  typography: {
    minBaseFontSize: number;
    maxBaseFontSize: number;
    minScaleRatio: number;
    maxScaleRatio: number;
  };
  spacing: {
    minBaseUnit: number;
    maxBaseUnit: number;
    steps: readonly string[];
    monotonic: boolean;
  };
  contrast: {
    AA: { normalText: number };
    AAA: { normalText: number };
  };
  requiredContrastPairs: Array<[pathA: string, pathB: string]>;
};

export const SYSTEM_SPEC: SystemConstraintSpec = {
  typography: {
    minBaseFontSize: 12,
    maxBaseFontSize: 24,
    minScaleRatio: 1.1,
    maxScaleRatio: 1.5,
  },
  spacing: {
    minBaseUnit: 6,
    maxBaseUnit: 8,
    steps: ["xs", "sm", "md", "lg", "xl"] as const,
    monotonic: true,
  },
  contrast: {
    AA: { normalText: 4.5 },
    AAA: { normalText: 7.0 },
  },
  
  // These are the color pairs that must meet the specified contrast ratios based on the user's accessibility target. More might be added when the preview component is built out and we see which pairs are most critical to check.
  requiredContrastPairs: [
    ["colors.neutral.textPrimary", "colors.neutral.background"],
    ["colors.neutral.textSecondary", "colors.neutral.background"],
    ["colors.neutral.textSecondary", "colors.brand.secondary"],
    ["colors.neutral.textPrimary", "colors.neutral.surface"],
    ["colors.neutral.textSecondary", "colors.neutral.surface"],
    ["colors.brand.onPrimary", "colors.brand.primary"],
    ["colors.brand.onSecondary", "colors.brand.secondary"],
    ["colors.brand.secondary", "colors.neutral.background"],
    ["colors.brand.primary", "colors.neutral.surface"],
  ],
};

export function contrastThreshold(target: ContrastTarget): number {
  return SYSTEM_SPEC.contrast[target].normalText;
}
