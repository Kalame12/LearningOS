import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function POST(req: Request) {
  try {
    const { stepId } = await req.json();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabaseServer
      .from("learning_tasks")
      .select("id")
      .eq("roadmap_step_id", stepId)
      .eq("user_id", userId)
      .eq("due_date", today)
      .maybeSingle();

    if (existing) return NextResponse.json({ taskId: existing.id });

    const { data: stepRow } = await supabaseServer
      .from("roadmap")
      .select("step, type, session_id")
      .eq("id", stepId)
      .single();

    if (!stepRow) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    const { data: session } = await supabaseServer
      .from("roadmap_sessions")
      .select("id,user_id")
      .eq("id", stepRow.session_id)
      .single();
    if (!session || session.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: task } = await supabaseServer
      .from("learning_tasks")
      .insert({
        user_id: userId,
        roadmap_step_id: stepId,
        topic: stepRow.step,
        task_type: stepRow.type || "learn",
        status: "pending",
        priority_score: 0.8,
        estimated_minutes: 40,
        due_date: today,
      })
      .select("id")
      .single();

    return NextResponse.json({ taskId: task?.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
