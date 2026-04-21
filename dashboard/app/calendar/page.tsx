"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Video,
  Image,
  FileText,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarItem {
  date: string;
  video: number;
  image: number;
  copy: number;
}

interface DayCell {
  date: Date;
  dateStr: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  video: number;
  image: number;
  copy: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonth(year: number, month: number, data: CalendarItem[]): DayCell[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];

  // Leading days from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    const dateStr = d.toISOString().split("T")[0];
    const match = data.find((c) => c.date === dateStr);
    cells.push({
      date: d, dateStr, dayNum: d.getDate(), inMonth: false,
      isToday: dateStr === todayStr,
      video: match?.video ?? 0, image: match?.image ?? 0, copy: match?.copy ?? 0,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toISOString().split("T")[0];
    const match = data.find((c) => c.date === dateStr);
    cells.push({
      date: d, dateStr, dayNum: day, inMonth: true,
      isToday: dateStr === todayStr,
      video: match?.video ?? 0, image: match?.image ?? 0, copy: match?.copy ?? 0,
    });
  }

  // Trailing days to fill 6 rows
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = d.toISOString().split("T")[0];
    const match = data.find((c) => c.date === dateStr);
    cells.push({
      date: d, dateStr, dayNum: i, inMonth: false,
      isToday: dateStr === todayStr,
      video: match?.video ?? 0, image: match?.image ?? 0, copy: match?.copy ?? 0,
    });
  }

  return cells;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [calendarData, setCalendarData] = useState<CalendarItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);

  const fetchCalendar = useCallback(async () => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/calendar?month=${monthStr}`);
      const data = await res.json();
      const fetched: any[] = data.entries || [];

      // Aggregate by date for calendar dots
      const byDate: Record<string, CalendarItem> = {};
      for (const e of fetched) {
        if (!byDate[e.date]) byDate[e.date] = { date: e.date, video: 0, image: 0, copy: 0 };
        if (e.contentType === "video") byDate[e.date].video++;
        else if (e.contentType === "image") byDate[e.date].image++;
        else byDate[e.date].copy++;
      }
      setCalendarData(Object.values(byDate));
      setEntries(fetched);
    } catch {
      setCalendarData([]);
      setEntries([]);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const cells = buildMonth(year, month, calendarData);
  const selected = selectedDate ? cells.find((c) => c.dateStr === selectedDate) : null;

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };
  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const totalAssets = calendarData.reduce((sum, d) => sum + d.video + d.image + d.copy, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="fade-up fade-up-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-pp-text">Content Calendar</h1>
          <p className="mt-1 text-sm text-pp-muted">
            Schedule and manage content across all brands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-lg border border-pp-border bg-pp-surface px-3 py-1.5 text-xs font-medium text-pp-muted hover:text-pp-text transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Calendar grid */}
        <div className="fade-up fade-up-2 rounded-xl border border-pp-border bg-pp-surface p-5">
          {/* Month nav */}
          <div className="mb-4 flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-lg p-2 text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold text-pp-text">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth} className="rounded-lg p-2 text-pp-muted hover:bg-pp-surface-raised hover:text-pp-text transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-medium uppercase tracking-wider text-pp-muted">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const hasContent = cell.video + cell.image + cell.copy > 0;
              const isSelected = selectedDate === cell.dateStr;
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-all duration-200 min-h-[72px]",
                    !cell.inMonth && "opacity-30",
                    cell.isToday && "border-pp-purple/40 bg-pp-purple/5",
                    isSelected && "border-pp-purple glow-purple",
                    !cell.isToday && !isSelected && "border-transparent hover:border-pp-border/50 hover:bg-pp-surface-raised",
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    cell.isToday ? "text-pp-purple" : cell.inMonth ? "text-pp-text" : "text-pp-muted",
                  )}>
                    {cell.dayNum}
                  </span>
                  {hasContent && (
                    <div className="flex items-center gap-0.5">
                      {cell.video > 0 && <Circle className="h-1.5 w-1.5 fill-pp-purple text-pp-purple" />}
                      {cell.image > 0 && <Circle className="h-1.5 w-1.5 fill-pp-gold text-pp-gold" />}
                      {cell.copy > 0 && <Circle className="h-1.5 w-1.5 fill-pp-success text-pp-success" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-[10px] text-pp-muted">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-pp-purple" /> Video
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-pp-gold" /> Image
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-pp-success" /> Copy
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Summary card */}
          <div className="fade-up fade-up-3 rounded-xl border border-pp-border bg-pp-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-muted">Pipeline Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-pp-muted">
                  <CalendarDays className="h-4 w-4" />
                  <span>Total Assets</span>
                </div>
                <span className="text-sm font-bold text-pp-text tabular-nums">{totalAssets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-pp-muted">
                  <Video className="h-4 w-4 text-pp-purple" />
                  <span>Videos</span>
                </div>
                <span className="text-sm font-bold text-pp-text tabular-nums">
                  {calendarData.reduce((s, d) => s + d.video, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-pp-muted">
                  <Image className="h-4 w-4 text-pp-gold" />
                  <span>Images</span>
                </div>
                <span className="text-sm font-bold text-pp-text tabular-nums">
                  {calendarData.reduce((s, d) => s + d.image, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-pp-muted">
                  <FileText className="h-4 w-4 text-pp-success" />
                  <span>Copy</span>
                </div>
                <span className="text-sm font-bold text-pp-text tabular-nums">
                  {calendarData.reduce((s, d) => s + d.copy, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Selected day detail */}
          <div className="fade-up fade-up-4 rounded-xl border border-pp-border bg-pp-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-muted">
              {selected ? selected.dateStr : "Select a Day"}
            </h3>
            {selected ? (
              <div className="space-y-2">
                {entries.filter(e => e.date === selectedDate).map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-pp-border/50 bg-[#0A0A0F] px-3 py-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      entry.contentType === "video" ? "bg-pp-purple" : entry.contentType === "image" ? "bg-pp-gold" : "bg-pp-success"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-pp-text truncate">{entry.title}</p>
                      <p className="text-[10px] text-pp-muted">{entry.platform} | {entry.brand} | {entry.status}</p>
                    </div>
                  </div>
                ))}
                {entries.filter(e => e.date === selectedDate).length === 0 && (
                  <p className="text-xs text-pp-muted">No content scheduled</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-pp-muted">Click a day to see scheduled content</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
