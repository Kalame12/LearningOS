import { NextResponse } from "next/server";
import { generateAIText } from "@/lib/ai-provider";

export async function POST(req: Request) {
  try {
    const { subjects } = await req.json();
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json({ confirmed: [], suggested: [], message: "" });
    }

    const prompt = `A student wants to learn these topics: ${subjects.join(", ")}.

Return a JSON object with:
- "confirmed": the original topics array (unchanged)
- "suggested": up to 2 prerequisite or complementary topics not already listed
- "message": one friendly sentence like "I'll build your roadmap around these topics. I'd also suggest adding:"

Return ONLY the JSON object, no markdown fences.`;

    let confirmed = subjects;
    let suggested: string[] = [];
    let message = `I'll build your roadmap around: ${subjects.join(", ")}.`;

    try {
      const text = await generateAIText({
        provider: "openai",
        prompt,
        openAIModel: "gpt-4o-mini",
      });
      const parsed = JSON.parse(text);
      if (parsed.confirmed) confirmed = parsed.confirmed;
      if (Array.isArray(parsed.suggested)) suggested = parsed.suggested.slice(0, 2);
      if (parsed.message) message = parsed.message;
    } catch {
      // use defaults above
    }

    return NextResponse.json({ confirmed, suggested, message });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ confirmed: [], suggested: [], message: "" });
  }
}
