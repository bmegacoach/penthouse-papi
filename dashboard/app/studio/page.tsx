"use client";

import { useState, useMemo } from "react";
import { Player } from "@remotion/player";
import { cn } from "@/lib/utils";
import {
  Clapperboard,
  Bot,
  Play,
  RotateCcw,
  Download,
  Palette,
  Type,
  MonitorSmartphone,
  Monitor,
} from "lucide-react";
import { COMPOSITIONS, type CompositionConfig } from "@/lib/remotion/compositions";

const tabs = [
  { id: "remotion" as const, label: "Remotion Studio", icon: Clapperboard },
  { id: "agent" as const, label: "Agent Chat", icon: Bot },
];

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<"remotion" | "agent">("remotion");
  const [selectedComp, setSelectedComp] = useState<CompositionConfig>(COMPOSITIONS[1]); // DynamicKinetic default
  const [props, setProps] = useState<Record<string, any>>(COMPOSITIONS[1].defaultProps);
  const [playing, setPlaying] = useState(false);

  const updateProp = (key: string, value: any) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const selectComposition = (comp: CompositionConfig) => {
    setSelectedComp(comp);
    setProps({ ...comp.defaultProps });
    setPlaying(false);
  };

  const isVertical = selectedComp.height > selectedComp.width;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between fade-up fade-up-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-pp-text">Studio</h1>
          <p className="mt-1 text-sm text-pp-muted">Video rendering and agent workspace</p>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "border-pp-purple/40 bg-pp-purple/10 text-pp-purple glow-purple"
                  : "border-pp-border text-pp-muted hover:text-pp-text"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === "remotion" ? (
        <div className="flex flex-1 gap-4 overflow-hidden fade-up fade-up-2">
          {/* Left: Composition selector */}
          <div className="w-56 shrink-0 space-y-3 overflow-y-auto">
            <div className="rounded-xl border border-pp-border bg-pp-surface p-3">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-pp-muted">
                Compositions
              </h3>
              <div className="space-y-1">
                {COMPOSITIONS.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => selectComposition(comp)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all",
                      selectedComp.id === comp.id
                        ? "bg-pp-purple/10 text-pp-purple"
                        : "text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text"
                    )}
                  >
                    {comp.height > comp.width ? (
                      <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">{comp.label}</div>
                      <div className="text-[10px] opacity-50">
                        {comp.width}x{comp.height} | {comp.durationInFrames / comp.fps}s
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Props editor */}
            {selectedComp.editableProps.length > 0 && (
              <div className="rounded-xl border border-pp-border bg-pp-surface p-3">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-pp-muted">
                  Properties
                </h3>
                <div className="space-y-2">
                  {selectedComp.editableProps.map((prop) => (
                    <div key={prop.key} className="space-y-1">
                      <label className="flex items-center gap-1 text-[10px] font-medium text-pp-muted">
                        {prop.type === "color" && <Palette className="h-3 w-3" />}
                        {prop.type === "text" && <Type className="h-3 w-3" />}
                        {prop.label}
                      </label>
                      {prop.type === "color" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props[prop.key] || prop.default}
                            onChange={(e) => updateProp(prop.key, e.target.value)}
                            className="h-7 w-7 cursor-pointer rounded border border-pp-border bg-transparent"
                          />
                          <input
                            type="text"
                            value={props[prop.key] || prop.default}
                            onChange={(e) => updateProp(prop.key, e.target.value)}
                            className="flex-1 rounded border border-pp-border bg-[#0A0A0F] px-2 py-1 text-[10px] text-pp-text focus:border-pp-purple/50 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={props[prop.key] || prop.default}
                          onChange={(e) => updateProp(prop.key, e.target.value)}
                          className="w-full rounded border border-pp-border bg-[#0A0A0F] px-2 py-1.5 text-xs text-pp-text focus:border-pp-purple/50 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center: Player */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-pp-border bg-[#0A0A0F] p-6">
            <div
              className={cn(
                "relative overflow-hidden rounded-lg border border-pp-border/30 shadow-2xl",
                isVertical ? "h-full max-h-[80vh] aspect-[9/16]" : "w-full max-w-full aspect-video"
              )}
            >
              <Player
                component={selectedComp.component}
                compositionWidth={selectedComp.width}
                compositionHeight={selectedComp.height}
                durationInFrames={selectedComp.durationInFrames}
                fps={selectedComp.fps}
                inputProps={props}
                style={{ width: "100%", height: "100%" }}
                controls
                autoPlay={playing}
                loop
              />
            </div>

            {/* Controls bar */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setPlaying(!playing)}
                className="flex items-center gap-2 rounded-lg bg-pp-purple px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-pp-purple/90 glow-purple"
              >
                <Play className="h-3.5 w-3.5" />
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => {
                  setProps({ ...selectedComp.defaultProps });
                  setPlaying(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-pp-border px-3 py-2 text-xs text-pp-muted transition-colors hover:text-pp-text"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                className="flex items-center gap-2 rounded-lg border border-pp-border px-3 py-2 text-xs text-pp-muted transition-colors hover:text-pp-text"
                title="Render to file (coming soon)"
              >
                <Download className="h-3.5 w-3.5" />
                Render
              </button>

              <div className="ml-4 flex items-center gap-2 text-[10px] text-pp-muted">
                <span className="rounded bg-pp-border/50 px-1.5 py-0.5 font-mono">
                  {selectedComp.id}
                </span>
                <span>
                  {selectedComp.width}x{selectedComp.height}
                </span>
                <span>
                  {selectedComp.fps}fps
                </span>
                <span>
                  {(selectedComp.durationInFrames / selectedComp.fps).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-pp-border bg-pp-surface fade-up fade-up-2">
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center grid-pattern p-8">
            <Bot className="h-10 w-10 text-pp-muted/40" />
            <p className="text-sm font-medium text-pp-muted">
              OpenFang agent chat — connect to localhost:4200
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
