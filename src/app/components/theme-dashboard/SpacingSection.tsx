"use client";

import type { CssVarEntry } from "@/app/components/theme-dashboard/types";
import styles from "@/app/components/theme-dashboard/themeDashboard.module.css";

type Props = {
  spacingVars: CssVarEntry[];
};

export default function SpacingSection({ spacingVars }: Props) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Spacing</h2>
        <p>Each scale value is shown as real layout gap and internal padding.</p>
      </div>
      <div className={styles.spacingContextGrid}>
        {spacingVars.map((entry) => (
          <div key={entry.name} className={styles.spaceContextCard}>
            <div className={styles.spaceContextHead}>
              <code>{entry.name}</code>
              <span>{entry.value}</span>
            </div>
            <div className={styles.spaceStackDemo} style={{ gap: `var(${entry.name})` }}>
              <div />
              <div />
              <div />
            </div>
            <div className={styles.spaceInsetDemo} style={{ padding: `var(${entry.name})` }}>
              <p>Inset sample</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
