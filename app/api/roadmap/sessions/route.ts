import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function GET(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ sessions: [], steps: [], message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const { data: sessions, error: sessionError } = await supabaseServer
      .from("roadmap_sessions")
      .select("id, subject, level, created_at")
      .eq("user_id", userId)
      .neq("subject", "General")
      .order("created_at", { ascending: false });

    if (sessionError) {
      return NextResponse.json({ sessions: [], steps: [], message: sessionError.message }, { status: 500 });
    }

    const selectedSessionId = sessionId || sessions?.[0]?.id;
    if (!selectedSessionId) {
      return NextResponse.json({ sessions: [], steps: [] });
    }

    const { data: steps, error: stepError } = await supabaseServer
      .from("roadmap")
      .select("*")
      .eq("session_id", selectedSessionId)
      .order("order_index");

    if (stepError) {
      return NextResponse.json({ sessions: sessions || [], steps: [], message: stepError.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [], steps: steps || [], selectedSessionId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ sessions: [], steps: [], message: "Failed to fetch roadmap sessions." }, { status: 500 });
  }
}
