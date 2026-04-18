import { NextResponse } from "next/server";
import { readRunArtifact } from "@/logic/history/runHistory.server";

type Params = {
  params: Promise<{ runId: string; artifactId: string }>;
};

export async function GET(_: Request, context: Params) {
  try {
    const { runId, artifactId } = await context.params;
    const payload = await readRunArtifact(runId, artifactId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load artifact.";
    const status =
      message.includes("not found") || message.includes("ENOENT") || message.includes("Unsafe")
        ? 404
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
