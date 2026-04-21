import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

type DayData = {
  date: string;
  topics: string[];
  attempts: number;
  questionsAnswered: number;
};

export async function GET(req: Request) {
  try {
    new URL(req.url);
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ currentStreak: 0, longestStreak: 0, days: [], message: "Unauthorized" }, { status: 401 });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
    const since = ninetyDaysAgo.toISOString().slice(0, 10);

    const { data: attempts } = await supabaseServer
      .from("learning_attempts")
      .select("created_at, correct_count, total_count")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    const { data: tasks } = await supabaseServer
      .from("learning_tasks")
      .select("id, topic, created_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("created_at", since);

    const taskMap = new Map<string, string[]>();
    (tasks || []).forEach((t) => {
      const d = t.created_at.slice(0, 10);
      if (!taskMap.has(d)) taskMap.set(d, []);
      if (!taskMap.get(d)!.includes(t.topic)) taskMap.get(d)!.push(t.topic);
    });

    const dayMap = new Map<string, DayData>();
    (attempts || []).forEach((a) => {
      const d = a.created_at.slice(0, 10);
      if (!dayMap.has(d)) {
        dayMap.set(d, {
          date: d,
          topics: taskMap.get(d) || [],
          attempts: 0,
          questionsAnswered: 0,
        });
      }
      const day = dayMap.get(d)!;
      day.attempts += 1;
      day.questionsAnswered += a.total_count || 0;
    });

    const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const activeDates = new Set(days.map((d) => d.date));
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    const checkDate = new Date();

    while (true) {
      const d = checkDate.toISOString().slice(0, 10);
      if (activeDates.has(d)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    let prev: string | null = null;
    for (const d of Array.from(activeDates).sort()) {
      if (prev) {
        const prevDate: Date = new Date(prev);
        prevDate.setDate(prevDate.getDate() + 1);
        if (prevDate.toISOString().slice(0, 10) === d) {
          streak++;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }
      longestStreak = Math.max(longestStreak, streak);
      prev = d;
    }

    return NextResponse.json({ currentStreak, longestStreak, days });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ currentStreak: 0, longestStreak: 0, days: [] });
  }
}
