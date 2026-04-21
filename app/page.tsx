"use client";

import { ArrowRight } from "lucide-react";
import SplineRobot from "@/components/SplineRobot";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#0a0a0a_80%)]" />

      <div className="relative z-10 grid md:grid-cols-2 items-center min-h-screen px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start text-center md:text-left animate-fadeIn">
          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight bg-gradient-to-r from-white to-indigo-400 text-transparent bg-clip-text">
            Saarthi AI
          </h1>

          <p className="text-base text-zinc-400 max-w-md mb-8 leading-relaxed">
            Your Learning OS for university students. Set one goal and Saarthi
            generates your roadmap, daily tasks, adaptive revision, and mastery tracking.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            {status === "unauthenticated" ? (
              <button onClick={() => signIn("google")} className="btn-primary">
                Sign in to start <ArrowRight size={16} />
              </button>
            ) : status === "authenticated" ? (
              <>
                <button
                  onClick={() => router.push("/onboarding")}
                  className="btn-primary"
                >
                  Start Learning OS <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => router.push("/today")}
                  className="btn-ghost"
                >
                  Open Today Plan
                </button>
                <button
                  onClick={() => router.push("/progress")}
                  className="btn-ghost"
                >
                  View Progress
                </button>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {["Roadmap", "Daily Tasks", "Auto Notes", "Mastery Score"].map((f) => (
              <span key={f} className="badge">{f}</span>
            ))}
          </div>
        </div>

        <div className="h-[500px] md:h-[600px] w-full">
          <SplineRobot />
        </div>
      </div>
    </main>
  );
}
