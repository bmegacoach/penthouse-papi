# Penthouse Papi — Claude Code Session

## Project Context
OpenChief CMO — content creation engine with Remotion video rendering.
- Frontend: React + TypeScript (Remotion)
- Backend: Supabase
- Content: YouTube analyzer, Reddit scraper, learning algorithm
- Status: **Scaffold** — TIER 3 growth project

## Fleet Coordination
This project is under the **OpenChief Unified Dispatcher**.
- Dispatch module: `chiefos/unified_dispatcher.py` (repo root)
- This project can receive tasks via autopilot: `python -m chiefos.orchestrator autopilot`
- Agent systems that can work on this: `a0-desktop`, `openfang-desktop` (via A2A)
- Architecture: see `ARCHITECTURE.md` in this directory

## Session Goal
Build out CMO content pipeline: research → script → render → publish.

## Key Files
- `production/` — Remotion video project (RemotionRoot.tsx)
- `dashboard/` — CMO dashboard UI
- `clawdbot/` — Learning algorithm + skill definitions
- `flow-workflows/` — Automation templates
- `ARCHITECTURE.md` — System design

## On Start
1. Run `git log --oneline -10` to see last work
2. Read `session-summary.md` for prior context
3. Read `ARCHITECTURE.md` for system design
4. Check Supabase connection
