import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { device_id, current_rul } = body;

  if (!device_id) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const updateData: Record<string, unknown> = { last_seen: new Date().toISOString() };
  if (current_rul !== undefined) updateData.current_rul = current_rul;
  if (body.sensor_count !== undefined) updateData.sensor_count = body.sensor_count;
  if (body.status !== undefined) updateData.status = body.status;

  const { data, error } = await supabaseAdmin
    .from("devices")
    .update(updateData)
    .eq("id", device_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
