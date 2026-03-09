import Ajv, {ErrorObject} from "ajv";
import addFormats from "ajv-formats";
import tokensSchema from "@/logic/schema/tokens.schema.json";
import type {DesignTokens} from "@/logic/schema/tokens.types";
import type {UserConstraints} from "@/logic/schema/userConstraints.zod";
import {contrastRatio} from "@/logic/validate/color";
import {getByPath} from "@/logic/validate/path";
import {SYSTEM_SPEC, contrastThreshold} from "@/logic/constraints/systemSpec"; 

export type ValidationItem = {
    id: string;
    ok: boolean;
    message: string;
    details?: Record<string, unknown>;
    severity: "info" | "warning" | "error";
};

export type ValidationReport = {
    schema: {
        ok: boolean;
        errors: Array<{path: string; message: string}>;
    };
    system: {
        contrast: ValidationItem[];
        typography: ValidationItem[]; 
        spacing: ValidationItem[];
    };
    userAdherence: {
        items: ValidationItem[];
    };
    summary: {
        systemPass: boolean;
        systemFailures: number;
        repairable: boolean; // Indicates if failures are potentially repairable based on their IDs (e.g., contrast, typography, spacing issues might be repairable, while schema errors are not)
    };
};

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

const validateSchema = ajv.compile(tokensSchema as Record<string, unknown>);

function ajvErrorstoSimple(errors: ErrorObject[] | null | undefined) {
    if (!errors) return [];
    return errors.map(err => ({
        path: err.instancePath || err.schemaPath,
        message: err.message ?? "Schema error",
    }));
}

function isRepairableSystemFailure(item: ValidationItem): boolean {
  // Keep conservative: contrast/typography/spacing are repairable
  return (
    item.id.startsWith("contrast:") ||
    item.id.startsWith("typography:") ||
    item.id.startsWith("spacing:")
  );
}

