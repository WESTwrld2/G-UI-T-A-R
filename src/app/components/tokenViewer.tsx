"use client";

import React from "react";
import type { DesignTokens } from "@/logic/schema/tokens.types";

interface Props {
  tokens: DesignTokens;
}

export default function TokenViewer({ tokens }: Props) {
  // display colors, typography, and spacing in a simple grid
  return (
    <div style={{ marginTop: 20 }}>
      <h2>Token Preview</h2>
      <section>
        <h3>Colors</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <ColorSwatch name="brand.primary" value={tokens.colors.brand.primary} />
          <ColorSwatch name="brand.secondary" value={tokens.colors.brand.secondary} />
          <ColorSwatch name="brand.onPrimary" value={tokens.colors.brand.onPrimary} />
          <ColorSwatch name="brand.onSecondary" value={tokens.colors.brand.onSecondary} />
          <ColorSwatch name="neutral.background" value={tokens.colors.neutral.background} />
          <ColorSwatch name="neutral.surface" value={tokens.colors.neutral.surface} />
          <ColorSwatch name="neutral.textPrimary" value={tokens.colors.neutral.textPrimary} />
          <ColorSwatch name="neutral.textSecondary" value={tokens.colors.neutral.textSecondary} />
          <ColorSwatch name="neutral.border" value={tokens.colors.neutral.border} />
        </div>
      </section>

      <section>
        <h3>Typography</h3>
        <ul>
          <li style={{ fontSize: `var(--font-size-xs)` }}>xs</li>
          <li style={{ fontSize: `var(--font-size-sm)` }}>sm</li>
          <li style={{ fontSize: `var(--font-size-md)` }}>md</li>
          <li style={{ fontSize: `var(--font-size-lg)` }}>lg</li>
          <li style={{ fontSize: `var(--font-size-xl)` }}>xl</li>
        </ul>
      </section>

      <section>
        <h3>Spacing (applied as padding)</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ background: "#eee", padding: `var(--spacing-xs)` }}>xs</div>
          <div style={{ background: "#eee", padding: `var(--spacing-sm)` }}>sm</div>
          <div style={{ background: "#eee", padding: `var(--spacing-md)` }}>md</div>
          <div style={{ background: "#eee", padding: `var(--spacing-lg)` }}>lg</div>
          <div style={{ background: "#eee", padding: `var(--spacing-xl)` }}>xl</div>
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ textAlign: "center", width: 100 }}>
      <div
        style={{
          background: value,
          width: 100,
          height: 50,
          border: "1px solid #ccc",
        }}
      />
      <div style={{ fontSize: 12 }}>{name}</div>
      <div style={{ fontSize: 12 }}>{value}</div>
    </div>
  );
}
