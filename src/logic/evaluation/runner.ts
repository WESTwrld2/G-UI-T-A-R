import type { UserConstraints } from "@/logic/schema/userConstraints.zod";
import type { DesignTokens } from "@/logic/schema/tokens.types";
import { buildPrompt } from "@/logic/llm/buildPromptV2";
import { generateWithOpenAI } from "@/logic/llm/openai";
import { generateWithGemini } from "@/logic/llm/gemini";
import { buildFinalTokens } from "@/logic/utilities/generation/buildFinalTokens";
import { validateTokens } from "@/logic/validate/validateTokens";
import { repairTokens } from "@/logic/repair/repairTokens";
import { computeMetrics } from "@/logic/evaluation/computeMetrics";
import type { EvaluationMetrics } from "@/logic/evaluation/computeMetrics";
import type { EvaluationResult } from "@/logic/evaluation/resultsLogger";
import type { ExperimentConfig } from "@/logic/evaluation/experimentConfig";
import type { TestCase } from "@/logic/evaluation/dataset";

export async function runSingleEvaluation(
  testCase: TestCase,
  config: ExperimentConfig
): Promise<EvaluationResult> {
  const runId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  let metricsBefore: EvaluationMetrics;
  let metricsAfter: EvaluationMetrics | null = null;

  try {
    // Step 1: Pick prompt builder
    const prompt = buildPrompt(testCase.constraints, config.promptMode);

    // Step 2: Call LLM
    let llmResponse: unknown;
    if (config.model === "openai") {
      const result = await generateWithOpenAI(testCase.constraints);
      llmResponse = result.tokens;
    } else {
      llmResponse = await generateWithGemini(testCase.constraints);
    }

    // Step 3: Build final tokens
    const buildResult = buildFinalTokens(llmResponse, testCase.constraints);
    const initialTokens = buildResult.tokens;

    // Step 4: Validate initial tokens
    let currentValidation = validateTokens(initialTokens, testCase.constraints);
    metricsBefore = computeMetrics(currentValidation);

    let currentTokens = initialTokens;

    // Step 5: Repair loop if enabled
    if (config.repairEnabled) {
      for (let pass = 0; pass < config.maxRepairPasses; pass++) {
        if (currentValidation.summary.systemFailures === 0) {
          break;
        }

        // Repair tokens
        const repairResult = repairTokens(currentTokens, testCase.constraints, currentValidation);
        currentTokens = repairResult.tokens;

        // Re-validate
        currentValidation = validateTokens(currentTokens, testCase.constraints);

        // Check if we're done
        if (currentValidation.summary.systemFailures === 0) {
          break;
        }
      }

      metricsAfter = computeMetrics(currentValidation);
    }

    // Calculate violation reduction
    const violationReduction = metricsBefore.violationCount - (metricsAfter?.violationCount ?? metricsBefore.violationCount);

    return {
      runId,
      inputId: testCase.id,
      model: config.model,
      promptMode: config.promptMode,
      repaired: config.repairEnabled,
      metricsBefore,
      metricsAfter,
      violationReduction,
      timestamp,
    };
  } catch (error) {
    // On error, return a result with schema validation failure
    const errorMetrics: EvaluationMetrics = {
      contrastScore: 0,
      typographyScore: 0,
      schemaValid: false,
      schemaErrorCount: 1,
      violationCount: 999,
      aggregateScore: 0,
    };

    return {
      runId,
      inputId: testCase.id,
      model: config.model,
      promptMode: config.promptMode,
      repaired: config.repairEnabled,
      metricsBefore: errorMetrics,
      metricsAfter: config.repairEnabled ? errorMetrics : null,
      violationReduction: 0,
      timestamp,
    };
  }
}
