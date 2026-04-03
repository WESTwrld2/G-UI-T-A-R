"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { ThemeData } from "@/context/theme";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { GenerationReport } from "@/logic/schema/generationReport.types";
import ThemeTokenDashboard from "@/app/components/themeTokenDashboard";
import ValidationReportComponent from "@/app/components/validationReport";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";
import { assessThemeDescription } from "@/logic/llm/themeDescriptionAssessment";

export default function PreviewPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const data = theme as ThemeData | null; // theme is already maintained by provider
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const generationReport = (data?.generationReport ?? null) as GenerationReport | null;

  const descriptionAssessment = useMemo(() => {
    if (!data) return null;
    return data.themeDescriptionAssessment ?? assessThemeDescription(data.constraints?.themeDescription);
  }, [data]);

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

  function exportThemeJson() {
    if (!data) return;
    downloadFile("theme.tokens.json", JSON.stringify(data.tokens, null, 2), "application/json");
  }

  function exportCssVars() {
    if (!data) return;
    const rootVars = Object.entries(data.cssVars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");
    const css = `:root {\n${rootVars}\n}\n`;
    downloadFile("theme.css", css, "text/css");
  }

  function goBackToConstraints() {
    router.push("/");
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
        generationReport:
          (response.generationReport as GenerationReport | undefined) ?? undefined,
        repair: response.repair as { applied: boolean; changes: string[] } | undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected regeneration error";
      setRegenerationError(message);
    } finally {
      setIsRegenerating(false);
    }
  }

  // if someone lands here without a theme, send them back to start
  useEffect(() => {
    if (!data) {
      router.replace("/");
    }
  }, [data, router]);

  if (!data) return <div>Loading...</div>; // navigating away

  return (
    <div className="preview-shell">
      <header className="preview-header">
        <div>
          <p className="preview-kicker">Final Theme Tokens</p>
          <h1>Design System Preview</h1>
          <p>
            Inspect your complete palette, typography, spacing, and component behavior before export.
          </p>
        </div>
        <div className="preview-actions">
          <button className="btn-neutral" type="button" onClick={goBackToConstraints}>
            Back to Constraints
          </button>
          <button
            className="btn"
            type="button"
            onClick={regenerateTheme}
            disabled={!data.constraints || isRegenerating}
            title={!data.constraints ? "Original constraints unavailable for regeneration" : undefined}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate Theme"}
          </button>
          <button className="btn" type="button" onClick={exportThemeJson}>
            Export Tokens JSON
          </button>
          <button className="btn" type="button" onClick={exportCssVars}>
            Export CSS Vars
          </button>
        </div>
      </header>

      {(descriptionAssessment || generationReport) && (
        <section className="preview-description-fit preview-generation-report">
          <h3>Generation Report</h3>

          {generationReport?.inferred?.length ? (
            <div>
              <strong>Inferred values</strong>
              <ul>
                {generationReport.inferred.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {generationReport?.defaults?.length ? (
            <div>
              <strong>Defaults used</strong>
              <ul>
                {generationReport.defaults.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {generationReport?.repairs?.length ? (
            <div>
              <strong>Repairs applied</strong>
              <ul>
                {generationReport.repairs.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {generationReport?.sources?.length ? (
            <details>
              <summary title="Shows token path + source for each assigned value in this generation">Sources (token origin)</summary>
              <p style={{ marginTop: '6px', fontSize: '0.9rem', color: 'var(--color-neutral-text-secondary)' }}>
                This list explains where key values came from: user input, LLM suggestion, derived defaults, or repair.
              </p>
              <ul className="preview-source-list">
                {generationReport.sources.map((item) => (
                  <li key={`${item.path}-${item.source}-${item.detail ?? ""}`}>
                    <code>{item.path}</code>
                    <span>{item.source}</span>
                    {item.detail ? <small>{item.detail}</small> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {descriptionAssessment ? (
            <>
              <strong>Theme description fit</strong>
          <p>{descriptionAssessment.guidance}</p>

          {descriptionAssessment.supportedSignals.length > 0 ? (
            <ul>
              {descriptionAssessment.supportedSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>
              The description is still sent to the LLM, but no clear mapped signals were detected.
            </p>
          )}

          {descriptionAssessment.unsupportedSignals.length > 0 && (
            <div className="preview-description-limitations">
              <strong>Not directly enforceable yet:</strong>
              <ul>
                {descriptionAssessment.unsupportedSignals.map((item) => (
                  <li key={item.request}>
                    <span>{item.request}:</span> {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
            </>
          ) : null}
        </section>
      )}

      {regenerationError && (
        <section className="preview-repair">
          <h3>Regeneration Notice</h3>
          <p>{regenerationError}</p>
        </section>
      )}

      <ThemeTokenDashboard cssVars={data.cssVars} tokens={data.tokens} />
      {data.report && <ValidationReportComponent report={data.report} />}
    </div>
  );
}
