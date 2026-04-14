import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";

type ValidationItem = {
  id: string;
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
  severity: "info" | "warning" | "error";
};

export function evaluateAdherence(tokens: DesignTokens, constraints: UserConstraints): ValidationItem[] {
  const items: ValidationItem[] = [];
  const brandPrimary = constraints.brand.primary.toLowerCase();
  const brandSecondary = constraints.brand.secondary?.toLowerCase();
  const tokenPrimary = tokens?.colors?.brand?.primary?.toLowerCase();
  const tokenSecondary = tokens?.colors?.brand?.secondary?.toLowerCase();

  items.push({
    id: "user:brandPrimaryMatch",
    ok: tokenPrimary === brandPrimary,
    severity: tokenPrimary === brandPrimary ? "info" : "warning",
    message:
      tokenPrimary === brandPrimary
        ? "Primary token color matches user brand primary color exactly."
        : "Primary token does not exactly match the user brand primary color input. This will be treated as a soft preference.",
    details: { brandPrimary, tokenPrimary },
  });

  if (brandSecondary) {
    items.push({
      id: "user:brandSecondaryMatch",
      ok: tokenSecondary === brandSecondary,
      severity: tokenSecondary === brandSecondary ? "info" : "warning",
      message:
        tokenSecondary === brandSecondary
          ? "Secondary token color matches user brand secondary color exactly."
          : "Secondary token does not exactly match the user brand secondary color input. This will be treated as a soft preference.",
      details: { brandSecondary, tokenSecondary },
    });
  }

  items.push({
    id: "user:themeMode",
    ok: true,
    severity: "warning",
    message: `User theme mode preference is ${constraints.themeMode}. This is noted for downstream use in the preview component but does not affect token validation at this stage.`,
    details: { themeMode: constraints.themeMode },
  });

  return items;
}
