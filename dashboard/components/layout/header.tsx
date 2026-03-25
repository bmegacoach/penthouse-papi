"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Bell,
  Search,
  Activity,
  Circle,
} from "lucide-react";

const brands = [
  { id: "all", label: "ALL", color: "#6C63FF" },
  { id: "gbb", label: "GBB", color: "#FFD700" },
  { id: "coach", label: "COACH", color: "#22C55E" },
  { id: "open", label: "OPEN", color: "#6C63FF" },
] as const;

export type BrandFilter = (typeof brands)[number]["id"];

interface SearchResult {
  source: string;
  content: string;
  path?: string;
}

interface SearchResponse {
  layer: "L1" | "L2" | "L3";
  results: SearchResult[];
  query: string;
}

interface HeaderProps {
  activeBrand: BrandFilter;
  onBrandChange: (brand: BrandFilter) => void;
}

export function Header({ activeBrand, onBrandChange }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setSearchResults(data);
      }
    } catch {
      // silently fail
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(searchQuery);
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults(null);
    }
  };

  const handleBlur = () => {
    // Delay close so clicks on dropdown register
    setTimeout(() => {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-pp-border bg-[#0D0D14]/80 px-6 backdrop-blur-sm">
      {/* Left: Brand switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-pp-border bg-pp-surface p-1">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => onBrandChange(brand.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-all duration-200",
              activeBrand === brand.id
                ? "text-white shadow-sm"
                : "text-pp-muted hover:text-pp-text"
            )}
            style={
              activeBrand === brand.id
                ? { backgroundColor: brand.color + "22", color: brand.color, boxShadow: `0 0 12px ${brand.color}22` }
                : undefined
            }
          >
            <Circle
              className="h-2 w-2"
              fill={activeBrand === brand.id ? brand.color : "transparent"}
              stroke={brand.color}
              strokeWidth={2}
            />
            {brand.label}
          </button>
        ))}
      </div>

      {/* Center: Search */}
      <div className="relative flex items-center">
        {searchOpen ? (
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-pp-border bg-pp-surface px-3 py-1.5">
              <Search className="h-4 w-4 text-pp-muted" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onBlur={handleBlur}
                placeholder="Search concepts, clips, campaigns..."
                className="w-72 bg-transparent text-sm text-pp-text placeholder:text-pp-muted/60 focus:outline-none"
              />
              {searchLoading && (
                <span className="h-3 w-3 animate-spin rounded-full border border-pp-muted border-t-transparent" />
              )}
              <kbd className="rounded border border-pp-border bg-[#0A0A0F] px-1.5 py-0.5 text-[10px] text-pp-muted">
                ESC
              </kbd>
            </div>

            {/* Search results dropdown */}
            {searchResults && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full z-50 mt-1 w-full min-w-[400px] rounded-lg border border-pp-border bg-[#0D0D14] shadow-xl"
              >
                <div className="border-b border-pp-border px-3 py-1.5 text-[10px] text-pp-muted">
                  {searchResults.results.length > 0
                    ? `${searchResults.results.length} result${searchResults.results.length !== 1 ? "s" : ""} from ${searchResults.layer}`
                    : "No results found"}
                </div>
                {searchResults.results.slice(0, 6).map((r, i) => (
                  <div key={i} className="border-b border-pp-border/50 px-3 py-2 last:border-0 hover:bg-pp-surface/50">
                    <div className="text-[10px] font-medium text-pp-purple">{r.source}</div>
                    <div className="mt-0.5 text-xs text-pp-muted line-clamp-2">
                      {r.content.slice(0, 120)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-pp-border/50 bg-transparent px-3 py-1.5 text-sm text-pp-muted transition-colors hover:border-pp-border hover:text-pp-text"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="rounded border border-pp-border bg-pp-surface px-1.5 py-0.5 text-[10px]">
              /
            </kbd>
          </button>
        )}
      </div>

      {/* Right: Status + Notifications */}
      <div className="flex items-center gap-4">
        {/* System status */}
        <div className="flex items-center gap-2 text-xs">
          <Activity className="h-3.5 w-3.5 text-pp-success" />
          <span className="text-pp-muted">
            Fleet <span className="text-pp-success font-medium">Online</span>
          </span>
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-pp-muted transition-colors hover:bg-pp-surface hover:text-pp-text">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pp-purple pulse-ring" />
        </button>
      </div>
    </header>
  );
}
