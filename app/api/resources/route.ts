import { NextResponse } from "next/server";

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url?: string } };
  };
};

type YouTubeStatsItem = {
  id?: string;
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};

function toNumber(value: string | undefined): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = (searchParams.get("topic") || "").trim();
  const encoded = encodeURIComponent(`${topic} tutorial`);
  const fallbackVideos = [
    {
      title: `Search YouTube: ${topic} tutorial`,
      thumbnail: null,
      videoId: null,
      url: `https://www.youtube.com/results?search_query=${encoded}`,
      views: null,
      channel: "YouTube Search",
    },
  ];

  if (!topic) return NextResponse.json({ videos: [] });

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ videos: fallbackVideos });
  }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        topic + " tutorial"
      )}&type=video&maxResults=5&order=viewCount&relevanceLanguage=en&key=${apiKey}`
    );
    if (!searchRes.ok) {
      return NextResponse.json({ videos: fallbackVideos });
    }
    const searchData = await searchRes.json();
    const items = (searchData.items || []) as YouTubeSearchItem[];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ videos: fallbackVideos });
    }
    const videoIds = items.map((i) => i.id?.videoId).filter(Boolean).join(",");
    if (!videoIds) {
      return NextResponse.json({ videos: fallbackVideos });
    }

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const statsData = statsRes.ok ? await statsRes.json() : { items: [] };
    const statsMap = new Map<string, YouTubeStatsItem>(
      ((statsData.items || []) as YouTubeStatsItem[]).map((v) => [String(v.id || ""), v])
    );

    const ranked = items
      .map((item) => {
        const videoId = item.id?.videoId || "";
        const stat = statsMap.get(videoId);
        const viewCount = toNumber(stat?.statistics?.viewCount);
        const likeCount = toNumber(stat?.statistics?.likeCount);
        const commentCount = toNumber(stat?.statistics?.commentCount);
        // Weighted quality score: views + engagement ratio proxy.
        const engagement = (likeCount + commentCount * 2) / Math.max(1, viewCount);
        const score = viewCount * (1 + engagement * 10);
        return {
          title: item.snippet?.title || "YouTube Video",
          thumbnail: item.snippet?.thumbnails?.medium?.url || null,
          videoId: videoId || null,
          url: videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : `https://www.youtube.com/results?search_query=${encoded}`,
          views: viewCount > 0 ? viewCount.toLocaleString() : null,
          channel: item.snippet?.channelTitle || null,
          qualityScore: Number(score.toFixed(2)),
        };
      })
      .filter((video) => Boolean(video.videoId))
      .sort((a, b) => b.qualityScore - a.qualityScore);

    const videos = ranked.slice(0, 3).map((video) => ({
      title: video.title,
      thumbnail: video.thumbnail,
      videoId: video.videoId,
      url: video.url,
      views: video.views,
      channel: video.channel,
      qualityScore: video.qualityScore,
    }));

    return NextResponse.json({ videos: videos.length > 0 ? videos : fallbackVideos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ videos: fallbackVideos });
  }
}
