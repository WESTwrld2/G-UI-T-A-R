"use client";

import { useMemo, useState } from "react";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import ColorPaletteSection from "@/app/components/theme-dashboard/ColorPaletteSection";
import ComponentPreviewSection from "@/app/components/theme-dashboard/ComponentPreviewSection";
import TypographySection from "@/app/components/theme-dashboard/TypographySection";
import SpacingSection from "@/app/components/theme-dashboard/SpacingSection";
import InventorySection from "@/app/components/theme-dashboard/InventorySection";
import { COLOR_GROUPS, COLOR_ORDER, FONT_SIZE_ORDER, SPACING_ORDER } from "@/app/components/theme-dashboard/config";
import { orderByList } from "@/app/components/theme-dashboard/utils";
import type { CssVarEntry } from "@/app/components/theme-dashboard/types";
import styles from "@/app/components/theme-dashboard/themeDashboard.module.css";

type Props = {
  cssVars: Record<string, string>;
  tokens: DesignTokens;
};

export default function ThemeTokenDashboard({ cssVars, tokens }: Props) {
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy filtered");

  const entries: CssVarEntry[] = useMemo(
    () => Object.entries(cssVars).map(([name, value]) => ({ name, value })),
    [cssVars]
  );

  const colorVars = useMemo(
    () =>
      orderByList(
        entries.filter((entry) => entry.name.startsWith("--color-") || entry.name.startsWith("--state-")),
        COLOR_ORDER
      ),
    [entries]
  );

  const fontSizes = useMemo(
    () => orderByList(entries.filter((entry) => entry.name.startsWith("--font-size-")), FONT_SIZE_ORDER),
    [entries]
  );

  const spacingVars = useMemo(
    () => orderByList(entries.filter((entry) => entry.name.startsWith("--spacing-")), SPACING_ORDER),
    [entries]
  );

  const colorGroups = useMemo(() => {
    return COLOR_GROUPS.map((group) => ({
      ...group,
      entries: group.names
        .map((name) => colorVars.find((entry) => entry.name === name))
        .filter((entry): entry is CssVarEntry => Boolean(entry)),
    })).filter((group) => group.entries.length > 0);
  }, [colorVars]);

  const filteredEntries = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((entry) => `${entry.name} ${entry.value}`.toLowerCase().includes(query));
  }, [entries, inventoryQuery]);

  const fontFamilyStack = cssVars["--font-family-base"] ?? tokens.typography.fontFamily;

  async function copyInventory() {
    const payload = filteredEntries.map((entry) => `${entry.name}: ${entry.value};`).join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy filtered"), 1800);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy filtered"), 1800);
    }
  }

  return (
    <div className={styles.dashboard}>
      <ColorPaletteSection colorGroups={colorGroups} />
      <ComponentPreviewSection />
      <TypographySection tokens={tokens} fontFamilyStack={fontFamilyStack} fontSizes={fontSizes} />
      <SpacingSection spacingVars={spacingVars} />
      <InventorySection
        tokens={tokens}
        filteredEntries={filteredEntries}
        inventoryQuery={inventoryQuery}
        copyLabel={copyLabel}
        onInventoryQueryChange={setInventoryQuery}
        onCopy={copyInventory}
      />
    </div>
  );
}
