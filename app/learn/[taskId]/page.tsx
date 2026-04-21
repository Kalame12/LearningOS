"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import ThinkingPanel from "@/components/ThinkingPanel";

type QuizItem = { question: string; options: string[]; answerIndex: number };
type CornellNote = {
  cues: string[];
  mainNotes: string;
  examples: string[];
  keyTerms: { term: string; definition: string }[];
  summary: string;
};

export default function LearnTaskPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const taskId = params.taskId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState("");
  const [markdownLesson, setMarkdownLesson] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [cornell, setCornell] = useState<CornellNote | null>(null);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [error, setError] = useState("");
  const [sessionStart] = useState<number>(Date.now());
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [canExplain, setCanExplain] = useState(false);
  const [blocker, setBlocker] = useState("");

  useEffect(() => {
    const savedProvider = localStorage.getItem("ai_provider");
    const savedModel = localStorage.getItem("ai_model");
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setModel(savedModel);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/learn/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, provider, model }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load lesson");
        setTopic(data.task.topic);
        setMarkdownLesson(data.lesson.markdownLesson);
        setNotesSummary(data.lesson.summary);
        setCornell(data.lesson.cornell || null);
        setThoughts(data.thoughts || []);
        setQuiz(data.lesson.quiz || []);
        setSelectedAnswers(new Array((data.lesson.quiz || []).length).fill(-1));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load lesson");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [taskId, provider, model]);

  const notesMarkdown = useMemo(
    () => `# ${topic}\n\n${markdownLesson}\n\n## Key Takeaways\n- ${notesSummary}`,
    [topic, markdownLesson, notesSummary]
  );

  const handleSubmit = async () => {
    setSaving(true);
    const total = quiz.length;
    const correct = quiz.reduce((acc, q, idx) => (selectedAnswers[idx] === q.answerIndex ? acc + 1 : acc), 0);
    const timeSpentMinutes = Math.max(1, Math.round((Date.now() - sessionStart) / 60000));

    const res = await fetch("/api/learn/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        correctCount: correct, totalCount: total,
        hintsUsed, skippedCount, confidence, timeSpentMinutes,
        notesMarkdown, notesSummary,
        reflectionCanExplain: canExplain,
        reflectionBlocker: blocker,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.message || "Failed to save attempt"); return; }
    alert(`Mastery: ${data.masteryBefore} → ${data.masteryAfter}\nNext review: ${data.nextReviewDate}`);
    router.push("/today");
  };

  if (loading) return <main className="min-h-screen bg-[#0a0a0a] text-white p-8">Loading lesson...</main>;
  if (error) return <main className="min-h-screen bg-[#0a0a0a] text-red-400 p-8">{error}</main>;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <p className="badge mb-2">Learning Session</p>
        <h1 className="page-header">{topic}</h1>
        <p className="page-subheader mb-6">Read, answer the quiz, and complete the task to update mastery.</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              const m = e.target.value === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini";
              setModel(m);
              localStorage.setItem("ai_provider", e.target.value);
              localStorage.setItem("ai_model", m);
            }}
            className="field-input max-w-[160px]"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <input
            value={model}
            onChange={(e) => { setModel(e.target.value); localStorage.setItem("ai_model", e.target.value); }}
            className="field-input max-w-[200px]"
            placeholder="Model"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: lesson + quiz */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cornell Notes Layout */}
            {cornell ? (
              <div className="card space-y-0 overflow-hidden p-0">
                <div className="px-4 pt-4 pb-2 border-b border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Cornell Notes — {topic}</p>
                </div>
                <div className="flex divide-x divide-zinc-800">
                  {/* Cue column */}
                  <div className="w-[30%] p-4 space-y-4 bg-zinc-950">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Cue Questions</p>
                      <ul className="space-y-2">
                        {cornell.cues.map((cue, i) => (
                          <li key={i} className="text-xs text-indigo-300 leading-snug">→ {cue}</li>
                        ))}
                      </ul>
                    </div>
                    {cornell.keyTerms.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Key Terms</p>
                        {cornell.keyTerms.map((kt, i) => (
                          <div key={i} className="mb-2">
                            <p className="text-xs font-semibold text-white">{kt.term}</p>
                            <p className="text-xs text-zinc-400">{kt.definition}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Main notes column */}
                  <div className="flex-1 p-4 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{cornell.mainNotes}</ReactMarkdown>
                    {cornell.examples.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Examples</p>
                        {cornell.examples.map((ex, i) => (
                          <pre key={i} className="text-xs bg-zinc-900 rounded p-2 mb-2 overflow-x-auto">{ex}</pre>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Summary strip */}
                <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-sm text-zinc-300">{cornell.summary}</p>
                </div>
              </div>
            ) : (
              <div className="card prose prose-invert max-w-none">
                <ReactMarkdown>{markdownLesson}</ReactMarkdown>
              </div>
            )}

            {/* Quiz */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Mini Quiz</h2>
              <div className="space-y-4">
                {quiz.map((q, qIdx) => (
                  <div key={`${q.question}-${qIdx}`} className="card p-4">
                    <p className="mb-3 font-medium">{q.question}</p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oIdx) => (
                        <button
                          key={`${opt}-${oIdx}`}
                          onClick={() => setSelectedAnswers((prev) => { const c = [...prev]; c[qIdx] = oIdx; return c; })}
                          className={`text-left px-3 py-2 rounded border text-sm transition ${
                            selectedAnswers[qIdx] === oIdx ? "bg-indigo-600/30 border-indigo-500 text-white" : "bg-zinc-900 border-zinc-700 hover:border-zinc-500"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reflection */}
            <div className="card">
              <h3 className="font-semibold mb-3">Quick Reflection</h3>
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" checked={canExplain} onChange={(e) => setCanExplain(e.target.checked)} />
                I can explain this topic to a friend
              </label>
              <textarea
                className="field-input min-h-[80px]"
                placeholder="Biggest blocker (optional)"
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
              />
            </div>

            {/* Tracking controls */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setHintsUsed((v) => v + 1)} className="btn-ghost text-sm">Used Hint ({hintsUsed})</button>
              <button onClick={() => setSkippedCount((v) => v + 1)} className="btn-ghost text-sm">Skipped ({skippedCount})</button>
              <label className="px-3 py-2 bg-zinc-900 rounded border border-zinc-700 text-sm">
                Confidence:
                <select className="ml-2 bg-black border border-zinc-700 rounded px-2 py-1" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))}>
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full md:w-auto">
              {saving ? "Saving..." : "Complete Task"}
            </button>
          </div>

          {/* RIGHT: thinking panel + stats */}
          <div className="space-y-4">
            {thoughts.length > 0 && <ThinkingPanel thoughts={thoughts} />}

            <div className="card space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Session Stats</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-lg font-semibold">{hintsUsed}</p>
                  <p className="text-xs text-zinc-500">Hints</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{skippedCount}</p>
                  <p className="text-xs text-zinc-500">Skipped</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{confidence}/5</p>
                  <p className="text-xs text-zinc-500">Confidence</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
