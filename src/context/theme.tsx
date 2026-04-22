"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { GenerationReport, RepairDiff } from "@/logic/schema/generationReport.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";
import { ensureGoogleFontLoaded, type FontStyle } from "@/logic/llm/googleFonts";
import type { RunHistorySummary } from "@/logic/history/runHistory.types";

export interface ThemeData {
  cssVars: Record<string, string>;
  tokens: DesignTokens;
  constraints?: UserConstraints;
  themeDescriptionAssessment?: ThemeDescriptionAssessment | null;
  report?: ValidationReport; // may be undefined if we decide not to store it
  generationReport?: GenerationReport;
  run?: RunHistorySummary;
  repair?: {
    applied: boolean;
    changes: string[];
    diffs?: RepairDiff[];
  };
}

interface ThemeContextValue {
  theme: ThemeData | null;
  setTheme: (t: ThemeData) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const defaultTheme: ThemeData = {
  cssVars: {
    "--color-neutral-background": "white",
    "--color-neutral-text-primary": "black",
    "--color-neutral-border": "black",
  },
  tokens: {
    colors: {
      brand: {
        primary: "#000000",
        secondary: "#000000",
        onPrimary: "#ffffff",
        onSecondary: "#ffffff",
      },
      neutral: {
        background: "#ffffff",
        surface: "#ffffff",
        textPrimary: "#000000",
        textSecondary: "#000000",
        border: "#000000",
        tint: "neutral",
      },
    },
    typography: {
      fontFamily: "Arial",
      baseFontSize: 16,
      scaleRatio: 1.2,
    },
    spacing: {
      baseUnit: 4,
    },
    meta: {
      generatedBy: "default",
      method: "default",
      timestamp: new Date().toISOString(),
    },
  },
};

function applyCSS(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeData | null>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = localStorage.getItem("previewData");
    return stored ? JSON.parse(stored) : defaultTheme;
  });

  // whenever theme changes, persist and apply CSS vars
  useEffect(() => {
    if (!theme) return;
    applyCSS(theme.cssVars);
    ensureGoogleFontLoaded(
      theme.tokens.typography.fontFamily,
      (theme.constraints?.typography.fontFamily?.style ?? "sans-serif") as FontStyle
    );
    try {
      localStorage.setItem("previewData", JSON.stringify(theme));
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