export function validateTokens(
    tokens: DesignTokens,
    userConstraints: UserConstraints): ValidationReport {
        const schemaOk = validateSchema(tokens);const schemaErrors = ajvErrorstoSimple(validateSchema.errors); 

        const safeTokens = (schemaOk ? tokens : null) as DesignTokens | null; // If schema validation fails, we won't crash. A structured report of schema errors will be returned, and system/user validations will be skipped since they depend on valid tokens.

        const contrastItems: ValidationItem[] = [];
        const typographyItems: ValidationItem[] = [];
        const spacingItems: ValidationItem[] = [];
        const userAdherenceItems: ValidationItem[] = [];

        if (safeTokens) {
            // System-level validations
            const threshold = contrastThreshold(userConstraints.accessibilityTarget);

            for (const [pathA, pathB] of SYSTEM_SPEC.requiredContrastPairs) {
                const a = getByPath(safeTokens, pathA);
                const b = getByPath(safeTokens, pathB);

                if (typeof a !== "string" || typeof b !== "string") {
                    contrastItems.push({
                        id: `contrast:${pathA}-${pathB}`,
                        ok: false,
                        severity: "error",
                        message: `Missing color(s) for contrast pair (${pathA}, ${pathB}) `,
                    });
                    continue;
                }

                const ratio = contrastRatio(a, b);
                const ok = ratio >= threshold;

                contrastItems.push({
                    id: `contrast:${pathA}-${pathB}`,
                    ok, 
                    severity: ok ? "info" : "error", // failing contrast is error
                    message: ok 
                    ? `Contrast(${pathA}, ${pathB}) meets target (${ratio.toFixed(2)} >= ${threshold}).`
                    : `Contrast(${pathA}, ${pathB}) does not meet target (${ratio.toFixed(2)} < ${threshold}).`,
                    details: {a, b, ratio, threshold, pathA, pathB},           
                });      
            }

            // System: Typography checks
            const base = safeTokens.typography.baseFontSize;
            const ratio = safeTokens.typography.scaleRatio;

            const baseOk = base >= SYSTEM_SPEC.typography.minBaseFontSize && base <= SYSTEM_SPEC.typography.maxBaseFontSize;
 
            typographyItems.push({
                id: "typography:baseFontSize",
                ok: baseOk,
                severity: baseOk ? "info" : "error",
                message: `Base font size ${base}px must be within [${SYSTEM_SPEC.typography.minBaseFontSize}px, ${SYSTEM_SPEC.typography.maxBaseFontSize}px].`,
                details: {base},
            });

            const ratioOk = ratio >= SYSTEM_SPEC.typography.minScaleRatio && ratio <= SYSTEM_SPEC.typography.maxScaleRatio;
  
            typographyItems.push({
                id: "typography:scaleRatio",
                ok: ratioOk,
                severity: ratioOk ? "info" : "error",
                message: `Scale ratio ${ratio} must be within [${SYSTEM_SPEC.typography.minScaleRatio}, ${SYSTEM_SPEC.typography.maxScaleRatio}].`,
                details: {ratio},
            });

            // System: Spacing checks
            const baseUnit = safeTokens.spacing.baseUnit; // updated to match the new schema field name
            const unitOk = baseUnit >= SYSTEM_SPEC.spacing.minBaseUnit && baseUnit <= SYSTEM_SPEC.spacing.maxBaseUnit;
  
            spacingItems.push({
                id: "spacing:baseUnit",
                ok: unitOk,
                severity: unitOk ? "info" : "error",
                message: `Base unit ${baseUnit}px must be within [${SYSTEM_SPEC.spacing.minBaseUnit}px, ${SYSTEM_SPEC.spacing.maxBaseUnit}px].`,
                details: {baseUnit},
            });
        }

        // User adherence checks (soft constraints)
        const brandPrimary = userConstraints.brand.primary.toLowerCase();
        const brandSecondary = userConstraints.brand.secondary?.toLowerCase();
        // be defensive: if schema failed safeTokens may be null or missing fields,
        // optional-chaining on each segment avoids runtime errors.
        const tokenPrimary = safeTokens?.colors?.brand?.primary?.toLowerCase();
        const tokenSecondary = safeTokens?.colors?.brand?.secondary?.toLowerCase();

        userAdherenceItems.push({
            id: "user:brandPrimaryMatch",
            ok: tokenPrimary === brandPrimary,
            severity: tokenPrimary === brandPrimary ? "info" : "warning", // exact match is a warning (good but not critical), mismatch is an error (important for brand consistency)
            message: 
                tokenPrimary === brandPrimary
                ? "Primary token color matches user brand primary color exactly."
                : "Primary token does not exactly match the user brand primary color input. This will be treated as a soft preference",
            details: {brandPrimary, tokenPrimary},
        });

        if (brandSecondary) {
            userAdherenceItems.push({
                id: "user:brandSecondaryMatch",
                ok: tokenSecondary === brandSecondary,
                severity: tokenSecondary === brandSecondary ? "info" : "warning",
                message:
                    tokenSecondary === brandSecondary
                    ? "Secondary token color matches user brand secondary color exactly."
                    : "Secondary token does not exactly match the user brand secondary color input. This will be treated as a soft preference",
                details: {brandSecondary, tokenSecondary},
            });
        }

        userAdherenceItems.push({
            id: "user:themeMode",
            ok: true,
            severity: "warning", // User theme mode preference is noted but does not affect token validation, so it's a warning for downstream components to consider.
            message: `User theme mode preference is ${userConstraints.themeMode}. This is noted for downstream use in the preview component but does not affect token validation at this stage.`,
            details: {themeMode: userConstraints.themeMode},
        });

        const allSystemItems = [...contrastItems, ...typographyItems, ...spacingItems];
        const systemFailures = allSystemItems.filter(item => !item.ok).length;
        const repairable = schemaOk && allSystemItems.filter(item => !item.ok).every(isRepairableSystemFailure);

    return {
        schema: {
            ok: !!schemaOk,
            errors: schemaErrors,
        },
        system: {
            contrast: contrastItems,
            typography: typographyItems,
            spacing: spacingItems,
        },
        userAdherence: {
            items: userAdherenceItems,
        },
        summary: {
            systemPass: !!schemaOk && systemFailures === 0,
            systemFailures,
            repairable,
        },
    };
}
