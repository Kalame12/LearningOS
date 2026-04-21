import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { buildRoadmapPrompt, parseRoadmap, fallbackRoadmap, StudentProfileInput } from "@/lib/learning-os";
import { generateAIText } from "@/lib/ai-provider";

async function generateRoadmapForSubject(
  profile: StudentProfileInput,
  subject: string,
  provider: string,
  model: string
) {
  const subjectProfile = { ...profile, subjects: [subject], goal: subject };
  const prompt = buildRoadmapPrompt(subjectProfile);
  let roadmap = fallbackRoadmap(subjectProfile);
  try {
    const text = await generateAIText({
      provider: provider === "gemini" ? "gemini" : "openai",
      prompt,
      openAIModel: model || "gpt-4o-mini",
      geminiModel: model || "gemini-1.5-flash",
    });
    const parsed = parseRoadmap(text);
    if (parsed.length > 0) roadmap = parsed;
  } catch {
    // use fallback
  }
  return roadmap;
}

export async function POST(req: Request) {
  try {
    const {
      userId,
      level,
      interest,
      goal,
      semesterWeeks,
      dailyMinutes,
      provider = "openai",
      model,
      subjects,
    } = await req.json();

    const currentLevel =
      level === "intermediate" || level === "advanced" ? level : "beginner";

    const baseProfile: StudentProfileInput = {
      userId: userId || "user-1",
      goal: goal || interest || "general learning",
      interest: interest || "general",
      currentLevel,
      semesterWeeks: Number(semesterWeeks) || 16,
      dailyMinutes: Number(dailyMinutes) || 90,
    };

    const subjectList: string[] =
      Array.isArray(subjects) && subjects.length > 0
        ? subjects
        : [goal || interest || "General Learning"];

    const allRoadmaps: any[] = [];

    for (const subject of subjectList) {
      const roadmap = await generateRoadmapForSubject(baseProfile, subject, provider, model);

      const { data: session } = await supabase
        .from("roadmap_sessions")
        .insert([{ user_id: baseProfile.userId, level: currentLevel, subject }])
        .select()
        .single();

      const rows = roadmap.map((s, i) => ({
        step: s.step,
        type: s.type,
        domain: s.domain,
        platform: s.platform,
        difficulty: currentLevel,
        status: "not_started",
        order_index: i,
        session_id: session?.id,
      }));

      if (rows.length > 0) await supabase.from("roadmap").insert(rows);

      allRoadmaps.push({ subject, roadmap });
    }

    return NextResponse.json({ roadmap: allRoadmaps[0]?.roadmap ?? [], subjects: subjectList });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ roadmap: [] });
  }
}
