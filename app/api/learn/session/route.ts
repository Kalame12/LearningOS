import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { AIProvider, generateAIText } from "@/lib/ai-provider";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { resolveAI } from "@/lib/ai-config";

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
    const { taskId, provider, model } = await req.json();
    const ai = resolveAI(provider, model);
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

    const isRevision = task.task_type === "revise";
    const isStruggling = recentAccuracy !== null && recentAccuracy < 0.6;

    const prompt = `You are a world-class university tutor creating a high-quality lesson for a student.

Topic: "${task.topic}"
Session type: ${isRevision ? "Revision — reinforce and test recall" : "New lesson — explain, demonstrate, connect"}
${isStruggling ? `⚠ Student scored ${Math.round(recentAccuracy! * 100)}% on recent attempts — start with prerequisite context before the main content.` : ""}

Your output MUST be a single valid JSON object (no markdown fences, no comments):
{
  "markdownLesson": "Full lesson in markdown with headers, bold key terms, and code blocks where relevant",
  "summary": "1-2 sentence TL;DR the student can say out loud",
  "cues": [
    "Precise question a student should answer after reading (not yes/no)",
    "Second cue question",
    "Third cue question"
  ],
  "mainNotes": "Detailed explanation in markdown — use ## headers, bullet points, inline code. 200-300 words. Explain the WHY not just the WHAT.",
  "examples": [
    "Concrete code snippet or worked example 1 (as a string, use \\n for newlines)",
    "Concrete code snippet or worked example 2"
  ],
  "keyTerms": [
    {"term": "exact technical term", "definition": "one-sentence plain-English definition"},
    {"term": "second term", "definition": "definition"}
  ],
  "quiz": [
    {"question": "Specific question testing understanding (not memorisation)", "options": ["Option A", "Option B", "Option C", "Option D"], "answerIndex": 0},
    {"question": "Question 2", "options": ["A", "B", "C", "D"], "answerIndex": 2},
    {"question": "Question 3 — application/scenario based", "options": ["A", "B", "C", "D"], "answerIndex": 1}
  ]
}

Quality rules:
- mainNotes: explain intuitively — use analogies, real-world context
- examples: prefer runnable code snippets or step-by-step worked examples
- quiz: test actual understanding, not trivia — make wrong options plausible
- keyTerms: 2-4 terms maximum, only the truly essential vocabulary
- cues: frame as "How does X work?", "When would you use Y over Z?" style questions`;

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
      const text = await generateAIText({
        provider: ai.provider as AIProvider,
        prompt,
        openAIModel: ai.provider === "openai" ? ai.model : undefined,
        geminiModel: ai.provider === "gemini" ? ai.model : undefined,
      });
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
      provider: ai.provider,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to create learning session." }, { status: 500 });
  }
}
