export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

export function hexToRgb(hex: `#${string}`): RGB {
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): `#${string}` {
  const toHex = (value: number) => {
    const safe = Math.max(0, Math.min(255, Math.round(value)));
    return safe.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}` as `#${string}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

export function adjustLightness(hex: `#${string}`, delta: number): `#${string}` {
  const hsl = rgbToHsl(hexToRgb(hex));
  const next = { ...hsl, l: Math.max(0, Math.min(1, hsl.l + delta)) };
  const rgb = hslToRgb(next);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function mixHex(a: `#${string}`, b: `#${string}`, ratio: number): `#${string}` {
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  return rgbToHex(
    aa.r * (1 - ratio) + bb.r * ratio,
    aa.g * (1 - ratio) + bb.g * ratio,
    aa.b * (1 - ratio) + bb.b * ratio
  );
}
