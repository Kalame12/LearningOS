import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { topic, videoId, watched } = await req.json();
    if (!topic || !videoId) {
      return NextResponse.json({ message: "topic and videoId are required" }, { status: 400 });
    }

    await supabaseServer.from("learning_events").insert([
      {
        user_id: userId,
        event_type: "video_watch_marked",
        topic: String(topic),
        metadata: {
          videoId: String(videoId),
          watched: Boolean(watched),
          timestamp: new Date().toISOString(),
        },
      },
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Failed to track video watch state." }, { status: 500 });
  }
}
