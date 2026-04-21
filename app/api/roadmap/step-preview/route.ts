import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";
import { resolveAI } from "@/lib/ai-config";

export async function POST(req: Request) {
  try {
    const { topic, provider, model } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic required" }, { status: 400 });
    const ai = resolveAI(provider, model);

    const prompt = `You are a world-class university tutor creating a quick-preview lesson card.

Topic: "${topic}"

Return ONLY a valid JSON object (no markdown fences):
{
  "summary": "2-4 sentence TL;DR",
  "cues": ["How does X work?", "When would you use this?", "What is the key tradeoff?", "How does this compare to alternatives?", "What mistakes should be avoided?"],
  "mainNotes": "Comprehensive 700-1200 word explanation in markdown — use multiple ## and ### headers, bold key terms, inline code snippets where relevant. Cover complete topic scope, not a brief summary.",
  "examples": ["Concrete code or worked example (use \\n for line breaks)", "Second example", "Third example", "Fourth example if useful"],
  "keyTerms": [{"term": "technical term", "definition": "plain-English one-sentence definition"}, {"term": "second term", "definition": "definition"}, {"term": "third term", "definition": "definition"}],
  "quiz": [
    {"question": "Specific question testing understanding", "options": ["Plausible A", "Plausible B", "Plausible C", "Plausible D"], "answerIndex": 0},
    {"question": "Scenario-based question", "options": ["A", "B", "C", "D"], "answerIndex": 2},
    {"question": "Application question", "options": ["A", "B", "C", "D"], "answerIndex": 1}
  ]
}

Quality requirements:
- mainNotes: intuitive explanation with real-world context, not a textbook definition
- mainNotes must be comprehensive and detailed, covering all major subtopics of "${topic}"
- examples: prefer short runnable code snippets or step-by-step worked problems
- quiz: wrong answers must be plausible — test understanding, not memorisation
- keyTerms: include 6-12 important terms for full topic coverage`;

    const fallback = {
      summary: `Overview of ${topic}`,
      cues: [`What is ${topic}?`, `When would you use ${topic}?`, `What are the key concepts in ${topic}?`],
      mainNotes: `## ${topic}\n\nThis topic covers the core concepts you need to understand before building on more advanced ideas.`,
      examples: [],
      keyTerms: [],
      quiz: [
        { question: `Which best describes ${topic}?`, options: ["A foundational concept", "An advanced pattern", "A design principle", "A runtime error"], answerIndex: 0 },
        { question: "What should you do after learning a new concept?", options: ["Skip practice", "Apply it immediately", "Read more theory", "Take a break forever"], answerIndex: 1 },
        { question: "What helps retain concepts long-term?", options: ["Passive reading", "Spaced repetition", "Watching videos only", "Single cramming session"], answerIndex: 1 },
      ],
    };

    try {
      const text = await generateAIText({
        provider: ai.provider,
        prompt,
        openAIModel: ai.provider === "openai" ? ai.model : undefined,
        geminiModel: ai.provider === "gemini" ? ai.model : undefined,
      });
      if (text) {
        const parsed = JSON.parse(text);
        return NextResponse.json({
          summary: parsed.summary || fallback.summary,
          cornell: {
            cues: Array.isArray(parsed.cues) ? parsed.cues : fallback.cues,
            mainNotes: parsed.mainNotes || fallback.mainNotes,
            examples: Array.isArray(parsed.examples) ? parsed.examples : [],
            keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
            summary: parsed.summary || fallback.summary,
          },
          quiz: Array.isArray(parsed.quiz) ? parsed.quiz.slice(0, 3) : fallback.quiz,
        });
      }
    } catch {
      // use fallback
    }

    return NextResponse.json({
      summary: fallback.summary,
      cornell: { cues: fallback.cues, mainNotes: fallback.mainNotes, examples: [], keyTerms: [], summary: fallback.summary },
      quiz: fallback.quiz,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
