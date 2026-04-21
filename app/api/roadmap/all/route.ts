import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ groups: [], message: "Unauthorized" }, { status: 401 });
    }

    const { data: goals, error: goalError } = await supabaseServer
      .from("goals")
      .select("id,goal_text,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (goalError) {
      return NextResponse.json({ groups: [], message: goalError.message }, { status: 500 });
    }

    const goalIds = (goals || []).map((goal) => goal.id);
    if (goalIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const { data: allSessions, error: sessionError } = await supabaseServer
      .from("roadmap_sessions")
      .select("id,goal_id,created_at")
      .eq("user_id", userId)
      .in("goal_id", goalIds)
      .order("created_at", { ascending: false });
    if (sessionError) {
      return NextResponse.json({ groups: [], message: sessionError.message }, { status: 500 });
    }

    const latestSessionByGoal = new Map<string, { id: string; goal_id: string }>();
    for (const session of allSessions || []) {
      if (!session.goal_id) continue;
      if (!latestSessionByGoal.has(session.goal_id)) {
        latestSessionByGoal.set(session.goal_id, session);
      }
    }

    const sessionIds = Array.from(latestSessionByGoal.values()).map((session) => session.id);
    const { data: allSteps, error: stepError } = sessionIds.length
      ? await supabaseServer
          .from("roadmap")
          .select("*")
          .in("session_id", sessionIds)
          .order("order_index")
      : { data: [], error: null };
    if (stepError) {
      return NextResponse.json({ groups: [], message: stepError.message }, { status: 500 });
    }

    const stepsBySession = new Map<string, unknown[]>();
    for (const step of allSteps || []) {
      const list = stepsBySession.get(step.session_id) || [];
      list.push(step);
      stepsBySession.set(step.session_id, list);
    }

    const groups = (goals || []).map((goal) => {
      const session = latestSessionByGoal.get(goal.id);
      return {
        goal,
        sessionId: session?.id || null,
        roadmap: session ? stepsBySession.get(session.id) || [] : [],
      };
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ groups: [], message: "Failed to fetch all roadmaps." }, { status: 500 });
  }
}
