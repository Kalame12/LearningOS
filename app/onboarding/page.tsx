"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, X, Plus } from "lucide-react";

type Answers = {
  fullName: string;
  branch: string;
  experience: string;
  subjects: string[];
  semesterWeeks: string;
  dailyMinutes: string;
  provider: string;
  model: string;
};

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectInput, setSubjectInput] = useState("");
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [answers, setAnswers] = useState<Answers>({
    fullName: "",
    branch: "",
    experience: "",
    subjects: [],
    semesterWeeks: "16",
    dailyMinutes: "90",
    provider: "openai",
    model: "gpt-4o-mini",
  });

  const addSubject = () => {
    const trimmed = subjectInput.trim();
    if (trimmed && !answers.subjects.includes(trimmed) && answers.subjects.length < 10) {
      setAnswers((prev) => ({ ...prev, subjects: [...prev.subjects, trimmed] }));
      setSubjectInput("");
    }
  };

  const removeSubject = (s: string) =>
    setAnswers((prev) => ({ ...prev, subjects: prev.subjects.filter((x) => x !== s) }));

  const goToStep3 = async () => {
    if (answers.subjects.length === 0) {
      setError("Add at least one subject.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: answers.subjects }),
      });
      const data = await res.json();
      setConfirmed(data.confirmed || answers.subjects);
      setSuggested(data.suggested || []);
      setAiMessage(data.message || "");
    } catch {
      setConfirmed(answers.subjects);
    }
    setLoading(false);
    setStep(3);
  };

  const acceptSuggestion = (s: string) => {
    if (!answers.subjects.includes(s)) {
      setAnswers((prev) => ({ ...prev, subjects: [...prev.subjects, s] }));
    }
    setSuggested((prev) => prev.filter((x) => x !== s));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let score = 1;
      if (answers.experience === "intermediate") score = 3;
      if (answers.experience === "advanced") score = 5;
      const level = score >= 5 ? "advanced" : score >= 3 ? "intermediate" : "beginner";

      await supabase.from("profiles").insert([{
        purpose: "university_learning_os",
        level,
        projects: "0",
        hackathons: "0",
        interest: answers.branch,
        goal: answers.subjects.join(", "),
        time_commitment: `${answers.dailyMinutes} mins/day`,
      }]);

      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          level,
          interest: answers.branch,
          goal: answers.subjects.join(", "),
          semesterWeeks: Number(answers.semesterWeeks),
          dailyMinutes: Number(answers.dailyMinutes),
          provider: answers.provider,
          model: answers.model,
          subjects: answers.subjects,
        }),
      });

      const data = await res.json();
      if (!data || !Array.isArray(data.roadmap)) {
        setError("Failed to generate roadmap. Try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem("ai_provider", answers.provider);
      localStorage.setItem("ai_model", answers.model);
      window.location.href = "/roadmap";
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                step === n ? "bg-indigo-600 border-indigo-500 text-white"
                : step > n ? "bg-indigo-900 border-indigo-700 text-indigo-300"
                : "bg-zinc-900 border-zinc-700 text-zinc-500"
              }`}>{n}</div>
              {n < 5 && <div className={`h-px w-6 ${step > n ? "bg-indigo-600" : "bg-zinc-700"}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-zinc-400">
            {["Profile", "Subjects", "AI Review", "Schedule", "Generating"][step - 1]}
          </span>
        </div>

        <div className="card animate-fadeIn">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="page-header text-xl">Tell us about yourself</h2>
              <input
                placeholder="Your full name"
                value={answers.fullName}
                onChange={(e) => setAnswers({ ...answers, fullName: e.target.value })}
                className="field-input w-full"
              />
              <input
                placeholder="Branch / track (e.g. CSE, ECE, BBA)"
                value={answers.branch}
                onChange={(e) => setAnswers({ ...answers, branch: e.target.value })}
                className="field-input w-full"
              />
              <select
                value={answers.experience}
                onChange={(e) => setAnswers({ ...answers, experience: e.target.value })}
                className="field-input w-full"
              >
                <option value="">Current level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!answers.branch || !answers.experience) {
                      setError("Please fill in all fields.");
                      return;
                    }
                    setError(null);
                    setStep(2);
                  }}
                  className="btn-primary"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="page-header text-xl">What do you want to learn?</h2>
              <p className="text-sm text-zinc-400">Type a subject and press Enter to add it. Add up to 10.</p>
              <div className="flex gap-2">
                <input
                  placeholder="e.g. React Hooks, DSA, DBMS..."
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSubject(); } }}
                  className="field-input flex-1"
                />
                <button onClick={addSubject} className="btn-ghost px-3">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {answers.subjects.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-indigo-900/40 border border-indigo-700 text-indigo-300 text-sm px-3 py-1 rounded-full">
                    {s}
                    <button onClick={() => removeSubject(s)} className="hover:text-white"><X size={12} /></button>
                  </span>
                ))}
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="btn-ghost">Back</button>
                <button onClick={goToStep3} disabled={loading} className="btn-primary">
                  {loading ? "Checking..." : <><span>Next</span> <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="page-header text-xl">AI Review</h2>
              {aiMessage && <p className="text-zinc-300 text-sm">{aiMessage}</p>}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Your topics</p>
                <div className="flex flex-wrap gap-2">
                  {confirmed.map((s) => (
                    <span key={s} className="badge bg-emerald-900/30 border-emerald-700 text-emerald-300">{s}</span>
                  ))}
                </div>
              </div>
              {suggested.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Suggested additions</p>
                  <div className="flex flex-wrap gap-2">
                    {suggested.map((s) => (
                      <button
                        key={s}
                        onClick={() => acceptSuggestion(s)}
                        className="badge border-dashed border-zinc-600 text-zinc-400 hover:border-indigo-500 hover:text-indigo-300 cursor-pointer"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="btn-ghost">Back</button>
                <button onClick={() => setStep(4)} className="btn-primary">
                  Looks good <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="page-header text-xl">Set your schedule</h2>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={answers.semesterWeeks}
                  onChange={(e) => setAnswers({ ...answers, semesterWeeks: e.target.value })}
                  className="field-input"
                >
                  <option value="12">12-week semester</option>
                  <option value="16">16-week semester</option>
                  <option value="20">20-week semester</option>
                </select>
                <select
                  value={answers.dailyMinutes}
                  onChange={(e) => setAnswers({ ...answers, dailyMinutes: e.target.value })}
                  className="field-input"
                >
                  <option value="60">60 mins/day</option>
                  <option value="90">90 mins/day</option>
                  <option value="120">120 mins/day</option>
                  <option value="180">180 mins/day</option>
                </select>
                <select
                  value={answers.provider}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      provider: e.target.value,
                      model: e.target.value === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini",
                    }))
                  }
                  className="field-input"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </select>
                <input
                  value={answers.model}
                  onChange={(e) => setAnswers({ ...answers, model: e.target.value })}
                  className="field-input"
                  placeholder="Model (e.g. gpt-4o-mini)"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="btn-ghost">Back</button>
                <button onClick={() => { setStep(5); handleSubmit(); }} className="btn-primary">
                  Generate Roadmap <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4 text-center py-8">
              <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500 flex items-center justify-center mx-auto animate-pulse">
                <span className="text-2xl">🧠</span>
              </div>
              <h2 className="text-xl font-semibold">Building your personalized roadmap...</h2>
              <p className="text-zinc-400 text-sm">Analyzing your subjects, setting up spaced revision, generating 6-step plan.</p>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
