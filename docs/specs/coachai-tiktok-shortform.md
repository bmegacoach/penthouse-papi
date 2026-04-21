# CoachAI Tech Tools — Raw-to-TikTok Shortform Spec

> Dropped 2026-03-29. Source: Perplexity analysis of TikTok growth strategy video.

## Overview

Record raw videos in OBS on desktop → OpenChief/Penthouse Papi auto-ingests from watched folder → transcribe → identify best 3-10 short clips → edit into vertical TikTok drafts with captions, hooks, music, CTA → review queue → publish to CoachAI Tech Tools.

## Operating Spec

```yaml
project: coachai-tech-tools
platform: tiktok
mode: raw-content-to-shortform
source_folder: ~/ChiefOS/media/inbox/coachai-tech-tools/raw/
output_folder: ~/ChiefOS/media/outbox/coachai-tech-tools/tiktok/
review_folder: ~/ChiefOS/media/review/coachai-tech-tools/
primary_goal: audience-growth-and-trust
content_topic: beginner-friendly ai tools and workflows
clip_rules:
  min_duration_sec: 18
  max_duration_sec: 45
  preferred_duration_sec: 28
  clips_per_source_video: 3-10
hook_rules:
  top_text_required: true
  first_10_seconds_optimized: true
  use-hook-bank: true
caption_rules:
  burned_in_captions: true
  highlight_keywords: true
  reading_level: simple
music_rules:
  background_music: true
  music_volume_percent: 12
  speech_priority: true
cta_rules:
  soft_cta: true
  preferred_ctas:
    - follow for more ai tools
    - comment TOOL and i'll break it down
    - save this for your workflow stack
review:
  approval_required: true
  reviewer: jerry_or_founder
publishing:
  destination: tiktok-drafts
  account: coachai-tech-tools
```

## Pipeline Stages

### 1. Record in OBS
- Dedicated folder: `~/ChiefOS/media/inbox/coachai-tech-tools/raw/`
- Format: 1080p, clear mic, strong lighting, direct talking-head
- No fancy setup needed — simple production is fine

### 2. Auto-Ingest
- OpenChief file watcher detects new files
- Creates content job: filename, date, project, status, source path

### 3. Transcribe + Segment
- Whisper transcription → timestamped transcript
- Identify: hook candidates, teachable moments, quotable lines, CTA moments, 20-45s clips

### 4. Clip Generation
- Hyperedit-style cuts: multiple clips per source
- Reframe to 9:16 vertical, centered on face/action

### 5. TikTok Formatting
- Burned-in captions (keyword highlights, simple reading level)
- Large top hook text
- Emphasis text blocks
- Low-volume background music (12%)
- End CTA panel

### 6. Review + Publish
- Telegram approval flow (Jerry or Troy reviews 3-10 drafts)
- Approve best clips, tweak hooks if needed
- Publish to CoachAI Tech Tools TikTok

## Hook Library (Starters)

| Hook Type | Template |
|---|---|
| Mistake call-out | "Most people use this AI tool wrong" |
| Hindsight | "I wish I knew this before using [tool]" |
| Result proof | "This workflow saved me [time/result]" |
| Stop doing | "Beginner AI users need to stop doing this" |
| Easy how-to | "Here's the easiest way to [result] with AI" |

## Content Rules

1. **One niche first** — CoachAI Tech Tools stays on beginner AI workflows for 90 days minimum
2. **First 10 seconds matter most** — clip selection optimized around opening hook
3. **Copy hooks, not whole videos** — reuse winning structures, swap substance
4. **Volume over perfection** — more usable drafts > fewer polished pieces
5. **Simple production is fine** — OBS + talking head is enough at this stage

## MVP Plan

| Week | Deliverables |
|---|---|
| 1 | OBS raw folder + file watcher + auto-transcribe + clip timestamp export |
| 2 | Clipping engine + captions + top text + end CTA + 3 drafts per video |
| 3 | Music selection + hook bank + Telegram approval flow + daily publishing |
| 4 | Analytics tracking (views, watch time, saves, comments, shares, follows by clip type) + hook ranking |
