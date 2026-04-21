import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: tasks } = await supabaseServer
      .from("learning_tasks")
      .select("id,status")
      .eq("user_id", userId);

    const totalTasks = tasks?.length || 0;
    const completedTasks = (tasks || []).filter((t) => t.status === "completed").length;
    const taskCompletion = totalTasks > 0 ? completedTasks / totalTasks : 0;

    const { data: attempts } = await supabaseServer
      .from("learning_attempts")
      .select("correct_count,total_count,created_at")
      .eq("user_id", userId);
    const quizScore =
      attempts && attempts.length > 0
        ? attempts.reduce((acc, a) => acc + (a.total_count > 0 ? a.correct_count / a.total_count : 0), 0) / attempts.length
        : 0;

    const last14 = new Date();
    last14.setDate(last14.getDate() - 13);
    const activeDays = new Set(
      (attempts || [])
        .filter((a) => new Date(a.created_at) >= last14)
        .map((a) => String(a.created_at).slice(0, 10))
    ).size;
    const consistency = activeDays / 14;

    const { data: reflections } = await supabaseServer
      .from("learning_reflections")
      .select("id")
      .eq("user_id", userId);
    const reflectionCompletion =
      totalTasks > 0 ? Math.min(1, (reflections?.length || 0) / totalTasks) : reflections && reflections.length > 0 ? 1 : 0;

    const completionScore =
      0.4 * taskCompletion + 0.3 * quizScore + 0.2 * consistency + 0.1 * reflectionCompletion;

    return NextResponse.json({
      completionScore: Number((completionScore * 100).toFixed(1)),
      breakdown: {
        taskCompletion: Number((taskCompletion * 100).toFixed(1)),
        quizScore: Number((quizScore * 100).toFixed(1)),
        consistency: Number((consistency * 100).toFixed(1)),
        reflectionCompletion: Number((reflectionCompletion * 100).toFixed(1)),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      completionScore: 0,
      breakdown: { taskCompletion: 0, quizScore: 0, consistency: 0, reflectionCompletion: 0 },
    });
  }
}
