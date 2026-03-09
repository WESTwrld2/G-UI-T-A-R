"use client";

import type { DesignTokens } from "@/logic/schema/tokens.types";

type Props = {
  cssVars: Record<string, string>;
  tokens: DesignTokens;
};

type CssVarEntry = {
  name: string;
  value: string;
};

const COLOR_ORDER = [
  "--color-brand-primary",
  "--color-brand-secondary",
  "--color-brand-on-primary",
  "--color-brand-on-secondary",
  "--color-neutral-background",
  "--color-neutral-surface",
  "--color-neutral-text-primary",
  "--color-neutral-text-secondary",
  "--color-neutral-border",
  "--state-primary-hover",
  "--state-primary-active",
  "--state-secondary-hover",
  "--state-secondary-active",
  "--state-focus-ring",
];

const FONT_SIZE_ORDER = [
  "--font-size-xs",
  "--font-size-sm",
  "--font-size-md",
  "--font-size-lg",
  "--font-size-xl",
  "--font-size-h3",
  "--font-size-h2",
  "--font-size-h1",
];

const SPACING_ORDER = [
  "--spacing-xs",
  "--spacing-sm",
  "--spacing-md",
  "--spacing-lg",
  "--spacing-xl",
];

function orderByList(entries: CssVarEntry[], order: string[]) {
  const rank = new Map(order.map((name, index) => [name, index]));
  return [...entries].sort((a, b) => {
    const ai = rank.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bi = rank.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function pxValue(input: string): number {
  const raw = Number.parseFloat(input.replace("px", ""));
  return Number.isFinite(raw) ? raw : 0;
}

function label(name: string) {
  return name
    .replace(/^--/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function ThemeTokenDashboard({ cssVars, tokens }: Props) {
  const entries: CssVarEntry[] = Object.entries(cssVars).map(([name, value]) => ({ name, value }));
  const colorVars = orderByList(
    entries.filter((entry) => entry.name.startsWith("--color-") || entry.name.startsWith("--state-")),
    COLOR_ORDER
  );
  const fontSizes = orderByList(
    entries.filter((entry) => entry.name.startsWith("--font-size-")),
    FONT_SIZE_ORDER
  );
  const spacingVars = orderByList(
    entries.filter((entry) => entry.name.startsWith("--spacing-")),
    SPACING_ORDER
  );
  const fontFamily = cssVars["--font-family-base"] ?? tokens.typography.fontFamily;

  return (
    <div className="token-dashboard">
      <section className="token-panel">
        <div className="token-panel-head">
          <h2>Color Palette</h2>
          <p>Complete color system used by components and states.</p>
        </div>
        <div className="color-grid">
          {colorVars.map((entry) => (
            <article key={entry.name} className="swatch-card">
              <div className="swatch-preview" style={{ background: entry.value }}>
                <span>{entry.value}</span>
              </div>
              <div className="swatch-meta">
                <strong>{label(entry.name)}</strong>
                <code>{entry.name}</code>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="token-panel">
        <div className="token-panel-head">
          <h2>Typography</h2>
          <p>Font family and modular scale generated from your constraints.</p>
        </div>
        <div className="typo-meta">
          <div>
            <span>Font Family</span>
            <strong>{fontFamily}</strong>
          </div>
          <div>
            <span>Base Size</span>
            <strong>{tokens.typography.baseFontSize}px</strong>
          </div>
          <div>
            <span>Scale Ratio</span>
            <strong>{tokens.typography.scaleRatio}</strong>
          </div>
        </div>
        <div className="type-scale">
          {fontSizes.map((entry) => (
            <div key={entry.name} className="type-row">
              <code>{entry.name}</code>
              <p
                className="type-sample"
                style={{ fontFamily: "var(--font-family-base)", fontSize: `var(${entry.name})` }}
              >
                Sphinx of black quartz, judge my vow.
              </p>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="token-panel">
        <div className="token-panel-head">
          <h2>Spacing</h2>
          <p>Spacing scale and practical density preview.</p>
        </div>
        <div className="spacing-scale">
          {spacingVars.map((entry) => {
            const px = pxValue(entry.value);
            const width = Math.max(36, Math.min(300, px * 14));
            return (
              <div key={entry.name} className="space-row">
                <code>{entry.name}</code>
                <div className="space-track">
                  <div className="space-bar" style={{ width }} />
                </div>
                <span>{entry.value}</span>
              </div>
            );
          })}
        </div>
        <div className="space-demo-grid">
          {spacingVars.map((entry) => (
            <div key={entry.name} className="space-demo-card" style={{ padding: `var(${entry.name})` }}>
              <small>{entry.name}</small>
              <p>Padded with {entry.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="token-panel">
        <div className="token-panel-head">
          <h2>Component Preview</h2>
          <p>Real UI elements consuming the final token values.</p>
        </div>
        <div className="component-preview">
          <div className="component-card">
            <h3>Product Card</h3>
            <p>
              This card uses surface, border, text, and spacing tokens with the generated typography
              scale.
            </p>
            <div className="component-actions">
              <button className="btn" type="button">
                Primary Action
              </button>
              <button className="preview-btn-secondary" type="button">
                Secondary
              </button>
            </div>
          </div>
          <div className="component-form">
            <label htmlFor="preview-input">Input Example</label>
            <input id="preview-input" placeholder="Token-driven input field" />
            <label htmlFor="preview-select">Select Example</label>
            <select id="preview-select" defaultValue="default">
              <option value="default">Default option</option>
              <option value="alternate">Alternate option</option>
            </select>
          </div>
        </div>
      </section>

      <section className="token-panel">
        <div className="token-panel-head">
          <h2>Token Inventory</h2>
          <p>Complete list of final compiled CSS variables and metadata.</p>
        </div>
        <div className="inventory-grid">
          <div className="inventory-card">
            <h4>Metadata</h4>
            <p>
              <strong>Neutral Tint:</strong> {tokens.colors.neutral.tint}
            </p>
            <p>
              <strong>Generated By:</strong> {tokens.meta.generatedBy}
            </p>
            <p>
              <strong>Method:</strong> {tokens.meta.method}
            </p>
            <p>
              <strong>Timestamp:</strong> {tokens.meta.timestamp}
            </p>
          </div>
          <div className="inventory-card">
            <h4>CSS Variables</h4>
            <div className="css-var-list">
              {entries
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((entry) => (
                  <div key={entry.name} className="css-var-row">
                    <code>{entry.name}</code>
                    <span>{entry.value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
