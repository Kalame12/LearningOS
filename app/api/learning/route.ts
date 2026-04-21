import { NextResponse } from "next/server";

type Message = { role: "user" | "assistant"; content: string };
type Context = { page?: string; userId?: string };

export async function POST(req: Request) {
  try {
    const { messages, context }: { messages: Message[]; context?: Context } = await req.json();
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const input = lastUserMessage?.content || "";
    const lower = input.toLowerCase();
    const page = context?.page || "";

    const addRoadmapMatch = lower.match(/add\s+(.+?)\s+(to|in)\s+(my\s+)?roadmap/i);
    const askTodayTasks = lower.includes("today") && (lower.includes("study") || lower.includes("task") || lower.includes("do"));

    let reply = "";
    let action: { type: string; payload: Record<string, unknown> } | null = null;

    if (addRoadmapMatch) {
      const topic = addRoadmapMatch[1].trim();
      reply = `I'll add "${topic}" to your roadmap. It'll appear as a new step the next time you load the roadmap page.`;
      action = { type: "add_roadmap_step", payload: { topic } };
    } else if (askTodayTasks) {
      reply = `Check your Today page (/today) for your generated tasks, or click the Today link in the navigation.`;
    } else {
      try {
        const systemPrompt = `You are Saarthi AI, a helpful learning assistant for university students.
Current page: ${page || "unknown"}
Keep responses concise and actionable (2-3 sentences max unless explaining a concept).
If asked to add a topic to the roadmap, confirm you will do it.`;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-6),
            ],
          }),
        });
        const data = await res.json();
        reply = data.choices?.[0]?.message?.content || "I'm here to help with your studies!";
      } catch {
        reply = "I'm here to help! What are you studying?";
      }
    }

    return NextResponse.json({ reply, action });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reply: "Something went wrong. Try again.", action: null });
  }
}
