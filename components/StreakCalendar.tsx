"use client";

import { useState } from "react";

type DayData = {
  date: string;
  topics: string[];
  attempts: number;
  questionsAnswered: number;
};

type Props = {
  days: DayData[];
  currentStreak: number;
  longestStreak: number;
};

export default function StreakCalendar({ days, currentStreak, longestStreak }: Props) {
  const [tooltip, setTooltip] = useState<DayData | null>(null);
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    cells.push(d.toISOString().slice(0, 10));
  }

  const getColor = (date: string) => {
    const d = dayMap.get(date);
    if (!d) return "bg-zinc-900 border-zinc-800";
    if (d.attempts >= 3) return "bg-indigo-600 border-indigo-500";
    if (d.attempts >= 1) return "bg-indigo-900 border-indigo-700";
    return "bg-zinc-900 border-zinc-800";
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Study Streak</h2>
          <p className="text-sm text-zinc-400">Last 90 days of activity</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-2xl font-bold text-indigo-400">🔥 {currentStreak}</p>
            <p className="text-xs text-zinc-500">Current</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-300">{longestStreak}</p>
            <p className="text-xs text-zinc-500">Longest</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(13,1fr)] gap-1">
        {cells.map((date) => (
          <button
            key={date}
            title={date}
            onMouseEnter={() => setTooltip(dayMap.get(date) || null)}
            onMouseLeave={() => setTooltip(null)}
            className={`aspect-square rounded-sm border transition-transform hover:scale-110 ${getColor(date)} ${date === today ? "ring-1 ring-white/30" : ""}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-zinc-900 border border-zinc-800" />
          <div className="w-3 h-3 rounded-sm bg-indigo-900 border border-indigo-700" />
          <div className="w-3 h-3 rounded-sm bg-indigo-600 border border-indigo-500" />
        </div>
        <span>More</span>
      </div>

      {tooltip && (
        <div className="mt-3 p-3 bg-zinc-900 rounded-lg border border-zinc-700 text-sm animate-fadeIn">
          <p className="font-medium text-white">{new Date(tooltip.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
          <p className="text-zinc-400">{tooltip.attempts} session{tooltip.attempts !== 1 ? "s" : ""} · {tooltip.questionsAnswered} questions</p>
          {tooltip.topics.length > 0 && (
            <p className="text-indigo-300 mt-1">{tooltip.topics.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
