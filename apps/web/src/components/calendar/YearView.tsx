"use client";

import type { CalendarFeedEvent } from "@job-tracker/shared";

interface YearViewProps {
  focusedDate: Date;
  events: CalendarFeedEvent[];
  onYearClick?: (year: number) => void;
  onYearHover?: (year: number) => void;
  onPrevClick?: () => void;
  onNextClick?: () => void;
}

export function YearView({ focusedDate, events: _events, onYearClick, onYearHover, onPrevClick, onNextClick }: YearViewProps) {
  const focusedYear = focusedDate.getFullYear();
  const currentYear = new Date().getFullYear();

  // 7 years: focused ± 3; indices 0 and 6 are the peeking ones
  const years = Array.from({ length: 7 }, (_, i) => focusedYear - 3 + i);

  return (
    <div className="relative overflow-hidden mx-6 my-8">
      {/*
        Track centred so the focused year (index 3 of 7) is in the middle.
        Each square is w-40 (160px) with gap-4 (1rem).
        Offset = -(3 * (160px + 1rem)) to bring index 3 to left edge,
        then + 50% - 80px to visually centre it.
      */}
      <div
        className="flex gap-4"
        style={{ transform: "translateX(calc(-3 * (160px + 1rem) + 50% - 80px))" }}
      >
        {years.map((year, idx) => {
          const isPeeking = idx === 0 || idx === 6;
          const isFocused = year === focusedYear;
          const isToday   = year === currentYear;

          return (
            <div
              key={year}
              onClick={() => {
                if (isPeeking && idx === 0) { onPrevClick?.(); return; }
                if (isPeeking && idx === 6) { onNextClick?.(); return; }
                onYearClick?.(year);
              }}
              role="button"
              tabIndex={0}
              onMouseEnter={() => onYearHover?.(year)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (isPeeking && idx === 0) { onPrevClick?.(); return; }
                if (isPeeking && idx === 6) { onNextClick?.(); return; }
                onYearClick?.(year);
              }}
              className={[
                "flex-shrink-0 w-40 h-40 rounded-xl flex flex-col items-center justify-center cursor-pointer select-none transition-opacity",
                isFocused  ? "bg-blue-50 ring-2 ring-blue-400"           : "bg-white border border-gray-200 hover:border-gray-300",
                isPeeking  ? "opacity-60 hover:opacity-80"                : "",
              ].filter(Boolean).join(" ")}
            >
              <span className={`text-3xl font-semibold ${isFocused ? "text-blue-700" : "text-gray-700"}`}>
                {year}
              </span>
              {isToday && !isFocused && (
                <span className="mt-1 text-xs text-blue-400">current</span>
              )}
              {isToday && isFocused && (
                <span className="mt-1 text-xs text-blue-500">this year</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
