import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  accentColor?: string;
  glowClass?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  accentColor = "#6C63FF",
  glowClass = "glow-purple",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-pp-border bg-pp-surface p-5 transition-all duration-300 hover:border-pp-purple/30",
        glowClass && `hover:${glowClass}`,
        className
      )}
    >
      {/* Subtle gradient accent at top */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] opacity-50 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-pp-muted">
            {label}
          </p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-pp-text">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium",
                changeType === "up" && "text-pp-success",
                changeType === "down" && "text-pp-error",
                changeType === "neutral" && "text-pp-muted"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: accentColor + "15" }}
        >
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}
