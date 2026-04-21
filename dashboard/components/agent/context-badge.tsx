"use client";

import { useAgent } from "./agent-provider";

const PAGE_LABELS: Record<string, string> = {
  "command-center": "Command Center",
  calendar: "Calendar",
  concepts: "Concepts",
  hyperedit: "Hyperedit",
  studio: "Studio",
  analytics: "Analytics",
  memory: "Memory",
  "scenario-lab": "Scenario Lab",
  manual: "Manual",
  settings: "Settings",
};

export function ContextBadge() {
  const { context } = useAgent();
  const pageLabel = PAGE_LABELS[context.page] || context.page;
  const itemLabel = context.selectedItem
    ? ` > ${context.selectedItem.type} #${context.selectedItem.id.slice(0, 8)}`
    : "";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-pp-border/50 bg-[#0A0A0F] px-3 py-1.5 text-[10px] text-pp-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-pp-purple pulse-ring" />
      <span>
        Viewing: <span className="font-medium text-pp-text">{pageLabel}</span>
        {itemLabel && <span className="text-pp-purple">{itemLabel}</span>}
      </span>
    </div>
  );
}
