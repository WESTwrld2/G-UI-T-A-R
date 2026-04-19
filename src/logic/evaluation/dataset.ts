import type { UserConstraints } from "@/logic/schema/userConstraints.zod";

export type TestCase = {
  id: string;
  constraints: UserConstraints;
  category: "normal" | "edge" | "extreme";
};

export const TEST_DATASET: TestCase[] = [
  // NORMAL category (10 test cases)
  {
    id: "normal-1",
    category: "normal",
    constraints: {
      themeDescription: "A modern tech company brand with minimalist design principles",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#0066cc",
        secondary: "#ff6600",
        neutralPreference: "cool",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
        fontFamily: { style: "sans-serif", name: "Inter" },
      },
      spacing: { density: "normal" },
      styleTags: ["tech", "minimal"],
    },
  },
  {
    id: "normal-2",
    category: "normal",
    constraints: {
      themeDescription: "Warm and welcoming financial services platform",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#1a5c3d",
        secondary: "#d4a574",
      },
      typography: {
        baseFontSize: 14,
        scalePreset: "compact",
        fontFamily: { style: "serif", name: "Merriweather" },
      },
      spacing: { density: "spacious" },
    },
  },
  {
    id: "normal-3",
    category: "normal",
    constraints: {
      themeDescription: "Creative agency portfolio with bold visuals",
      themeMode: "dark",
      accessibilityTarget: "AA",
      brand: {
        primary: "#ff1493",
        secondary: "#00ffff",
      },
      typography: {
        baseFontSize: 18,
        scalePreset: "expressive",
      },
      spacing: { density: "normal" },
      styleTags: ["creative", "bold"],
    },
  },
  {
    id: "normal-4",
    category: "normal",
    constraints: {
      themeDescription: "Healthcare provider accessible interface",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#0066ff",
        secondary: "#00cc00",
        neutralPreference: "neutral",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "normal-5",
    category: "normal",
    constraints: {
      themeDescription: "E-commerce retail store with inclusive design",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#c41e3a",
        secondary: "#ffd700",
      },
      typography: {
        baseFontSize: 15,
        scalePreset: "balanced",
        fontFamily: { style: "sans-serif", name: "Roboto" },
      },
      spacing: { density: "condensed" },
    },
  },
  {
    id: "normal-6",
    category: "normal",
    constraints: {
      themeMode: "dark",
      accessibilityTarget: "AA",
      brand: {
        primary: "#64b5f6",
        secondary: "#81c784",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "normal-7",
    category: "normal",
    constraints: {
      themeDescription: "SaaS dashboard with productivity focus",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#2563eb",
        neutralPreference: "cool",
      },
      typography: {
        baseFontSize: 14,
        scalePreset: "compact",
      },
      spacing: { density: "condensed" },
    },
  },
  {
    id: "normal-8",
    category: "normal",
    constraints: {
      themeDescription: "News publication with readable typography",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#1f2937",
        secondary: "#f59e0b",
      },
      typography: {
        baseFontSize: 17,
        scalePreset: "balanced",
        fontFamily: { style: "serif", name: "Georgia" },
      },
      spacing: { density: "spacious" },
    },
  },
  {
    id: "normal-9",
    category: "normal",
    constraints: {
      themeMode: "dark",
      accessibilityTarget: "AA",
      brand: {
        primary: "#10b981",
        secondary: "#f472b6",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
      styleTags: ["dark", "modern"],
    },
  },
  {
    id: "normal-10",
    category: "normal",
    constraints: {
      themeDescription: "Educational platform for diverse learners",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#7c3aed",
        secondary: "#06b6d4",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
        fontFamily: { style: "sans-serif", name: "Verdana" },
      },
      spacing: { density: "normal" },
    },
  },

  // EDGE category (10 test cases)
  {
    id: "edge-1",
    category: "edge",
    constraints: {
      themeDescription: "High contrast accessibility-first design for AAA compliance",
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#000010",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-2",
    category: "edge",
    constraints: {
      themeDescription: "Very light neutral theme for AAA accessibility",
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#fffef0",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-3",
    category: "edge",
    constraints: {
      themeMode: "dark",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#ffffff",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-4",
    category: "edge",
    constraints: {
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#000000",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-5",
    category: "edge",
    constraints: {
      themeDescription: "Dark mode with very light primary for AAA",
      themeMode: "dark",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#f0f0ff",
        neutralPreference: "cool",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-6",
    category: "edge",
    constraints: {
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#003300",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-7",
    category: "edge",
    constraints: {
      themeDescription: "No secondary color edge case",
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#0066cc",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-8",
    category: "edge",
    constraints: {
      themeMode: "dark",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#ffff00",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-9",
    category: "edge",
    constraints: {
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#333333",
        neutralPreference: "warm",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "edge-10",
    category: "edge",
    constraints: {
      themeMode: "dark",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#dddddd",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },

  // EXTREME category (10 test cases)
  {
    id: "extreme-1",
    category: "extreme",
    constraints: {
      themeDescription: "Near-identical primary and secondary colors extreme case",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#0066cc",
        secondary: "#0066d0",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "extreme-2",
    category: "extreme",
    constraints: {
      themeDescription: "Monospace font with AAA dark mode extreme",
      themeMode: "dark",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#00ff00",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
        fontFamily: { style: "monospace", name: "Courier New" },
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "extreme-3",
    category: "extreme",
    constraints: {
      themeDescription: "Maximum base font size with expressive scale",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#ff0000",
      },
      typography: {
        baseFontSize: 24,
        scalePreset: "expressive",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "extreme-4",
    category: "extreme",
    constraints: {
      themeDescription: "Minimum base font size with extreme scale",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#0000ff",
      },
      typography: {
        baseFontSize: 12,
        scalePreset: "loose",
      },
      spacing: { density: "spacious" },
    },
  },
  {
    id: "extreme-5",
    category: "extreme",
    constraints: {
      themeDescription: "Nearly identical colors with AAA",
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#ff6600",
        secondary: "#ff6601",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "normal" },
    },
  },
  {
    id: "extreme-6",
    category: "extreme",
    constraints: {
      themeDescription: "Maximum font size with compact scale",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#00cc00",
      },
      typography: {
        baseFontSize: 24,
        scalePreset: "compact",
      },
      spacing: { density: "condensed" },
    },
  },
  {
    id: "extreme-7",
    category: "extreme",
    constraints: {
      themeDescription: "Monospace with minimum font size extreme",
      themeMode: "light",
      accessibilityTarget: "AA",
      brand: {
        primary: "#cc0000",
      },
      typography: {
        baseFontSize: 12,
        scalePreset: "expressive",
        fontFamily: { style: "monospace", name: "Monaco" },
      },
      spacing: { density: "condensed" },
    },
  },
  {
    id: "extreme-8",
    category: "extreme",
    constraints: {
      themeDescription: "Dark mode with very similar primary and secondary",
      themeMode: "dark",
      accessibilityTarget: "AA",
      brand: {
        primary: "#1a1a2e",
        secondary: "#1a1a30",
      },
      typography: {
        baseFontSize: 16,
        scalePreset: "balanced",
      },
      spacing: { density: "spacious" },
    },
  },
  {
    id: "extreme-9",
    category: "extreme",
    constraints: {
      themeDescription: "Loose scale with maximum font size extreme",
      themeMode: "light",
      accessibilityTarget: "AAA",
      brand: {
        primary: "#6600cc",
      },
      typography: {
        baseFontSize: 24,
        scalePreset: "loose",
      },
      spacing: { density: "spacious" },
    },
  },
  {
    id: "extreme-10",
    category: "extreme",
    constraints: {
      themeDescription: "Compact scale with minimum font size",
      themeMode: "dark",
      accessibilityTarget: "AA",
      brand: {
        primary: "#00cccc",
      },
      typography: {
        baseFontSize: 12,
        scalePreset: "compact",
        fontFamily: { style: "sans-serif", name: "Arial" },
      },
      spacing: { density: "condensed" },
      styleTags: ["extreme", "compact"],
    },
  },
];
