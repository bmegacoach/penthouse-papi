"use client";

import Link from "next/link";
import {
  Lightbulb,
  Upload,
  ClipboardCheck,
  Bot,
  Clapperboard,
  Megaphone,
} from "lucide-react";

const actions = [
  {
    label: "New Concept",
    description: "Create a content concept",
    href: "/concepts?action=new",
    icon: Lightbulb,
    color: "#FFD700",
  },
  {
    label: "Drop Video",
    description: "Upload to Hyperedit",
    href: "/hyperedit?action=upload",
    icon: Upload,
    color: "#6C63FF",
  },
  {
    label: "Review Queue",
    description: "Approve pending clips",
    href: "/hyperedit?filter=ready",
    icon: ClipboardCheck,
    color: "#22C55E",
  },
  {
    label: "Agent Chat",
    description: "Open AI copilot",
    href: "#agent",
    icon: Bot,
    color: "#6C63FF",
  },
  {
    label: "Render Video",
    description: "Open Remotion Studio",
    href: "/studio",
    icon: Clapperboard,
    color: "#F59E0B",
  },
  {
    label: "Campaign Brief",
    description: "Run scenario projection",
    href: "/scenario-lab?action=new",
    icon: Megaphone,
    color: "#EF4444",
  },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
      <h3 className="mb-4 text-sm font-semibold text-pp-text">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex flex-col gap-1.5 rounded-lg border border-pp-border/50 bg-transparent p-3 transition-all duration-200 hover:border-pp-border hover:bg-pp-surface-raised"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md transition-transform group-hover:scale-110"
              style={{ backgroundColor: action.color + "15" }}
            >
              <action.icon
                className="h-4 w-4"
                style={{ color: action.color }}
              />
            </div>
            <span className="text-xs font-semibold text-pp-text">
              {action.label}
            </span>
            <span className="text-[10px] leading-tight text-pp-muted">
              {action.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
