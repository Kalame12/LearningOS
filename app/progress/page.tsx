"use client";

import { useEffect, useState } from "react";

type ProgressRow = {
  id: string;
  date: string;
  topic: string;
  taskType: string;
  timeSpent: number;
  correct: number;
  total: number;
  hintsUsed: number;
  skipped: number;
  masteryBefore: number;
  masteryAfter: number;
};

type MasteryRow = {
  topic: string;
  mastery_score: number;
  next_review_date: string;
};

export default function ProgressPage() {
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<{ completionScore: number; breakdown: Record<string, number> } | null>(null);

  useEffect(() => {
    const run = async () => {
      const [tableRes, masteryRes] = await Promise.all([
        fetch("/api/progress/table", { cache: "no-store" }),
        fetch("/api/progress/mastery", { cache: "no-store" }),
      ]);
      const scoreRes = await fetch("/api/progress/score", { cache: "no-store" });
      const tableData = await tableRes.json();
      const masteryData = await masteryRes.json();
      const scoreData = await scoreRes.json();
      setRows(tableData.rows || []);
      setMastery(masteryData.mastery || []);
      setScore(scoreData);
      setLoading(false);
    };
    run();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <p className="badge mb-2">Analytics</p>
        <h1 className="page-header">Progress Dashboard</h1>
        <p className="page-subheader">Auto-tracked attempts, mastery trend, and review readiness.</p>

        {loading && <p className="text-zinc-400">Loading progress...</p>}

        {!loading && (
          <>
            <div className="grid md:grid-cols-3 gap-3 mb-8">
              <div className="card py-4">
                <p className="text-xs text-zinc-400">Roadmap Completion Score</p>
                <p className="text-2xl font-semibold">{score?.completionScore ?? 0}%</p>
              </div>
              <div className="card py-4">
                <p className="text-xs text-zinc-400">Tracked Attempts</p>
                <p className="text-2xl font-semibold">{rows.length}</p>
              </div>
              <div className="card py-4">
                <p className="text-xs text-zinc-400">Mastered Topics (&gt;= 0.75)</p>
                <p className="text-2xl font-semibold">{mastery.filter((m) => m.mastery_score >= 0.75).length}</p>
              </div>
              <div className="card py-4">
                <p className="text-xs text-zinc-400">Need Revision (&lt; 0.55)</p>
                <p className="text-2xl font-semibold">{mastery.filter((m) => m.mastery_score < 0.55).length}</p>
              </div>
            </div>

            {score && (
              <div className="card mb-8">
                <p className="text-sm text-zinc-300 mb-2">Score breakdown</p>
                <p className="text-xs text-zinc-400">
                  Task {score.breakdown.taskCompletion}% • Quiz {score.breakdown.quizScore}% •
                  Consistency {score.breakdown.consistency}% • Reflection {score.breakdown.reflectionCompletion}%
                </p>
              </div>
            )}

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Topic Mastery (0-1)</h2>
              <div className="space-y-3">
                {mastery.length === 0 && <p className="text-zinc-500">No mastery data yet.</p>}
                {mastery.map((item) => (
                  <div key={item.topic} className="card p-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{item.topic}</span>
                      <span>{item.mastery_score}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded">
                      <div
                        className="h-2 bg-emerald-500 rounded"
                        style={{ width: `${Math.round(item.mastery_score * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Next review: {item.next_review_date || "Not scheduled"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Auto-Tracking Table</h2>
              <div className="overflow-x-auto border border-zinc-800 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-900">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Topic</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Score</th>
                      <th className="text-left p-2">Hints</th>
                      <th className="text-left p-2">Skips</th>
                      <th className="text-left p-2">Mastery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                        <td className="p-2">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="p-2">{row.topic}</td>
                        <td className="p-2">{row.taskType}</td>
                        <td className="p-2">{row.timeSpent}m</td>
                        <td className="p-2">
                          {row.correct}/{row.total}
                        </td>
                        <td className="p-2">{row.hintsUsed}</td>
                        <td className="p-2">{row.skipped}</td>
                        <td className="p-2">
                          {row.masteryBefore} -&gt; {row.masteryAfter}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
