"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Plus, Trash2, ChevronRight, Scissors, FlaskConical, CheckCircle2, Film, Sparkles } from "lucide-react";
import type { Concept } from "@/lib/concepts/types";
import { useBrand } from "@/lib/brand-context";
import { useRouter } from "next/navigation";

interface ResearchSuggestion {
  id: string;
  question: string;
  summary: string;
  sources: number;
  priority: string;
  suggestedTitle: string;
  suggestedTags: string[];
}

const STATUS_ORDER: Concept["status"][] = ["draft", "review", "approved", "published"];

const STATUS_COLORS: Record<Concept["status"], string> = {
  draft: "border-pp-border text-pp-muted",
  review: "border-yellow-500/50 text-yellow-400",
  approved: "border-blue-500/50 text-blue-400",
  published: "border-pp-success/50 text-pp-success",
};

const BRANDS = ["GBB", "CoachAI", "OpenChief"];

export default function ConceptsPage() {
  const router = useRouter();
  const globalBrand = useBrand();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("GBB");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<ResearchSuggestion[]>([]);

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterBrand !== "all") params.set("brand", filterBrand);
    if (filterStatus) params.set("status", filterStatus);
    try {
      const res = await fetch(`/api/concepts?${params}`);
      const data = await res.json();
      setConcepts(data.concepts || []);
    } catch {
      setConcepts([]);
    } finally {
      setLoading(false);
    }
  }, [filterBrand, filterStatus]);

  // Sync global brand switcher → local filter
  useEffect(() => {
    const brandMap: Record<string, string> = { all: "all", gbb: "gbb", coach: "coachai", open: "openchief" };
    setFilterBrand(brandMap[globalBrand] || "all");
  }, [globalBrand]);

  useEffect(() => { fetchConcepts(); }, [fetchConcepts]);

  // Fetch research-driven suggestions
  useEffect(() => {
    fetch("/api/concepts/suggestions")
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, []);

  const approveResearchSuggestion = async (suggestion: ResearchSuggestion) => {
    const res = await fetch("/api/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: suggestion.suggestedTitle,
        description: suggestion.summary,
        brand: "GBB",
        tags: suggestion.suggestedTags,
        status: "draft",
        researchItemId: suggestion.id,
      }),
    });
    if (res.ok) {
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      fetchConcepts();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          brand,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create");
        return;
      }
      setTitle(""); setDescription(""); setTags(""); setBrand("GBB");
      setFormOpen(false);
      fetchConcepts();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStatus = async (concept: Concept) => {
    const currentIdx = STATUS_ORDER.indexOf(concept.status);
    if (currentIdx === STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];
    await fetch(`/api/concepts/${concept.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchConcepts();
  };

  const sendToHyperedit = async (concept: Concept) => {
    const res = await fetch("/api/hyperedit/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: concept.title,
        source: "url",
        sourcePath: "concept-pipeline",
        brand: concept.brand,
        platforms: ["reels", "tiktok", "shorts"],
        maxClips: 3,
        conceptId: concept.id,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      // Link job back to concept
      await fetch(`/api/concepts/${concept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: data.job?.id }),
      });
      router.push(`/hyperedit/${data.job?.id || ""}`);
    }
  };

  const generateAiVideo = async (concept: Concept, provider: "minimax" | "seedance") => {
    const prompt = [concept.title, concept.description].filter(Boolean).join(" — ");
    const res = await fetch("/api/hyperedit/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        prompt,
        brand: concept.brand,
        conceptId: concept.id,
        aspectRatio: "9:16",
        adMode: true,
        name: `${provider === "minimax" ? "MiniMax" : "Seedance 2.0"} Ad — ${concept.title}`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.jobId) {
        await fetch(`/api/concepts/${concept.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: data.jobId }),
        });
        router.push(`/hyperedit/${data.jobId}`);
      }
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`AI video generation failed: ${d.error || res.status}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this concept?")) return;
    await fetch(`/api/concepts/${id}`, { method: "DELETE" });
    fetchConcepts();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="fade-up fade-up-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-pp-text">Concepts</h1>
          <p className="mt-1 text-sm text-pp-muted">Content concepts intake and status tracking</p>
        </div>
        <button
          onClick={() => setFormOpen(v => !v)}
          className="flex items-center gap-2 rounded-lg bg-pp-purple px-4 py-2 text-sm font-medium text-white hover:bg-pp-purple/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Concept
        </button>
      </div>

      {/* New Concept Form */}
      {formOpen && (
        <div className="fade-up rounded-xl border border-pp-purple/30 bg-pp-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-pp-text">New Concept</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-pp-muted">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Concept title..."
                  className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/60 focus:border-pp-purple focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-pp-muted">Brand</label>
                <select
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text focus:border-pp-purple focus:outline-none"
                >
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-pp-muted">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Concept description..."
                rows={2}
                className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/60 focus:border-pp-purple focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-pp-muted">Tags (comma separated)</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="seo, video, blog..."
                className="w-full rounded-lg border border-pp-border bg-[#0A0A0F] px-3 py-2 text-sm text-pp-text placeholder:text-pp-muted/60 focus:border-pp-purple focus:outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-pp-purple px-4 py-2 text-sm font-medium text-white hover:bg-pp-purple/80 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating..." : "Create Concept"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-sm text-pp-muted hover:text-pp-text"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Research-driven suggestions */}
      {suggestions.length > 0 && (
        <div className="fade-up rounded-xl border border-pp-gold/30 bg-pp-gold/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-pp-gold" />
            <span className="text-xs font-semibold text-pp-gold">Research Suggestions</span>
            <span className="rounded-full bg-pp-gold/20 px-2 py-0.5 text-[10px] font-bold text-pp-gold">{suggestions.length}</span>
          </div>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-pp-border/50 bg-[#0A0A0F] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-pp-text truncate">{s.suggestedTitle}</p>
                  <p className="text-[10px] text-pp-muted truncate">{s.summary.slice(0, 100)}...</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded border border-pp-gold/30 px-1 py-0.5 text-[10px] text-pp-gold">research</span>
                    <span className="text-[10px] text-pp-muted">{s.sources} sources</span>
                  </div>
                </div>
                <button
                  onClick={() => approveResearchSuggestion(s)}
                  className="flex items-center gap-1 rounded-lg bg-pp-purple px-3 py-1.5 text-[10px] font-medium text-white hover:bg-pp-purple/80 transition-colors shrink-0"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="fade-up fade-up-2 flex items-center gap-3 flex-wrap">
        <select
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
          className="rounded-lg border border-pp-border bg-pp-surface px-3 py-1.5 text-xs text-pp-text focus:border-pp-purple focus:outline-none"
        >
          <option value="all">All Brands</option>
          {BRANDS.map(b => <option key={b} value={b.toLowerCase()}>{b}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-pp-border bg-pp-surface px-3 py-1.5 text-xs text-pp-text focus:border-pp-purple focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-pp-muted">{concepts.length} concept{concepts.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Concepts List */}
      <div className="fade-up fade-up-3 rounded-xl border border-pp-border bg-pp-surface">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-pp-muted text-sm">
            Loading...
          </div>
        ) : concepts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
            <Lightbulb className="h-10 w-10 text-pp-muted/40" />
            <p className="text-sm font-medium text-pp-muted">No concepts yet — create one above</p>
          </div>
        ) : (
          <div className="divide-y divide-pp-border">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_80px_120px_80px] gap-4 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-pp-muted">
              <span>Title / Description</span>
              <span>Brand</span>
              <span>Tags</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {concepts.map(concept => (
              <div
                key={concept.id}
                className="grid grid-cols-[1fr_100px_80px_120px_80px] gap-4 px-4 py-3 items-center hover:bg-pp-surface/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-pp-text">{concept.title}</div>
                  {concept.description && (
                    <div className="mt-0.5 truncate text-xs text-pp-muted">{concept.description}</div>
                  )}
                </div>
                <div className="text-xs text-pp-muted">{concept.brand}</div>
                <div className="flex flex-wrap gap-1">
                  {concept.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="rounded border border-pp-border px-1 py-0.5 text-[10px] text-pp-muted">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => advanceStatus(concept)}
                  disabled={concept.status === "published"}
                  className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors ${STATUS_COLORS[concept.status]} hover:opacity-80 disabled:cursor-default`}
                  title={concept.status !== "published" ? `Advance to ${STATUS_ORDER[STATUS_ORDER.indexOf(concept.status) + 1]}` : "Published"}
                >
                  {concept.status}
                  {concept.status !== "published" && <ChevronRight className="h-3 w-3" />}
                </button>
                <div className="flex items-center gap-1">
                  {concept.status === "approved" && (
                    <>
                      <button
                        onClick={() => sendToHyperedit(concept)}
                        className="rounded p-1 text-pp-muted hover:text-pp-purple hover:bg-pp-purple/10 transition-colors"
                        title="Send to Hyperedit"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => generateAiVideo(concept, "minimax")}
                        className="rounded p-1 text-pp-muted hover:text-pp-gold hover:bg-pp-gold/10 transition-colors"
                        title="Generate Ad with MiniMax"
                      >
                        <Film className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => generateAiVideo(concept, "seedance")}
                        className="rounded p-1 text-pp-muted hover:text-pp-purple hover:bg-pp-purple/10 transition-colors"
                        title="Generate Ad with Seedance 2.0"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(concept.id)}
                    className="rounded p-1 text-pp-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
