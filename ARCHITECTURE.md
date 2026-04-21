# Penthouse Papi Architecture

## Overview
Penthouse Papi is an autonomous AI agent system for high-volume content creation, marketing, and launch execution. It orchestrates the lifecycle from concept to distribution.

## Core Components

### 1. Agent Brain (ClawdBot + Superpowers)
- **Role**: 24/7 autonomous agent, Telegram interface, and Production Director.
- **Location**: `c:\Users\Troy\Chief OS\penthouse-papi\clawdbot-skills`
- **Functions**:
    - **Cognitive**: Uses `superpowers-core` skill to plan and debug production issues.
    - **Interface**: Telegram bot for user interaction (Concept In, Approval Out).
    - **Intelligence**: Competitive analysis (Reddit, YouTube).

### 2. Production Engine (Antigravity + Remotion + Stitch)
- **Role**: Video/image generation orchestration.
- **Location**: `c:\Users\Troy\Chief OS\penthouse-papi\production`
- **Functions**:
    - Video script generation (LLM via ClawdBot).
    - Remotion video rendering.
    - Static image generation (Stitch/DALL-E).

### 3. Orchestrator (Flow: Tiledesk + n8n)
- **Role**: Reliability, scheduling, and workflow automation.
- **Location**: `c:\Users\Troy\Chief OS\penthouse-papi\flow-workflows` (JSON templates)
- **Functions**:
    - **Reliability**: Guarantees delivery (retries, error handling).
    - **Scheduling**: Cron jobs for posting times.
    - **Integration**: Glue between Supabase, GHL, and Production Engine.

### 4. Database (Supabase on VPS)
- **Role**: Central data store and file storage.
- **Location**: Self-hosted on VPS (Primary), Managed Backup (Secondary).
- **Tables**: `concepts`, `calendar`, `video_assets`, `asset_approvals`, `asset_performance`.

### 5. Distribution (GoHighLevel)
- **Role**: Multi-platform social posting and CRM.
- **Integration**: via Flow (n8n) and HTTP API.

## Data Flow
1. **Intake**: User -> Telegram -> ClawdBot (Superpowers) -> Supabase (`concepts`).
2. **Plan**: Planning Agent (Superpowers) -> Supabase (`calendar`) & Notion.
3. **Produce**: Calendar Item -> Antigravity/Remotion -> Supabase Storage.
4. **Approve**: Notification -> Telegram -> User Approval -> Webhook.
5. **Distribute**: Flow (n8n) -> GHL -> Social Platforms.
6. **Learn**: Analytics -> Supabase (`asset_performance`) -> Optimization (Superpowers).

## Tech Stack
- **Languages**: TypeScript, Python (ClawdBot skills).
- **Frameworks**: Next.js (optional UI), Remotion (Video).
- **Infrastructure**: Docker/VPS (Production), Flow (Orchestration).
