import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "";

  if (!topic) return NextResponse.json({ videos: [] });

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    const encoded = encodeURIComponent(`${topic} tutorial`);
    return NextResponse.json({
      videos: [
        {
          title: `Search YouTube: ${topic} tutorial`,
          thumbnail: null,
          videoId: null,
          url: `https://www.youtube.com/results?search_query=${encoded}`,
          views: null,
        },
      ],
    });
  }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        topic + " tutorial"
      )}&type=video&maxResults=5&order=viewCount&relevanceLanguage=en&key=${apiKey}`
    );
    const searchData = await searchRes.json();
    const items = searchData.items || [];
    const videoIds = items.map((i: any) => i.id.videoId).join(",");

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`
    );
    const statsData = await statsRes.json();
    const statsMap = new Map(
      (statsData.items || []).map((v: any) => [v.id, v])
    );

    const videos = items.slice(0, 3).map((item: any) => {
      const stat = statsMap.get(item.id.videoId) as any;
      const views = stat?.statistics?.viewCount
        ? Number(stat.statistics.viewCount).toLocaleString()
        : null;
      return {
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        videoId: item.id.videoId,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        views,
        channel: item.snippet.channelTitle,
      };
    });

    return NextResponse.json({ videos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ videos: [] });
  }
}
