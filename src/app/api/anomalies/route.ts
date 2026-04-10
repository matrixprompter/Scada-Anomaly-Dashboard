import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const severity = searchParams.get("severity");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from("anomaly_events")
    .select("*", { count: "exact" })
    .order("detected_at", { ascending: false });

  if (severity) query = query.eq("severity", severity);
  if (from) query = query.gte("detected_at", from);
  if (to) query = query.lte("detected_at", to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("anomaly_events")
    .insert({
      device_id: body.device_id,
      severity: body.severity,
      sensor_values: body.sensor_values,
      shap_top_feature: body.shap_top_feature ?? null,
      model_version: body.model_version ?? "v1.0.0",
      detected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
