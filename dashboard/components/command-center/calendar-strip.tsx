"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CalendarDay {
  date: string;
  video: number;
  image: number;
  copy: number;
}

interface DayData {
  date: string;
  dayLabel: string;
  dayNum: number;
  video: number;
  image: number;
  copy: number;
  isToday: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildDays(calendarData: CalendarDay[]): DayData[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const days: DayData[] = [];

  for (let i = -1; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const match = calendarData.find((c) => c.date === dateStr);
    days.push({
      date: dateStr,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: d.getDate(),
      video: match?.video ?? 0,
      image: match?.image ?? 0,
      copy: match?.copy ?? 0,
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

interface CalendarStripProps {
  calendarData?: CalendarDay[];
}

export function CalendarStrip({ calendarData }: CalendarStripProps) {
  const [days, setDays] = useState<DayData[]>(() =>
    calendarData ? buildDays(calendarData) : []
  );

  useEffect(() => {
    if (calendarData && calendarData.length > 0) {
      setDays(buildDays(calendarData));
      return;
    }
    // Fallback: fetch from /api/stats if no data was passed in
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendar) {
          setDays(buildDays(data.calendar));
        }
      })
      .catch(() => {});
  }, [calendarData]);

  return (
    <div className="rounded-xl border border-pp-border bg-pp-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pp-text">7-Day Pipeline</h3>
        <span className="text-xs text-pp-muted">This week</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-3 transition-all duration-200",
              day.isToday
                ? "border-pp-purple/40 bg-pp-purple/5 glow-purple"
                : "border-pp-border/50 bg-transparent hover:border-pp-border hover:bg-pp-surface-raised"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                day.isToday ? "text-pp-purple" : "text-pp-muted"
              )}
            >
              {day.dayLabel}
            </span>
            <span
              className={cn(
                "text-lg font-bold tabular-nums",
                day.isToday ? "text-pp-purple" : "text-pp-text"
              )}
            >
              {day.dayNum}
            </span>

            {/* Asset counts */}
            <div className="flex items-center gap-1.5">
              {day.video > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded bg-pp-purple/15 text-[10px] font-bold text-pp-purple">
                  {day.video}
                </span>
              )}
              {day.image > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded bg-pp-gold-dim text-[10px] font-bold text-pp-gold">
                  {day.image}
                </span>
              )}
              {day.copy > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded bg-pp-success/15 text-[10px] font-bold text-pp-success">
                  {day.copy}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-pp-muted">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-pp-purple" />
          Video
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-pp-gold" />
          Image
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-pp-success" />
          Copy
        </div>
      </div>
    </div>
  );
}
