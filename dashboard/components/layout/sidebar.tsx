"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Scissors,
  Clapperboard,
  BarChart3,
  Brain,
  BookOpen,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Command Center", href: "/", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Concepts", href: "/concepts", icon: Lightbulb },
  { label: "Hyperedit", href: "/hyperedit", icon: Scissors },
  { label: "Studio", href: "/studio", icon: Clapperboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Memory", href: "/memory", icon: Brain },
  { label: "Scenario Lab", href: "/scenario-lab", icon: FlaskConical },
  { label: "Manual", href: "/manual", icon: BookOpen },
];

const bottomItems = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-pp-border bg-[#0D0D14] transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-pp-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pp-purple/15 glow-purple">
          <Zap className="h-5 w-5 text-pp-purple" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold tracking-tight text-pp-text">
              Penthouse Papi
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-pp-muted">
              Media Studio
            </span>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "nav-active bg-pp-purple/10 text-pp-purple"
                  : "text-pp-muted hover:bg-pp-surface hover:text-pp-text"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active
                    ? "text-pp-purple drop-shadow-[0_0_6px_#6C63FF66]"
                    : "text-pp-muted group-hover:text-pp-text"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && (
                <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-pp-purple pulse-ring" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-pp-border" />

      {/* Bottom nav */}
      <nav className="space-y-1 px-3 py-4">
        {bottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-pp-purple/10 text-pp-purple"
                  : "text-pp-muted hover:bg-pp-surface hover:text-pp-text"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-pp-border bg-pp-surface text-pp-muted transition-colors hover:border-pp-purple/50 hover:text-pp-purple"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
