"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Play } from "lucide-react";

type Video = {
  title: string;
  thumbnail: string | null;
  videoId: string | null;
  url: string;
  views: string | null;
  channel?: string;
};

type Props = {
  step: { step: string; id: string };
  onClose: () => void;
};

export default function ResourcePanel({ step, onClose }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/resources?topic=${encodeURIComponent(step.step)}`);
        const data = await res.json();
        setVideos(data.videos || []);
      } catch {
        setVideos([]);
      }
      setLoading(false);
    };
    fetchVideos();
  }, [step.step]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-5 shadow-2xl animate-fadeIn">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="badge mb-1">YouTube Resources</p>
            <h3 className="font-semibold text-white">{step.step}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && videos.length === 0 && (
          <p className="text-zinc-500 text-sm">No videos found for this topic.</p>
        )}

        {!loading && videos.length > 0 && (
          <div className="space-y-3">
            {videos.map((v, i) => (
              <a
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition group"
              >
                {v.thumbnail ? (
                  <div className="relative shrink-0 w-20 h-14 rounded overflow-hidden">
                    <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition">
                      <Play size={16} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 w-20 h-14 rounded bg-zinc-800 flex items-center justify-center">
                    <Play size={16} className="text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{v.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {v.channel && <p className="text-xs text-zinc-500 truncate">{v.channel}</p>}
                    {v.views && <p className="text-xs text-zinc-600 shrink-0">{v.views} views</p>}
                  </div>
                </div>
                <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 transition shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
