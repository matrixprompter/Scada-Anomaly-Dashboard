import { NextRequest, NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  const anomalyId = request.nextUrl.searchParams.get("anomaly_id");

  try {
    const url = new URL("/shap-values", ML_API_URL);
    if (anomalyId) url.searchParams.set("anomaly_id", anomalyId);

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      return NextResponse.json({ error: "ML API error" }, { status: response.status });
    }
    const result = await response.json();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "ML API baglanti hatasi" },
      { status: 503 }
    );
  }
}
