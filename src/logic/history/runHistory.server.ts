import "server-only";

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { ValidationReport } from "@/logic/validate/validateTokens";
import type { RepairDiff } from "@/logic/schema/generationReport.types";
import type {
  RunArtifact,
  RunArtifactStep,
  RunHistoryManifest,
  RunHistorySummary,
} from "@/logic/history/runHistory.types";

type ArtifactWrite = {
  id: string;
  label: string;
  step: RunArtifactStep;
  fileName: string;
  mimeType: string;
  content: string;
};

type CreateRunHistoryInput = {
  userConstraints: UserConstraints;
  prompt: string;
  rawModelResponse: string;
  builtTokens: DesignTokens;
  validationReport: ValidationReport;
  cssVars: Record<string, string>;
  provider: string;
  model: string;
};

type UpdateRunHistoryWithRepairInput = {
  repair: {
    applied: boolean;
    changes: string[];
    diffs?: RepairDiff[];
  };
  repairedTokens: DesignTokens;
  validationReport: ValidationReport;
  cssVars: Record<string, string>;
};

const RUN_HISTORY_ROOT = path.join(process.cwd(), ".theme-history");
const MANIFEST_FILE_NAME = "manifest.json";
const ARTIFACTS_DIRECTORY = "artifacts";

function assertSafeSegment(value: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`Unsafe path segment: ${value}`);
  }
  return value;
}

function runDirectory(runId: string) {
  return path.join(RUN_HISTORY_ROOT, assertSafeSegment(runId));
}

function toIsoTimestamp() {
  return new Date().toISOString();
}

