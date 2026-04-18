import { SYSTEM_SPEC, contrastThreshold } from "@/logic/constraints/systemSpec";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { RepairDiff } from "@/logic/schema/generationReport.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { contrastRatio } from "@/logic/validate/color";
import { validateTokens } from "@/logic/validate/validateTokens";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import { adjustLightness, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, type HSL } from "@/logic/utilities/color";

type RepairResult = {
  tokens: DesignTokens;
  changes: string[];
  diffs: RepairDiff[];
};

type ContrastItemDetails = {
  pathA: string;
  pathB: string;
  ratio?: number;
};

type CandidateScore = {
  passCount: number;
  minRatio: number;
  distance: number;
};

const MAX_ITER = 50;
const SEARCH_STEPS = 128;

/* ------------------ COLOR UTILS ------------------ */

function luminance(hex: `#${string}`) {
  const { r, g, b } = hexToRgb(hex);

  const f = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/* ------------------ TOKEN ACCESS ------------------ */

function getColor(tokens: DesignTokens, key: string): `#${string}` {
  const [group, sub, name] = key.split(".");
  const target = tokens as unknown as Record<string, Record<string, Record<string, `#${string}`>>>;
  return target[group][sub][name];
}

function setColor(tokens: DesignTokens, key: string, value: `#${string}`) {
  const [group, sub, name] = key.split(".");
  const target = tokens as unknown as Record<string, Record<string, Record<string, `#${string}`>>>;
  target[group][sub][name] = value;
}

/* ------------------ MUTABILITY ------------------ */

function buildIsMutable(userConstraints: UserConstraints) {
  const protectedKeys = new Set(["colors.brand.primary"]);
  if (userConstraints.brand.secondary) {
    protectedKeys.add("colors.brand.secondary");
  }
  return (key: string) => !protectedKeys.has(key);
}

function chooseRepairTarget(keyA: string, keyB: string) {
  const textOrOn = (key: string) => /(text|on)/i.test(key);
  const background = (key: string) => /(background|surface)/i.test(key);

  if (textOrOn(keyA) && !textOrOn(keyB)) return keyA;
  if (textOrOn(keyB) && !textOrOn(keyA)) return keyB;
  if (background(keyA) && !background(keyB)) return keyA;
  if (background(keyB) && !background(keyA)) return keyB;

  return keyA;
}

function orderedRepairTargets(
  keyA: string,
  keyB: string,
  isMutable: (key: string) => boolean
) {
  const preferred = chooseRepairTarget(keyA, keyB);
  const alternate = preferred === keyA ? keyB : keyA;
  return [preferred, alternate].filter((key, index, list) => isMutable(key) && list.indexOf(key) === index);
}

function getContrastDetails(item: ValidationReport["system"]["contrast"][number]): ContrastItemDetails | null {
  const details = item.details as ContrastItemDetails | undefined;
  if (!details?.pathA || !details?.pathB) return null;
  return details;
}

function relatedContrastPartners(
  report: ValidationReport,
  key: string
) {
  const related = new Set<string>();

  for (const item of report.system.contrast) {
    const details = getContrastDetails(item);
    if (!details) continue;

    if (details.pathA === key) related.add(details.pathB);
    if (details.pathB === key) related.add(details.pathA);
  }

  return [...related];
}

function scoreCandidate(
  candidate: `#${string}`,
  original: `#${string}`,
  otherColors: Array<`#${string}`>,
  threshold: number
): CandidateScore {
  const ratios = otherColors.map((other) => contrastRatio(candidate, other));
  return {
    passCount: ratios.filter((ratio) => ratio >= threshold).length,
    minRatio: ratios.length > 0 ? Math.min(...ratios) : Number.POSITIVE_INFINITY,
    distance: Math.abs(luminance(candidate) - luminance(original)),
  };
}

function isBetterCandidate(
  next: CandidateScore,
  current: CandidateScore,
  totalPairs: number
) {
  if (next.passCount !== current.passCount) {
    return next.passCount > current.passCount;
  }

  const nextPassesAll = next.passCount === totalPairs;
  const currentPassesAll = current.passCount === totalPairs;
  if (nextPassesAll && currentPassesAll && next.distance !== current.distance) {
    return next.distance < current.distance;
  }

  if (next.minRatio !== current.minRatio) {
    return next.minRatio > current.minRatio;
  }

  if (next.distance !== current.distance) {
    return next.distance < current.distance;
  }

  return false;
}

function searchBestColorForKey(
  tokens: DesignTokens,
  key: string,
  report: ValidationReport,
  threshold: number
) {
  const original = getColor(tokens, key);
  const partnerKeys = relatedContrastPartners(report, key);
  if (partnerKeys.length === 0) return original;

  const partnerColors = partnerKeys.map((partnerKey) => getColor(tokens, partnerKey));
  let best = original;
  let bestScore = scoreCandidate(original, original, partnerColors, threshold);

  // Expanded candidate set with HSL exploration
  const candidates = new Set<`#${string}`>([original, "#000000", "#FFFFFF"]);
  const originalHsl = rgbToHsl(hexToRgb(original));

  // 1. Systematic lightness exploration (primary approach for contrast)
  for (let step = 1; step <= SEARCH_STEPS; step += 1) {
    const ratio = step / SEARCH_STEPS;
    // Linear interpolation towards black and white
    candidates.add(adjustLightness(original, ratio));
    candidates.add(adjustLightness(original, -ratio));
  }

  // 2. Saturation adjustments can help with some contrast cases
  for (let satStep = 0; satStep <= 10; satStep += 1) {
    const satFactor = satStep / 10; // 0 to 1
    const newSat = Math.max(0, Math.min(1, originalHsl.s * (1 - satFactor * 0.5))); // Reduce saturation
    
    for (let lightStep = 0; lightStep <= 20; lightStep += 1) {
      const lightDelta = (lightStep - 10) / 10; // -1 to 1
      const newLight = Math.max(0, Math.min(1, originalHsl.l + lightDelta * 0.5));
      
      const hsl: HSL = {
        h: originalHsl.h,
        s: newSat,
        l: newLight,
      };
      const rgb = hslToRgb(hsl);
      candidates.add(rgbToHex(rgb.r, rgb.g, rgb.b));
    }
  }

  // 3. Extreme candidates (almost black/white with original hue)
  for (let hueShift = -0.15; hueShift <= 0.15; hueShift += 0.05) {
    const h = (originalHsl.h + hueShift + 1) % 1;
    for (const l of [0.05, 0.15, 0.25, 0.35, 0.65, 0.75, 0.85, 0.95]) {
      const hsl: HSL = { h, s: 0, l }; // Grayscale for better contrast
      const rgb = hslToRgb(hsl);
      candidates.add(rgbToHex(rgb.r, rgb.g, rgb.b));
    }
  }

  // Find the best candidate
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, original, partnerColors, threshold);
    if (isBetterCandidate(score, bestScore, partnerColors.length)) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

/* ------------------ MAIN ------------------ */

export function repairTokens(
  tokens: DesignTokens,
  userConstraints: UserConstraints,
  report: ValidationReport
): RepairResult {
  const hasContrastFailures = report.system.contrast.some((item) => !item.ok);

  if (!hasContrastFailures) {
    return { tokens: structuredClone(tokens), changes: [], diffs: [] };
  }

  const repaired = structuredClone(tokens);
  const changes: string[] = [];
  const diffs: RepairDiff[] = [];

  const threshold = contrastThreshold(userConstraints.accessibilityTarget);

  function track(path: string, before: string, after: string, reason: string) {
    if (before === after) return;
    diffs.push({ path, before, after, reason });
    changes.push(reason);
  }

  /* -------- CLAMPS -------- */

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const baseBefore = repaired.typography.baseFontSize;
  repaired.typography.baseFontSize = clamp(
    baseBefore,
    SYSTEM_SPEC.typography.minBaseFontSize,
    SYSTEM_SPEC.typography.maxBaseFontSize
  );
  track("typography.baseFontSize", `${baseBefore}`, `${repaired.typography.baseFontSize}`, "clamped");

  const ratioBefore = repaired.typography.scaleRatio;
  repaired.typography.scaleRatio = clamp(
    ratioBefore,
    SYSTEM_SPEC.typography.minScaleRatio,
    SYSTEM_SPEC.typography.maxScaleRatio
  );
  track("typography.scaleRatio", `${ratioBefore}`, `${repaired.typography.scaleRatio}`, "clamped");

  const unitBefore = repaired.spacing.baseUnit;
  repaired.spacing.baseUnit = clamp(
    unitBefore,
    SYSTEM_SPEC.spacing.minBaseUnit,
    SYSTEM_SPEC.spacing.maxBaseUnit
  );
  track("spacing.baseUnit", `${unitBefore}`, `${repaired.spacing.baseUnit}`, "clamped");

  const isMutableKey = buildIsMutable(userConstraints);

  /* -------- ITERATIVE CONTRAST FIX -------- */

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const currentReport = validateTokens(repaired, userConstraints);
    const failing = currentReport.system.contrast
      .filter((item) => !item.ok)
      .sort((left, right) => {
        const leftRatio = ((left.details as ContrastItemDetails | undefined)?.ratio ?? 0);
        const rightRatio = ((right.details as ContrastItemDetails | undefined)?.ratio ?? 0);
        return leftRatio - rightRatio;
      });
    if (failing.length === 0) break;

    let anyChange = false;

    for (const item of failing) {
      const details = getContrastDetails(item);
      if (!details) continue;

      const keyA = details.pathA;
      const keyB = details.pathB;
      const repairTargets = orderedRepairTargets(keyA, keyB, isMutableKey);

      for (const repairTarget of repairTargets) {
        const before = getColor(repaired, repairTarget);
        const next = searchBestColorForKey(repaired, repairTarget, currentReport, threshold);

        if (next !== before) {
          setColor(repaired, repairTarget, next);
          const counterpart = repairTarget === keyA ? keyB : keyA;
          track(repairTarget, before, next, `contrast fix vs ${counterpart}`);
          anyChange = true;
          break;
        }
      }
    }

    if (!anyChange) break;
  }

  if (changes.length > 0) {
    repaired.meta.method = "generation+repair";
    repaired.meta.repairedAt = new Date().toISOString();
  }

  return { tokens: repaired, changes, diffs };
}
