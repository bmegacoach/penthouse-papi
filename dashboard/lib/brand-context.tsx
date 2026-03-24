"use client";

import { createContext, useContext } from "react";

export type BrandFilter = "all" | "gbb" | "coach" | "open";

const BrandContext = createContext<BrandFilter>("all");

export function BrandProvider({ brand, children }: { brand: BrandFilter; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandFilter {
  return useContext(BrandContext);
}

// Helper to check if a brand string matches the filter
export function matchesBrand(filter: BrandFilter, brandStr: string): boolean {
  if (filter === "all") return true;
  const lower = brandStr.toLowerCase();
  switch (filter) {
    case "gbb": return lower.includes("gbb") || lower.includes("gold");
    case "coach": return lower.includes("coach");
    case "open": return lower.includes("open") || lower.includes("chief");
    default: return true;
  }
}
