"use client";

import type { ColorGroup } from "@/app/components/theme-dashboard/types";
import { hexOrValue, label } from "@/app/components/theme-dashboard/utils";
import styles from "@/app/components/theme-dashboard/themeDashboard.module.css";

type Props = {
  colorGroups: Array<ColorGroup & { entries: Array<{ name: string; value: string }> }>;
};

export default function ColorPaletteSection({ colorGroups }: Props) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Color Palette</h2>
        <p>Grouped by role so you can scan backgrounds, text, and interaction states quickly.</p>
      </div>

      {colorGroups.map((group) => (
        <div key={group.title} className={styles.colorGroupBlock}>
          <div className={styles.colorGroupHead}>
            <h3>{group.title}</h3>
            <span>{group.role}</span>
          </div>
          <div className={styles.colorGrid}>
            {group.entries.map((entry) => (
              <article key={entry.name} className={styles.swatchCard}>
                <div className={styles.swatchPreview} style={{ background: entry.value }}>
                  <span>{hexOrValue(entry.value)}</span>
                </div>
                <div className={styles.swatchMeta}>
                  <strong>{label(entry.name)}</strong>
                  <code>{entry.name}</code>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
