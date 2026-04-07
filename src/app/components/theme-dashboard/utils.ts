import type { CssVarEntry } from "@/app/components/theme-dashboard/types";

export function orderByList(entries: CssVarEntry[], order: string[]) {
  const rank = new Map(order.map((name, index) => [name, index]));
  return [...entries].sort((a, b) => {
    const ai = rank.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bi = rank.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

export function label(name: string) {
  return name
    .replace(/^--/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function hexOrValue(input: string) {
  return /^#[0-9a-fA-F]{3,8}$/.test(input) ? input.toUpperCase() : input;
}
