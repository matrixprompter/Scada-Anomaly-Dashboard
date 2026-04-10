import { NextResponse } from "next/server";

export async function GET() {
  const mlRunning = !!(global.__mlServerProcess && !global.__mlServerProcess.killed);
  const ingestRunning = !!(global.__ingestProcess && !global.__ingestProcess.killed);

  return NextResponse.json({
    mlServer: mlRunning,
    ingest: ingestRunning,
    mlServerError: !mlRunning ? (global.__mlServerStderr || "").slice(-300) : undefined,
    ingestError: !ingestRunning ? (global.__ingestStderr || "").slice(-300) : undefined,
  });
}
