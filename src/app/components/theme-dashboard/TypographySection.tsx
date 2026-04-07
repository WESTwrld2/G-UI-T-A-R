"use client";

import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { CssVarEntry } from "@/app/components/theme-dashboard/types";
import styles from "@/app/components/theme-dashboard/themeDashboard.module.css";

type Props = {
  tokens: DesignTokens;
  fontFamilyStack: string;
  fontSizes: CssVarEntry[];
};

export default function TypographySection({ tokens, fontFamilyStack, fontSizes }: Props) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Typography</h2>
        <p>Contextual type preview first, token-level scale details second.</p>
      </div>
      <div className={styles.typoMeta}>
        <div>
          <span>Font Name</span>
          <strong>{tokens.typography.fontFamily}</strong>
        </div>
        <div>
          <span>Preview Stack</span>
          <strong>{fontFamilyStack}</strong>
        </div>
        <div>
          <span>Base Size</span>
          <strong>{tokens.typography.baseFontSize}px</strong>
        </div>
        <div>
          <span>Scale Ratio</span>
          <strong>{tokens.typography.scaleRatio}</strong>
        </div>
      </div>

      <div className={styles.typeContextStack}>
        <div className={styles.typeContextRow}>
          <p style={{ fontSize: "var(--font-size-h1)" }}>Heading Level One</p>
          <code>--font-size-h1</code>
        </div>
        <div className={styles.typeContextRow}>
          <p style={{ fontSize: "var(--font-size-h2)" }}>Section Heading for Key Content</p>
          <code>--font-size-h2</code>
        </div>
        <div className={styles.typeContextRow}>
          <p style={{ fontSize: "var(--font-size-md)" }}>
            Body copy should carry most of the interface information and remain readable at a glance.
          </p>
          <code>--font-size-md</code>
        </div>
        <div className={styles.typeContextRow}>
          <p style={{ fontSize: "var(--font-size-sm)" }}>Caption or helper text for secondary details.</p>
          <code>--font-size-sm</code>
        </div>
      </div>

      <div className={styles.typeScale}>
        {fontSizes.map((entry) => (
          <div key={entry.name} className={styles.typeRow}>
            <code>{entry.name}</code>
            <p className={styles.typeSample} style={{ fontSize: `var(${entry.name})` }}>
              Sphinx of black quartz, judge my vow.
            </p>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
