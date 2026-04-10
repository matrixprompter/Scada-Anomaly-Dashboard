import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const deviceId = searchParams.get("device_id");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from("sensor_readings")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (deviceId) {
    query = query.eq("device_id", deviceId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("sensor_readings")
    .insert({
      device_id: body.device_id,
      timestamp: body.timestamp ?? new Date().toISOString(),
      sensor_data: body.sensor_data,
      anomaly_score: body.anomaly_score,
      is_anomaly: body.is_anomaly ?? false,
      rul_estimate: body.rul_estimate,
      shap_values: body.shap_values,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
