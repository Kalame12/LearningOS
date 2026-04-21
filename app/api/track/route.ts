import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { eventType, topic, taskId, metadata } = await req.json();
    if (!eventType) {
      return NextResponse.json({ message: "eventType is required." }, { status: 400 });
    }

    // Best-effort logging; table is optional for backwards compatibility.
    await supabaseServer.from("learning_events").insert([
      {
        user_id: userId,
        event_type: String(eventType),
        topic: topic || null,
        task_id: taskId || null,
        metadata: metadata || {},
      },
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Tracking failed." }, { status: 200 });
  }
}
