import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { calculatePriority } from "@/lib/tier1";
import { getAuthenticatedUserId } from "@/lib/auth-user";

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

    const masteryMap = new Map(
      (masteryRows || []).map((row) => [String(row.topic).toLowerCase(), row])
    );

    const firstPendingIndex = steps.findIndex((step) => step.status === "not_started");
    const nextSteps = steps.slice(Math.max(0, firstPendingIndex), Math.max(0, firstPendingIndex) + 4);
    const candidates = nextSteps.length > 0 ? nextSteps : steps.slice(0, 4);

    const taskRows: TaskInsertRow[] = candidates.map((step, idx) => {
      const mastery = masteryMap.get(step.step.toLowerCase());
      const reviewDue = mastery?.next_review_date
        ? mastery.next_review_date <= today
        : false;
      const weakness = mastery ? 1 - Number(mastery.mastery_score || 0) : 0.5;
      const score = calculatePriority({
        isRoadmapNext: idx < 2,
        reviewDue,
        weaknessScore: weakness,
      });
      const inferredType = reviewDue ? "revise" : step.type || "learn";

      return {
        user_id: userId,
        roadmap_step_id: step.id,
        topic: step.step,
        task_type: inferredType as "learn" | "practice" | "revise",
        status: "pending",
        priority_score: score,
        estimated_minutes: inferredType === "learn" ? 40 : 25,
        due_date: today,
      };
    });

    // If mastery is weak, inject prerequisite review task from previous roadmap step.
    const prerequisiteRows: TaskInsertRow[] = [];
    for (const step of candidates) {
      const mastery = masteryMap.get(step.step.toLowerCase());
      if (!mastery || Number(mastery.mastery_score ?? 1) >= 0.5) continue;
      const previous = steps.find((s) => s.order_index === step.order_index - 1);
      if (!previous) continue;
      prerequisiteRows.push({
        user_id: userId,
        roadmap_step_id: previous.id,
        topic: `${previous.step} (Prerequisite Review)`,
        task_type: "revise",
        status: "pending",
        priority_score: 0.98,
        estimated_minutes: 20,
        due_date: today,
      });
    }

    const uniqueRows = [...prerequisiteRows, ...taskRows]
      .filter((row, index, arr) => arr.findIndex((x) => x.topic === row.topic) === index)
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 5);

    const { data: inserted, error: insertError } = await supabaseServer
      .from("learning_tasks")
      .insert(uniqueRows)
      .select("*");

    if (insertError) {
      return NextResponse.json(
        { tasks: [], message: `Failed to persist tasks: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: inserted || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ tasks: [], message: "Could not generate tasks." }, { status: 500 });
  }
}
