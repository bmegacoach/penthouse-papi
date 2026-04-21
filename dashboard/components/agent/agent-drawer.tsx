"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Loader2 } from "lucide-react";
import { useAgent } from "./agent-provider";
import { ContextBadge } from "./context-badge";
import { ActionCard } from "./action-card";
import type { AgentAction, AgentResponse } from "@/lib/agent/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: AgentAction[];
}

export function AgentDrawer() {
  const { isOpen, close, context } = useAgent();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AgentResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, actions: data.actions },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect. Please check Settings > Agent configuration." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: AgentAction, msgIdx: number) => {
    setActionLoading(action.description);
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = await res.json();

      setMessages((prev) => {
        const updated = [...prev];
        if (updated[msgIdx]?.actions) {
          updated[msgIdx] = { ...updated[msgIdx], actions: updated[msgIdx].actions?.filter((a) => a !== action) };
        }
        updated.push({
          role: "assistant",
          content: result.success ? `Done: ${action.description}` : `Failed: ${result.error}`,
        });
        return updated;
      });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: `Failed to execute: ${action.description}` }]);
    } finally {
      setActionLoading(null);
    }
  };

  const cancelAction = (action: AgentAction, msgIdx: number) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[msgIdx]?.actions) {
        updated[msgIdx] = { ...updated[msgIdx], actions: updated[msgIdx].actions?.filter((a) => a !== action) };
      }
      return updated;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 z-40 flex h-screen w-[400px] flex-col border-l border-pp-border bg-[#0D0D14] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pp-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pp-purple/15">
            <Bot className="h-4 w-4 text-pp-purple" />
          </div>
          <span className="text-sm font-semibold text-pp-text">Copilot</span>
        </div>
        <button onClick={close} className="rounded-lg p-1.5 text-pp-muted hover:bg-pp-surface hover:text-pp-text">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Context badge */}
      <div className="border-b border-pp-border/50 px-4 py-2">
        <ContextBadge />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 pt-12 text-center">
            <Bot className="h-8 w-8 text-pp-muted/30" />
            <p className="text-xs text-pp-muted">Ask me anything about your content pipeline.</p>
            <p className="text-[10px] text-pp-muted/60">I can see what you're working on and take actions.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-pp-purple/15 text-pp-text"
                  : "bg-pp-surface text-pp-text/90"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.actions?.map((action, ai) => (
                <div key={ai} className="mt-2">
                  <ActionCard
                    action={action}
                    onConfirm={() => handleAction(action, i)}
                    onCancel={() => cancelAction(action, i)}
                    loading={actionLoading === action.description}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-pp-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-pp-border p-4">
        <div className="flex items-center gap-2 rounded-lg border border-pp-border bg-pp-surface px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask the copilot..."
            className="flex-1 bg-transparent text-sm text-pp-text placeholder:text-pp-muted/60 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-md p-1.5 text-pp-muted transition-colors hover:text-pp-purple disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
