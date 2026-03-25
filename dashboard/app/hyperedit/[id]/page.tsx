"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Scissors,
  Loader2,
  Save,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import type { HypereditJob, ClipPlan } from "@/lib/hyperedit/types";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<HypereditJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editedClips, setEditedClips] = useState<ClipPlan[]>([]);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch(`/api/hyperedit/jobs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data.job);
        setEditedClips(data.job?.clipPlan || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Poll while processing
  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;
    const interval = setInterval(() => {
      fetch(`/api/hyperedit/jobs/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setJob(data.job);
          if (data.job?.clipPlan) setEditedClips(data.job.clipPlan);
        });
    }, 3000);
    return () => clearInterval(interval);
  }, [id, job?.status]);

  const updateClip = (index: number, field: keyof ClipPlan, value: string | boolean) => {
    setEditedClips((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveClips = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/hyperedit/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipPlan: editedClips }),
      });
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(""), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await fetch(`/api/hyperedit/jobs/${id}/regenerate`, { method: "POST" });
      // Poll for completion
      const poll = setInterval(async () => {
        const res = await fetch(`/api/hyperedit/jobs/${id}`);
        const data = await res.json();
        setJob(data.job);
        if (data.job?.clipPlan) setEditedClips(data.job.clipPlan);
        if (data.job?.status === "ready" || data.job?.status === "failed") {
          clearInterval(poll);
          setRegenerating(false);
        }
      }, 3000);
    } catch {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="animate-pulse rounded-xl bg-pp-surface p-12 h-64" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-pp-error">Job not found</p>
      </div>
    );
  }

  const isProcessing = !["ready", "failed", "queued"].includes(job.status) || regenerating;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/hyperedit")}
            className="rounded-lg border border-pp-border p-2 text-pp-muted hover:text-pp-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-pp-text">{job.name}</h1>
            <p className="text-xs text-pp-muted">
              {job.brand} | {job.platforms.join(", ")} | {job.maxClips} max clips | {job.source}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-xs text-pp-success font-medium">{saveMsg}</span>}
          <button
            onClick={saveClips}
            disabled={saving || isProcessing}
            className="flex items-center gap-1.5 rounded-lg border border-pp-border px-3 py-1.5 text-xs font-medium text-pp-muted hover:text-pp-text disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Edits"}
          </button>
          <button
            onClick={regenerate}
            disabled={regenerating || isProcessing}
            className="flex items-center gap-1.5 rounded-lg bg-pp-purple px-3 py-1.5 text-xs font-medium text-white hover:bg-pp-purple/90 disabled:opacity-50 transition-colors"
          >
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            {regenerating ? "Regenerating..." : "Regenerate Clips"}
          </button>
        </div>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="rounded-xl border border-pp-purple/30 bg-pp-purple/5 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-pp-purple animate-spin" />
            <div>
              <p className="text-sm font-medium text-pp-purple capitalize">{job.status}...</p>
              <p className="text-xs text-pp-muted">Progress: {job.progress}%</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-pp-border/50">
            <div
              className="h-full rounded-full bg-pp-purple transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Content Summary */}
      {job.contentSummary && (
        <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-pp-purple" />
            <h2 className="text-sm font-semibold text-pp-text">Content Summary</h2>
          </div>
          <p className="text-sm text-pp-muted leading-relaxed">{job.contentSummary}</p>
          {job.brandAlignment && (
            <p className="mt-2 text-xs text-pp-muted/70">Brand alignment: {job.brandAlignment}</p>
          )}
        </div>
      )}

      {/* Clips */}
      {editedClips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-pp-text">{editedClips.length} Clips</h2>

          {editedClips.map((clip, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border bg-pp-surface p-5 transition-all",
                clip.approved === true ? "border-pp-success/30" : clip.approved === false ? "border-pp-error/30" : "border-pp-border"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-pp-muted">Clip {i + 1} — Title</label>
                    <input
                      type="text"
                      value={clip.title}
                      onChange={(e) => updateClip(i, "title", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none"
                    />
                  </div>

                  {/* Hook */}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-pp-muted">Hook (first 3 seconds)</label>
                    <input
                      type="text"
                      value={clip.hook}
                      onChange={(e) => updateClip(i, "hook", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-pp-purple/30 bg-pp-purple/5 px-3 py-2 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-pp-muted">Description</label>
                    <textarea
                      value={clip.description}
                      onChange={(e) => updateClip(i, "description", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text focus:border-pp-purple/50 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Script */}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-pp-muted">Script / Talking Points</label>
                    <textarea
                      value={clip.script_outline}
                      onChange={(e) => updateClip(i, "script_outline", e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text font-mono text-xs focus:border-pp-purple/50 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Operator Notes */}
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-pp-muted">Your Notes / Edits</label>
                    <textarea
                      value={clip.notes || ""}
                      onChange={(e) => updateClip(i, "notes", e.target.value)}
                      rows={2}
                      placeholder="Add notes, changes, or feedback..."
                      className="mt-1 w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/40 focus:border-pp-purple/50 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[10px] text-pp-muted">
                    <span className="rounded bg-pp-border/50 px-1.5 py-0.5 font-medium">{clip.platform}</span>
                    <span>{clip.estimated_duration}</span>
                  </div>
                </div>

                {/* Approve / Reject */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => updateClip(i, "approved", clip.approved === true ? undefined as any : true)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                      clip.approved === true
                        ? "border-pp-success/50 bg-pp-success/10 text-pp-success"
                        : "border-pp-border text-pp-muted hover:text-pp-success hover:border-pp-success/30"
                    )}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => updateClip(i, "approved", clip.approved === false ? undefined as any : false)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                      clip.approved === false
                        ? "border-pp-error/50 bg-pp-error/10 text-pp-error"
                        : "border-pp-border text-pp-muted hover:text-pp-error hover:border-pp-error/30"
                    )}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isProcessing && editedClips.length === 0 && (
        <div className="rounded-xl border border-pp-border bg-pp-surface p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Scissors className="h-8 w-8 text-pp-muted/40" />
            <p className="text-sm font-medium text-pp-muted">No clip plan generated yet</p>
            <button
              onClick={regenerate}
              className="flex items-center gap-1.5 rounded-lg bg-pp-purple px-4 py-2 text-xs font-medium text-white hover:bg-pp-purple/90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Clip Plan
            </button>
          </div>
        </div>
      )}

      {/* Approved summary */}
      {editedClips.length > 0 && (
        <div className="rounded-xl border border-pp-border bg-pp-surface p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-pp-success font-medium">
              {editedClips.filter((c) => c.approved === true).length} approved
            </span>
            <span className="text-pp-error font-medium">
              {editedClips.filter((c) => c.approved === false).length} rejected
            </span>
            <span className="text-pp-muted">
              {editedClips.filter((c) => c.approved === undefined).length} pending
            </span>
          </div>
          <button
            onClick={saveClips}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-pp-purple px-4 py-2 text-xs font-medium text-white hover:bg-pp-purple/90 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
