import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

export async function POST() {
  const stopped: string[] = [];

  // 1. Stop ingest on ML API
  try {
    const res = await fetch(`${ML_API_URL}/stop-ingest`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) stopped.push("ingest");
  } catch {
    // ML API might not be reachable, continue with cleanup
  }

  // 2. Clean up Supabase realtime data (sensor_readings + anomaly_events)
  const supabase = getSupabaseAdmin();
  await supabase.from("anomaly_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("sensor_readings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 3. Reset device RUL and status
  await supabase
    .from("devices")
    .update({ current_rul: null, status: "active", last_seen: null })
    .neq("id", "");

  stopped.push("supabase-cleanup");

  return NextResponse.json({
    status: "stopped",
    message: `Durduruldu (${stopped.join(", ")}). Supabase verileri temizlendi.`,
    killed: stopped,
  });
}
