import { HEX_COLOR } from "@/logic/schema/userConstraints.zod";

// Utility functions for color validation and contrast calculations
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (!HEX_COLOR.test(hex)) {
        throw new Error(`Invalid hex color: ${hex}`);
    }

    const raw = hex.slice(1);
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    const n = parseInt(full, 16);

    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
    };
}

// Linearize sRGB values for contrast calculations
function linearize(c: number): number {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Calculate relative luminance for a given hex color
export function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    const R = linearize(r);
    const G = linearize(g);
    const B = linearize(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Calculate contrast ratio between two hex colors
export function contrastRatio(hexA: string, hexB: string): number {
    const L1 = relativeLuminance(hexA);
    const L2 = relativeLuminance(hexB);

    //Determine which is lighter and which is darker for the contrast ratio formula
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}