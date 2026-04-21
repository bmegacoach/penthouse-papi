"use client";

import { Bot } from "lucide-react";
import { useAgent } from "./agent-provider";

export function AgentButton() {
  const { toggle, isOpen } = useAgent();

  return (
    <button
      onClick={toggle}
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 ${
        isOpen
          ? "border-pp-purple bg-pp-purple text-white glow-purple-strong"
          : "border-pp-border bg-pp-surface text-pp-muted hover:border-pp-purple/50 hover:text-pp-purple glow-purple"
      }`}
    >
      <Bot className="h-5 w-5" />
    </button>
  );
}
