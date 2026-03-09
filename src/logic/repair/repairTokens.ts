import { SYSTEM_SPEC, contrastThreshold } from "@/logic/constraints/systemSpec";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { contrastRatio } from "@/logic/validate/color";
import type { ValidationReport } from "@/logic/validate/validateTokens";

type RepairResult = {
  tokens: DesignTokens;
  changes: string[];
};

function pickBestTextColor(background: string): `#${string}` {
  const black = "#000000";
  const white = "#FFFFFF";
  const blackRatio = contrastRatio(black, background);
  const whiteRatio = contrastRatio(white, background);
  return (blackRatio >= whiteRatio ? black : white) as `#${string}`;
}

function hexToRgb(hex: `#${string}`) {
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): `#${string}` {
  const toHex = (v: number) => {
    const safe = Math.max(0, Math.min(255, Math.round(v)));
    return safe.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}` as `#${string}`;
}

function mixHex(a: `#${string}`, b: `#${string}`, t: number): `#${string}` {
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  return rgbToHex(
    aa.r * (1 - t) + bb.r * t,
    aa.g * (1 - t) + bb.g * t,
    aa.b * (1 - t) + bb.b * t
  );
}

function ensureBrandContrast(
  background: `#${string}`,
  threshold: number
): { background: `#${string}`; onColor: `#${string}`; changed: boolean } {
  const initialOn = pickBestTextColor(background);
  const initialRatio = contrastRatio(initialOn, background);
  if (initialRatio >= threshold) {
    return { background, onColor: initialOn, changed: false };
  }

  let best = { background, onColor: initialOn, ratio: initialRatio, delta: 1 };
  const targets: Array<`#${string}`> = ["#000000", "#FFFFFF"];
  for (const target of targets) {
    for (let step = 1; step <= 20; step++) {
      const t = step / 20;
      const candidate = mixHex(background, target, t);
      const candidateOn = pickBestTextColor(candidate);
      const ratio = contrastRatio(candidateOn, candidate);
      if (ratio > best.ratio) {
        best = { background: candidate, onColor: candidateOn, ratio, delta: t };
      }
      if (ratio >= threshold) {
        return { background: candidate, onColor: candidateOn, changed: t > 0 };
      }
    }
  }

  return {
    background: best.background,
    onColor: best.onColor,
    changed: best.delta > 0,
  };
}

function pickBestSharedTextColor(backgrounds: string[]): `#${string}` {
  const black = "#000000";
  const white = "#FFFFFF";
  const blackMin = Math.min(...backgrounds.map((bg) => contrastRatio(black, bg)));
  const whiteMin = Math.min(...backgrounds.map((bg) => contrastRatio(white, bg)));
  return (blackMin >= whiteMin ? black : white) as `#${string}`;
}

export function repairTokens(
  tokens: DesignTokens,
  userConstraints: UserConstraints,
  report: ValidationReport
): RepairResult {
  const repaired: DesignTokens = structuredClone(tokens);
  const changes: string[] = [];

  const clampedBase = Math.max(
    SYSTEM_SPEC.typography.minBaseFontSize,
    Math.min(SYSTEM_SPEC.typography.maxBaseFontSize, repaired.typography.baseFontSize)
  );
  if (clampedBase !== repaired.typography.baseFontSize) {
    repaired.typography.baseFontSize = clampedBase;
    changes.push("Clamped typography.baseFontSize to system range.");
  }

  const clampedRatio = Math.max(
    SYSTEM_SPEC.typography.minScaleRatio,
    Math.min(SYSTEM_SPEC.typography.maxScaleRatio, repaired.typography.scaleRatio)
  );
  if (clampedRatio !== repaired.typography.scaleRatio) {
    repaired.typography.scaleRatio = clampedRatio;
    changes.push("Clamped typography.scaleRatio to system range.");
  }

  const clampedBaseUnit = Math.max(
    SYSTEM_SPEC.spacing.minBaseUnit,
    Math.min(SYSTEM_SPEC.spacing.maxBaseUnit, repaired.spacing.baseUnit)
  );
  if (clampedBaseUnit !== repaired.spacing.baseUnit) {
    repaired.spacing.baseUnit = clampedBaseUnit;
    changes.push("Clamped spacing.baseUnit to system range.");
  }

  if (report.system.contrast.some((item) => !item.ok)) {
    const threshold = contrastThreshold(userConstraints.accessibilityTarget);

    const primaryFix = ensureBrandContrast(repaired.colors.brand.primary, threshold);
    if (primaryFix.background !== repaired.colors.brand.primary) {
      repaired.colors.brand.primary = primaryFix.background;
      changes.push("Adjusted colors.brand.primary to satisfy contrast target.");
    }
    if (primaryFix.onColor !== repaired.colors.brand.onPrimary) {
      repaired.colors.brand.onPrimary = primaryFix.onColor;
      changes.push("Adjusted colors.brand.onPrimary for better contrast.");
    }

    const secondaryFix = ensureBrandContrast(repaired.colors.brand.secondary, threshold);
    if (secondaryFix.background !== repaired.colors.brand.secondary) {
      repaired.colors.brand.secondary = secondaryFix.background;
      changes.push("Adjusted colors.brand.secondary to satisfy contrast target.");
    }
    if (secondaryFix.onColor !== repaired.colors.brand.onSecondary) {
      repaired.colors.brand.onSecondary = secondaryFix.onColor;
      changes.push("Adjusted colors.brand.onSecondary for better contrast.");
    }

    const sharedText = pickBestSharedTextColor([
      repaired.colors.neutral.background,
      repaired.colors.neutral.surface,
    ]);
    if (sharedText !== repaired.colors.neutral.textPrimary) {
      repaired.colors.neutral.textPrimary = sharedText;
      changes.push("Adjusted colors.neutral.textPrimary for better contrast.");
    }

    const secondary = pickBestTextColor(repaired.colors.neutral.background);
    const secondaryRatio = contrastRatio(secondary, repaired.colors.neutral.background);
    if (
      (secondaryRatio < threshold ||
        report.system.contrast.some((item) => item.id.includes("textSecondary"))) &&
      repaired.colors.neutral.textSecondary !== repaired.colors.neutral.textPrimary
    ) {
      repaired.colors.neutral.textSecondary = repaired.colors.neutral.textPrimary;
      changes.push("Aligned colors.neutral.textSecondary with textPrimary for contrast.");
    }
  }

  if (changes.length > 0) {
    repaired.meta.method = "generation+repair";
    repaired.meta.repairedAt = new Date().toISOString();
  }

  return { tokens: repaired, changes };
}