function toRunId(model: string, provider: string) {
  const timestamp = toIsoTimestamp().replace(/[:.]/g, "-");
  const safeProvider = provider.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeModel = model.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${timestamp}_${safeProvider}_${safeModel}_${randomUUID().slice(0, 8)}`;
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildCssExport(cssVars: Record<string, string>) {
  const rootVars = Object.entries(cssVars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `:root {\n${rootVars}\n}\n`;
}

async function ensureRunHistoryRoot() {
  await mkdir(RUN_HISTORY_ROOT, { recursive: true });
}

async function saveManifest(runId: string, manifest: RunHistoryManifest) {
  const target = path.join(runDirectory(runId), MANIFEST_FILE_NAME);
  await writeFile(target, stringifyJson(manifest), "utf8");
}

async function loadManifest(runId: string) {
  const raw = await readFile(path.join(runDirectory(runId), MANIFEST_FILE_NAME), "utf8");
  return JSON.parse(raw) as RunHistoryManifest;
}

function upsertArtifact(manifest: RunHistoryManifest, artifact: RunArtifact) {
  const nextArtifacts = manifest.artifacts.filter((item: RunArtifact) => item.id !== artifact.id);
  nextArtifacts.push(artifact);
  nextArtifacts.sort((left: RunArtifact, right: RunArtifact) => left.fileName.localeCompare(right.fileName));
  manifest.artifacts = nextArtifacts;
  manifest.artifactCount = nextArtifacts.length;
}

async function writeArtifact(runId: string, manifest: RunHistoryManifest, artifact: ArtifactWrite) {
  const runDir = runDirectory(runId);
  const artifactDir = path.join(runDir, ARTIFACTS_DIRECTORY);
  await mkdir(artifactDir, { recursive: true });

  const fullPath = path.join(artifactDir, artifact.fileName);
  await writeFile(fullPath, artifact.content, "utf8");
  const fileStats = await stat(fullPath);

  upsertArtifact(manifest, {
    id: artifact.id,
    label: artifact.label,
    step: artifact.step,
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
    size: fileStats.size,
    updatedAt: toIsoTimestamp(),
    relativePath: path.posix.join(ARTIFACTS_DIRECTORY, artifact.fileName),
  });
}

function toSummary(manifest: RunHistoryManifest): RunHistorySummary {
  return {
    id: manifest.id,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    provider: manifest.provider,
    model: manifest.model,
    status: manifest.status,
    themeDescription: manifest.themeDescription,
    themeMode: manifest.themeMode,
    accessibilityTarget: manifest.accessibilityTarget,
    artifactCount: manifest.artifactCount,
  };
}

export async function createRunHistoryEntry(input: CreateRunHistoryInput) {
  await ensureRunHistoryRoot();

  const runId = toRunId(input.model, input.provider);
  const createdAt = toIsoTimestamp();
  const manifest: RunHistoryManifest = {
    id: runId,
    createdAt,
    updatedAt: createdAt,
    provider: input.provider,
    model: input.model,
    status: "generated",
    themeDescription: input.userConstraints.themeDescription,
    themeMode: input.userConstraints.themeMode,
    accessibilityTarget: input.userConstraints.accessibilityTarget,
    artifactCount: 0,
    artifacts: [],
  };

  await mkdir(runDirectory(runId), { recursive: true });

  const exportTokens = stringifyJson(input.builtTokens);
  const exportCss = buildCssExport(input.cssVars);

  await writeArtifact(runId, manifest, {
    id: "user-constraints",
    label: "User Constraints",
    step: "generate",
    fileName: "01-user-constraints.json",
    mimeType: "application/json",
    content: stringifyJson(input.userConstraints),
  });
  await writeArtifact(runId, manifest, {
    id: "built-prompt",
    label: "Built Prompt",
    step: "generate",
    fileName: "02-built-prompt.txt",
    mimeType: "text/plain",
    content: input.prompt,
  });
  await writeArtifact(runId, manifest, {
    id: "raw-llm-output",
    label: "Raw LLM Output",
    step: "generate",
    fileName: "03-raw-llm-output.txt",
    mimeType: "text/plain",
    content: input.rawModelResponse,
  });
  await writeArtifact(runId, manifest, {
    id: "built-tokens",
    label: "Validated Built Tokens",
    step: "generate",
    fileName: "04-built-tokens.json",
    mimeType: "application/json",
    content: exportTokens,
  });
  await writeArtifact(runId, manifest, {
    id: "validation-report",
    label: "Validation Report",
    step: "generate",
    fileName: "05-validation-report.json",
    mimeType: "application/json",
    content: stringifyJson(input.validationReport),
  });
  await writeArtifact(runId, manifest, {
    id: "compiled-css-vars",
    label: "Compiled CSS Vars",
    step: "generate",
    fileName: "06-compiled-css-vars.json",
    mimeType: "application/json",
    content: stringifyJson(input.cssVars),
  });
  await writeArtifact(runId, manifest, {
    id: "export-theme-css",
    label: "Export Theme CSS",
    step: "generate",
    fileName: "07-export-theme.css",
    mimeType: "text/css",
    content: exportCss,
  });
  await writeArtifact(runId, manifest, {
    id: "export-theme-tokens",
    label: "Export Theme Tokens",
    step: "generate",
    fileName: "08-export-theme.tokens.json",
    mimeType: "application/json",
    content: exportTokens,
  });

  manifest.updatedAt = toIsoTimestamp();
  await saveManifest(runId, manifest);

  return toSummary(manifest);
}

export async function updateRunHistoryWithRepair(runId: string, input: UpdateRunHistoryWithRepairInput) {
  await ensureRunHistoryRoot();

  const manifest = await loadManifest(runId);
  const exportTokens = stringifyJson(input.repairedTokens);
  const exportCss = buildCssExport(input.cssVars);

  await writeArtifact(runId, manifest, {
    id: "repair-summary",
    label: "Repair Summary",
    step: "repair",
    fileName: "09-repair-summary.json",
    mimeType: "application/json",
    content: stringifyJson(input.repair),
  });
  await writeArtifact(runId, manifest, {
    id: "repaired-tokens",
    label: "Repaired Tokens",
    step: "repair",
    fileName: "10-repaired-tokens.json",
    mimeType: "application/json",
    content: exportTokens,
  });
  await writeArtifact(runId, manifest, {
    id: "repaired-validation-report",
    label: "Repaired Validation Report",
    step: "repair",
    fileName: "11-repaired-validation-report.json",
    mimeType: "application/json",
    content: stringifyJson(input.validationReport),
  });
  await writeArtifact(runId, manifest, {
    id: "repaired-css-vars",
    label: "Repaired CSS Vars",
    step: "repair",
    fileName: "12-repaired-css-vars.json",
    mimeType: "application/json",
    content: stringifyJson(input.cssVars),
  });
  await writeArtifact(runId, manifest, {
    id: "repaired-export-theme-css",
    label: "Repaired Export Theme CSS",
    step: "repair",
    fileName: "13-repaired-export-theme.css",
    mimeType: "text/css",
    content: exportCss,
  });
  await writeArtifact(runId, manifest, {
    id: "repaired-export-theme-tokens",
    label: "Repaired Export Theme Tokens",
    step: "repair",
    fileName: "14-repaired-export-theme.tokens.json",
    mimeType: "application/json",
    content: exportTokens,
  });

  manifest.status = "repaired";
  manifest.updatedAt = toIsoTimestamp();
  await saveManifest(runId, manifest);

  return toSummary(manifest);
}

export async function listRunHistory() {
  await ensureRunHistoryRoot();
  const entries = await readdir(RUN_HISTORY_ROOT, { withFileTypes: true });
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          return await loadManifest(entry.name);
        } catch {
          return null;
        }
      })
  );

  return manifests
    .filter((manifest): manifest is RunHistoryManifest => Boolean(manifest))
    .sort((left: RunHistoryManifest, right: RunHistoryManifest) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toSummary);
}

export async function getRunHistoryManifest(runId: string) {
  await ensureRunHistoryRoot();
  return loadManifest(runId);
}

export async function readRunArtifact(runId: string, artifactId: string) {
  const manifest = await loadManifest(runId);
  const artifact = manifest.artifacts.find((item: RunArtifact) => item.id === artifactId);
  if (!artifact) {
    throw new Error(`Artifact not found for run ${runId}: ${artifactId}`);
  }

  const content = await readFile(path.join(runDirectory(runId), artifact.relativePath), "utf8");
  return { artifact, content, run: toSummary(manifest) };
}