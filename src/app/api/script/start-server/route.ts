import { NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

export async function POST() {
  try {
    const res = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      return NextResponse.json({ status: "already_running", message: "ML API zaten calisiyor" });
    }
    return NextResponse.json(
      { status: "error", message: "ML API yanitlamiyor" },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { status: "error", message: `ML API erisilemedi: ${ML_API_URL}` },
      { status: 503 }
    );
  }
}
