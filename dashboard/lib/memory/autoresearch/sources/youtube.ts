const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

export interface YouTubeResult {
  videos: { title: string; videoId: string; channelTitle: string; viewCount: string; publishedAt: string }[];
}

export async function queryYouTube(query: string, apiKey: string, maxResults = 5): Promise<YouTubeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const searchParams = new URLSearchParams({ part: "snippet", q: query, type: "video", order: "viewCount", maxResults: String(maxResults), key: apiKey });
    const searchRes = await fetch(`${YT_SEARCH_URL}?${searchParams}`, { signal: controller.signal });
    if (!searchRes.ok) throw new Error(`YouTube Search ${searchRes.status}: ${await searchRes.text()}`);
    const searchData = await searchRes.json();
    const videoIds = searchData.items?.map((i: any) => i.id.videoId).filter(Boolean) || [];
    if (videoIds.length === 0) return { videos: [] };
    const statsParams = new URLSearchParams({ part: "statistics", id: videoIds.join(","), key: apiKey });
    const statsRes = await fetch(`${YT_VIDEOS_URL}?${statsParams}`, { signal: controller.signal });
    if (!statsRes.ok) throw new Error(`YouTube Stats ${statsRes.status}`);
    const statsData = await statsRes.json();
    const statsMap = new Map<string, string>();
    for (const item of statsData.items || []) statsMap.set(item.id, item.statistics?.viewCount || "0");
    return {
      videos: searchData.items?.map((item: any) => ({
        title: item.snippet?.title || "",
        videoId: item.id?.videoId || "",
        channelTitle: item.snippet?.channelTitle || "",
        viewCount: statsMap.get(item.id?.videoId) || "0",
        publishedAt: item.snippet?.publishedAt || "",
      })) || [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
