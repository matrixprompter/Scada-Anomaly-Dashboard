import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const periodA = request.nextUrl.searchParams.get("period_a") ?? "this_week";
  const periodB = request.nextUrl.searchParams.get("period_b") ?? "last_week";

  const supabase = getSupabaseAdmin();
  const now = new Date();

  function getRange(period: string): [string, string] {
    const d = new Date(now);
    switch (period) {
      case "this_week":
        d.setDate(d.getDate() - 7);
        return [d.toISOString(), now.toISOString()];
      case "last_week":
        const end = new Date(now); end.setDate(end.getDate() - 7);
        d.setDate(d.getDate() - 14);
        return [d.toISOString(), end.toISOString()];
      case "this_month":
        d.setDate(d.getDate() - 30);
        return [d.toISOString(), now.toISOString()];
      case "last_month":
        const end2 = new Date(now); end2.setDate(end2.getDate() - 30);
        d.setDate(d.getDate() - 60);
        return [d.toISOString(), end2.toISOString()];
      default:
        d.setDate(d.getDate() - 7);
        return [d.toISOString(), now.toISOString()];
    }
  }

  async function getPeriodStats(from: string, to: string) {
    const { data, count } = await supabase
      .from("anomaly_events")
      .select("severity, sensor_values, shap_top_feature", { count: "exact" })
      .gte("detected_at", from)
      .lte("detected_at", to);

    const total = count ?? 0;
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const featureCount: Record<string, number> = {};

    for (const row of data ?? []) {
      bySeverity[row.severity]++;
      if (row.shap_top_feature) {
        featureCount[row.shap_top_feature] = (featureCount[row.shap_top_feature] || 0) + 1;
      }
    }

    const topFeature = Object.entries(featureCount).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      by_severity: bySeverity,
      top_sensor: topFeature ? topFeature[0] : null,
    };
  }

  const [fromA, toA] = getRange(periodA);
  const [fromB, toB] = getRange(periodB);

  const [statsA, statsB] = await Promise.all([
    getPeriodStats(fromA, toA),
    getPeriodStats(fromB, toB),
  ]);

  return NextResponse.json({
    period_a: { period: periodA, ...statsA },
    period_b: { period: periodB, ...statsB },
    diff: {
      anomaly_count: statsA.total - statsB.total,
    },
  });
}
