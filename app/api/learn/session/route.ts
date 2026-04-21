import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { AIProvider, generateAIText } from "@/lib/ai-provider";
import { getAuthenticatedUserId } from "@/lib/auth-user";

type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
};

type CornellNote = {
  cues: string[];
  mainNotes: string;
  examples: string[];
  keyTerms: { term: string; definition: string }[];
  summary: string;
};

export async function POST(req: Request) {
  try {
    const { taskId, provider = "openai", model } = await req.json();
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: task, error: taskError } = await supabaseServer
      .from("learning_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ message: "Task not found." }, { status: 404 });
    }

    await supabaseServer
      .from("learning_tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId);

    const { data: recentAttempts } = await supabaseServer
      .from("learning_attempts")
      .select("correct_count, total_count, topic")
      .eq("user_id", userId)
      .eq("topic", task.topic)
      .order("created_at", { ascending: false })
      .limit(3);

    const totalCorrect = (recentAttempts || []).reduce((a, r) => a + (r.correct_count || 0), 0);
    const totalQ = (recentAttempts || []).reduce((a, r) => a + (r.total_count || 0), 0);
    const recentAccuracy = totalQ > 0 ? totalCorrect / totalQ : null;

    const thoughts: string[] = [
      `Analyzing your history for: ${task.topic}`,
      recentAttempts && recentAttempts.length > 0
        ? recentAccuracy !== null && recentAccuracy < 0.6
          ? `⚠ You scored ${Math.round(recentAccuracy * 100)}% recently — adding prerequisite context`
          : `✓ Recent performance looks good — building on what you know`
        : `First time with this topic — starting from foundations`,
      `Structuring lesson: ${task.task_type === "revise" ? "revision sprint" : "progressive explanation"}`,
      `Generating 3 targeted quiz questions`,
      `✅ Lesson ready`,
    ];

    const prompt = `You are a concise tutor.
Topic: ${task.topic}
Task type: ${task.task_type}
${recentAccuracy !== null && recentAccuracy < 0.6 ? `Note: Student struggled recently (${Math.round(recentAccuracy * 100)}% accuracy) — include prerequisite context.` : ""}

Return ONLY a strict JSON object (no markdown fences):
{
  "markdownLesson": "...",
  "summary": "...",
  "cues": ["Question 1?", "Question 2?", "Question 3?"],
  "mainNotes": "main lesson content in markdown",
  "examples": ["short example 1", "short example 2"],
  "keyTerms": [{"term": "...", "definition": "..."}],
  "quiz": [
    {"question":"...", "options":["A","B","C","D"], "answerIndex":0}
  ]
}

Rules:
- Beginner-friendly, 180-250 words for mainNotes.
- Exactly 3 cues (questions a student should be able to answer after this lesson).
- Exactly 3 quiz questions. answerIndex between 0 and 3.
- summary is 1-2 sentences.`;

    let markdownLesson = `## ${task.topic}\n\nThis lesson introduces the key idea in a practical way and prepares you for short retrieval practice.`;
    let summary = `Quick overview of ${task.topic}`;
    let cornell: CornellNote = {
      cues: [`What is ${task.topic}?`, "When would you use this?", "What are the key steps?"],
      mainNotes: markdownLesson,
      examples: [],
      keyTerms: [],
      summary,
    };
    let quiz: QuizItem[] = [
      { question: `Which statement best describes ${task.topic}?`, options: ["Core concept", "Random fact", "UI style", "Database key"], answerIndex: 0 },
      { question: "What helps improve mastery fastest?", options: ["Passive reading", "Spaced practice", "Skipping quizzes", "No review"], answerIndex: 1 },
      { question: "What should you do after one study session?", options: ["Stop forever", "Review weak points", "Delete notes", "Ignore feedback"], answerIndex: 1 },
    ];

    try {
      const text = await generateAIText({ provider: provider as AIProvider, prompt, openAIModel: model, geminiModel: model });
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed?.markdownLesson) markdownLesson = parsed.markdownLesson;
        if (parsed?.summary) summary = parsed.summary;
        if (parsed?.quiz && Array.isArray(parsed.quiz)) quiz = parsed.quiz.slice(0, 3);
        cornell = {
          cues: Array.isArray(parsed.cues) ? parsed.cues.slice(0, 3) : cornell.cues,
          mainNotes: parsed.mainNotes || parsed.markdownLesson || cornell.mainNotes,
          examples: Array.isArray(parsed.examples) ? parsed.examples : [],
          keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
          summary: parsed.summary || summary,
        };
      }
    } catch {
      // fallback already set
    }

    return NextResponse.json({
      task,
      lesson: { markdownLesson, summary, quiz, cornell },
      thoughts,
      provider,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to create learning session." }, { status: 500 });
  }
}
