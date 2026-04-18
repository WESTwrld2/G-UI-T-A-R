import { NextResponse } from "next/server";
import {
  constraintDraftSchema,
  userConstraintsSchema,
} from "@/logic/schema/userConstraints.zod";
import { resolveConstraintDraft } from "@/logic/constraints/resolveConstraintDraft";

function formatConstraintIssues(
  parsed:
    | ReturnType<typeof userConstraintsSchema.safeParse>
    | ReturnType<typeof constraintDraftSchema.safeParse>
) {
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = constraintDraftSchema.safeParse(body);

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

    const resolved = resolveConstraintDraft(parsed.data);
    const validated = userConstraintsSchema.safeParse(resolved);

    if (!validated.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Resolved constraints were invalid",
          issues: formatConstraintIssues(validated),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, userConstraints: validated.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
