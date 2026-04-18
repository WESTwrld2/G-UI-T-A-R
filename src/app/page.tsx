"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { constraintDraftSchema, type ConstraintDraft } from "@/logic/schema/userConstraints.zod";
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

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(true);
  const [draft] = useState(loadConstraintDraft);
  const [form, setForm] = useState<ConstraintDraft>(draft.form);
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
    const parsed = constraintDraftSchema.safeParse(normalized);

    if (!parsed.success) {
      setFormErrors(
        parsed.error.issues.map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`)
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/constraints", {
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
        setFormErrors(apiIssues.length > 0 ? apiIssues : [response.error ?? "Failed to validate constraints"]);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("validatedConstraints.v1", JSON.stringify(response.userConstraints));
      }

      router.push("/generate");
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
        Start with a description. Any constraint you leave blank will be inferred from that prompt before generation.
      </p>

      {form.themeDescription.trim().length >= 8 && (
        <section className={styles.autoNotice}>
          <strong>Description-first mode is active.</strong>
          <span>
            The system will resolve any blank fields from your theme description before generation. The
            resolved version is what gets sent forward.
          </span>
        </section>
      )}

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
          {isSubmitting ? "Validating…" : "Submit constraints"}
        </button>
      </form>
    </div>
  );
}
