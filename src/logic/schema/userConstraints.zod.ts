import {z} from 'zod';

export const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_STYLE_VALUES = ['serif', 'sans-serif', 'monospace'] as const;
const THEME_MODE_VALUES = ['light', 'dark'] as const;
const ACCESSIBILITY_VALUES = ['AA', 'AAA'] as const;
const SCALE_PRESET_VALUES = ['compact', 'balanced', 'expressive', 'loose'] as const;
const DENSITY_VALUES = ['condensed', 'normal', 'spacious'] as const;
const NEUTRAL_PREFERENCE_VALUES = ['cool', 'warm', 'neutral'] as const;

const fontFamilySchema = z.object({
    style: z.enum(FONT_STYLE_VALUES),
    name: z.string().min(2).max(80),
});

export const userConstraintsSchema = z.object({
    themeDescription: z.string().min(8).max(500).optional(),
    themeMode: z.enum(THEME_MODE_VALUES),
    accessibilityTarget: z.enum(ACCESSIBILITY_VALUES),
    brand: z.object({
        primary: z.string().regex(HEX_COLOR, 'Primary color must be a valid hex code like #004411 or #abc'),
        secondary: z.string().regex(HEX_COLOR, 'Secondary color must be a valid hex code like #004411 or #abc').optional(),
        neutralPreference: z.enum(NEUTRAL_PREFERENCE_VALUES).optional(),
    }),
    typography: z.object({
        baseFontSize: z.number().min(12).max(24),
        scalePreset: z.enum(SCALE_PRESET_VALUES),
        fontFamily: fontFamilySchema.optional(),
    }),
    spacing: z.object({
        density: z.enum(DENSITY_VALUES),
    }),
    styleTags: z.array(z.string().min(2).max(24)).max(5).optional(),
});

export type UserConstraints = z.infer<typeof userConstraintsSchema>;

export const constraintDraftSchema = z.object({
    themeDescription: z.string().trim().min(8).max(500),
    themeMode: z.enum(THEME_MODE_VALUES).optional(),
    accessibilityTarget: z.enum(ACCESSIBILITY_VALUES).optional(),
    brand: z.object({
        primary: z.string().regex(HEX_COLOR, 'Primary color must be a valid hex code like #004411 or #abc').optional(),
        secondary: z.string().regex(HEX_COLOR, 'Secondary color must be a valid hex code like #004411 or #abc').optional(),
        neutralPreference: z.enum(NEUTRAL_PREFERENCE_VALUES).optional(),
    }).default({}),
    typography: z.object({
        baseFontSize: z.number().min(12).max(24).optional(),
        scalePreset: z.enum(SCALE_PRESET_VALUES).optional(),
        fontFamily: z.object({
            style: z.enum(FONT_STYLE_VALUES).optional(),
            name: z.string().min(2).max(80).optional(),
        }).optional(),
    }).default({}),
    spacing: z.object({
        density: z.enum(DENSITY_VALUES).optional(),
    }).default({}),
    styleTags: z.array(z.string().min(2).max(24)).max(5).optional(),
});

export type ConstraintDraft = z.infer<typeof constraintDraftSchema>;

export type UserWarning = {
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
};

const presetToRatio: Record<UserConstraints['typography']['scalePreset'], number> = {
    compact: 1.125,
    balanced: 1.25,
    expressive: 1.333,
    loose: 1.5,
};

const densityToBaseUnit: Record<UserConstraints['spacing']['density'], number> = {
    condensed: 6,
    normal: 6, 
    spacious: 8, 
};

export function analyzeUserConstraints(input: UserConstraints): UserWarning[] {
    const warnings: UserWarning[] = [];

// Check for potential accessibility issues with color contrast
    if (input.accessibilityTarget === 'AAA') {
        warnings.push({
        code: 'AAA_STRICT',
        severity: 'info',
        message: 'You have selected AAA accessibility target, which is very strict. Some brand colors may require adjustments in derived tokens (e.g., button text color) to meet contrast requirements.',
        });
    }

// Check for potential issues with typography scale
    if (input.typography.baseFontSize === 12 && input.typography.scalePreset === 'expressive') {
        warnings.push({
            code: 'SMALL_FONT_SIZE',
            severity: 'warning',
            message: 'You have selected the minimum base font size (12px) with an expressive scale preset. This combination may result in small text that is harder to read. The system may clamp sizes to preserve legibility.',
        });
    }

    return warnings;
}

export function expandUserConstraints(input: UserConstraints) {
    return {
        ...input,
        derived: {
            typography: { 
                scaleRatio: presetToRatio[input.typography.scalePreset], 
            }, 
            spacing: { 
                baseUnit: densityToBaseUnit[input.spacing.density], 
            }, 
        },
    };
}
