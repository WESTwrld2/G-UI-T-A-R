import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TEST_DATASET } from "@/logic/evaluation/dataset";
import { DEFAULT_CONFIG, type ExperimentConfig } from "@/logic/evaluation/experimentConfig";
import { runSingleEvaluation } from "@/logic/evaluation/runner";
import { logResult, type EvaluationResult } from "@/logic/evaluation/resultsLogger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { config?: Partial<ExperimentConfig>; datasetSlice?: number };

    // Merge request config with defaults
    const config: ExperimentConfig = {
      ...DEFAULT_CONFIG,
      ...body.config,
    };

    // Determine how many test cases to run
    const datasetSlice = body.datasetSlice ?? TEST_DATASET.length;
    const testCases = TEST_DATASET.slice(0, Math.min(datasetSlice, TEST_DATASET.length));

    // Run evaluations sequentially
    const results: EvaluationResult[] = [];
    for (const testCase of testCases) {
      const result = await runSingleEvaluation(testCase, config);
      await logResult(result);
      results.push(result);
    }

    // Compute summary statistics
    let sumAggregateBefore = 0;
    let sumAggregateAfter = 0;
    let sumViolationReduction = 0;
    let schemaFailureCount = 0;

    for (const result of results) {
      sumAggregateBefore += result.metricsBefore.aggregateScore;
      if (result.metricsAfter) {
        sumAggregateAfter += result.metricsAfter.aggregateScore;
      } else {
        sumAggregateAfter += result.metricsBefore.aggregateScore;
      }
      sumViolationReduction += result.violationReduction;
      if (!result.metricsBefore.schemaValid) {
        schemaFailureCount += 1;
      }
    }

    const resultCount = results.length;
    const avgAggregateBefore = resultCount > 0 ? sumAggregateBefore / resultCount : 0;
    const avgAggregateAfter = resultCount > 0 ? sumAggregateAfter / resultCount : 0;
    const avgViolationReduction = resultCount > 0 ? sumViolationReduction / resultCount : 0;
    const schemaFailureRate = resultCount > 0 ? schemaFailureCount / resultCount : 0;

    return NextResponse.json({
      ok: true,
      runCount: resultCount,
      results,
      summary: {
        avgAggregateBefore,
        avgAggregateAfter,
        avgViolationReduction,
        schemaFailureRate,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
