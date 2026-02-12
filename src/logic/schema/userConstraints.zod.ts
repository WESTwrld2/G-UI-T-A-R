import {z} from 'zod';

export const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const userConstraintsSchema = z.object({
    themeMode: z.enum(['light', 'dark']),
    accessibilityTarget: z.enum(['AA', 'AAA']),
    brand: z.object({
        primary: z.string().regex(HEX_COLOR, 'Primary color must be a valid hex code like #004411 or #abc'),
        secondary: z.string().regex(HEX_COLOR, 'Secondary color must be a valid hex code like #004411 or #abc').optional(),
        neutralPreference: z.enum(['cool', 'warm', 'neutral']).optional(),
    }),
    typography: z.object({
        baseFontSize: z.number().min(10).max(24),
        scalePreset: z.enum(['compact', 'balanced', 'expressive', 'loose']),
        fontFamily: z.object({style: z.enum(['serif', 'sans-serif', 'monospace']), name: z.string().min(2).max(80)}).optional(),
    }),
    spacing: z.object({
        density: z.enum(['condensed', 'normal', 'spacious']),
    }),
    styleTags: z.array(z.string().min(2).max(24)).max(5).optional(),
});

export type UserConstraints = z.infer<typeof userConstraintsSchema>;

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
    condensed: 4, 
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
    if (input.typography.baseFontSize === 10 && input.typography.scalePreset === 'expressive') {
        warnings.push({
            code: 'SMALL_FONT_SIZE',
            severity: 'warning',
            message: 'You have selected the minimum base font size (10px) with an expressive scale preset. This combination may result in very small text that is hard to read. The system may clamp sizes to preserve legibility.',
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