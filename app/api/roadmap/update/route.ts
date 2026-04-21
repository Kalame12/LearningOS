import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: Request) {
  try {
    const { stepId, step } = await req.json();
    if (!stepId || !step) {
      return NextResponse.json({ error: "stepId and step required" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("roadmap")
      .update({ step })
      .eq("id", stepId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
