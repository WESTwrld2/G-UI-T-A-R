export type HexColor = `#${string}`;

export type DesignTokens = {
  colors: {
    background: HexColor;
    surface: HexColor;
    primary: HexColor;
    onPrimary: HexColor;
    textPrimary: HexColor;
    textSecondary: HexColor;
    border: HexColor;
  };
  typography: {
    fontFamily: string;
    baseFontSize: number;
    scaleRatio: number;
    sizes: {
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
    baseUnit: number;
    scale: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
  meta: {
    generatedBy: string;
    method: string;
    timestamp: string;
    [k: string]: unknown;
  };
};
