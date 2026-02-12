
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
  requiredContrastPairs: Array<[colorKeyA: string, colorKeyB: string]>;
};

export const SYSTEM_SPEC: SystemConstraintSpec = {
  typography: {
    minBaseFontSize: 10,
    maxBaseFontSize: 24,
    minScaleRatio: 1.1,
    maxScaleRatio: 1.5,
  },
  spacing: {
    minBaseUnit: 4,
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
    ["textPrimary", "background"],
    ["textSecondary", "background"],
    ["textPrimary", "surface"],
    ["onPrimary", "primary"],
  ],
};

export function contrastThreshold(target: ContrastTarget): number {
  return SYSTEM_SPEC.contrast[target].normalText;
}
