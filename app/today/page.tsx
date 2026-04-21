"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DailyTaskRow } from "@/lib/tier1";

export default function TodayPage() {
  const [tasks, setTasks] = useState<DailyTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const refreshTasks = async () => {
    setLoading(true);
    const res = await fetch("/api/tasks/today", { cache: "no-store" });
    const data = await res.json();
    setTasks(data.tasks || []);
    setMessage(data.message || "");
    setLoading(false);
  };

  const generateTasks = async () => {
    setLoading(true);
    const res = await fetch("/api/tasks/generate-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });
    const data = await res.json();
    setTasks(data.tasks || []);
    setMessage(data.message || "");
    setLoading(false);
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="badge mb-2">Daily Loop</p>
          <h1 className="page-header">Today&apos;s Learning Tasks</h1>
          <p className="page-subheader">3-5 tasks generated from your roadmap, weak areas, and spaced revision.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card py-4">
            <p className="text-xs text-zinc-400">Total Tasks</p>
            <p className="text-2xl font-semibold">{tasks.length}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-zinc-400">Completed</p>
            <p className="text-2xl font-semibold">{tasks.filter((t) => t.status === "completed").length}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-zinc-400">In Progress</p>
            <p className="text-2xl font-semibold">{tasks.filter((t) => t.status === "in_progress").length}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-zinc-400">Pending</p>
            <p className="text-2xl font-semibold">{tasks.filter((t) => t.status === "pending").length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={generateTasks} className="btn-primary">
          Generate Today&apos;s Plan
        </button>
          <button onClick={refreshTasks} className="btn-ghost">
          Refresh
        </button>
          <Link href="/progress" className="btn-ghost">
          View Progress
        </Link>
        </div>

        {loading && <p className="text-zinc-400">Loading tasks...</p>}
        {!loading && message && <p className="text-yellow-300 mb-4">{message}</p>}
        {!loading && tasks.length === 0 && <p className="text-zinc-500">No tasks yet. Generate your day first.</p>}

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{task.topic}</p>
                  <p className="text-sm text-zinc-400">
                    {task.task_type.toUpperCase()} • {task.estimated_minutes} mins • priority {task.priority_score}
                  </p>
                  <div className="progress-bar-track mt-2">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, task.priority_score * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-zinc-800">{task.status}</span>
                  <Link href={`/learn/${task.id}`} className="bg-emerald-600 px-3 py-2 rounded hover:bg-emerald-700">
                    Start
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
