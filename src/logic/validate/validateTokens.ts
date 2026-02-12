import Ajv, {ErrorObject} from "ajv";
import addFormats from "ajv-formats";
import tokensSchema from "@/logic/schema/tokens.schema.json";
import type {DesignTokens} from "@/logic/schema/tokens.types";
import type {UserConstraints} from "@/logic/schema/userConstraints.zod";
import {contrastRatio} from "@/logic/validate/color";import {SYSTEM_SPEC, contrastThreshold} from "@/logic/constraints/systemSpec"; 

export type ValidationItem = {
    id: string;
    ok: boolean;
    message: string;
    details?: Record<string, unknown>;
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

            for (const [colorAKey, colorBKey] of SYSTEM_SPEC.requiredContrastPairs) {
                const colorA = (safeTokens.colors as Record<string, unknown>)[colorAKey] as string | undefined; // Type assertion since we know the structure from the schema
                const colorB = (safeTokens.colors as Record<string, unknown>)[colorBKey] as string | undefined;

                if (!colorA || !colorB) {
                    contrastItems.push({
                        id: `contrast:${colorAKey}-${colorBKey}`,
                        ok: false,
                        message: `Missing color(s) for contrast pair (${colorAKey}, ${colorBKey}) `,
                    });
                    continue;
                }

                const ratio = contrastRatio(colorA, colorB);
                const ok = ratio >= threshold;

                contrastItems.push({
                    id: `contrast:${colorAKey}-${colorBKey}`,
                    ok, 
                    message: ok 
                    ? `Contrast(${colorAKey}, ${colorBKey}) meets target (${ratio.toFixed(2)} >= ${threshold}).`
                    : `Contrast(${colorAKey}, ${colorBKey}) does not meet target (${ratio.toFixed(2)} < ${threshold}).`,
                    details: {colorA, colorB, ratio, threshold, colorAKey, colorBKey},           
                });
            }

            // System: Typography checks
            const base = safeTokens.typography.baseFontSize;
            const ratio = safeTokens.typography.scaleRatio;

            typographyItems.push({
                id: "typography:baseFontSize",
                ok: base >= SYSTEM_SPEC.typography.minBaseFontSize && base <= SYSTEM_SPEC.typography.maxBaseFontSize,
                message: `Base font size ${base}px must be within [${SYSTEM_SPEC.typography.minBaseFontSize}px, ${SYSTEM_SPEC.typography.maxBaseFontSize}px].`,
                details: {base},
            });

            typographyItems.push({
                id: "typography:scaleRatio",
                ok: ratio >= SYSTEM_SPEC.typography.minScaleRatio && ratio <= SYSTEM_SPEC.typography.maxScaleRatio,
                message: `Scale ratio ${ratio} must be within [${SYSTEM_SPEC.typography.minScaleRatio}, ${SYSTEM_SPEC.typography.maxScaleRatio}].`,
                details: {ratio},
            });

            // System: Spacing checks
            const baseUnit = safeTokens.spacing.baseUnit;
            spacingItems.push({
                id: "spacing:baseUnit",
                ok: baseUnit >= SYSTEM_SPEC.spacing.minBaseUnit && baseUnit <= SYSTEM_SPEC.spacing.maxBaseUnit,
                message: `Base unit ${baseUnit}px must be within [${SYSTEM_SPEC.spacing.minBaseUnit}px, ${SYSTEM_SPEC.spacing.maxBaseUnit}px].`,
                details: {baseUnit},
            });

            if (SYSTEM_SPEC.spacing.monotonic) {
                const steps = SYSTEM_SPEC.spacing.steps;
                const values = steps.map((k) => (safeTokens.spacing.scale as Record<string, unknown>)[k] as number | undefined);

                const missing = values.some((v) => typeof v !== "number");
                if (missing) {
                    spacingItems.push({
                        id: "spacing:monotonic",
                        ok: false,
                        message: "Spacing scale is missing one or more required steps."
                    });
                } else {
                    let monoOk = true;
                    for (let i = 1; i < values.length; i++) {
                        if ((values[i] as number) <= (values[i - 1] as number)) monoOk = false;
                    }
                    spacingItems.push({
                        id: "spacing:monotonic",
                        ok: monoOk,
                        message: monoOk 
                        ? "Spacing scale is monotonic increasing." 
                        : "Spacing scale must be strictly increasing from xs to xl."
                    });
                }
            }
        }

        // User adherence checks (soft constraints)
        const brandPrimary = userConstraints.brand.primary.toLowerCase();
        const tokenPrimary = safeTokens?.colors.primary.toLowerCase();

        userAdherenceItems.push({
            id: "user:brandPrimaryMatch",
            ok: tokenPrimary === brandPrimary,
            message: 
                tokenPrimary === brandPrimary
                ? "Primary token color matches user brand primary color exactly."
                : "Primary token does not exactly match the user brand primary color. This will be treated as a soft preference",
            details: {brandPrimary, tokenPrimary},
        });

        userAdherenceItems.push({
            id: "user:themeMode",
            ok: true,
            message: `User theme mode preference is ${userConstraints.themeMode}. This is noted for downstream use in the preview component but does not affect token validation at this stage.`,
            details: {themeMode: userConstraints.themeMode},
        });

        const allSystemItems = [...contrastItems, ...typographyItems, ...spacingItems];
        const systemFailures = allSystemItems.filter(item => !item.ok).length;

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
        },
    };
}