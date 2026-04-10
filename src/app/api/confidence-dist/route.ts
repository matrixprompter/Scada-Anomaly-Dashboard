import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("anomaly_score")
    .not("anomaly_score", "is", null)
    .order("timestamp", { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 0.0-1.0 arasi 0.1 adimla bins
  const bins = Array.from({ length: 10 }, (_, i) => `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`);
  const counts = new Array(10).fill(0);

  for (const row of data ?? []) {
    const score = row.anomaly_score as number;
    const idx = Math.min(Math.floor(score * 10), 9);
    counts[idx]++;
  }

  return NextResponse.json({ bins, counts, threshold: 0.5 });
}
