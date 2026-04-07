"use client";

import styles from "@/app/components/theme-dashboard/themeDashboard.module.css";

export default function ComponentPreviewSection() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Component Preview</h2>
        <p>This mock UI consumes generated tokens so mood and contrast are visible before export.</p>
      </div>
      <div className={styles.componentPreview}>
        <div className={`${styles.componentCard} ${styles.componentStoryCard}`}>
          <div className={styles.storyHero}>
            <p className={styles.storyKicker}>Theme Snapshot</p>
            <h3>Night Collection Launch</h3>
            <p>
              Surfaces, borders, typography, and interaction colors all use generated variables from this run.
            </p>
            <div className={styles.componentActions}>
              <button className="btn" type="button">
                Primary Action
              </button>
              <button className={styles.secondaryButton} type="button">
                Secondary
              </button>
            </div>
          </div>

          <div className={styles.stateShowcase}>
            <div className={styles.stateRow}>
              <span>Primary states</span>
              <button className="btn" type="button">
                Default
              </button>
              <button className="btn is-hovered" type="button">
                Hover
              </button>
              <button className="btn is-active" type="button">
                Active
              </button>
            </div>
            <div className={styles.stateRow}>
              <span>Secondary states</span>
              <button className={styles.secondaryButton} type="button">
                Default
              </button>
              <button className={`${styles.secondaryButton} ${styles.isHovered}`} type="button">
                Hover
              </button>
              <button className={`${styles.secondaryButton} ${styles.isActive}`} type="button">
                Active
              </button>
            </div>
          </div>
        </div>

        <div className={styles.componentForm}>
          <label htmlFor="preview-input">Input Example</label>
          <input id="preview-input" placeholder="Token-driven input field" />
          <label htmlFor="preview-select">Select Example</label>
          <select id="preview-select" defaultValue="default">
            <option value="default">Default option</option>
            <option value="alternate">Alternate option</option>
          </select>
          <label htmlFor="preview-note">Supportive Copy</label>
          <textarea
            id="preview-note"
            rows={3}
            defaultValue="Use this preview to verify tonal direction and legibility."
          />
        </div>
      </div>
    </section>
  );
}
