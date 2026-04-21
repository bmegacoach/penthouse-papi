---
name: reddit_scraper
description: Skill to scrape top and trending posts from specific subreddits and extract viral hooks/patterns.
---

# Reddit Scraper Skill

This skill allows ClawdBot to gather competitive intelligence by analyzing what content is currently performing well in target communities on Reddit.

## Required Setup
- **API Access**: In production, use the Reddit API (OAuth) or a service like Apify to avoid rate limits. For the MVP, we use simulated data fetching.

## Logic Flow

1.  **Input**: Array of subreddits (e.g., `["r/realestateinvesting", "r/entrepreneur"]`).
2.  **Fetch**: Retrieve the "Top" posts over the last "Week".
3.  **Analyze**: 
    - Extract Title (The Hook)
    - Calculate Engagement Rate (Upvotes + Comments)
    - Identify Post Type (Story, Question, Data/Tip)
4.  **Synthesize**: Output highest-performing hooks as inspiration for the `planning_agent`.

## Simulation Script Snippet

```javascript
// Simulated Reddit Fetch (To be replaced with real API call)
const fetchRedditIntel = async (subreddits) => {
    console.log(`[Reddit Scraper] Fetching intel from: ${subreddits.join(', ')}`);
    
    // Mock Data
    const trends = [
        { hook: "I made 12% APY on my first commercial deal. Here is the exact math.", engagement: "High", type: "Data/Tip" },
        { hook: "Why buying a house in 2026 is mathematically worse than renting.", engagement: "Viral", type: "Contrarian" }
    ];

    return {
        source: "Reddit",
        timestamp: new Date().toISOString(),
        top_hooks: trends
    };
};
```

## Interface
- **Trigger**: Called by the Pre-Planning phase or via Telegram `/intel reddit`
- **Output**: JSON payload injected into the `concepts.competitive_intel` database field.
