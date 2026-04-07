"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { ThemeData } from "@/context/theme";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { GenerationReport, RepairDiff } from "@/logic/schema/generationReport.types";
import ThemeTokenDashboard from "@/app/components/themeTokenDashboard";
import ValidationReportComponent from "@/app/components/validationReport";
import GenerationReportPanel from "@/app/components/preview/GenerationReportPanel";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";
import { assessThemeDescription } from "@/logic/llm/themeDescriptionAssessment";
import styles from "@/app/preview/previewPage.module.css";

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

export default function PreviewPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const data = theme as ThemeData | null;
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);

  const generationReport = (data?.generationReport ?? null) as GenerationReport | null;

  const descriptionAssessment = useMemo(() => {
    if (!data) return null;
    return data.themeDescriptionAssessment ?? assessThemeDescription(data.constraints?.themeDescription);
  }, [data]);

  function goBackToConstraints() {
    router.push("/");
  }

  function exportThemeJson() {
    if (!data) return;
    downloadFile("theme.tokens.json", JSON.stringify(data.tokens, null, 2), "application/json");
  }

  function exportCssVars() {
    if (!data) return;
    const rootVars = Object.entries(data.cssVars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");
    downloadFile("theme.css", `:root {\n${rootVars}\n}\n`, "text/css");
  }

  async function regenerateTheme() {
    if (!data?.constraints) {
      setRegenerationError("Cannot regenerate because original constraints are not available.");
      return;
    }

    setRegenerationError(null);
    setIsRegenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.constraints),
      });

      const response = await res.json();
      if (!response.ok) {
        setRegenerationError(response.error ?? "Failed to regenerate theme.");
        return;
      }

      setTheme({
        cssVars: response.cssVars as Record<string, string>,
        tokens: response.tokens as DesignTokens,
        constraints: data.constraints,
        themeDescriptionAssessment:
          (response.descriptionAssessment as ThemeDescriptionAssessment | null | undefined) ?? null,
        report: response.report as ValidationReport,
        generationReport: (response.generationReport as GenerationReport | undefined) ?? undefined,
        repair: response.repair as
          | { applied: boolean; changes: string[]; diffs?: RepairDiff[] }
          | undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected regeneration error";
      setRegenerationError(message);
    } finally {
      setIsRegenerating(false);
    }
  }

  useEffect(() => {
    if (!data) router.replace("/");
  }, [data, router]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Final Theme Tokens</p>
          <h1>Design System Preview</h1>
          <p>
            Validate the generated look, inspect token behavior in context, and export ready-to-use files.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.backLink} type="button" onClick={goBackToConstraints}>
            Back to Constraints
          </button>
          <button
            className="btn-neutral"
            type="button"
            onClick={regenerateTheme}
            disabled={!data.constraints || isRegenerating}
            title={!data.constraints ? "Original constraints unavailable for regeneration" : undefined}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate Theme"}
          </button>
          <button className="btn-neutral" type="button" onClick={exportCssVars}>
            Export CSS Vars
          </button>
          <button className={`btn ${styles.primaryExport}`} type="button" onClick={exportThemeJson}>
            Export Tokens JSON
          </button>
        </div>
      </header>

      <GenerationReportPanel
        generationReport={generationReport}
        descriptionAssessment={descriptionAssessment}
      />

      {regenerationError && (
        <section className={styles.repairNotice}>
          <h3>Regeneration Notice</h3>
          <p>{regenerationError}</p>
        </section>
      )}

      <ThemeTokenDashboard cssVars={data.cssVars} tokens={data.tokens} />
      {data.report && <ValidationReportComponent report={data.report} />}
    </div>
  );
}
