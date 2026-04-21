---
name: youtube_analyzer
description: Skill to fetch top competitor videos and extract hooks, formats, and CTAs.
---

# YouTube Analyzer Skill

This skill enables ClawdBot to deconstruct successful video content from competitors or industry leaders to inform Penthouse Papi's video production engine.

## Required Setup
- **API Access**: Requires YouTube Data API v3 key or Apify scraper for transcripts.

## Logic Flow

1.  **Input**: Array of competitor channel IDs or keywords (e.g., "Real Estate Investing 2026").
2.  **Fetch**: Retrieve the top 5 viewed videos in the last 30 days for those queries.
3.  **Analyze**:
    - Title formatting (e.g., "Stop Doing X", "How I made Y")
    - Thumbnail composition (Extracted via image analysis if applicable)
    - Pacing (Shorts vs Long-form ratio)
4.  **Synthesize**: Pass the winning formats to the `planning_agent` to influence the video template selection (e.g., favoring `DynamicKinetic` if high-energy Shorts are trending).

## Simulation Script Snippet

```javascript
// Simulated YouTube Fetch
const fetchYouTubeIntel = async (channels) => {
    console.log(`[YouTube Analyzer] Scanning competitors: ${channels.join(', ')}`);
    
    // Mock Data
    const insights = {
        winning_formats: ["60s Shorts", "Talking Head + Screen Recording"],
        common_hooks: ["The truth about [Topic]", "3 Mistakes you are making with [Topic]"],
        cta_placement: "First 15 seconds (Visual) + End Screen"
    };

    return {
        source: "YouTube",
        timestamp: new Date().toISOString(),
        insights: insights
    };
};
```

## Interface
- **Trigger**: Called during the Concept intake phase.
- **Output**: JSON payload updating the `concepts.competitive_intel` field.
