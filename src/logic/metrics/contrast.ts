import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import { contrastRatio } from "@/logic/validate/color";
import { getByPath } from "@/logic/validate/path";
import { SYSTEM_SPEC, contrastThreshold } from "@/logic/constraints/systemSpec";

type ValidationItem = {
  id: string;
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
  severity: "info" | "warning" | "error";
};

export function evaluateContrastPairs(tokens: DesignTokens, constraints: UserConstraints): ValidationItem[] {
  const items: ValidationItem[] = [];
  const threshold = contrastThreshold(constraints.accessibilityTarget);

  for (const [pathA, pathB] of SYSTEM_SPEC.requiredContrastPairs) {
    const a = getByPath(tokens, pathA);
    const b = getByPath(tokens, pathB);

    if (typeof a !== "string" || typeof b !== "string") {
      items.push({
        id: `contrast:${pathA}-${pathB}`,
        ok: false,
        severity: "error",
        message: `Missing color(s) for contrast pair (${pathA}, ${pathB}).`,
      });
      continue;
    }

    const ratio = contrastRatio(a, b);
    const ok = ratio >= threshold;

    items.push({
      id: `contrast:${pathA}-${pathB}`,
      ok,
      severity: ok ? "info" : "error",
      message: ok
        ? `Contrast(${pathA}, ${pathB}) meets target (${ratio.toFixed(2)} >= ${threshold}).`
        : `Contrast(${pathA}, ${pathB}) does not meet target (${ratio.toFixed(2)} < ${threshold}).`,
      details: { a, b, ratio, threshold, pathA, pathB },
    });
  }

  return items;
}
