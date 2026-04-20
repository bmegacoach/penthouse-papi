"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header, type BrandFilter } from "./header";
import { BrandProvider } from "@/lib/brand-context";
import { AgentProvider } from "@/components/agent/agent-provider";
import { AgentButton } from "@/components/agent/agent-button";
import { AgentDrawer } from "@/components/agent/agent-drawer";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [activeBrand, setActiveBrand] = useState<BrandFilter>("all");

  return (
    <div className="relative flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header activeBrand={activeBrand} onBrandChange={setActiveBrand} />
        <main className="relative z-10 flex-1 overflow-y-auto p-6">
          <BrandProvider brand={activeBrand}>
            <AgentProvider brand={activeBrand}>
              {children}
              <AgentButton />
              <AgentDrawer />
            </AgentProvider>
          </BrandProvider>
        </main>
      </div>
    </div>
  );
}
