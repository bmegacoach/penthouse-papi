import type { SecurityTemplate } from "./types";

// ── Security Scenario Templates ───────────────────────────────────────────────
// Pre-built tabletop templates for common agent + platform threat scenarios

export const SECURITY_TEMPLATES: SecurityTemplate[] = [
  {
    id: "sec_prompt_injection",
    title: "Prompt Injection Attack",
    description:
      "An adversarial user or external data source injects instructions that cause an agent to take unintended actions — leaking data, bypassing guardrails, or escalating privileges.",
    scenario_type: "security",
    decision_question:
      "What happens if a prompt injection attack succeeds against a C-suite or content-generation agent?",
    stakeholders: ["agent-fleet", "users", "api-providers", "chiefos-orchestrator"],
    assumptions: [
      "Agents process user-supplied or external text without sanitization",
      "No adversarial input detection is active",
      "Agent has write access to memory or can trigger external actions",
    ],
    variables_to_inject: [
      "attacker has access to a chat input or webhook",
      "injected instruction targets memory write or API call",
      "no human-in-the-loop review",
      "escalation path to Discord/Telegram exists",
    ],
  },
  {
    id: "sec_api_key_exposure",
    title: "API Key Exposure",
    description:
      "An API key (A0, Supabase, Vercel, or broker) is inadvertently committed to a public repo, logged, or returned in an error response.",
    scenario_type: "security",
    decision_question:
      "What is the blast radius if an API key is exposed and how quickly can we rotate and contain?",
    stakeholders: ["ops", "chiefos", "third-party-providers", "client-data"],
    assumptions: [
      "Keys are currently stored in .env and not rotated on schedule",
      "Public GitHub repo scan tools are not watching the org",
      "Rotation requires manual steps across multiple services",
    ],
    variables_to_inject: [
      "key appears in public commit",
      "key is for a broker account with trading permissions",
      "30-minute delay before detection",
      "automatic scanning by threat actors",
    ],
  },
  {
    id: "sec_rogue_agent_misuse",
    title: "Rogue Agent Tool Misuse",
    description:
      "An agent in the fleet gains or is given excessive tool permissions and begins taking actions outside its intended lane — posting content, spending budget, or modifying memory.",
    scenario_type: "security",
    decision_question:
      "What is the failure chain if a rogue or misconfigured agent acts outside its lane?",
    stakeholders: ["chiefos-orchestrator", "fleet-agents", "troy", "supabase", "discord"],
    assumptions: [
      "Agents are trusted inside the fleet by default",
      "Tool permissions are not per-agent scoped",
      "QUEUE.md claiming protocol is the primary guard",
    ],
    variables_to_inject: [
      "agent misidentifies its lane",
      "agent has write access to financial or publishing tools",
      "no rate limiting on tool calls",
      "delayed human review",
    ],
  },
  {
    id: "sec_memory_poisoning",
    title: "Memory Poisoning",
    description:
      "Malicious or corrupted content is written to the shared memory layer (knowledge graph or daily notes), causing agents to build incorrect mental models and make bad recommendations.",
    scenario_type: "security",
    decision_question:
      "What happens if the shared memory layer is poisoned with false facts or adversarial context?",
    stakeholders: ["all-agents", "chiefos", "knowledge-graph", "troy"],
    assumptions: [
      "Memory writes are not validated against a trusted source",
      "Agents retrieve and use memory without cross-referencing",
      "Consolidation runs automatically and could propagate bad data",
    ],
    variables_to_inject: [
      "false financial projection written to L2 knowledge",
      "agents act on poisoned decision brief",
      "consolidation amplifies the error across namespaces",
    ],
  },
  {
    id: "sec_vendor_outage_cascade",
    title: "Vendor Outage Cascade",
    description:
      "A key third-party service (Supabase, Vercel, OpenAI, Discord) goes down, causing cascading failures in the agent pipeline.",
    scenario_type: "security",
    decision_question:
      "What is the operational blast radius if Supabase or the primary LLM provider goes offline?",
    stakeholders: ["chiefos", "all-agents", "troy", "penthouse-papi", "clients"],
    assumptions: [
      "No fallback LLM provider is configured",
      "Agent fleet depends on Supabase for state and queue",
      "Troy monitors via Discord which would also be affected",
    ],
    variables_to_inject: [
      "primary LLM API returns 503 for 4 hours",
      "Supabase DB goes read-only",
      "Discord webhook silent — no ops alerts reach Troy",
    ],
  },
  {
    id: "sec_discord_webhook_misuse",
    title: "Discord / Telegram Webhook Misuse",
    description:
      "A webhook URL is leaked or hijacked, allowing an attacker to send fraudulent operational messages, task claims, or financial alerts to Troy.",
    scenario_type: "security",
    decision_question:
      "What is the risk if the #openchief-console or Telegram webhook is in attacker hands?",
    stakeholders: ["troy", "chiefos", "discord-guild", "agent-fleet"],
    assumptions: [
      "Webhooks are stored in .env but shared across multiple .env files",
      "No webhook signing or HMAC verification is in place",
      "Troy acts on Discord messages in near-real-time",
    ],
    variables_to_inject: [
      "attacker sends fake REVIEW approval to trigger deployment",
      "attacker floods channel causing real alerts to be missed",
      "attacker posts fake task completion to close a security audit",
    ],
  },
  {
    id: "sec_reputation_incident",
    title: "Reputation / PR Incident",
    description:
      "An AI-generated piece of content (video, post, or response) causes public backlash due to incorrect information, offensive material, or misrepresentation of a brand.",
    scenario_type: "security",
    decision_question:
      "What is the reputational blast radius if a Penthouse Papi or OpenChief CMO output goes viral for the wrong reasons?",
    stakeholders: ["penthouse-papi-brand", "clients", "followers", "press", "troy"],
    assumptions: [
      "Content is reviewed by agent before publishing",
      "Human final approval is optional for low-risk posts",
      "Social media deletion is not instant",
    ],
    variables_to_inject: [
      "post contains factual error about a public figure",
      "video goes viral before detection",
      "client brand is tagged in the post",
      "press picks up the story",
    ],
  },
  {
    id: "sec_data_exposure",
    title: "Data Exposure / Escalation Chain",
    description:
      "Sensitive client, financial, or personal data is inadvertently included in a public artifact — a markdown file, a video description, a Discord message, or a commit.",
    scenario_type: "security",
    decision_question:
      "How quickly can we contain and remediate if client or financial data appears in a public artifact?",
    stakeholders: ["clients", "chiefos", "troy", "ops", "legal"],
    assumptions: [
      "Memory files may contain raw API responses with sensitive fields",
      "Git commits are public",
      "Supabase rows may be returned in full in agent context windows",
    ],
    variables_to_inject: [
      "client deal terms written to a public knowledge file",
      "commit pushed with .env or wallet address",
      "agent includes raw Supabase row in a Discord message",
    ],
  },
];

