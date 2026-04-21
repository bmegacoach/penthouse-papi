"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AgentContext, AgentPage } from "@/lib/agent/types";
import type { BrandFilter } from "@/lib/brand-context";

interface AgentState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  context: AgentContext;
  setPageContext: (page: AgentPage, pageData: Record<string, unknown>, selectedItem?: AgentContext["selectedItem"]) => void;
}

const AgentCtx = createContext<AgentState | null>(null);

export function AgentProvider({ brand, children }: { brand: BrandFilter; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [agentContext, setAgentContext] = useState<AgentContext>({
    page: "command-center",
    brand,
    pageData: {},
  });

  const setPageContext = useCallback(
    (page: AgentPage, pageData: Record<string, unknown>, selectedItem?: AgentContext["selectedItem"]) => {
      setAgentContext((prev) => ({ ...prev, page, pageData, selectedItem, brand }));
    },
    [brand]
  );

  return (
    <AgentCtx.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
        context: { ...agentContext, brand },
        setPageContext,
      }}
    >
      {children}
    </AgentCtx.Provider>
  );
}

export function useAgent(): AgentState {
  const ctx = useContext(AgentCtx);
  if (!ctx) throw new Error("useAgent must be used within AgentProvider");
  return ctx;
}
