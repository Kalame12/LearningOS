import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { aggregateState, buildNextDayPlan } from "@/lib/brain";

type RoadmapStep = {
  id: string;
  step: string;
  type: "learn" | "practice" | "revise";
  status: string;
  order_index: number;
};

type TaskInsertRow = {
  user_id: string;
  roadmap_step_id: string;
  topic: string;
  task_type: "learn" | "practice" | "revise";
  status: "pending";
  priority_score: number;
  estimated_minutes: number;
  due_date: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ tasks: [], message: "Unauthorized" }, { status: 401 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const forceRegenerate = Boolean(body?.force);

    if (forceRegenerate) {
      await supabaseServer
        .from("learning_tasks")
        .delete()
        .eq("user_id", userId)
        .eq("due_date", today);
    }

    const { data: existing, error: existingError } = await supabaseServer
      .from("learning_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("due_date", today)
      .order("priority_score", { ascending: false });

    if (!existingError && existing && existing.length > 0) {
      return NextResponse.json({ tasks: existing });
    }

    const { data: sessions } = await supabaseServer
      .from("roadmap_sessions")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const sessionId = sessions?.[0]?.id;
    if (!sessionId) {
      return NextResponse.json({ tasks: [], message: "No roadmap session found." });
    }

    const { data: roadmap } = await supabaseServer
      .from("roadmap")
      .select("id,step,type,status,order_index")
      .eq("session_id", sessionId)
      .order("order_index");

    const steps = (roadmap || []) as RoadmapStep[];
    if (steps.length === 0) {
      return NextResponse.json({ tasks: [], message: "No roadmap steps found." });
    }

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
      steps,
      masteryRows: masteryRows || [],
      yesterdayAttempts: yesterdayAttempts || [],
      yesterdayTasks: yesterdayTasks || [],
      today,
    });
    const planned = buildNextDayPlan({ userId, steps, state, today });
    const finalRows: TaskInsertRow[] = planned.map((task) => ({
      user_id: userId,
      roadmap_step_id: task.roadmap_step_id,
      topic: task.topic,
      task_type: task.task_type,
      status: "pending",
      priority_score: task.priority_score,
      estimated_minutes: task.estimated_minutes,
      due_date: today,
    }));

    const { data: inserted, error: insertError } = await supabaseServer
      .from("learning_tasks")
      .insert(finalRows)
      .select("*");

    if (insertError) {
      return NextResponse.json(
        { tasks: [], message: `Failed to persist tasks: ${insertError.message}` },
        { status: 500 }
      );
    }

    const explanationMap = new Map(planned.map((item) => [item.topic, item]));
    const decorated = (inserted || []).map((task) => {
      const explanation = explanationMap.get(task.topic);
      return {
        ...task,
        intervention: explanation?.intervention,
        whyNow: explanation?.whyNow || "Selected to keep balanced momentum for today.",
      };
    });

    return NextResponse.json({ tasks: decorated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ tasks: [], message: "Could not generate tasks." }, { status: 500 });
  }
}
