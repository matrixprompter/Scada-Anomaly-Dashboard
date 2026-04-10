import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const embeddingParam = searchParams.get("embedding");
  const limit = parseInt(searchParams.get("limit") ?? "5", 10);

  if (!embeddingParam) {
    return NextResponse.json(
      { error: "embedding parameter is required" },
      { status: 400 }
    );
  }

  const embedding = JSON.parse(embeddingParam) as number[];
  const supabaseAdmin = getSupabaseAdmin();

  // pgvector cosine similarity search
  const { data, error } = await supabaseAdmin.rpc("match_similar_anomalies", {
    query_embedding: embedding,
    match_count: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
