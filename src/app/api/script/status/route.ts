import { NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

export async function GET() {
  let mlServer = false;
  let ingest = false;
  let mlServerError: string | undefined;

  // Check ML API health
  try {
    const healthRes = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(60000) });
    if (healthRes.ok) {
      mlServer = true;
    }
  } catch {
    mlServerError = `ML API erisilemedi: ${ML_API_URL}`;
  }

  // Check ingest status
  if (mlServer) {
    try {
      const ingestRes = await fetch(`${ML_API_URL}/ingest-status`, { signal: AbortSignal.timeout(30000) });
      if (ingestRes.ok) {
        const data = await ingestRes.json();
        ingest = data.running;
      }
    } catch {
      // Ingest status check failed, assume not running
    }
  }

  return NextResponse.json({
    mlServer,
    ingest,
    mlServerError,
  });
}
