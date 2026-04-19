import type { ValidationReport } from "@/logic/validate/validateTokens";

export type EvaluationMetrics = {
  contrastScore: number;      // 0–1: fraction of contrast pairs with ok: true
  typographyScore: number;    // 0–1: 1 if all typography items ok, scaled down per failure
  schemaValid: boolean;
  schemaErrorCount: number;
  violationCount: number;     // system failures (contrast + typography + spacing combined)
  aggregateScore: number;     // (contrastScore * 0.4) + (typographyScore * 0.3) + (schemaValid ? 0.3 : 0)
};

export function computeMetrics(report: ValidationReport): EvaluationMetrics {
  const schemaValid = report.schema.ok;
  const schemaErrorCount = report.schema.errors.length;

  // Contrast score: fraction of items passing
  const contrastItems = report.system.contrast;
  const contrastPassing = contrastItems.filter((item) => item.ok).length;
  const contrastScore = contrastItems.length > 0 ? contrastPassing / contrastItems.length : 1;

  // Typography score: fraction of items passing
  const typographyItems = report.system.typography;
  const typographyPassing = typographyItems.filter((item) => item.ok).length;
  const typographyScore = typographyItems.length > 0 ? typographyPassing / typographyItems.length : 1;

  // Total violation count
  const violationCount = report.summary.systemFailures + (schemaValid ? 0 : schemaErrorCount);

  // Aggregate score
  const schemaComponent = schemaValid ? 0.3 : 0;
  const aggregateScore = contrastScore * 0.4 + typographyScore * 0.3 + schemaComponent;

  return {
    contrastScore,
    typographyScore,
    schemaValid,
    schemaErrorCount,
    violationCount,
    aggregateScore,
  };
}
