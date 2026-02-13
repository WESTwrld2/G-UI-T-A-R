import { NextResponse } from "next/server";
import { userConstraintsSchema } from "@/logic/schema/userConstraints.zod";
import { validateTokens } from "@/logic/validate/validateTokens";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = userConstraintsSchema.safeParse(body?.userConstraints);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid userConstraints",
          issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }

    const report = validateTokens(body?.tokens, parsed.data);

    return NextResponse.json({ ok: true, report });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: "Failed to validate", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
