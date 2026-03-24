export interface RedditResult {
  posts: { title: string; subreddit: string; score: number; url: string; num_comments: number }[];
}

export async function queryReddit(query: string, subreddits: string[] = ["entrepreneur", "realestateinvesting"]): Promise<RedditResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const posts: RedditResult["posts"] = [];
    for (const sub of subreddits.slice(0, 3)) {
      const res = await fetch(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=top&t=week&limit=5`, {
        headers: { "User-Agent": "PenthousePapi/1.0" },
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const child of data?.data?.children || []) {
        const d = child.data;
        posts.push({ title: d.title, subreddit: d.subreddit, score: d.score, url: `https://reddit.com${d.permalink}`, num_comments: d.num_comments });
      }
    }
    return { posts: posts.sort((a, b) => b.score - a.score).slice(0, 10) };
  } finally {
    clearTimeout(timeout);
  }
}
