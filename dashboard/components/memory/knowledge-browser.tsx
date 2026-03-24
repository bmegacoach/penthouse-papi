"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Folder, FileText, Lock } from "lucide-react";

interface NamespaceData { namespaces: Record<string, { count: number }> }
interface EntityData { namespace: string; entities: { title: string; content: string; updated_at: string; source: string }[] }

export function KnowledgeBrowser() {
  const [namespaces, setNamespaces] = useState<NamespaceData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(true);

  const sharedNamespaces = ["fleet", "infrastructure"];

  useEffect(() => {
    fetch("/api/memory/knowledge").then(r => r.json()).then(setNamespaces).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setEntities(null); return; }
    fetch(`/api/memory/knowledge?namespace=${selected}`).then(r => r.json()).then(setEntities);
  }, [selected]);

  if (loading) return <div className="animate-pulse rounded-xl bg-pp-surface p-6 h-64" />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-pp-border bg-pp-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-pp-text">Namespaces</h3>
        <div className="space-y-1">
          {namespaces && Object.entries(namespaces.namespaces).map(([ns, info]) => (
            <button key={ns} onClick={() => setSelected(ns)} className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all",
              selected === ns ? "bg-pp-purple/10 text-pp-purple" : "text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text"
            )}>
              <Folder className="h-3.5 w-3.5" />
              <span className="flex-1 font-medium">{ns}</span>
              {sharedNamespaces.includes(ns) && <Lock className="h-3 w-3 text-pp-muted/50" />}
              <span className="text-[10px] opacity-50">{info.count}</span>
            </button>
          ))}
          {(!namespaces || Object.keys(namespaces.namespaces).length === 0) && (
            <p className="text-xs text-pp-muted px-3 py-2">No knowledge entities yet</p>
          )}
        </div>
      </div>
      <div className="lg:col-span-2 rounded-xl border border-pp-border bg-pp-surface p-4">
        {entities ? (
          <>
            <h3 className="mb-3 text-sm font-semibold text-pp-text">{entities.namespace}/</h3>
            <div className="space-y-2">
              {entities.entities.map((entity) => (
                <div key={entity.title} className="rounded-lg border border-pp-border/50 p-4 hover:bg-pp-surface-raised transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3.5 w-3.5 text-pp-purple" />
                    <span className="text-xs font-semibold text-pp-text">{entity.title}</span>
                    <span className="rounded bg-pp-border/50 px-1.5 py-0.5 text-[10px] text-pp-muted">{entity.source}</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-pp-muted font-mono">{entity.content}</pre>
                  <div className="mt-2 text-[10px] text-pp-muted/50">Updated: {entity.updated_at?.split("T")[0] || "unknown"}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center"><p className="text-xs text-pp-muted">Select a namespace to browse entities</p></div>
        )}
      </div>
    </div>
  );
}
