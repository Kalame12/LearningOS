import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function PATCH(req: Request) {
  try {
    const { stepId, step } = await req.json();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!stepId || !step) {
      return NextResponse.json({ error: "stepId and step required" }, { status: 400 });
    }

    const { data: roadmapRow, error: roadmapErr } = await supabaseServer
      .from("roadmap")
      .select("id,session_id")
      .eq("id", stepId)
      .single();
    if (roadmapErr || !roadmapRow) {
      return NextResponse.json({ error: "Roadmap step not found" }, { status: 404 });
    }

    const { data: session } = await supabaseServer
      .from("roadmap_sessions")
      .select("id,user_id")
      .eq("id", roadmapRow.session_id)
      .single();
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseServer
      .from("roadmap")
      .update({ step })
      .eq("id", stepId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
