"use client";

import type { ConstraintSectionProps } from "@/app/components/constraints/shared";
import { toColorPickerValue } from "@/logic/utilities/constraintsForm";
import styles from "@/app/components/constraints/constraintsForm.module.css";

export default function CoreConstraintsSection({
  form,
  setForm,
  fieldError,
}: ConstraintSectionProps) {
  const descriptionError = fieldError("themeDescription");
  const primaryError = fieldError("brand.primary");
  const secondaryError = fieldError("brand.secondary");
  const baseFontError = fieldError("typography.baseFontSize");

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Core Constraints</h2>

      <label htmlFor="themeDescription">Theme Description</label>
      <textarea
        id="themeDescription"
        rows={4}
        value={form.themeDescription}
        onChange={(e) => setForm((prev) => ({ ...prev, themeDescription: e.target.value }))}
        aria-invalid={Boolean(descriptionError)}
        className={styles.textarea}
      />
      {descriptionError ? (
        <p className={styles.error}>{descriptionError}</p>
      ) : (
        <p className={styles.hint}>Describe mood, contrast intent, and accent direction in one sentence.</p>
      )}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="themeMode">Theme Mode</label>
          <select
            id="themeMode"
            value={form.themeMode}
            onChange={(e) => setForm((prev) => ({ ...prev, themeMode: e.target.value as "light" | "dark" }))}
            className={styles.select}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="accessibilityTarget">Accessibility Target</label>
          <select
            id="accessibilityTarget"
            value={form.accessibilityTarget}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, accessibilityTarget: e.target.value as "AA" | "AAA" }))
            }
            className={styles.select}
          >
            <option value="AA">AA</option>
            <option value="AAA">AAA</option>
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="brandPrimaryHex">Brand Primary</label>
          <div className={styles.colorFieldControls}>
            <input
              type="color"
              value={toColorPickerValue(form.brand.primary)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, primary: e.target.value },
                }))
              }
              className={`${styles.input} ${styles.colorPicker}`}
              aria-label="Brand primary color picker"
            />
            <input
              id="brandPrimaryHex"
              type="text"
              value={form.brand.primary}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, primary: e.target.value.trim() || "#" },
                }))
              }
              placeholder="#E4B424"
              spellCheck={false}
              aria-label="Brand primary hex value"
              aria-invalid={Boolean(primaryError)}
              className={`${styles.input} ${styles.colorHexInput}`}
            />
          </div>
          {primaryError ? (
            <p className={styles.error}>{primaryError}</p>
          ) : (
            <p className={styles.hint}>Current value: {form.brand.primary}</p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="brandSecondaryHex">Brand Secondary</label>
          <div className={styles.colorFieldControls}>
            <input
              type="color"
              value={toColorPickerValue(form.brand.secondary ?? "#000000")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, secondary: e.target.value },
                }))
              }
              className={`${styles.input} ${styles.colorPicker}`}
              aria-label="Brand secondary color picker"
            />
            <input
              id="brandSecondaryHex"
              type="text"
              value={form.brand.secondary ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, secondary: e.target.value.trim() || "#" },
                }))
              }
              placeholder="#6A994E"
              spellCheck={false}
              aria-label="Brand secondary hex value"
              aria-invalid={Boolean(secondaryError)}
              className={`${styles.input} ${styles.colorHexInput}`}
            />
          </div>
          {secondaryError ? (
            <p className={styles.error}>{secondaryError}</p>
          ) : (
            <p className={styles.hint}>Current value: {form.brand.secondary ?? "None"}</p>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="baseFontSize">Base Font Size</label>
          <div className={styles.inputWithSuffix}>
            <input
              id="baseFontSize"
              type="number"
              value={form.typography.baseFontSize}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  typography: {
                    ...prev.typography,
                    baseFontSize: Number(e.target.value),
                  },
                }))
              }
              min={10}
              max={24}
              aria-invalid={Boolean(baseFontError)}
              className={styles.input}
            />
            <span className={styles.suffix}>px</span>
          </div>
          {baseFontError ? (
            <p className={styles.error}>{baseFontError}</p>
          ) : (
            <p className={styles.hint}>Allowed range: 10-24px.</p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="scalePreset">Scale Preset</label>
          <select
            id="scalePreset"
            value={form.typography.scalePreset}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                typography: {
                  ...prev.typography,
                  scalePreset: e.target.value as "compact" | "balanced" | "expressive" | "loose",
                },
              }))
            }
            className={styles.select}
          >
            <option value="balanced">Balanced</option>
            <option value="compact">Compact</option>
            <option value="expressive">Expressive</option>
            <option value="loose">Loose</option>
          </select>
        </div>
      </div>
    </section>
  );
}
