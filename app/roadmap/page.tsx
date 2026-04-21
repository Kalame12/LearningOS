"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoadmapGraph from "@/components/RoadmapGraph";

type Step = {
  id: string;
  step: string;
  type: string;
  domain: string;
  platform: string;
  status: string;
  difficulty?: string;
};

type RoadmapGroup = {
  goal: { id: string; goal_text: string };
  sessionId: string | null;
  roadmap: Step[];
};

export default function RoadmapPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<RoadmapGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Step>>({});

  useEffect(() => {
    const fetchAllRoadmaps = async () => {
      setLoading(true);
      const res = await fetch("/api/roadmap/all", { cache: "no-store" });
      const payload = await res.json();
      setGroups(payload.groups || []);
      setLoading(false);
    };
    fetchAllRoadmaps();
  }, []);

  const handleStepClick = async (step: Step) => {
    if (activeId === step.id) return;

    setActiveId(step.id);

    try {
      const startRes = await fetch("/api/roadmap/start-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id }),
      });
      const startPayload = await startRes.json();
      if (!startRes.ok || !startPayload.taskId) {
        alert(startPayload.message || "Could not open learning session");
        setActiveId(null);
        return;
      }

      // Do not block navigation on completion write.
      fetch("/api/roadmap/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id }),
      });

      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          roadmap: group.roadmap.map((s) => (s.id === step.id ? { ...s, status: "completed" } : s)),
        }))
      );
      router.push(`/learn/${startPayload.taskId}`);
    } catch (err) {
      console.error("Click error:", err);
      alert("Something went wrong");
    }

    setActiveId(null);
  };

  const startEdit = (step: Step) => {
    setEditingId(step.id);
    setEditDraft(step);
  };

  const saveEdit = async (stepId: string) => {
    setSavingEditId(stepId);
    const res = await fetch("/api/roadmap/update-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId,
        step: editDraft.step,
        type: editDraft.type,
        domain: editDraft.domain,
        platform: editDraft.platform,
      }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.step) {
      alert(payload.message || "Could not update step");
      setSavingEditId(null);
      return;
    }
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        roadmap: group.roadmap.map((s) => (s.id === stepId ? payload.step : s)),
      }))
    );
    setEditingId(null);
    setEditDraft({});
    setSavingEditId(null);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-4">All Goal Roadmaps</h1>
      <p className="text-zinc-400 mb-6">Showing every roadmap for all your goals automatically.</p>

      {loading && <p className="text-gray-400">Loading roadmap...</p>}
      {!loading && groups.length === 0 && (
        <p className="text-gray-500">No roadmaps found. Add goals in onboarding and generate plans.</p>
      )}

      {!loading &&
        groups.map((group) => (
          <section key={group.goal.id} className="mb-10">
            <div className="mb-3">
              <h2 className="text-xl font-semibold">{group.goal.goal_text}</h2>
              <p className="text-sm text-zinc-500">Goal ID: {group.goal.id}</p>
            </div>
            {group.roadmap.length === 0 ? (
              <p className="text-zinc-500">No roadmap generated for this goal yet.</p>
            ) : (
              <>
                <RoadmapGraph steps={group.roadmap} onStepClick={handleStepClick} />
                <div className="mt-6 grid gap-3">
                  {group.roadmap.map((step) => (
                    <div key={step.id} className="card">
                      {editingId === step.id ? (
                        <div className="grid md:grid-cols-4 gap-2">
                          <input
                            className="field-input md:col-span-2"
                            value={editDraft.step || ""}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, step: e.target.value }))}
                          />
                          <input
                            className="field-input"
                            value={editDraft.type || ""}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, type: e.target.value }))}
                          />
                          <input
                            className="field-input"
                            value={editDraft.platform || ""}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, platform: e.target.value }))}
                          />
                          <input
                            className="field-input md:col-span-2"
                            value={editDraft.domain || ""}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, domain: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button className="btn-primary" onClick={() => saveEdit(step.id)} disabled={savingEditId === step.id}>
                              {savingEditId === step.id ? "Saving..." : "Save"}
                            </button>
                            <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{step.step}</p>
                            <p className="text-sm text-zinc-400">
                              {step.type} • {step.domain} • {step.platform} • {step.status}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn-ghost" onClick={() => startEdit(step)}>Edit</button>
                            <button className="btn-primary" onClick={() => handleStepClick(step)} disabled={activeId === step.id}>
                              {activeId === step.id ? "Opening..." : "Open"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        ))}
    </main>
  );
}