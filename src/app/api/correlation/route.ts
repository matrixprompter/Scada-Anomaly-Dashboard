import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id");

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("sensor_readings")
    .select("sensor_data")
    .order("timestamp", { ascending: false })
    .limit(500);

  if (deviceId) query = query.eq("device_id", deviceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const labels = [
    "temperature_inlet", "temperature_outlet", "pressure_main",
    "pressure_secondary", "flow_rate_steam", "flow_rate_water",
    "vibration_turbine", "vibration_pump", "rpm_turbine", "power_output",
  ];

  // Sensor degerlerini topla
  const columns: number[][] = labels.map(() => []);
  for (const row of data ?? []) {
    const sd = row.sensor_data as Record<string, number>;
    labels.forEach((l, i) => {
      if (sd[l] !== undefined) columns[i].push(sd[l]);
    });
  }

  // Pearson korelasyon matrisi
  const n = labels.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { matrix[i][j] = 1; continue; }
      const a = columns[i], b = columns[j];
      const len = Math.min(a.length, b.length);
      if (len < 2) { matrix[i][j] = 0; continue; }
      const meanA = a.slice(0, len).reduce((s, v) => s + v, 0) / len;
      const meanB = b.slice(0, len).reduce((s, v) => s + v, 0) / len;
      let num = 0, denA = 0, denB = 0;
      for (let k = 0; k < len; k++) {
        const da = a[k] - meanA, db = b[k] - meanB;
        num += da * db; denA += da * da; denB += db * db;
      }
      const den = Math.sqrt(denA * denB);
      matrix[i][j] = den > 0 ? Math.round((num / den) * 100) / 100 : 0;
    }
  }

  return NextResponse.json({ matrix, labels });
}
