import { SYSTEM_SPEC, contrastThreshold } from "@/logic/constraints/systemSpec";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { RepairDiff } from "@/logic/schema/generationReport.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { contrastRatio } from "@/logic/validate/color";
import { validateTokens } from "@/logic/validate/validateTokens";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import { adjustLightness, hexToRgb } from "@/logic/utilities/color";

type RepairResult = {
  tokens: DesignTokens;
  changes: string[];
  diffs: RepairDiff[];
};

const MAX_ITER = 10;
const STEP = 0.02;

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

/* ------------------ FIX PAIR ------------------ */

function fixPair(
  tokens: DesignTokens,
  keyA: string,
  keyB: string,
  threshold: number,
  isMutable: (key: string) => boolean
): boolean {
  let a = getColor(tokens, keyA);
  let b = getColor(tokens, keyB);
  let ratio = contrastRatio(a, b);

  if (ratio >= threshold) return false;

  const aMutable = isMutable(keyA);
  const bMutable = isMutable(keyB);
  if (!aMutable && !bMutable) return false;

  for (let i = 0; i < 40; i++) {
    const aLum = luminance(a);
    const bLum = luminance(b);

    if (aMutable) {
      a = adjustLightness(a, aLum > bLum ? -STEP : STEP);
      setColor(tokens, keyA, a);
    }

    if (bMutable) {
      b = adjustLightness(b, bLum > aLum ? -STEP : STEP);
      setColor(tokens, keyB, b);
    }

    const nextRatio = contrastRatio(a, b);
    if (nextRatio >= threshold) return true;
    if (nextRatio <= ratio && i > 0) {
      break;
    }

    ratio = nextRatio;
  }

  return contrastRatio(getColor(tokens, keyA), getColor(tokens, keyB)) >= threshold;
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
    const failing = currentReport.system.contrast.filter((item) => !item.ok);
    if (failing.length === 0) break;

    let anyChange = false;

    for (const item of failing) {
      const details = item.details as { pathA: string; pathB: string } | undefined;
      if (!details?.pathA || !details?.pathB) continue;

      const keyA = details.pathA;
      const keyB = details.pathB;
      const beforeA = getColor(repaired, keyA);
      const beforeB = getColor(repaired, keyB);

      const changed = fixPair(repaired, keyA, keyB, threshold, isMutableKey);

      if (changed) {
        const afterA = getColor(repaired, keyA);
        const afterB = getColor(repaired, keyB);

        track(keyA, beforeA, afterA, `contrast fix vs ${keyB}`);
        track(keyB, beforeB, afterB, `contrast fix vs ${keyA}`);

        anyChange = true;
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