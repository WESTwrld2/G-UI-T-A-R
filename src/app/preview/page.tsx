"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/theme";
import type { ThemeData } from "@/context/theme";
import ThemeTokenDashboard from "@/app/components/themeTokenDashboard";
import ValidationReportComponent from "@/app/components/validationReport";

export default function PreviewPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const data = theme as ThemeData | null; // theme is already maintained by provider

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
          <button className="btn" type="button" onClick={exportThemeJson}>
            Export Tokens JSON
          </button>
          <button className="btn" type="button" onClick={exportCssVars}>
            Export CSS Vars
          </button>
        </div>
      </header>

      {data.repair?.applied && data.repair.changes.length > 0 && (
        <section className="preview-repair">
          <h3>Applied Repairs</h3>
          <ul>
            {data.repair.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </section>
      )}

      <ThemeTokenDashboard cssVars={data.cssVars} tokens={data.tokens} />
      {data.report && <ValidationReportComponent report={data.report} />}
    </div>
  );
}
