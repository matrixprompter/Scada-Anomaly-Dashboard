import { NextRequest, NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(`${ML_API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "ML API error" },
      { status: response.status }
    );
  }

  const result = await response.json();
  return NextResponse.json(result);
}
