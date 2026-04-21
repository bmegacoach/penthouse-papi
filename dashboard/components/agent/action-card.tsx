"use client";

import { Check, X } from "lucide-react";
import type { AgentAction } from "@/lib/agent/types";

interface ActionCardProps {
  action: AgentAction;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ActionCard({ action, onConfirm, onCancel, loading }: ActionCardProps) {
  return (
    <div className="rounded-lg border border-pp-purple/30 bg-pp-purple/5 p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-pp-purple">
        Proposed Action
      </div>
      <p className="text-sm text-pp-text">{action.description}</p>
      <div className="mt-2 text-[10px] text-pp-muted font-mono">
        {action.type}: {JSON.stringify(action.params).slice(0, 80)}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-1 rounded-md bg-pp-success/15 px-3 py-1 text-xs font-medium text-pp-success hover:bg-pp-success/25 disabled:opacity-50"
        >
          <Check className="h-3 w-3" /> Confirm
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-md bg-pp-error/15 px-3 py-1 text-xs font-medium text-pp-error hover:bg-pp-error/25"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    </div>
  );
}
