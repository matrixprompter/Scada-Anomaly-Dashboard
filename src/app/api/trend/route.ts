import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7", 10);

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

  const { data, error } = await supabase
    .from("anomaly_events")
    .select("detected_at, severity")
    .gte("detected_at", since)
    .order("detected_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Onceki donem sayisi
  const { count: prevCount } = await supabase
    .from("anomaly_events")
    .select("*", { count: "exact", head: true })
    .gte("detected_at", prevSince)
    .lt("detected_at", since);

  // Gun bazinda gruplama
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    const day = row.detected_at.split("T")[0];
    if (!dailyMap[day]) dailyMap[day] = { critical: 0, high: 0, medium: 0, low: 0 };
    dailyMap[day][row.severity]++;
  }

  const trendData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  const currentCount = data?.length ?? 0;
  const prev = prevCount ?? 0;
  const changePct = prev > 0 ? ((currentCount - prev) / prev) * 100 : 0;

  return NextResponse.json({
    data: trendData,
    period: `${days}d`,
    change_pct: Math.round(changePct * 10) / 10,
  });
}
