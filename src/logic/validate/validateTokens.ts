import Ajv, {ErrorObject} from "ajv";
import addFormats from "ajv-formats";
import tokensSchema from "@/logic/schema/tokens.schema.json";
import type {DesignTokens} from "@/logic/schema/tokens.types";
import type {UserConstraints} from "@/logic/schema/userConstraints.zod";
import {SYSTEM_SPEC} from "@/logic/constraints/systemSpec";
import { evaluateContrastPairs } from "@/logic/metrics/contrast";
import { evaluateTypography } from "@/logic/metrics/typography";
import { evaluateAdherence } from "@/logic/metrics/adherence";

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

        if (safeTokens) {
            contrastItems.push(...evaluateContrastPairs(safeTokens, userConstraints));
            typographyItems.push(...evaluateTypography(safeTokens));

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

        const userAdherenceItems = evaluateAdherence(tokens, userConstraints);

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
