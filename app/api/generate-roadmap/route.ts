import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildRoadmapPrompt, parseRoadmap, fallbackRoadmap, StudentProfileInput } from "@/lib/learning-os";
import { generateAIText } from "@/lib/ai-provider";
import { getAuthenticatedUserId } from "@/lib/auth-user";

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
      level,
      interest,
      goal,
      semesterWeeks,
      dailyMinutes,
      provider = "openai",
      model,
      subjects,
    } = await req.json();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ roadmap: [], message: "Unauthorized" }, { status: 401 });
    }

    const currentLevel =
      level === "intermediate" || level === "advanced" ? level : "beginner";

    const baseProfile: StudentProfileInput = {
      userId,
      goal: goal || interest || "general learning",
      interest: interest || "general",
      currentLevel,
      semesterWeeks: Number(semesterWeeks) || 16,
      dailyMinutes: Number(dailyMinutes) || 90,
    };

    const rawSubjects: string[] =
      Array.isArray(subjects) && subjects.length > 0
        ? subjects
        : [goal || interest || "General Learning"];

    // Deduplicate subjects (case-insensitive)
    const seen = new Set<string>();
    const subjectList = rawSubjects.filter((s) => {
      const key = s.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return key !== "" && key !== "general learning";
    });
    if (subjectList.length === 0) subjectList.push(goal || interest || "General Learning");

    const allRoadmaps: any[] = [];
    let insertedStepCount = 0;

    for (const subject of subjectList) {
      // Delete old sessions for same subject + user to avoid duplicate tabs
      const { data: oldSessions } = await supabaseServer
        .from("roadmap_sessions")
        .select("id")
        .eq("user_id", baseProfile.userId)
        .ilike("subject", subject.trim());

      if (oldSessions && oldSessions.length > 0) {
        const oldIds = oldSessions.map((s: any) => s.id);
        await supabaseServer.from("roadmap").delete().in("session_id", oldIds);
        await supabaseServer.from("roadmap_sessions").delete().in("id", oldIds);
      }

      const roadmap = await generateRoadmapForSubject(baseProfile, subject, provider, model);

      const { data: session, error: sessionError } = await supabaseServer
        .from("roadmap_sessions")
        .insert([{ user_id: baseProfile.userId, level: currentLevel, subject: subject.trim() }])
        .select()
        .single();
      if (sessionError || !session?.id) {
        return NextResponse.json(
          { roadmap: [], message: sessionError?.message || "Failed to create roadmap session." },
          { status: 500 }
        );
      }

      const rows = roadmap.map((s, i) => ({
        step: s.step,
        type: s.type,
        domain: s.domain,
        platform: s.platform,
        estimated_minutes: Number(s.estimatedMinutes || 45),
        prerequisites: s.prerequisites || [],
        difficulty: currentLevel,
        status: "not_started",
        order_index: i,
        session_id: session?.id,
      }));

      if (rows.length > 0) {
        const { error: insertError } = await supabaseServer.from("roadmap").insert(rows);
        // Backward-compatible fallback for schemas that don't yet store roadmap metadata.
        if (insertError) {
          const baseRows = rows.map(({ estimated_minutes, prerequisites, ...rest }) => rest);
          const { error: fallbackError } = await supabaseServer.from("roadmap").insert(baseRows);
          if (fallbackError) {
            return NextResponse.json(
              { roadmap: [], message: fallbackError.message || "Failed to persist roadmap steps." },
              { status: 500 }
            );
          }
        }
        insertedStepCount += rows.length;
      }

      allRoadmaps.push({ subject, roadmap });
    }

    if (insertedStepCount === 0) {
      return NextResponse.json(
        { roadmap: [], message: "Roadmap generation returned no steps. Try different topics." },
        { status: 500 }
      );
    }

    return NextResponse.json({ roadmap: allRoadmaps[0]?.roadmap ?? [], subjects: subjectList });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ roadmap: [], message: "Failed to generate roadmap." }, { status: 500 });
  }
}
