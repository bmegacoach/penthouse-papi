"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  state: "online" | "offline" | "busy";
  task?: string;
  model?: string;
}

// Fallback when OpenFang is not reachable
const FALLBACK_AGENTS: AgentStatus[] = [
  { id: "1", name: "Claude Code", state: "online", task: "Active session", model: "Opus 4" },
  { id: "2", name: "A0 Desktop", state: "offline", model: "GPT-4.1" },
  { id: "3", name: "OpenFang Desktop", state: "offline", model: "Claude Sonnet" },
  { id: "4", name: "A0 Mini", state: "offline", model: "GPT-4.1" },
  { id: "5", name: "ZeroClaw", state: "offline", model: "Phi 3.5" },
];

const stateConfig = {
  online: { color: "#22C55E", icon: Wifi, label: "Online" },
  offline: { color: "#94A3B8", icon: WifiOff, label: "Offline" },
  busy: { color: "#F59E0B", icon: Activity, label: "Busy" },
};

export function FleetStatus() {
  const [agents, setAgents] = useState<AgentStatus[]>(FALLBACK_AGENTS);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const openfangUrl = process.env.NEXT_PUBLIC_OPENFANG_URL || "http://localhost:4200";
    const apiKey = process.env.NEXT_PUBLIC_OPENFANG_API_KEY || "";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${openfangUrl}/api/agents`, { headers, signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: any[]) => {
        const mapped: AgentStatus[] = data.map(a => ({
          id: a.id,
          name: a.name,
          state: a.ready ? (a.state === "idle" ? "online" : "busy") : "offline",
          task: a.mode !== "idle" ? a.mode : undefined,
          model: a.model_name || a.model_provider,
        }));
        setAgents(mapped.length > 0 ? mapped : FALLBACK_AGENTS);
        setLive(mapped.length > 0);
      })
      .catch(() => {
        setError("OpenFang offline");
        setLive(false);
      })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  const onlineCount = agents.filter(a => a.state !== "offline").length;

  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pp-text">Agent Fleet</h3>
        <div className="flex items-center gap-2">
          {!live && error && (
            <span className="flex items-center gap-1 text-[10px] text-pp-warning">
              <AlertCircle className="h-3 w-3" />
              Fallback
            </span>
          )}
          <span className="text-xs text-pp-muted">
            <span className="font-bold text-pp-success">{onlineCount}</span>/{agents.length} active
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => {
          const cfg = stateConfig[agent.state];
          return (
            <div
              key={agent.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-pp-surface-raised"
            >
              {/* Status dot */}
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  agent.state === "online" && "glow-success",
                  agent.state === "busy" && "animate-pulse"
                )}
                style={{ backgroundColor: cfg.color }}
              />

              {/* Icon */}
              <Bot className="h-4 w-4 text-pp-muted" />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-pp-text">{agent.name}</p>
                {agent.task && <p className="truncate text-[10px] text-pp-muted">{agent.task}</p>}
              </div>

              {/* Model badge */}
              {agent.model && (
                <span className="shrink-0 rounded bg-pp-border/50 px-1.5 py-0.5 text-[10px] font-medium text-pp-muted">
                  {agent.model}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
