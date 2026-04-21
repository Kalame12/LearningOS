"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

type Props = { thoughts: string[] };

export default function ThinkingPanel({ thoughts }: Props) {
  const [visible, setVisible] = useState<number>(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (visible >= thoughts.length) return;
    const timer = setTimeout(() => setVisible((v) => v + 1), 420);
    return () => clearTimeout(timer);
  }, [visible, thoughts.length]);

  return (
    <div className={`border border-zinc-800 rounded-xl bg-zinc-950 transition-all ${open ? "p-4" : "p-3"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        <span className="text-indigo-400 text-sm font-semibold">🧠 AI Reasoning</span>
        <ChevronRight size={14} className={`text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2">
          {thoughts.slice(0, visible).map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-zinc-400 animate-fadeIn"
            >
              <span className="mt-0.5 shrink-0 text-indigo-500">›</span>
              <span>{t}</span>
            </div>
          ))}
          {visible < thoughts.length && (
            <div className="flex gap-1 pl-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