// ── Content/Marketing Templates ───────────────────────────────────────────────
// Pre-built starting points for Penthouse Papi and OpenChief CMO content decisions

export const CONTENT_TEMPLATES = [
  {
    id: "content_launch_bet",
    title: "Content Series Launch Bet",
    description: "Evaluate whether to green-light a new content series before committing production resources.",
    scenario_type: "marketing" as const,
    decision_question: "Should we launch this content series now and what is the risk/reward profile?",
    stakeholders: ["audience", "brand", "production-team", "sponsors"],
    assumptions: ["Series has 10-episode arc planned", "No paid promotion budget allocated"],
    variables_to_inject: ["audience backlash on episode 1", "algorithm boost", "sponsor pulls out", "viral moment"],
  },
  {
    id: "content_platform_pivot",
    title: "Platform Pivot (e.g., YouTube to Short-Form)",
    description: "Model the downstream effects of shifting primary distribution channel.",
    scenario_type: "strategy" as const,
    decision_question: "What happens if we pivot primary content distribution from YouTube to short-form?",
    stakeholders: ["audience", "ad-revenue", "brand-partners", "production-workflow"],
    assumptions: ["Current YouTube audience built over 12+ months", "Short-form requires reshooting format"],
    variables_to_inject: ["existing audience drops 40%", "new audience 3x larger", "ad rates drop by 60%"],
  },
];

export const ALL_TEMPLATES = [...SECURITY_TEMPLATES, ...CONTENT_TEMPLATES];

export function getTemplate(id: string) {
  return ALL_TEMPLATES.find((t) => t.id === id) ?? null;
}
