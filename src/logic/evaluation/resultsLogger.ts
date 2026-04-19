import { mkdir, readFile, readdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvaluationMetrics } from "@/logic/evaluation/computeMetrics";

export type EvaluationResult = {
  runId: string;           // crypto.randomUUID()
  inputId: string;
  model: "openai" | "gemini";
  promptMode: "naive" | "structured";
  repaired: boolean;
  metricsBefore: EvaluationMetrics;
  metricsAfter: EvaluationMetrics | null;  // null if repairEnabled is false
  violationReduction: number;  // metricsBefore.violationCount - (metricsAfter?.violationCount ?? metricsBefore.violationCount)
  timestamp: string;           // new Date().toISOString()
};

function getResultsDir(): string {
  return path.join(process.cwd(), "evaluation", "results");
}

export async function logResult(result: EvaluationResult): Promise<void> {
  const resultsDir = getResultsDir();
  await mkdir(resultsDir, { recursive: true });

  const filePath = path.join(resultsDir, `${result.runId}.json`);
  await writeFile(filePath, JSON.stringify(result, null, 2), "utf8");
}

export async function loadAllResults(): Promise<EvaluationResult[]> {
  const resultsDir = getResultsDir();
  try {
    const files = await readdir(resultsDir, { withFileTypes: true });
    const results: EvaluationResult[] = [];

    for (const file of files) {
      if (file.isFile() && file.name.endsWith(".json")) {
        const filePath = path.join(resultsDir, file.name);
        const content = await readFile(filePath, "utf8");
        const result = JSON.parse(content) as EvaluationResult;
        results.push(result);
      }
    }

    return results;
  } catch {
    // Directory doesn't exist yet
    return [];
  }
}
