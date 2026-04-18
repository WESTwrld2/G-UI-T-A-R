import { NextResponse } from "next/server";
import { userConstraintsSchema } from "@/logic/schema/userConstraints.zod";
import { generateWithOpenAI } from "@/logic/llm/openai";
import { validateTokens } from "@/logic/validate/validateTokens";
import { compileTokens } from "@/logic/compile/compileTokens";
import { assessThemeDescription } from "@/logic/llm/themeDescriptionAssessment";
import type { GenerationReport } from "@/logic/schema/generationReport.types";
import { buildFinalTokens } from "@/logic/utilities/generation/buildFinalTokens";
import { createRunHistoryEntry } from "@/logic/history/runHistory.server";

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
    const userConstraints = body?.userConstraints ?? body;
    const provider = body?.provider ?? "openai";

    if (provider !== "openai") {
      return NextResponse.json(
        { ok: false, error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    const parsed = userConstraintsSchema.safeParse(userConstraints);
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

    const validatedConstraints = parsed.data;
    const descriptionAssessment = assessThemeDescription(validatedConstraints.themeDescription);
    const generated = await generateWithOpenAI(validatedConstraints);
    const built = buildFinalTokens(generated.tokens, validatedConstraints);
    const report = validateTokens(built.tokens, validatedConstraints);
    const { cssVars } = compileTokens(built.tokens, validatedConstraints);
    const run = await createRunHistoryEntry({
      userConstraints: validatedConstraints,
      prompt: generated.prompt,
      rawModelResponse: generated.raw,
      builtTokens: built.tokens,
      validationReport: report,
      cssVars,
      provider: generated.provider,
      model: generated.model,
    });

    const generationReport: GenerationReport = {
      inferred: built.inferred,
      defaults: built.defaults,
      sources: built.sources,
      repairs: [],
      repairDiffs: [],
    };

    return NextResponse.json({
      ok: true,
      tokens: built.tokens,
      report,
      cssVars,
      rawModelResponse: generated.raw,
      descriptionAssessment,
      generationReport,
      run,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
