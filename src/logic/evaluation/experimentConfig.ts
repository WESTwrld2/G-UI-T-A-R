export type ExperimentConfig = {
  model: "openai" | "gemini";
  promptMode: "naive" | "structured";
  repairEnabled: boolean;
  iterations: number;
  maxRepairPasses: number;
};

export const DEFAULT_CONFIG: ExperimentConfig = {
  model: "openai",
  promptMode: "structured",
  repairEnabled: true,
  iterations: 1,
  maxRepairPasses: 3,
};
