import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { aggregateState, buildNextDayPlan } from "@/lib/brain";

export async function GET(req: Request) {
  try {
    new URL(req.url);
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ tasks: [], message: "Unauthorized" }, { status: 401 });
    }
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabaseServer
      .from("learning_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("due_date", today)
      .order("priority_score", { ascending: false });

    if (error) {
      return NextResponse.json({ tasks: [], message: error.message }, { status: 500 });
    }

    const tasks = data || [];
    if (tasks.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const { data: sessions } = await supabaseServer
      .from("roadmap_sessions")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    const sessionId = sessions?.[0]?.id;

    const { data: roadmap } = sessionId
      ? await supabaseServer
          .from("roadmap")
          .select("id,step,type,status,order_index")
          .eq("session_id", sessionId)
          .order("order_index")
      : { data: [] as any[] };

    const { data: masteryRows } = await supabaseServer
      .from("topic_mastery")
      .select("topic,mastery_score,next_review_date")
      .eq("user_id", userId);

    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const { data: yesterdayAttempts } = await supabaseServer
      .from("learning_attempts")
      .select("task_id,correct_count,total_count,hints_used,skipped_count,time_spent_minutes")
      .eq("user_id", userId)
      .gte("created_at", yesterdayStart.toISOString())
      .lte("created_at", yesterdayEnd.toISOString());

    const yesterdayTaskIds = (yesterdayAttempts || []).map((a) => a.task_id);
    const { data: yesterdayTasks } = await supabaseServer
      .from("learning_tasks")
      .select("id,topic,estimated_minutes")
      .in("id", yesterdayTaskIds.length > 0 ? yesterdayTaskIds : [""]);

    const state = aggregateState({
      steps: (roadmap || []) as any,
      masteryRows: (masteryRows || []) as any,
      yesterdayAttempts: (yesterdayAttempts || []) as any,
      yesterdayTasks: (yesterdayTasks || []) as any,
      today,
    });
    const planned = buildNextDayPlan({
      userId,
      steps: (roadmap || []) as any,
      state,
      today,
    });
    const explanationByTopic = new Map(planned.map((item) => [item.topic, item]));

    const decorated = tasks.map((task) => {
      const reason = explanationByTopic.get(task.topic);
      return {
        ...task,
        intervention: reason?.intervention,
        whyNow: reason?.whyNow || "Scheduled by the planner based on your current progress state.",
      };
    });

    return NextResponse.json({ tasks: decorated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ tasks: [], message: "Failed to fetch tasks." }, { status: 500 });
  }
}
