export type RunArtifactStep = "generate" | "repair";

export type RunArtifact = {
  id: string;
  label: string;
  step: RunArtifactStep;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
  relativePath: string;
};

export type RunHistoryStatus = "generated" | "repaired";

export type RunHistorySummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  status: RunHistoryStatus;
  themeDescription?: string;
  themeMode: "light" | "dark";
  accessibilityTarget: "AA" | "AAA";
  artifactCount: number;
};

export type RunHistoryManifest = RunHistorySummary & {
  artifacts: RunArtifact[];
};