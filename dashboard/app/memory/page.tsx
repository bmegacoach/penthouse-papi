"use client";

import { useState } from "react";
import { LayerTabs } from "@/components/memory/layer-tabs";
import { DailyTimeline } from "@/components/memory/daily-timeline";
import { KnowledgeBrowser } from "@/components/memory/knowledge-browser";
import { TacitRules } from "@/components/memory/tacit-rules";
import { ResearchPanel } from "@/components/memory/research-panel";

export default function MemoryPage() {
  const [activeLayer, setActiveLayer] = useState<"L1" | "L2" | "L3">("L1");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="fade-up fade-up-1">
        <h1 className="text-2xl font-bold tracking-tight text-pp-text">Memory</h1>
        <p className="mt-1 text-sm text-pp-muted">3-layer memory system — daily notes, knowledge graph, tacit rules</p>
      </div>
      <div className="fade-up fade-up-2">
        <LayerTabs active={activeLayer} onChange={setActiveLayer} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 fade-up fade-up-3">
          {activeLayer === "L1" && <DailyTimeline />}
          {activeLayer === "L2" && <KnowledgeBrowser />}
          {activeLayer === "L3" && <TacitRules />}
        </div>
        <div className="lg:col-span-1 fade-up fade-up-4">
          <ResearchPanel />
        </div>
      </div>
    </div>
  );
}
