import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";
import { DEFAULT_AI_PROVIDER, DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL } from "@/lib/ai-config";

export async function GET() {
  try {
    const text = await generateAIText({
      provider: DEFAULT_AI_PROVIDER,
      prompt: `
Return ONLY JSON.

Give top 12 trending tech skills.

Format:
[
  {
    "title": "",
    "description": "",
    "roadmap": ["topic1", "topic2", "topic3"]
  }
]
      `,
      openAIModel: DEFAULT_OPENAI_MODEL,
      geminiModel: DEFAULT_GEMINI_MODEL,
    });
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const match = cleaned.match(/\[[\s\S]*\]/);

    let skills = [];

    if (match) {
      skills = JSON.parse(match[0]);
    }

    // 🔥 ADD COURSERA LINKS
    const enhanced = skills.map((skill: any) => ({
      ...skill,
      roadmap: skill.roadmap.map((step: string) => ({
        title: step,
        link: `https://www.coursera.org/search?query=${encodeURIComponent(step)}`,
      })),
    }));

    return NextResponse.json({ skills: enhanced });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ skills: [] });
  }
}