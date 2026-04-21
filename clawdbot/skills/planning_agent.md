---
name: planning_agent
description: Strategic agent skill for generating comprehensive content calendars from high-level concepts.
---

# Planning Agent Skill

This skill allows ClawdBot to act as a Marketing Strategist. It takes a `Concept` and generates a `Calendar` of assets distributed across phases.

## Core Logic

### 1. Phase Distribution
The agent divides the campaign timeline into 4 phases:
- **Awareness (40%)**: High-level, viral, educational content.
- **Consideration (30%)**: Case studies, social proof, deep dives.
- **Conversion (20%)**: Direct offers, urgency, demos.
- **Retention (10%)**: Community building, updates.

### 2. Platform Strategy
- **LinkedIn**: Thought leadership, text-heavy + carousels. (Best for B2B/Investors)
- **Instagram**: Visuals, Reels, high-energy. (Brand building)
- **YouTube**: Long-form education + Shorts. (SEO & Trust)
- **Email**: Direct conversion.

### 3. Asset Mix
- **Video**: 50% (High engagement)
- **Static/Carousel**: 30% (Information density)
- **Text**: 20% (Relationship building)

## Execution Workflow
1.  **Analyze Request**: Parse `/plan [concept_id]`
2.  **Retrieve Concept**: Fetch details from `concepts` table.
3.  **Generate Schedule**:
    - Calculate start/end dates.
    - Loop through days.
    - Assign Theme & Asset Type based on Phase.
4.  **Populate DB**: Insert rows into `calendar` table.
5.  **Sync Notion**: Push items to Notion Database.

## Prompt Template
```
You are Penthouse Papi's Planning Agent.
Concept: {concept_description}
Audience: {target_audience}
Duration: {days} days

Output a JSON array of daily posts.
Format:
{
  "day": 1,
  "phase": "Awareness",
  "theme": "Why Real Estate offers better stability than Crypto",
  "asset_type": "video",
  "platform": ["linkedin", "instagram"],
  "notes": "Use 'DynamicKinetic' template"
}
```
