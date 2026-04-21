import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: sessions } = await supabaseServer
      .from("roadmap_sessions")
      .select("id")
      .eq("user_id", userId);
    const sessionIds = (sessions || []).map((s) => s.id);

    await supabaseServer.from("learning_tasks").delete().eq("user_id", userId);
    if (sessionIds.length > 0) {
      await supabaseServer.from("roadmap").delete().in("session_id", sessionIds);
      await supabaseServer.from("roadmap_sessions").delete().in("id", sessionIds);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Failed to reset roadmap." }, { status: 500 });
  }
}
