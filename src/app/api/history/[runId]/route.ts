import { NextResponse } from "next/server";
import { getRunHistoryManifest } from "@/logic/history/runHistory.server";

type Params = {
  params: Promise<{ runId: string }>;
};

export async function GET(_: Request, context: Params) {
  try {
    const { runId } = await context.params;
    const run = await getRunHistoryManifest(runId);
    return NextResponse.json({ ok: true, run });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load run.";
    const status = message.includes("ENOENT") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
