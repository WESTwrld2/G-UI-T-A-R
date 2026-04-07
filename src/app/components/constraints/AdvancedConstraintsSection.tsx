"use client";

import type { Dispatch, SetStateAction } from "react";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import {
  defaultFontNameForStyle,
} from "@/logic/utilities/constraintsForm";
import type { FieldErrorGetter } from "@/app/components/constraints/shared";
import styles from "@/app/components/constraints/constraintsForm.module.css";

type Props = {
  form: UserConstraints;
  setForm: Dispatch<SetStateAction<UserConstraints>>;
  styleTagsInput: string;
  setStyleTagsInput: Dispatch<SetStateAction<string>>;
  fieldError: FieldErrorGetter;
};

export default function AdvancedConstraintsSection({
  form,
  setForm,
  styleTagsInput,
  setStyleTagsInput,
  fieldError,
}: Props) {
  const fontNameError = fieldError("typography.fontFamily.name");
  const tagsError = fieldError("styleTags");

  return (
    <details className={`${styles.section} ${styles.advanced}`}>
      <summary>
        <span>Advanced Constraints</span>
        <small>Toggle optional controls for font, spacing, and interpretation hints</small>
      </summary>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="neutralPreference">Neutral Preference (Optional)</label>
          <select
            id="neutralPreference"
            value={form.brand.neutralPreference ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                brand: {
                  ...prev.brand,
                  neutralPreference:
                    e.target.value === "" ? undefined : (e.target.value as "cool" | "warm" | "neutral"),
                },
              }))
            }
            className={styles.select}
          >
            <option value="">None</option>
            <option value="cool">Cool</option>
            <option value="warm">Warm</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="fontStyle">Font Family Style</label>
          <select
            id="fontStyle"
            value={form.typography.fontFamily?.style ?? "sans-serif"}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                typography: {
                  ...prev.typography,
                  fontFamily: {
                    style: e.target.value as "serif" | "sans-serif" | "monospace",
                    name:
                      prev.typography.fontFamily?.name ??
                      defaultFontNameForStyle(e.target.value as "serif" | "sans-serif" | "monospace"),
                  },
                },
              }))
            }
            className={styles.select}
          >
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="monospace">Monospace</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="fontName">Font Name (Optional)</label>
          <input
            id="fontName"
            type="text"
            value={form.typography.fontFamily?.name ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                typography: {
                  ...prev.typography,
                  fontFamily: {
                    style: prev.typography.fontFamily?.style ?? "sans-serif",
                    name: e.target.value,
                  },
                },
              }))
            }
            placeholder="Arial, Georgia, Consolas..."
            aria-invalid={Boolean(fontNameError)}
            className={styles.input}
          />
          {fontNameError ? (
            <p className={styles.error}>{fontNameError}</p>
          ) : (
            <p className={styles.hint}>Leave blank to allow model/default resolution.</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="density">Spacing Density</label>
          <select
            id="density"
            value={form.spacing.density}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                spacing: {
                  density: e.target.value as "condensed" | "normal" | "spacious",
                },
              }))
            }
            className={styles.select}
          >
            <option value="condensed">Condensed</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="styleTags">Style Tags (comma-separated, optional)</label>
          <input
            id="styleTags"
            type="text"
            value={styleTagsInput}
            onChange={(e) => setStyleTagsInput(e.target.value)}
            placeholder="earthy, warm, nature"
            aria-invalid={Boolean(tagsError)}
            className={styles.input}
          />
          {tagsError ? (
            <p className={styles.error}>{tagsError}</p>
          ) : (
            <p className={styles.hint}>Up to 5 tags, each 2-24 characters.</p>
          )}
        </div>
      </div>
    </details>
  );
}
