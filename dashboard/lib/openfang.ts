// OpenFang API Client — connects Penthouse Papi dashboard to OpenFang runtime
// Default: localhost:4200 (ChiefOS branded OpenFang install)

const OPENFANG_BASE = process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
const API_KEY = process.env.NEXT_PUBLIC_OPENFANG_API_KEY || "";

// ── Types ──────────────────────────────────────────────────────────────

export interface HandRequirement {
  key: string;
  label: string;
  satisfied: boolean;
  optional: boolean;
}

export interface DashboardMetric {
  label: string;
  memory_key: string;
  format: "number" | "text" | "percentage" | "date";
}

export interface Hand {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tools: string[];
  requirements_met: boolean;
  active: boolean;
  degraded: boolean;
  requirements: HandRequirement[];
  dashboard_metrics: DashboardMetric[];
  has_settings: boolean;
  settings_count: number;
}

export interface HandInstance {
  instance_id: string;
  hand_id: string;
  status: string;
  agent_id: string;
  agent_name: string;
  activated_at: string;
  updated_at?: string;
}

export interface HandStats {
  instance_id: string;
  hand_id: string;
  status: string;
  agent_id: string;
  metrics: Record<string, { value: string | number; format: string }>;
}

export interface HandSetting {
  id: string;
  key: string;
  label: string;
  type: string;
  value: string;
  default: string;
  description?: string;
  options?: { value: string; label: string }[];
}

export interface Agent {
  id: string;
  name: string;
  state: string;
  mode: string;
  created_at: string;
  last_active: string;
  model_provider: string;
  model_name: string;
  ready: boolean;
  identity?: { emoji: string; avatar_url?: string; color?: string };
}

export interface AgentSession {
  id: string;
  messages: { role: string; content: string; timestamp?: string }[];
  created_at: string;
  updated_at: string;
}

export interface MessageResponse {
  response: string;
  input_tokens: number;
  output_tokens: number;
  iterations: number;
  cost_usd?: number;
}

export interface SystemStatus {
  status: string;
  uptime?: number;
  agents_active?: number;
  hands_active?: number;
}

// ── Fetch helper ───────────────────────────────────────────────────────

async function ofetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    ...(init?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${OPENFANG_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenFang ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
}

// ── Hands API ──────────────────────────────────────────────────────────

export async function listHands(): Promise<{ hands: Hand[]; total: number }> {
  return ofetch("/api/hands");
}

export async function getHand(handId: string): Promise<Hand> {
  return ofetch(`/api/hands/${handId}`);
}

export async function listActiveHands(): Promise<{ instances: HandInstance[]; total: number }> {
  return ofetch("/api/hands/active");
}

export async function activateHand(handId: string, config?: Record<string, unknown>): Promise<HandInstance> {
  return ofetch(`/api/hands/${handId}/activate`, {
    method: "POST",
    body: JSON.stringify({ config: config || {} }),
  });
}

export async function pauseHand(instanceId: string): Promise<{ status: string }> {
  return ofetch(`/api/hands/instances/${instanceId}/pause`, { method: "POST" });
}

export async function resumeHand(instanceId: string): Promise<{ status: string }> {
  return ofetch(`/api/hands/instances/${instanceId}/resume`, { method: "POST" });
}

export async function deactivateHand(instanceId: string): Promise<void> {
  await fetch(`${OPENFANG_BASE}/api/hands/instances/${instanceId}`, {
    method: "DELETE",
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
  });
}

export async function getHandStats(instanceId: string): Promise<HandStats> {
  return ofetch(`/api/hands/instances/${instanceId}/stats`);
}

export async function getHandSettings(handId: string): Promise<HandSetting[]> {
  return ofetch(`/api/hands/${handId}/settings`);
}

export async function updateHandSettings(handId: string, settings: Record<string, string>): Promise<void> {
  await ofetch(`/api/hands/${handId}/settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// ── Agents API ─────────────────────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  return ofetch("/api/agents");
}

export async function getAgent(agentId: string): Promise<Agent> {
  return ofetch(`/api/agents/${agentId}`);
}

export async function getAgentSession(agentId: string): Promise<AgentSession> {
  return ofetch(`/api/agents/${agentId}/session`);
}

export async function sendMessage(agentId: string, message: string): Promise<MessageResponse> {
  return ofetch(`/api/agents/${agentId}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// ── WebSocket ──────────────────────────────────────────────────────────

export type WsMessageType =
  | { type: "typing"; state: "start" | "tool" | "stop" }
  | { type: "text_delta"; content: string }
  | { type: "response"; content: string; input_tokens: number; output_tokens: number; iterations: number }
  | { type: "error"; content: string }
  | { type: "silent_complete" }
  | { type: "canvas"; canvas_id: string; html: string; title: string };

export function connectAgentWs(
  agentId: string,
  onMessage: (msg: WsMessageType) => void,
  onClose?: () => void,
): WebSocket {
  const wsBase = OPENFANG_BASE.replace(/^http/, "ws");
  const url = API_KEY
    ? `${wsBase}/api/agents/${agentId}/ws?token=${API_KEY}`
    : `${wsBase}/api/agents/${agentId}/ws`;

  const ws = new WebSocket(url);

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data) as WsMessageType;
      onMessage(msg);
    } catch { /* ignore non-JSON */ }
  };

  ws.onclose = () => onClose?.();

  return ws;
}

// ── System ─────────────────────────────────────────────────────────────

export async function getSystemStatus(): Promise<SystemStatus> {
  return ofetch("/api/status");
}

export async function getHealthDetail(): Promise<Record<string, unknown>> {
  return ofetch("/api/health/detail");
}

// ── Campaign helpers (local schema, submitted to strategist hand) ─────

export interface CampaignRequest {
  id: string;
  project: "openchief" | "goldbackbond" | "coachai-tech-camps";
  campaign_name: string;
  goal: string;
  audience: string;
  offer: string;
  timeline: string;
  priority: "p1" | "p2" | "p3";
  requested_outputs: string[];
  status: string;
  created_at: string;
}

export function buildCampaignMessage(campaign: Omit<CampaignRequest, "id" | "status" | "created_at">): string {
  return JSON.stringify({
    id: crypto.randomUUID(),
    ...campaign,
    status: "concept_received",
    created_at: new Date().toISOString(),
  });
}
