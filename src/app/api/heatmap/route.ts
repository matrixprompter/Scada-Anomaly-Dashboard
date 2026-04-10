import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id");
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "7", 10);

  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  let query = supabase
    .from("sensor_readings")
    .select("timestamp, sensor_data, anomaly_score, is_anomaly")
    .gte("timestamp", since)
    .eq("is_anomaly", true)
    .order("timestamp", { ascending: true });

  if (deviceId) query = query.eq("device_id", deviceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // sensor x saat matrisi olustur
  const sensors = [
    "temperature_inlet", "temperature_outlet", "pressure_main",
    "pressure_secondary", "flow_rate_steam", "flow_rate_water",
    "vibration_turbine", "vibration_pump", "rpm_turbine", "power_output",
  ];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const matrix: number[][] = sensors.map(() => new Array(24).fill(0));

  for (const row of data ?? []) {
    const hour = new Date(row.timestamp).getHours();
    const sensorData = row.sensor_data as Record<string, number>;
    sensors.forEach((s, si) => {
      if (sensorData[s] !== undefined) matrix[si][hour]++;
    });
  }

  return NextResponse.json({ matrix, sensors, hours });
}
