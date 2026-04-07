import { NextResponse } from "next/server";
import { userConstraintsSchema } from "@/logic/schema/userConstraints.zod";
import { generateWithOpenAI } from "@/logic/llm/openai";
import { validateTokens } from "@/logic/validate/validateTokens";
import { compileTokens } from "@/logic/compile/compileTokens";
import { repairTokens } from "@/logic/repair/repairTokens";
import { assessThemeDescription } from "@/logic/llm/themeDescriptionAssessment";
import type { GenerationReport } from "@/logic/schema/generationReport.types";
import { buildFinalTokens } from "@/logic/utilities/generation/buildFinalTokens";

function formatConstraintIssues(parsed: ReturnType<typeof userConstraintsSchema.safeParse>) {
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = userConstraintsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid user constraints",
          issues: formatConstraintIssues(parsed),
        },
        { status: 400 }
      );
    }

    const userConstraints = parsed.data;
    const descriptionAssessment = assessThemeDescription(userConstraints.themeDescription);

    const generated = await generateWithOpenAI(userConstraints);
    const built = buildFinalTokens(generated, userConstraints);

    let tokens = built.tokens;
    let report = validateTokens(tokens, userConstraints);
    let repairs: string[] = [];
    let repairDiffs = [] as Array<{ path: string; before: string; after: string; reason: string }>;

    if (!report.summary.systemPass && report.summary.repairable) {
      const repaired = repairTokens(tokens, userConstraints, report);
      tokens = repaired.tokens;
      repairs = repaired.changes;
      repairDiffs = repaired.diffs;
      report = validateTokens(tokens, userConstraints);
    }

    const { cssVars } = compileTokens(tokens, userConstraints);

    const generationReport: GenerationReport = {
      inferred: built.inferred,
      defaults: built.defaults,
      sources: built.sources,
      repairs,
      repairDiffs,
    };

    if (repairs.length > 0) {
      generationReport.sources.push({
        path: "tokens.*",
        source: "repair",
        detail: "Post-generation repair adjusted one or more tokens.",
      });
    }

    return NextResponse.json({
      ok: true,
      tokens,
      report,
      cssVars,
      descriptionAssessment,
      generationReport,
      repair: {
        applied: repairs.length > 0,
        changes: repairs,
        diffs: repairDiffs,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
