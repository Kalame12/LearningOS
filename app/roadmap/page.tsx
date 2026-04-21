"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoadmapGraph from "@/components/RoadmapGraph";
import StepDetailPanel from "@/components/StepDetailPanel";
import PageLoader from "@/components/PageLoader";
import { Pencil, Check } from "lucide-react";

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
  const [resetting, setResetting] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [panelStep, setPanelStep] = useState<any | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/roadmap/sessions", { cache: "no-store" });
        const payload = await res.json();
        const all = (payload.sessions || []) as Session[];

        // Deduplicate: keep only the latest session per subject
        const seen = new Map<string, Session>();
        for (const s of all) {
          const key = (s.subject || "General").toLowerCase().trim();
          if (!seen.has(key)) seen.set(key, s);
        }
        const unique = Array.from(seen.values());

        setSessions(unique);
        if (unique.length > 0) setActiveSessionId(unique[0].id);
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
      try {
        const res = await fetch(`/api/roadmap/sessions?sessionId=${encodeURIComponent(activeSessionId)}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        setSteps(payload.steps || []);
      } catch {
        setSteps([]);
      }
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
        body: JSON.stringify({ stepId: step.id }),
      });
      const data = await res.json();
      if (data.taskId) {
        setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: "in_progress" } : s)));
        router.push(`/learn/${data.taskId}`);
      }
    } catch (err) {
      console.error(err);
    }
    setStartingId(null);
  };

  const handleResetRoadmap = async () => {
    if (!confirm("This will delete your existing roadmap sessions and today's generated tasks. Continue?")) return;
    setResetting(true);
    try {
      await fetch("/api/roadmap/reset", { method: "POST" });
      setSessions([]);
      setSteps([]);
      setActiveSessionId(null);
    } catch (err) {
      console.error(err);
    }
    setResetting(false);
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
              <>
                <button onClick={() => setEditMode(true)} className="btn-ghost text-sm flex items-center gap-1.5">
                  <Pencil size={14} /> Edit Steps
                </button>
                <button onClick={handleResetRoadmap} disabled={resetting} className="btn-ghost text-sm">
                  {resetting ? "Resetting..." : "Reset Roadmap"}
                </button>
              </>
            )}
          </div>
        </div>

        {loading && <PageLoader title="Loading roadmap" subtitle="Setting up your learning path..." />}
        {!loading && sessions.length === 0 && (
        <p className="text-zinc-500">No roadmap found. Complete onboarding to generate one.</p>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {/* Subject tabs — one per unique subject */}
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
            {activeSession && steps.length > 0 && (
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

            {stepsLoading && <PageLoader title="Loading steps" subtitle="Arranging roadmap nodes..." compact />}

            {/* Edit mode */}
            {!stepsLoading && steps.length > 0 && editMode && (
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={step.id} className="card flex items-center gap-4">
                    <span className="text-zinc-500 text-sm w-6 shrink-0">{idx + 1}</span>
                    <input
                      value={editedTitles[step.id] ?? step.step}
                      onChange={(e) => setEditedTitles((prev) => ({ ...prev, [step.id]: e.target.value }))}
                      className="field-input flex-1"
                    />
                    <span className={`badge shrink-0 text-xs ${step.status === "completed" ? "border-emerald-700 text-emerald-400" : "border-zinc-700 text-zinc-400"}`}>
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* View mode — visual graph + clickable step list */}
            {!stepsLoading && steps.length > 0 && !editMode && (
              <>
                <RoadmapGraph steps={steps} onStepClick={(step) => setPanelStep(step)} />

                <div className="mt-6 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                    {steps.length} steps · click any step to preview notes, videos & quiz
                  </p>
                  {steps.map((step, idx) => (
                    <button
                      key={step.id}
                      onClick={() => setPanelStep(step)}
                      className="w-full card flex items-center gap-4 py-3 text-left hover:border-indigo-700 transition group"
                    >
                      {/* Status indicator */}
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold border ${
                        step.status === "completed"
                          ? "bg-emerald-600/20 border-emerald-600 text-emerald-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-500"
                      }`}>
                        {step.status === "completed" ? "✓" : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition truncate">{step.step}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{step.domain} · {step.platform}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`badge text-xs ${
                          step.type === "practice" ? "border-amber-700 text-amber-400" :
                          step.type === "revise" ? "border-purple-700 text-purple-400" :
                          "border-zinc-700 text-zinc-500"
                        }`}>{step.type}</span>
                        <span className="text-xs text-zinc-600">{step.estimated_minutes || step.estimatedMinutes || 45}m</span>
                        <span className="text-xs text-zinc-600 group-hover:text-indigo-400 transition">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {panelStep && (
        <StepDetailPanel
          step={panelStep}
          onClose={() => setPanelStep(null)}
          onStart={(step) => { setPanelStep(null); handleStart(step); }}
          startingId={startingId}
        />
      )}
    </main>
  );
}
