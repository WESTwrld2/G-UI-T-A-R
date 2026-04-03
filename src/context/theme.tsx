"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { GenerationReport } from "@/logic/schema/generationReport.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { ThemeDescriptionAssessment } from "@/logic/llm/themeDescriptionAssessment";

export interface ThemeData {
  cssVars: Record<string, string>;
  tokens: DesignTokens;
  constraints?: UserConstraints;
  themeDescriptionAssessment?: ThemeDescriptionAssessment | null;
  report?: ValidationReport; // may be undefined if we decide not to store it
  generationReport?: GenerationReport;
  repair?: {
    applied: boolean;
    changes: string[];
  };
}

interface ThemeContextValue {
  theme: ThemeData | null;
  setTheme: (t: ThemeData) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

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
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("previewData");
    return stored ? JSON.parse(stored) : null;
  });

  // whenever theme changes, persist and apply CSS vars
  useEffect(() => {
    if (!theme) return;
    applyCSS(theme.cssVars);
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
