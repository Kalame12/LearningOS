"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
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
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [error, setError] = useState("");
  const [sessionStart, setSessionStart] = useState<number>(Date.now());
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [canExplain, setCanExplain] = useState(false);
  const [blocker, setBlocker] = useState("");

  useEffect(() => {
    const savedProvider = localStorage.getItem("ai_provider");
    const savedModel = localStorage.getItem("ai_model");
    if (savedProvider) {
      setProvider(savedProvider);
    }
    if (savedModel) {
      setModel(savedModel);
    }
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
        setQuiz(data.lesson.quiz || []);
        setSelectedAnswers(new Array((data.lesson.quiz || []).length).fill(-1));
        setSessionStart(Date.now());
        await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "lesson_opened", taskId, topic: data.task.topic }),
        });
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
        correctCount: correct,
        totalCount: total,
        hintsUsed,
        skippedCount,
        confidence,
        timeSpentMinutes,
        notesMarkdown,
        notesSummary,
        reflectionCanExplain: canExplain,
        reflectionBlocker: blocker,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.message || "Failed to save attempt");
      return;
    }

    alert(`Mastery updated: ${data.masteryBefore} -> ${data.masteryAfter}\nNext review: ${data.nextReviewDate}`);
    router.push("/today");
  };

  if (loading) return <main className="min-h-screen bg-black text-white p-8">Loading lesson...</main>;
  if (error) return <main className="min-h-screen bg-black text-red-400 p-8">{error}</main>;

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <p className="badge mb-2">Learning Session</p>
        <h1 className="page-header">{topic}</h1>
        <p className="page-subheader">Read, answer the quiz, and complete the task to update mastery.</p>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={provider}
            onChange={(e) => {
              const value = e.target.value;
              setProvider(value);
              const nextModel = value === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini";
              setModel(nextModel);
              localStorage.setItem("ai_provider", value);
              localStorage.setItem("ai_model", nextModel);
            }}
            className="field-input max-w-[180px]"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <input
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              localStorage.setItem("ai_model", e.target.value);
            }}
            className="field-input max-w-sm"
            placeholder="Model"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="card py-4">
            <p className="text-xs text-zinc-400">Hints Used</p>
            <p className="text-2xl font-semibold">{hintsUsed}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-zinc-400">Skipped</p>
            <p className="text-2xl font-semibold">{skippedCount}</p>
          </div>
          <div className="card py-4">
            <p className="text-xs text-zinc-400">Confidence</p>
            <p className="text-2xl font-semibold">{confidence}/5</p>
          </div>
        </div>

        <div className="card mb-6 prose prose-invert max-w-none">
          <ReactMarkdown>{markdownLesson}</ReactMarkdown>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Mini Quiz</h2>
          <div className="space-y-4">
            {quiz.map((q, qIdx) => (
              <div key={`${q.question}-${qIdx}`} className="card p-4">
                <p className="mb-2">{q.question}</p>
                <div className="grid gap-2">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={`${opt}-${oIdx}`}
                      onClick={() =>
                        setSelectedAnswers((prev) => {
                          const copy = [...prev];
                          copy[qIdx] = oIdx;
                          return copy;
                        })
                      }
                      className={`text-left px-3 py-2 rounded border ${
                        selectedAnswers[qIdx] === oIdx ? "bg-blue-600 border-blue-400" : "bg-zinc-900 border-zinc-700"
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

        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={() => setHintsUsed((v) => v + 1)} className="btn-ghost">
          Used Hint (+1)
        </button>
          <button onClick={() => setSkippedCount((v) => v + 1)} className="btn-ghost">
          Skipped (+1)
        </button>
          <label className="px-3 py-2 bg-zinc-900 rounded border border-zinc-700">
            Confidence:
            <select
              className="ml-2 bg-black border border-zinc-700 rounded px-2 py-1"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold mb-3">Quick Reflection</h3>
          <label className="flex items-center gap-2 text-sm mb-3">
            <input
              type="checkbox"
              checked={canExplain}
              onChange={(e) => setCanExplain(e.target.checked)}
            />
            I can explain this topic to a friend
          </label>
          <textarea
            className="field-input min-h-[90px]"
            placeholder="Biggest blocker (optional)"
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
          />
        </div>

        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Complete Task"}
        </button>
      </div>
    </main>
  );
}
