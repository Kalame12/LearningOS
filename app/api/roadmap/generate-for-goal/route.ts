import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { buildRoadmapPrompt, fallbackRoadmap, parseRoadmap, StudentProfileInput } from "@/lib/learning-os";
import { AIProvider, generateAIText } from "@/lib/ai-provider";

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ roadmap: [], message: "Unauthorized" }, { status: 401 });
    }

    const {
      goalId,
      level = "beginner",
      interest = "General",
      semesterWeeks = 16,
      dailyMinutes = 90,
      provider = "openai",
      model,
    } = await req.json();

    if (!goalId) {
      return NextResponse.json({ roadmap: [], message: "goalId is required." }, { status: 400 });
    }

    const { data: goal, error: goalError } = await supabaseServer
      .from("goals")
      .select("id,goal_text,user_id")
      .eq("id", goalId)
      .single();
    if (goalError || !goal || goal.user_id !== userId) {
      return NextResponse.json({ roadmap: [], message: "Goal not found." }, { status: 404 });
    }

    const profile: StudentProfileInput = {
      userId,
      goal: goal.goal_text,
      interest,
      currentLevel: level,
      semesterWeeks: Number(semesterWeeks),
      dailyMinutes: Number(dailyMinutes),
    };
    const prompt = buildRoadmapPrompt(profile);

    let roadmap = fallbackRoadmap(profile);
    try {
      const text = await generateAIText({
        provider: provider as AIProvider,
        prompt,
        openAIModel: model,
        geminiModel: model,
      });
      const parsed = parseRoadmap(text);
      if (parsed.length > 0) roadmap = parsed;
    } catch {
      // fallback
    }

    const { data: session, error: sessionError } = await supabaseServer
      .from("roadmap_sessions")
      .insert([{ user_id: userId, level, goal_id: goalId }])
      .select()
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ roadmap: [], message: "Failed to create roadmap session." }, { status: 500 });
    }

    const rows = roadmap.map((s, index) => ({
      step: s.step,
      type: s.type,
      domain: s.domain,
      platform: s.platform,
      difficulty: level,
      status: "not_started",
      order_index: index,
      session_id: session.id,
    }));

    if (rows.length > 0) {
      const { data: insertedRows } = await supabaseServer.from("roadmap").insert(rows).select("*");

      if (insertedRows && insertedRows.length > 0) {
        for (const row of insertedRows) {
          try {
            const query = `${row.step} ${goal.goal_text} tutorial`;
            const ytRes = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
                query
              )}&type=video&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`
            );
            const ytData = await ytRes.json();
            const item = ytData?.items?.[0];
            if (!item) continue;

            // Best-effort table for recommendations (optional migration).
            await supabaseServer.from("roadmap_resources").insert([
              {
                roadmap_id: row.id,
                resource_type: "youtube",
                title: item.snippet.title,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                quality_score: 0.8,
              },
            ]);
          } catch {
            // Ignore recommendation failures, roadmap stays usable.
          }
        }
      }
    }

    return NextResponse.json({ roadmap, goalId, provider });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ roadmap: [], message: "Failed to generate roadmap." }, { status: 500 });
  }
}
