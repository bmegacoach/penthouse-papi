"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Scissors,
  Monitor,
  Smartphone,
  Linkedin,
  Twitter,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HypereditJob } from "@/lib/hyperedit/types";

const platforms = [
  { id: "reels", label: "Reels", icon: Smartphone },
  { id: "shorts", label: "Shorts", icon: Monitor },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "twitter", label: "Twitter/X", icon: Twitter },
];

const statusConfig: Record<
  HypereditJob["status"],
  { label: string; color: string; icon: React.ElementType; animate: boolean }
> = {
  queued: { label: "Queued", color: "#94A3B8", icon: Loader2, animate: false },
  planning: { label: "Planning", color: "#F59E0B", icon: Loader2, animate: true },
  transcribing: { label: "Transcribing", color: "#6C63FF", icon: Loader2, animate: true },
  rendering: { label: "Rendering", color: "#6C63FF", icon: Scissors, animate: false },
  ready: { label: "Ready", color: "#22C55E", icon: CheckCircle2, animate: false },
  failed: { label: "Failed", color: "#EF4444", icon: AlertCircle, animate: false },
};

const brandColors: Record<string, string> = {
  "Goldbackbond (GBB)": "#FFD700",
  "CoachAI Tech Camps": "#22C55E",
  OpenChief: "#6C63FF",
};

function getBrandColor(brand: string): string {
  return brandColors[brand] || "#6C63FF";
}

function getBrandShortName(brand: string): string {
  if (brand.includes("GBB") || brand.toLowerCase().includes("gold")) return "GBB";
  if (brand.toLowerCase().includes("coach")) return "COACH";
  if (brand.toLowerCase().includes("open")) return "OPEN";
  return brand.slice(0, 4).toUpperCase();
}

export default function HypereditPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["reels", "shorts"]);
  const [maxClips, setMaxClips] = useState(5);
  const [dragOver, setDragOver] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<HypereditJob[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("Goldbackbond (GBB)");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshJobs = () => {
    fetch("/api/hyperedit/jobs")
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => {});
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleFileDrop = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      const res = await fetch("/api/hyperedit/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        await fetch("/api/hyperedit/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.originalName,
            source: "file",
            sourcePath: data.path,
            brand: selectedBrand,
            platforms: selectedPlatforms,
            maxClips,
          }),
        });
        refreshJobs();
      }
    } finally {
      setUploading(false);
      setDragOver(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!videoUrl.trim()) return;
    setUploading(true);
    try {
      await fetch("/api/hyperedit/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: videoUrl,
          source: "url",
          sourcePath: videoUrl,
          brand: selectedBrand,
          platforms: selectedPlatforms,
          maxClips,
        }),
      });
      setVideoUrl("");
      refreshJobs();
    } finally {
      setUploading(false);
    }
  };

  const runningJobs = jobs.filter((j) => j.status !== "ready" && j.status !== "failed");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="fade-up fade-up-1">
        <h1 className="text-2xl font-bold tracking-tight text-pp-text">
          Hyperedit
        </h1>
        <p className="mt-1 text-sm text-pp-muted">
          Long-form to multi-clip pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload zone */}
        <div className="lg:col-span-2 fade-up fade-up-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files); }}
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-all duration-300",
              dragOver
                ? "border-pp-purple bg-pp-purple/5 glow-purple-strong"
                : "border-pp-border bg-pp-surface hover:border-pp-border hover:bg-pp-surface-raised"
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pp-purple/10">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-pp-purple animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-pp-purple" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-pp-text">
                Drop a video file or paste a URL
              </p>
              <p className="mt-1 text-xs text-pp-muted">
                MP4, MKV, MOV up to 2GB — or paste a YouTube/Vimeo link
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileDrop(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-pp-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-pp-purple/90 glow-purple disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Browse Files"}
              </button>
              <span className="text-xs text-pp-muted">or</span>
              <input
                type="text"
                placeholder="Paste video URL..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className="w-64 rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/50 focus:border-pp-purple/50 focus:outline-none focus:ring-1 focus:ring-pp-purple/30"
              />
            </div>
          </div>
        </div>

        {/* Config panel */}
        <div className="fade-up fade-up-3">
          <div className="rounded-xl border border-pp-border bg-pp-surface p-5 space-y-5">
            <h3 className="text-sm font-semibold text-pp-text">Edit Config</h3>

            {/* Platform targets */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">
                Platform Targets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((p) => {
                  const selected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
                        selected
                          ? "border-pp-purple/40 bg-pp-purple/10 text-pp-purple"
                          : "border-pp-border/50 text-pp-muted hover:border-pp-border hover:text-pp-text"
                      )}
                    >
                      <p.icon className="h-3.5 w-3.5" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max clips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">
                  Max Clips
                </label>
                <span className="text-sm font-bold tabular-nums text-pp-purple">
                  {maxClips}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={maxClips}
                onChange={(e) => setMaxClips(Number(e.target.value))}
                className="w-full accent-pp-purple"
              />
            </div>

            {/* Brand selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-pp-muted">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none"
              >
                <option>Goldbackbond (GBB)</option>
                <option>CoachAI Tech Camps</option>
                <option>OpenChief</option>
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={handleUrlSubmit}
              disabled={uploading || !videoUrl.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pp-purple py-2.5 text-sm font-semibold text-white transition-all hover:bg-pp-purple/90 glow-purple disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scissors className="h-4 w-4" />
              )}
              {uploading ? "Submitting..." : "Start Hyperedit"}
            </button>
          </div>
        </div>
      </div>

      {/* Job list */}
      <div className="fade-up fade-up-4">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-pp-border bg-pp-surface p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center grid-pattern rounded-lg p-8">
              <Scissors className="h-8 w-8 text-pp-muted/40" />
              <p className="text-sm font-medium text-pp-muted">
                No active jobs — drop a video to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-pp-text">
                Hyperedit Jobs
              </h3>
              <span className="rounded-full bg-pp-purple/10 px-2.5 py-0.5 text-xs font-bold text-pp-purple">
                {runningJobs.length} running
              </span>
            </div>

            <div className="space-y-3">
              {jobs.map((job) => {
                const cfg = statusConfig[job.status] ?? statusConfig.queued;
                const StatusIcon = cfg.icon;
                const brandColor = getBrandColor(job.brand);
                const brandShort = getBrandShortName(job.brand);

                return (
                  <div
                    key={job.id}
                    className="group rounded-lg border border-pp-border/50 bg-[#0A0A0F]/50 p-4 transition-all duration-200 hover:border-pp-border"
                  >
                    {/* Top row */}
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-pp-text">
                          {job.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: brandColor + "15",
                              color: brandColor,
                            }}
                          >
                            {brandShort}
                          </span>
                          {job.clips > 0 && (
                            <span className="text-[10px] text-pp-muted">
                              {job.clips} clips
                            </span>
                          )}
                          <span className="text-[10px] text-pp-muted capitalize">
                            {job.source === "url" ? "URL" : "File"}
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1.5"
                        style={{ color: cfg.color }}
                      >
                        <StatusIcon
                          className={cn(
                            "h-3.5 w-3.5",
                            cfg.animate && "animate-spin"
                          )}
                        />
                        <span className="text-xs font-medium">{cfg.label}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-pp-border/50">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${job.progress}%`,
                          background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                          boxShadow: `0 0 8px ${cfg.color}44`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
