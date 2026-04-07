import type { ColorGroup } from "@/app/components/theme-dashboard/types";

export const COLOR_ORDER = [
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

export const FONT_SIZE_ORDER = [
  "--font-size-xs",
  "--font-size-sm",
  "--font-size-md",
  "--font-size-lg",
  "--font-size-xl",
  "--font-size-h3",
  "--font-size-h2",
  "--font-size-h1",
];

export const SPACING_ORDER = [
  "--spacing-xs",
  "--spacing-sm",
  "--spacing-md",
  "--spacing-lg",
  "--spacing-xl",
];

export const COLOR_GROUPS: ColorGroup[] = [
  {
    title: "Brand Actions",
    role: "interactive",
    names: [
      "--color-brand-primary",
      "--color-brand-on-primary",
      "--color-brand-secondary",
      "--color-brand-on-secondary",
    ],
  },
  {
    title: "Surfaces",
    role: "background",
    names: ["--color-neutral-background", "--color-neutral-surface", "--color-neutral-border"],
  },
  {
    title: "Text Roles",
    role: "text",
    names: ["--color-neutral-text-primary", "--color-neutral-text-secondary"],
  },
  {
    title: "Interaction States",
    role: "state",
    names: [
      "--state-primary-hover",
      "--state-primary-active",
      "--state-secondary-hover",
      "--state-secondary-active",
      "--state-focus-ring",
    ],
  },
];
