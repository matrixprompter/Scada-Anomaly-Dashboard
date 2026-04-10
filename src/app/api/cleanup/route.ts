import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function DELETE() {
  const supabaseAdmin = getSupabaseAdmin();

  // Eski sensor_readings ve anomaly_events'i temizle
  await supabaseAdmin.from("anomaly_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabaseAdmin.from("sensor_readings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({ status: "ok", message: "Veriler temizlendi" });
}
