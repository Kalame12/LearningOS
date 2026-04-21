"use client";

import { useEffect, useState } from "react";
import { X, Play, ExternalLink, BookOpen, PlayCircle, HelpCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Video = {
  title: string;
  thumbnail: string | null;
  url: string;
  views: string | null;
  channel?: string | null;
  videoId?: string | null;
  qualityScore?: number;
};
type QuizItem = { question: string; options: string[]; answerIndex: number };
type CornellNote = { cues: string[]; mainNotes: string; examples: string[]; keyTerms: { term: string; definition: string }[]; summary: string };

type Props = {
  step: { id: string; step: string; status: string; platform?: string };
  onClose: () => void;
  onStart: (step: any) => void;
  startingId: string | null;
};

type Tab = "notes" | "videos" | "quiz";

export default function StepDetailPanel({ step, onClose, onStart, startingId }: Props) {
  const [tab, setTab] = useState<Tab>("notes");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [notes, setNotes] = useState<{ cornell: CornellNote | null; summary: string } | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);
  const [trackingVideoId, setTrackingVideoId] = useState<string | null>(null);

  // Load notes on open
  useEffect(() => {
    const load = async () => {
      setNotesLoading(true);
      try {
        const res = await fetch("/api/roadmap/step-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: step.step }),
        });
        const data = await res.json();
        setNotes({ cornell: data.cornell || null, summary: data.summary || "" });
        setQuiz(data.quiz || []);
        setAnswers(new Array((data.quiz || []).length).fill(-1));
      } catch {
        setNotes(null);
      }
      setNotesLoading(false);
    };
    load();
  }, [step.step]);

  // Load videos when tab is switched to videos
  useEffect(() => {
    if (tab !== "videos" || videos.length > 0) return;
    const load = async () => {
      setVideosLoading(true);
      try {
        const res = await fetch(`/api/resources?topic=${encodeURIComponent(step.step)}`);
        const data = await res.json();
        setVideos(data.videos || []);
      } catch {
        setVideos([]);
      }
      setVideosLoading(false);
    };
    load();
  }, [tab, step.step, videos.length]);

  useEffect(() => {
    if (tab !== "videos" || videos.length === 0) return;
    const ids = videos
      .map((video) => video.videoId || "")
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;

    const loadProgress = async () => {
      try {
        const res = await fetch(
          `/api/resources/progress?topic=${encodeURIComponent(step.step)}&videoIds=${encodeURIComponent(ids.join(","))}`
        );
        const data = await res.json();
        setWatchedVideoIds(Array.isArray(data.watchedVideoIds) ? data.watchedVideoIds : []);
      } catch {
        setWatchedVideoIds([]);
      }
    };
    loadProgress();
  }, [tab, videos, step.step]);

  const toggleWatched = async (videoId: string, watched: boolean) => {
    setTrackingVideoId(videoId);
    try {
      await fetch("/api/resources/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: step.step,
          videoId,
          watched,
        }),
      });
      setWatchedVideoIds((prev) =>
        watched ? Array.from(new Set([...prev, videoId])) : prev.filter((id) => id !== videoId)
      );
    } finally {
      setTrackingVideoId(null);
    }
  };

  const correctCount = submitted ? quiz.reduce((acc, q, i) => (answers[i] === q.answerIndex ? acc + 1 : acc), 0) : 0;
  const allCurrentVideosWatched =
    videos.length > 0 &&
    videos
      .map((video) => video.videoId || "")
      .filter((id): id is string => Boolean(id))
      .every((id) => watchedVideoIds.includes(id));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <p className="badge mb-1">Roadmap Step</p>
            <h3 className="font-semibold text-white text-lg leading-snug">{step.step}</h3>
            {step.platform && <p className="text-xs text-zinc-500 mt-0.5">Suggested resource: {step.platform}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onStart(step)}
              disabled={startingId === step.id || step.status === "completed"}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
            >
              <Play size={12} />
              {startingId === step.id ? "Opening..." : step.status === "completed" ? "Done ✓" : "Start Learning"}
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 shrink-0">
          {(["notes", "videos", "quiz"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "border-indigo-500 text-indigo-300" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "notes" && <BookOpen size={14} />}
              {t === "videos" && <PlayCircle size={14} />}
              {t === "quiz" && <HelpCircle size={14} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* NOTES TAB */}
          {tab === "notes" && (
            <>
              {notesLoading && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Generating notes...
                </div>
              )}
              {!notesLoading && !notes && (
                <p className="text-zinc-500 text-sm">Could not load notes.</p>
              )}
              {!notesLoading && notes?.cornell && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-lg">
                    <p className="text-xs text-indigo-400 uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-sm text-zinc-200">{notes.cornell.summary}</p>
                  </div>

                  {/* Cue questions */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">After this lesson, you should be able to answer:</p>
                    <ul className="space-y-1">
                      {notes.cornell.cues.map((cue, i) => (
                        <li key={i} className="text-xs text-indigo-300 flex gap-2"><span className="shrink-0">→</span>{cue}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Main notes */}
                  <div className="prose prose-invert prose-sm max-w-none border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
                    <ReactMarkdown>{notes.cornell.mainNotes}</ReactMarkdown>
                  </div>

                  {/* Examples */}
                  {notes.cornell.examples.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Examples</p>
                      {notes.cornell.examples.map((ex, i) => (
                        <pre key={i} className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-2 overflow-x-auto whitespace-pre-wrap">{ex}</pre>
                      ))}
                    </div>
                  )}

                  {/* Key terms */}
                  {notes.cornell.keyTerms.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Key Terms</p>
                      <div className="space-y-2">
                        {notes.cornell.keyTerms.map((kt, i) => (
                          <div key={i} className="flex gap-3 text-sm">
                            <span className="text-white font-semibold shrink-0 min-w-[120px]">{kt.term}</span>
                            <span className="text-zinc-400">{kt.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* VIDEOS TAB */}
          {tab === "videos" && (
            <>
              {videosLoading && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Finding videos...
                </div>
              )}
              {!videosLoading && videos.length === 0 && <p className="text-zinc-500 text-sm">No videos found.</p>}
              {!videosLoading && videos.length > 0 && (
                <div className="space-y-3">
                  <div className={`text-xs px-3 py-2 rounded border ${allCurrentVideosWatched ? "bg-emerald-950/40 border-emerald-700 text-emerald-300" : "bg-zinc-900 border-zinc-700 text-zinc-400"}`}>
                    {allCurrentVideosWatched
                      ? "All recommended videos marked as watched."
                      : `${watchedVideoIds.length}/${videos.filter((v) => Boolean(v.videoId)).length} videos marked as watched.`}
                  </div>
                  {videos.map((v, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <a href={v.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 hover:bg-zinc-800 rounded-lg transition group">
                      {v.thumbnail ? (
                        <div className="relative shrink-0 w-24 h-16 rounded overflow-hidden">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition">
                            <Play size={18} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="shrink-0 w-24 h-16 rounded bg-zinc-800 flex items-center justify-center">
                          <Play size={18} className="text-zinc-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{v.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {v.channel && <p className="text-xs text-zinc-500 truncate">{v.channel}</p>}
                          {v.views && <p className="text-xs text-zinc-600 shrink-0">{v.views} views</p>}
                          {typeof v.qualityScore === "number" && (
                            <p className="text-xs text-zinc-600 shrink-0">score {v.qualityScore}</p>
                          )}
                        </div>
                      </div>
                      <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 transition shrink-0" />
                      </a>
                      {v.videoId && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => toggleWatched(v.videoId as string, !watchedVideoIds.includes(v.videoId as string))}
                            disabled={trackingVideoId === v.videoId}
                            className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
                          >
                            {watchedVideoIds.includes(v.videoId) ? "Mark as not watched" : "Mark as watched"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* QUIZ TAB */}
          {tab === "quiz" && (
            <>
              {quizLoading && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading quiz...
                </div>
              )}
              {!quizLoading && quiz.length === 0 && <p className="text-zinc-500 text-sm">No quiz available. Load notes first.</p>}
              {!quizLoading && quiz.length > 0 && (
                <div className="space-y-5">
                  {submitted && (
                    <div className={`p-3 rounded-lg border text-sm font-medium ${correctCount === quiz.length ? "bg-emerald-950/40 border-emerald-700 text-emerald-300" : "bg-amber-950/40 border-amber-700 text-amber-300"}`}>
                      {correctCount}/{quiz.length} correct {correctCount === quiz.length ? "🎉 Perfect!" : "— keep practising!"}
                    </div>
                  )}
                  {quiz.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-2">
                      <p className="text-sm font-medium text-white">{qIdx + 1}. {q.question}</p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          let cls = "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500";
                          if (submitted) {
                            if (oIdx === q.answerIndex) cls = "bg-emerald-950/40 border-emerald-600 text-emerald-300";
                            else if (oIdx === answers[qIdx]) cls = "bg-red-950/40 border-red-700 text-red-300";
                          } else if (answers[qIdx] === oIdx) {
                            cls = "bg-indigo-600/20 border-indigo-500 text-white";
                          }
                          return (
                            <button key={oIdx} disabled={submitted}
                              onClick={() => setAnswers((prev) => { const c = [...prev]; c[qIdx] = oIdx; return c; })}
                              className={`w-full text-left px-3 py-2 rounded border text-sm transition ${cls}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {!submitted && (
                    <button onClick={() => setSubmitted(true)} disabled={answers.includes(-1)}
                      className="btn-primary w-full disabled:opacity-50">
                      Submit Quiz
                    </button>
                  )}
                  {submitted && (
                    <button onClick={() => { setSubmitted(false); setAnswers(new Array(quiz.length).fill(-1)); }}
                      className="btn-ghost w-full text-sm">
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
