import { NextResponse } from "next/server";
import { userConstraintsSchema } from "@/logic/schema/userConstraints.zod";
import { generateWithOpenAI } from "@/logic/llm/openai"; // You can switch to generateWithGemini if you want to use Gemini instead
import { validateTokens } from "@/logic/validate/validateTokens";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = userConstraintsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid user constraints" },
        { status: 400 }
      );
    }

    const userConstraints = parsed.data;

    const tokens = await generateWithOpenAI(userConstraints);

    const report = validateTokens(tokens, userConstraints);

    return NextResponse.json({
      ok: true,
      tokens,
      report
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}