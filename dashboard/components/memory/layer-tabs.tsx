"use client";

import { cn } from "@/lib/utils";
import { FileText, Network, Shield } from "lucide-react";

const tabs = [
  { id: "L1" as const, label: "Daily Notes", icon: FileText, description: "Today's activity log" },
  { id: "L2" as const, label: "Knowledge Graph", icon: Network, description: "Durable facts & entities" },
  { id: "L3" as const, label: "Tacit Knowledge", icon: Shield, description: "Rules & patterns" },
];

interface LayerTabsProps {
  active: "L1" | "L2" | "L3";
  onChange: (layer: "L1" | "L2" | "L3") => void;
}

export function LayerTabs({ active, onChange }: LayerTabsProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-pp-border bg-pp-surface p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
            active === tab.id
              ? "bg-pp-purple/10 text-pp-purple glow-purple"
              : "text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text"
          )}
        >
          <tab.icon className="h-4 w-4" />
          <div className="text-left">
            <div className="text-xs font-semibold">{tab.label}</div>
            <div className="text-[10px] opacity-60">{tab.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
