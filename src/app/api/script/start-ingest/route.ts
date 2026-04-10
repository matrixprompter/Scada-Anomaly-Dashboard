import { NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  // Determine the Next.js base URL for the ML API to call back
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const nextUrl = `${protocol}://${host}`;

  try {
    const res = await fetch(`${ML_API_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        next_url: nextUrl,
        units: 5,
        samples: 50,
        delay: 0.05,
      }),
      signal: AbortSignal.timeout(90000),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { status: "error", message: "ML API ile baglanti kurulamadi" },
      { status: 503 }
    );
  }
}

export const maxDuration = 120;
