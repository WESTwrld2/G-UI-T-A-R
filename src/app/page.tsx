"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { GenerationReport, RepairDiff } from "@/logic/schema/generationReport.types";
import { userConstraintsSchema, type UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";
import CoreConstraintsSection from "@/app/components/constraints/CoreConstraintsSection";
import AdvancedConstraintsSection from "@/app/components/constraints/AdvancedConstraintsSection";
import styles from "@/app/components/constraints/constraintsForm.module.css";
import {
  CONSTRAINT_DRAFT_STORAGE_KEY,
  buildNormalizedConstraints,
  collectConstraintIssues,
  loadConstraintDraft,
} from "@/logic/utilities/constraintsForm";

export default function Home() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(true);
  const [draft] = useState(loadConstraintDraft);
  const [form, setForm] = useState<UserConstraints>(draft.form);
  const [styleTagsInput, setStyleTagsInput] = useState(draft.styleTagsInput);

  const issues = useMemo(() => collectConstraintIssues(form, styleTagsInput), [form, styleTagsInput]);

  function fieldError(path: string): string | null {
    if (!showValidation) return null;
    const issue = issues.find((entry) => entry.path === path || entry.path.startsWith(`${path}.`));
    return issue?.message ?? null;
  }

  useEffect(() => {
    try {
      localStorage.setItem(CONSTRAINT_DRAFT_STORAGE_KEY, JSON.stringify({ form, styleTagsInput }));
    } catch {
      // ignore localStorage errors
    }
  }, [form, styleTagsInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowValidation(true);
    setFormErrors([]);

    const normalized = buildNormalizedConstraints(form, styleTagsInput);
    const parsed = userConstraintsSchema.safeParse(normalized);

    if (!parsed.success) {
      setFormErrors(
        parsed.error.issues.map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`)
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const response = await res.json();
      if (!response.ok) {
        const apiIssues = Array.isArray(response.issues)
          ? response.issues.map((issue: { path?: string; message?: string }) =>
              `${issue.path ?? "form"}: ${issue.message ?? "Invalid value"}`
            )
          : [];
        setFormErrors(apiIssues.length > 0 ? apiIssues : [response.error ?? "Failed to generate theme"]);
        return;
      }

      setTheme({
        cssVars: response.cssVars as Record<string, string>,
        tokens: response.tokens as DesignTokens,
        constraints: parsed.data,
        themeDescriptionAssessment:
          (response.descriptionAssessment as ThemeDescriptionAssessment | null | undefined) ?? null,
        report: response.report as ValidationReport,
        generationReport: (response.generationReport as GenerationReport | undefined) ?? undefined,
        repair: response.repair as
          | { applied: boolean; changes: string[]; diffs?: RepairDiff[] }
          | undefined,
      });

      router.push("/preview");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setFormErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Generate UI Theme</h1>
      <p className={styles.intro}>
        Define your constraints first, then generate and export production-ready tokens.
      </p>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <CoreConstraintsSection form={form} setForm={setForm} fieldError={fieldError} />

        <AdvancedConstraintsSection
          form={form}
          setForm={setForm}
          styleTagsInput={styleTagsInput}
          setStyleTagsInput={setStyleTagsInput}
          fieldError={fieldError}
        />

        {formErrors.length > 0 && (
          <ul className={styles.errors} role="alert">
            {formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <button type="submit" disabled={isSubmitting} className={`btn ${styles.generateButton}`}>
          {isSubmitting ? "Generating Theme..." : "Generate Theme"}
        </button>
      </form>
    </div>
  );
}
