export type HexColor = `#${string}`;

export type DesignTokens = {
  colors: {
    brand: {
      primary: HexColor;
      onPrimary: HexColor;
    };
    neutral: {
      background: HexColor;
      surface: HexColor;
      textPrimary: HexColor;
      textSecondary: HexColor;
      border: HexColor;
      tint: "brand" | "cool" | "warm" | "neutral";
    };
  };
  typography: {
    fontFamily: string;
    baseFontSize: number;
    scaleRatio: number;
  };
  spacing: {
    baseUnit: number;
  };
  meta: {
    generatedBy: string;
    method: string;
    timestamp: string;
    [k: string]: unknown;
  };
};

export type CompiledTokens = DesignTokens & {
  // derived, produced by compile step
  derived: {
    typography: {
      sizesPx: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        h3: number;
        h2: number;
        h1: number;
      };
    };
    spacing: {
      scalePx: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
      };
      densityMultiplier: number;
    };
    states: {
      brand: {
        primaryHover: HexColor;
        primaryActive: HexColor;
        focusRing: string; // rgba(...) string
      };
    };
  };
};
