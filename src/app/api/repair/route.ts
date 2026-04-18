import { NextResponse } from "next/server";
import { userConstraintsSchema } from "@/logic/schema/userConstraints.zod";
import { compileTokens } from "@/logic/compile/compileTokens";
import { repairTokens } from "@/logic/repair/repairTokens";
import { validateTokens } from "@/logic/validate/validateTokens";
import { updateRunHistoryWithRepair } from "@/logic/history/runHistory.server";

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
    const parsed = userConstraintsSchema.safeParse(body?.userConstraints);

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

    const constraints = parsed.data;
    const tokens = body?.tokens;
    if (!tokens) {
      return NextResponse.json(
        { ok: false, error: "Missing generated tokens for repair." },
        { status: 400 }
      );
    }

    const report = validateTokens(tokens, constraints);
    const repaired = repairTokens(tokens, constraints, report);
    const finalReport = validateTokens(repaired.tokens, constraints);
    const { cssVars } = compileTokens(repaired.tokens, constraints);
    const repair = {
      applied: repaired.changes.length > 0,
      changes: repaired.changes,
      diffs: repaired.diffs,
    };

    const run =
      typeof body?.runId === "string" && body.runId.trim().length > 0
        ? await updateRunHistoryWithRepair(body.runId, {
            repair,
            repairedTokens: repaired.tokens,
            validationReport: finalReport,
            cssVars,
          })
        : null;

    return NextResponse.json({
      ok: true,
      tokens: repaired.tokens,
      report: finalReport,
      cssVars,
      repair,
      run,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
