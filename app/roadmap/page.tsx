"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import RoadmapGraph from "@/components/RoadmapGraph";
import ResourcePanel from "@/components/ResourcePanel";
import { Pencil, Check, Play } from "lucide-react";

type Session = { id: string; subject: string; level: string; created_at: string };

export default function RoadmapPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [panelStep, setPanelStep] = useState<any | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("roadmap_sessions")
          .select("id, subject, level, created_at")
          .order("created_at", { ascending: true });
        const list = (data || []) as Session[];
        setSessions(list);
        if (list.length > 0) setActiveSessionId(list[0].id);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    const fetchSteps = async () => {
      setStepsLoading(true);
      const { data } = await supabase
        .from("roadmap")
        .select("*")
        .eq("session_id", activeSessionId)
        .order("order_index");
      setSteps(data || []);
      setStepsLoading(false);
    };
    fetchSteps();
  }, [activeSessionId]);

  const handleSaveEdits = async () => {
    setSaving(true);
    const updates = Object.entries(editedTitles).map(([stepId, step]) =>
      fetch("/api/roadmap/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, step }),
      })
    );
    await Promise.all(updates);
    setSteps((prev) =>
      prev.map((s) => (editedTitles[s.id] ? { ...s, step: editedTitles[s.id] } : s))
    );
    setEditedTitles({});
    setEditMode(false);
    setSaving(false);
  };

  const handleStart = async (step: any) => {
    setStartingId(step.id);
    try {
      const res = await fetch("/api/roadmap/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id, userId: "user-1" }),
      });
      const data = await res.json();
      if (data.taskId) router.push(`/learn/${data.taskId}`);
    } catch (err) {
      console.error(err);
    }
    setStartingId(null);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="badge mb-2">Learning Path</p>
            <h1 className="text-3xl font-bold">Your AI Roadmap</h1>
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={() => { setEditMode(false); setEditedTitles({}); }} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button onClick={handleSaveEdits} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
                  <Check size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="btn-ghost text-sm flex items-center gap-1.5">
                <Pencil size={14} /> Edit Roadmap
              </button>
            )}
          </div>
        </div>

        {loading && <p className="text-zinc-400">Loading roadmaps...</p>}

        {!loading && sessions.length === 0 && (
          <p className="text-zinc-500">No roadmap found. Complete onboarding first.</p>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {/* Subject tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-800 pb-4">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => { setActiveSessionId(session.id); setEditMode(false); setEditedTitles({}); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isActive
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                        : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {session.subject || "General"}
                  </button>
                );
              })}
            </div>

            {/* Progress bar */}
            {activeSession && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">{activeSession.subject}</span>
                  <span className="text-zinc-400">{completedCount}/{steps.length} steps · {progress}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {stepsLoading && <p className="text-zinc-400">Loading steps...</p>}

            {/* Edit mode: flat list with inputs */}
            {!stepsLoading && steps.length > 0 && editMode && (
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={step.id} className="card flex items-center gap-4">
                    <span className="text-zinc-500 text-sm w-6 shrink-0">{idx + 1}</span>
                    <input
                      value={editedTitles[step.id] ?? step.step}
                      onChange={(e) =>
                        setEditedTitles((prev) => ({ ...prev, [step.id]: e.target.value }))
                      }
                      className="field-input flex-1"
                    />
                    <span className={`badge shrink-0 text-xs ${step.status === "completed" ? "border-emerald-700 text-emerald-400" : "border-zinc-700 text-zinc-400"}`}>
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* View mode: graph + step list with Start buttons */}
            {!stepsLoading && steps.length > 0 && !editMode && (
              <>
                <RoadmapGraph steps={steps} onStepClick={handleStart} />
                <div className="mt-6 space-y-2">
                  <h2 className="text-sm text-zinc-500 uppercase tracking-wider mb-3">Steps</h2>
                  {steps.map((step, idx) => (
                    <div key={step.id} className="card flex items-center gap-4 py-3">
                      <span className="text-zinc-500 text-sm w-6 shrink-0">{idx + 1}</span>
                      <button onClick={() => setPanelStep(step)} className="flex-1 text-sm text-left hover:text-indigo-300 transition">{step.step}</button>
                      <span className={`badge shrink-0 text-xs ${step.status === "completed" ? "border-emerald-700 text-emerald-400" : "border-zinc-700 text-zinc-500"}`}>
                        {step.status}
                      </span>
                      <button
                        onClick={() => handleStart(step)}
                        disabled={startingId === step.id}
                        className="btn-primary text-xs px-3 py-1.5 shrink-0 flex items-center gap-1"
                      >
                        <Play size={12} /> {startingId === step.id ? "..." : "Start"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {panelStep && <ResourcePanel step={panelStep} onClose={() => setPanelStep(null)} />}
    </main>
  );
}
