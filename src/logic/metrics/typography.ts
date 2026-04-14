import type { DesignTokens } from "@/logic/schema/tokens.types";
import { SYSTEM_SPEC } from "@/logic/constraints/systemSpec";

type ValidationItem = {
  id: string;
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
  severity: "info" | "warning" | "error";
};

export function evaluateTypography(tokens: DesignTokens): ValidationItem[] {
  const items: ValidationItem[] = [];
  const base = tokens.typography.baseFontSize;
  const ratio = tokens.typography.scaleRatio;

  const baseOk =
    base >= SYSTEM_SPEC.typography.minBaseFontSize &&
    base <= SYSTEM_SPEC.typography.maxBaseFontSize;

  items.push({
    id: "typography:baseFontSize",
    ok: baseOk,
    severity: baseOk ? "info" : "error",
    message: `Base font size ${base}px must be within [${SYSTEM_SPEC.typography.minBaseFontSize}px, ${SYSTEM_SPEC.typography.maxBaseFontSize}px].`,
    details: { base },
  });

  const ratioOk =
    ratio >= SYSTEM_SPEC.typography.minScaleRatio &&
    ratio <= SYSTEM_SPEC.typography.maxScaleRatio;

  items.push({
    id: "typography:scaleRatio",
    ok: ratioOk,
    severity: ratioOk ? "info" : "error",
    message: `Scale ratio ${ratio} must be within [${SYSTEM_SPEC.typography.minScaleRatio}, ${SYSTEM_SPEC.typography.maxScaleRatio}].`,
    details: { ratio },
  });

  return items;
}
