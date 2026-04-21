"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Visualizer from "@/components/Visualizer";
import Link from "next/link";
import { DEFAULT_CLIENT_MODEL_BY_PROVIDER, DEFAULT_CLIENT_PROVIDER } from "@/lib/ai-client-defaults";

export default function LearningPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🗺️ ROADMAP
  const getRoadmapLink = (topic: string) => {
    const t = (topic || "").toLowerCase();

    if (t.includes("data") || t.includes("algorithm"))
      return "https://roadmap.sh/datastructures-and-algorithms";

    if (t.includes("web")) return "https://roadmap.sh/frontend";
    if (t.includes("backend")) return "https://roadmap.sh/backend";
    if (t.includes("ai")) return "https://roadmap.sh/machine-learning";

    return "https://roadmap.sh";
  };

  // 🎤 VOICE INPUT
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.start();
    setListening(true);

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;

      setInput(transcript);
      setIsVoiceInput(true); // 🔥 mark voice input
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
  };

  // 🔊 CLEAN SPEECH
  const speakInChunks = (text: string) => {
    const clean = text
      .replace(/#+\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/[-•]/g, "")
      .replace(/`/g, "")
      .replace(/[\p{Emoji}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    const sentences = clean.split(/(?<=[.!?])\s+/);

    let i = 0;

    const speakNext = () => {
      if (i >= sentences.length) return;

      const speech = new SpeechSynthesisUtterance(sentences[i]);
      speech.rate = 1;
      speech.pitch = 1;

      speech.onend = () => {
        i++;
        speakNext();
      };

      window.speechSynthesis.speak(speech);
    };

    window.speechSynthesis.cancel(); // stop previous
    speakNext();
  };

  // 🚀 SEND MESSAGE
  const handleSend = async () => {
    if (!input.trim()) return;

    window.speechSynthesis.cancel(); // 🛑 stop old speech

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/learning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          provider: localStorage.getItem("ai_provider") || DEFAULT_CLIENT_PROVIDER,
          model:
            localStorage.getItem("ai_model") ||
            DEFAULT_CLIENT_MODEL_BY_PROVIDER[localStorage.getItem("ai_provider") || DEFAULT_CLIENT_PROVIDER],
        }),
      });

      const data = await res.json();

      const botMsg = {
        role: "bot",
        text: "",
        topic: data.topic,
        videos: data.videos,
        steps: data.steps,
        action: data.action,
        actionResult: data.actionResult,
      };

      setMessages((prev) => [...prev, botMsg]);

      const fullText = data.explanation || "";

      // 🔊 SPEAK ONLY IF VOICE INPUT
      if (isVoiceInput) {
        speakInChunks(fullText);
        setIsVoiceInput(false);
      }

      // ✨ typing animation
      let i = 0;

      const interval = setInterval(() => {
        i++;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].text =
            fullText.slice(0, i);
          return updated;
        });

        if (i >= fullText.length) clearInterval(interval);
      }, 10);

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <main className="h-screen bg-black text-white flex flex-col">

      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 text-xl font-semibold">
        Saarthi AI 🎙️
      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                max-w-[70%] px-4 py-3 text-sm shadow-md
                ${
                  msg.role === "user"
                    ? "bg-blue-600 rounded-2xl rounded-br-md"
                    : "bg-gray-800 rounded-2xl rounded-bl-md"
                }
              `}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>

              {/* 🎥 VIDEOS */}
              {msg.videos?.length > 0 && (
                <div className="flex gap-3 mt-3 overflow-x-auto">
                  {msg.videos.map((v: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setActiveVideo(v.videoId)}
                      className="cursor-pointer min-w-[200px] bg-gray-900 rounded-xl overflow-hidden"
                    >
                      <img src={v.thumbnail} />
                      <p className="text-xs p-2">{v.title}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 🎬 VIDEO */}
              {activeVideo && (
                <div className="mt-3">
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="bg-red-500 px-2 py-1 text-xs rounded mb-2"
                  >
                    ✖ Close
                  </button>

                  <iframe
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${activeVideo}`}
                  />
                </div>
              )}

              {/* 🗺️ ROADMAP */}
              {msg.topic && msg.topic.length > 3 && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      window.open(getRoadmapLink(msg.topic), "_blank")
                    }
                    className="bg-purple-600 px-3 py-2 rounded text-sm"
                  >
                    View Roadmap 🗺️
                  </button>
                </div>
              )}

              {/* 🔥 VISUALIZER */}
              {msg.steps?.length > 0 && (
                <Visualizer steps={msg.steps} />
              )}

              {msg.action && msg.action !== "none" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-indigo-900/60 border border-indigo-700">
                    Action: {msg.action}
                  </span>
                  {msg.action === "generate_roadmap" && (
                    <Link href="/roadmap" className="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600">
                      Open Roadmap
                    </Link>
                  )}
                  {msg.action === "generate_today_tasks" && (
                    <Link href="/today" className="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600">
                      Open Today
                    </Link>
                  )}
                  {msg.action === "show_progress" && (
                    <Link href="/progress" className="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600">
                      Open Progress
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 🤖 THINKING */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-md flex gap-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce delay-100">.</span>
              <span className="animate-bounce delay-200">.</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-gray-800 flex gap-2">

        {/* 🎤 MIC */}
        <button
          onClick={startListening}
          className={`px-4 py-2 rounded ${
            listening ? "bg-red-600" : "bg-gray-700"
          }`}
        >
          🎤
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening..." : "Ask anything..."}
          className="flex-1 p-3 bg-gray-800 rounded"
        />

        <button
          onClick={handleSend}
          className="bg-blue-600 px-5 rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}