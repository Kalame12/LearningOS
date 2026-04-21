import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function GET(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ watchedVideoIds: [], allWatched: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const topic = (searchParams.get("topic") || "").trim();
    const videoIds = (searchParams.get("videoIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!topic || videoIds.length === 0) {
      return NextResponse.json({ watchedVideoIds: [], allWatched: false });
    }

    const { data: events } = await supabaseServer
      .from("learning_events")
      .select("metadata,created_at")
      .eq("user_id", userId)
      .eq("event_type", "video_watch_marked")
      .eq("topic", topic)
      .order("created_at", { ascending: true });

    const stateByVideo = new Map<string, boolean>();
    for (const event of events || []) {
      const metadata = event.metadata as { videoId?: string; watched?: boolean } | null;
      if (!metadata?.videoId) continue;
      stateByVideo.set(metadata.videoId, Boolean(metadata.watched));
    }

    const watchedVideoIds = videoIds.filter((id) => stateByVideo.get(id) === true);
    const allWatched = watchedVideoIds.length > 0 && watchedVideoIds.length === videoIds.length;

    return NextResponse.json({ watchedVideoIds, allWatched });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ watchedVideoIds: [], allWatched: false, message: "Failed to fetch watch progress." }, { status: 500 });
  }
}
