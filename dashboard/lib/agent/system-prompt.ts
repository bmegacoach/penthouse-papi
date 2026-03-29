import type { AgentContext } from "./types";
import { getTacitManager } from "@/lib/memory/server";

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "command-center": "the main dashboard showing pipeline stats, active jobs, and quick actions",
  calendar: "the content calendar showing scheduled posts by date and platform",
  concepts: "the content concepts page where ideas are created, reviewed, and approved",
  hyperedit: "the video editing pipeline where long-form videos become platform-ready clips",
  studio: "the Remotion video studio for previewing and refining clip compositions",
  analytics: "the analytics page showing content performance metrics across brands",
  memory: "the 3-layer memory system (L1 daily notes, L2 knowledge graph, L3 tacit rules)",
  "scenario-lab": "the scenario simulation lab for projecting content strategy outcomes",
  manual: "the operations manual for the content pipeline operator",
  settings: "the settings page for API keys, defaults, and system configuration",
};

const BRAND_NAMES: Record<string, string> = {
  all: "all brands",
  gbb: "Goldbackbond (GBB) — authoritative, data-driven, gold/finance",
  coach: "CoachAI Tech Camps — energetic, accessible, education",
  open: "OpenChief — technical, builder-focused, agent orchestration",
};

export async function buildSystemPrompt(ctx: AgentContext): Promise<string> {
  let tacitSection = "";
  try {
    const tm = await getTacitManager();
    const rules = await tm.list();
    if (rules.length > 0) {
      tacitSection = "\n\n## Tacit Rules (learned patterns)\n" +
        rules.map((r: { title: string; content: string; confidence: number }) =>
          `- **${r.title}** (confidence ${r.confidence}): ${r.content.trim()}`
        ).join("\n");
    }
  } catch { /* memory unavailable — skip */ }

  const pageDesc = PAGE_DESCRIPTIONS[ctx.page] || ctx.page;
  const brandDesc = BRAND_NAMES[ctx.brand] || ctx.brand;

  let selectedSection = "";
  if (ctx.selectedItem) {
    selectedSection = `\n\n## Currently Selected\nType: ${ctx.selectedItem.type}\nID: ${ctx.selectedItem.id}\nData: ${JSON.stringify(ctx.selectedItem.data, null, 2)}`;
  }

  const pageDataSection = Object.keys(ctx.pageData).length > 0
    ? `\n\n## Page State\n${JSON.stringify(ctx.pageData, null, 2)}`
    : "";

  return `You are the Penthouse Papi AI copilot — a context-aware assistant embedded in a content creation dashboard.

## Current Context
- **Page:** ${ctx.page} — ${pageDesc}
- **Active Brand:** ${brandDesc}
${pageDataSection}${selectedSection}${tacitSection}

## Your Capabilities
You can suggest and execute actions. When you want to take an action, include it as a JSON block:
\`\`\`action
{"type": "create_concept", "params": {"title": "...", "brand": "GBB", "tags": ["video"]}, "description": "Create a GBB concept about..."}
\`\`\`

Available action types:
- create_concept: Create a new content concept
- advance_concept: Move a concept to the next status
- create_job: Create a Hyperedit job
- search_memory: Search across memory layers
- append_memory: Add a note to today's daily log
- submit_research: Submit a question to the autoresearch queue
- navigate: Navigate to a different page

## Guidelines
- Be concise and actionable. Jerry is an operator, not a developer.
- Reference tacit rules when relevant.
- When suggesting content, align with the active brand's tone.
- Propose actions — don't just describe what could be done.
- If you cite memory or research, mention the source layer (L1/L2/L3).`;
}
