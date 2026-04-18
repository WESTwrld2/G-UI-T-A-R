import { NextResponse } from "next/server";
import { listRunHistory } from "@/logic/history/runHistory.server";

export async function GET() {
  try {
    const runs = await listRunHistory();
    return NextResponse.json({ ok: true, runs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load run history.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
