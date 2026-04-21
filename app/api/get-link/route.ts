import { NextResponse } from "next/server";
import { DEFAULT_OPENROUTER_MODEL } from "@/lib/ai-config";

export async function POST(req: Request) {
  try {
    const { platform, difficulty, stepText } = await req.json();

    // 🔥 Ask AI to infer topic from step text
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_MODEL,
        messages: [
          {
            role: "user",
            content: `
Classify the topic of this step into ONE word only:
Options: dsa, webdev, ai, systemdesign, general

Step: "${stepText}"

Return only the word.
            `,
          },
        ],
      }),
    });

    const data = await aiRes.json();
    let topic =
      data.choices?.[0]?.message?.content?.trim().toLowerCase() || "general";

    // 🧹 sanitize
    topic = topic.replace(/[^a-z]/g, "");

    // 🎯 YOUTUBE (topic + difficulty)
if (platform === "youtube") {
  try {
    // 🧠 fallback query (in case AI fails)
    let query = stepText || "programming tutorial";

    // 🔹 AI query (optional but keep safe)
    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_OPENROUTER_MODEL,
          messages: [
            {
              role: "user",
              content: `Convert this into a YouTube tutorial search: "${stepText}"`,
            },
          ],
        }),
      });

      const aiData = await aiRes.json();
      query =
        aiData.choices?.[0]?.message?.content?.trim() || query;

    } catch {
      console.log("AI failed, using fallback query");
    }

    // 🧹 clean
    query = query.replace(/[^a-zA-Z0-9\s]/g, "");
    const encoded = encodeURIComponent(query);

    // 🔥 IMPORTANT: check API key
    if (!process.env.YOUTUBE_API_KEY) {
      console.error("Missing YOUTUBE_API_KEY");

      return NextResponse.json({
        link: `https://www.youtube.com/results?search_query=${encoded}`,
      });
    }

    // 🎥 call YouTube API
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`
    );

    const ytData = await ytRes.json();

    console.log("YT DATA:", ytData); // 🔥 DEBUG

    if (!ytData.items || ytData.items.length === 0) {
      return NextResponse.json({
        link: `https://www.youtube.com/results?search_query=${encoded}`,
      });
    }

    const videoId = ytData.items[0]?.id?.videoId;

    if (!videoId) {
      return NextResponse.json({
        link: `https://www.youtube.com/results?search_query=${encoded}`,
      });
    }

    return NextResponse.json({
      link: `https://www.youtube.com/watch?v=${videoId}`,
    });

  } catch (err) {
    console.error("YOUTUBE ERROR:", err);

    return NextResponse.json({
      link: `https://www.youtube.com`,
    });
  }
}

    // 🧠 LEETCODE (difficulty-based)
    // 🧠 LEETCODE
// 🔥 LEETCODE (BEST APPROACH: dynamic search)

if (platform === "leetcode") {
  // 🧠 Generate search query from step
  const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENROUTER_MODEL,
      messages: [
        {
          role: "user",
          content: `
Convert this step into a SHORT search query for coding problems.

Step: "${stepText}"

Examples:
"searching sorting"
"binary search"
"two pointer problems"
"dynamic programming"

Return ONLY the query.
          `,
        },
      ],
    }),
  });

  const data = await aiRes.json();

  let query =
    data.choices?.[0]?.message?.content?.trim() || "arrays";

  // 🧹 clean + encode
  query = query.replace(/[^a-zA-Z0-9\s]/g, "");
  const encoded = encodeURIComponent(query);

  return NextResponse.json({
    link: `https://leetcode.com/search/?q=${encoded}`,
  });
}

// 🌐 OTHER PLATFORMS (🔥 restore functionality)
if (platform === "github") {
  return NextResponse.json({
    link: "https://github.com",
  });
}

if (platform === "devfolio") {
  return NextResponse.json({
    link: "https://devfolio.co",
  });
}

if (platform === "internshala") {
  return NextResponse.json({
    link: "https://internshala.com",
  });
}

if (platform === "linkedin") {
  return NextResponse.json({
    link: "https://linkedin.com",
  });
}

// 🔥 FINAL FALLBACK (important safety)
return NextResponse.json({
  link: "https://google.com",
});

    return NextResponse.json({ link: null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ link: null });
  }
}