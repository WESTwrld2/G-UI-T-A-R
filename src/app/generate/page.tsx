"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { GenerationReport, RepairDiff } from "@/logic/schema/generationReport.types";
import { ensureGoogleFontLoaded, type FontStyle } from "@/logic/llm/googleFonts";
import type { RunHistorySummary } from "@/logic/history/runHistory.types";
import styles from "./generatePage.module.css";

const VALIDATED_CONSTRAINTS_STORAGE_KEY = "validatedConstraints.v1";

type RepairState = {
  applied: boolean;
  changes: string[];
  diffs?: RepairDiff[];
};

export default function GeneratePage() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const [constraints, setConstraints] = useState<UserConstraints | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [generatedTokens, setGeneratedTokens] = useState<DesignTokens | null>(null);
  const [cssVars, setCssVars] = useState<Record<string, string> | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [generationReport, setGenerationReport] = useState<GenerationReport | null>(null);
  const [repairState, setRepairState] = useState<RepairState | null>(null);
  const [run, setRun] = useState<RunHistorySummary | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(VALIDATED_CONSTRAINTS_STORAGE_KEY);
    if (raw) {
      try {
        setConstraints(JSON.parse(raw));
      } catch {
        setConstraints(null);
      }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!constraints) {
      router.replace("/");
    }
  }, [constraints, isReady, router]);

  useEffect(() => {
    if (!generatedTokens || !constraints) return;
    ensureGoogleFontLoaded(
      generatedTokens.typography.fontFamily,
      (constraints.typography.fontFamily?.style ?? "sans-serif") as FontStyle
    );
  }, [constraints, generatedTokens]);

  const providerItems = useMemo(
    () => [
      { id: "openai", label: "OpenAI", enabled: true },
      { id: "gemini", label: "Gemini", enabled: false },
      { id: "local", label: "Local model", enabled: false },
    ],
    []
  );

  const previewCardStyle = useMemo(
    () => (cssVars ? ({ ...cssVars } as CSSProperties) : undefined),
    [cssVars]
  );

  const canRepair = Boolean(
    constraints &&
      generatedTokens &&
      report &&
      report.summary.repairable &&
      !report.summary.systemPass
  );

  async function generateTheme() {
    if (!constraints) return;
    setGenerationError(null);
    setIsGenerating(true);
    setRawResponse(null);
    setGeneratedTokens(null);
    setCssVars(null);
    setReport(null);
    setGenerationReport(null);
    setRepairState(null);
    setRun(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userConstraints: constraints, provider }),
      });
      const json = await res.json();
      if (!json.ok) {
        const issueText = Array.isArray(json.issues)
          ? json.issues
              .map((issue: { path?: string; message?: string }) =>
                `${issue.path ?? "form"}: ${issue.message ?? "Invalid value"}`
              )
              .join("\n")
          : json.error ?? "Failed to generate theme.";
        setGenerationError(issueText);
        return;
      }

      setRawResponse(json.rawModelResponse ?? "");
      setGeneratedTokens(json.tokens);
      setCssVars(json.cssVars ?? {});
      setReport(json.report ?? null);
      setGenerationReport(json.generationReport ?? null);
      setRepairState(null);
      setRun(json.run ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected generation error";
      setGenerationError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function repairTheme() {
    if (!constraints || !generatedTokens || report?.summary.systemPass) return;
    setGenerationError(null);
    setIsRepairing(true);

    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userConstraints: constraints, tokens: generatedTokens, runId: run?.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        setGenerationError(json.error ?? "Failed to repair theme.");
        return;
      }

      setGeneratedTokens(json.tokens);
      setCssVars(json.cssVars ?? cssVars ?? {});
      setReport(json.report ?? report ?? null);
      setRepairState(json.repair ?? null);
      setRun(json.run ?? run ?? null);
      setGenerationReport((current) =>
        current
          ? {
              ...current,
              repairs: json.repair?.changes ?? [],
              repairDiffs: json.repair?.diffs ?? [],
            }
          : current
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected repair error";
      setGenerationError(message);
    } finally {
      setIsRepairing(false);
    }
  }

  function proceedToPreview() {
    if (!constraints || !generatedTokens || !cssVars) return;

    setTheme({
      constraints,
      cssVars,
      tokens: generatedTokens,
      report: report ?? undefined,
      generationReport: generationReport ?? undefined,
      run: run ?? undefined,
      repair: repairState ?? undefined,
    });

    router.push("/preview");
  }

  if (!isReady || !constraints) {
    return <div>Loading validated constraints...</div>;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <p className={styles.kicker}>Step 2: Generate Theme</p>
        <h1>Review constraints and generate with LLM</h1>
        <p>
          Select a provider, generate the theme output, and inspect the direct LLM response before you proceed to preview.
        </p>
      </div>

      <section className={styles.constraintsCard}>
        <h2 className={styles.sectionTitle}>Validated constraints</h2>
        <ul className={styles.summaryList}>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Theme description</span>
            <span>{constraints.themeDescription ?? "No description provided"}</span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Mode</span>
            <span>{constraints.themeMode}</span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Accessibility</span>
            <span>{constraints.accessibilityTarget}</span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Brand primary</span>
            <span>{constraints.brand.primary}</span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Brand secondary</span>
            <span>{constraints.brand.secondary ?? "Auto-derived"}</span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Typography</span>
            <span>
              {constraints.typography.fontFamily?.name ?? "Default font"}, {constraints.typography.scalePreset}, {constraints.typography.baseFontSize}px
            </span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Spacing density</span>
            <span>{constraints.spacing.density}</span>
          </li>
          <li className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Style tags</span>
            <span>{(constraints.styleTags ?? []).join(", ") || "None"}</span>
          </li>
          {run && (
            <li className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Current run</span>
              <span>{run.id}</span>
            </li>
          )}
        </ul>
      </section>

      <section className={styles.stepCard}>
        <h2 className={styles.sectionTitle}>Select an LLM provider</h2>
        <div className={styles.providerList}>
          {providerItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.providerOption} ${!item.enabled ? styles.providerOptionDisabled : ""}`}
              disabled={!item.enabled}
              onClick={() => setProvider(item.id)}
              aria-pressed={provider === item.id}
            >
              <span>{item.label}</span>
              {!item.enabled && <span className={styles.tag}>Coming soon</span>}
            </button>
          ))}
        </div>

        <div className={styles.sectionFooter}>
          <button className="btn" type="button" onClick={generateTheme} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Theme"}
          </button>
          <button className="btn-neutral" type="button" onClick={() => router.push("/history")}>
            Version history
          </button>
          <button className="btn-neutral" type="button" onClick={() => router.push("/")}>Back to constraints</button>
        </div>
      </section>

      {generationError && (
        <section className={styles.rawResponseCard}>
          <p className={styles.errorMessage}>{generationError}</p>
        </section>
      )}

      {rawResponse && (
        <section className={styles.rawResponseCard}>
          <h2 className={styles.sectionTitle}>Direct LLM response</h2>
          <div className={styles.rawResponse}>{rawResponse}</div>
        </section>
      )}

      {generatedTokens && cssVars && (
        <section className={styles.previewCard} style={previewCardStyle}>
          <div className={styles.sectionTitle}>Mini preview</div>

          <div className={styles.miniPreview}>
            <div className={styles.previewHeader}>
              <div>
                <h3>Preview sample</h3>
                <p>View the main brand palette and typography in a compact format.</p>
              </div>
              <div className={styles.previewStatus}>
                {report ? (
                  <span className={report.summary.systemPass ? styles.statusPass : styles.statusFail}>
                    {report.summary.systemPass ? "Valid" : "Issues"}
                  </span>
                ) : (
                  <span className={styles.statusInfo}>No validation yet</span>
                )}
              </div>
            </div>

            <div className={styles.previewSample}>
              <div className={styles.sampleHeader}>
                <p className={styles.sampleKicker}>Brand preview</p>
                <h2>Button label</h2>
                <p>Secondary text, copy, and chart callout example.</p>
              </div>
              <div className={styles.sampleControls}>
                <button className={styles.miniButton} type="button">Primary action</button>
                <button className={styles.miniButtonSecondary} type="button">Secondary</button>
              </div>
            </div>

            <div className={styles.swatchGrid}>
              <div
                className={styles.swatchItem}
                style={{
                  background: cssVars["--color-brand-primary"],
                  color: cssVars["--color-brand-on-primary"] || "#ffffff",
                }}
              >
                <span className={styles.swatchLabel}>Primary</span>
                <code>{cssVars["--color-brand-primary"]}</code>
              </div>
              <div
                className={styles.swatchItem}
                style={{
                  background: cssVars["--color-brand-secondary"],
                  color: cssVars["--color-brand-on-secondary"] || "#ffffff",
                }}
              >
                <span className={styles.swatchLabel}>Secondary</span>
                <code>{cssVars["--color-brand-secondary"]}</code>
              </div>
              <div
                className={styles.swatchItem}
                style={{
                  background: cssVars["--color-neutral-surface"],
                  color: cssVars["--color-neutral-text-primary"] || "#111111",
                }}
              >
                <span className={styles.swatchLabel}>Surface</span>
                <code>{cssVars["--color-neutral-surface"]}</code>
              </div>
            </div>
          </div>

          <div className={styles.validationSummary}>
            <p>
              {report
                ? `System failures: ${report.summary.systemFailures} - Repairable: ${report.summary.repairable ? "Yes" : "No"}`
                : "Validation report not available yet."}
            </p>
            {repairState?.applied && (
              <p className={styles.repairNoticeLine}>Repair applied: {repairState.changes.length} change(s)</p>
            )}
          </div>

          <div className={styles.buttonRow}>
            <button className="btn" type="button" onClick={proceedToPreview}>
              Proceed to preview
            </button>
            <button
              className="btn-neutral"
              type="button"
              onClick={repairTheme}
              disabled={isRepairing || !canRepair}
            >
              {isRepairing ? "Repairing..." : "Repair"}
            </button>
          </div>

          {repairState?.diffs && repairState.diffs.length > 0 && (
            <div className={styles.repairSummary}>
              <h3>Repair preview</h3>
              <p>Repairs were applied before preview. Review changed values here.</p>
              <ul className={styles.repairTimeline}>
                {repairState.diffs.map((diff) => (
                  <li key={`${diff.path}-${diff.after}-${diff.before}`} className={styles.repairItem}>
                    <strong>{diff.path}</strong>: {diff.before} {"->"} {diff.after}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
