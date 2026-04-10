import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST() {
  const killed: string[] = [];

  // Stop ingest process first
  if (global.__ingestProcess && !global.__ingestProcess.killed) {
    global.__ingestProcess.kill("SIGTERM");
    global.__ingestProcess = null;
    killed.push("ingest");
  }

  // Stop ML server
  if (global.__mlServerProcess && !global.__mlServerProcess.killed) {
    global.__mlServerProcess.kill("SIGTERM");
    global.__mlServerProcess = null;
    killed.push("ml-server");
  }

  // Clean up Supabase realtime data (sensor_readings + anomaly_events)
  const supabase = getSupabaseAdmin();
  await supabase.from("anomaly_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("sensor_readings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Reset device RUL and status
  await supabase
    .from("devices")
    .update({ current_rul: null, status: "active", last_seen: null })
    .neq("id", "");

  return NextResponse.json({
    status: "stopped",
    message: `Scriptler durduruldu (${killed.join(", ")}). Supabase verileri temizlendi.`,
    killed,
  });
}
