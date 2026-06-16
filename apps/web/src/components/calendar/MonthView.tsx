"use client";

import { addMonths, subMonths, format } from "date-fns";
import type { CalendarFeedEvent } from "@job-tracker/shared";
import { MonthGrid } from "./MonthGrid";

interface MonthViewProps {
  focusedDate: Date;
  events: CalendarFeedEvent[];
  onWeekClick?: (weekStart: Date) => void;
  onWeekHover?: (weekStart: Date) => void;
  onDayClick?: (day: Date) => void;
  onPrevClick?: () => void;
  onNextClick?: () => void;
}

export function MonthView({
  focusedDate,
  events,
  onWeekClick,
  onWeekHover,
  onDayClick,
  onPrevClick,
  onNextClick,
}: MonthViewProps) {
  const prev    = subMonths(focusedDate, 1);
  const current = focusedDate;
  const next    = addMonths(focusedDate, 1);

  return (
    <div className="px-4 py-2 overflow-hidden">
      {/* Month title */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pl-1">
        {format(current, "MMMM yyyy")}
      </h2>

      {/*
        3-panel track: each panel is `calc(100% - 3rem)` wide so neighbours
        peek in ~1.5rem on each side. Track is offset left by one panel+gap
        to centre the current panel.
      */}
      <div
        className="flex flex-row gap-4"
        style={{ transform: "translateX(calc(-1 * (100% - 3rem) - 1rem))" }}
      >
        {/* Previous month — peeking left edge */}
        <div
          className="w-[calc(100%-3rem)] max-w-[calc(100%-3rem)] shrink-0 overflow-hidden opacity-60 hover:opacity-80 cursor-pointer"
          onClick={onPrevClick}
          aria-label={`Go to ${format(prev, "MMMM yyyy")}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onPrevClick?.()}
        >
          <p className="text-sm font-medium text-gray-400 mb-3 pl-1">
            {format(prev, "MMMM yyyy")}
          </p>
          <MonthGrid anchor={prev} events={events} />
        </div>

        {/* Current month — centred */}
        <div className="w-[calc(100%-3rem)] max-w-[calc(100%-3rem)] shrink-0 overflow-hidden">
          <MonthGrid
            anchor={current}
            events={events}
            onWeekClick={onWeekClick}
            onWeekHover={onWeekHover}
            onDayClick={onDayClick}
          />
        </div>

        {/* Next month — peeking right edge */}
        <div
          className="w-[calc(100%-3rem)] max-w-[calc(100%-3rem)] shrink-0 overflow-hidden opacity-60 hover:opacity-80 cursor-pointer"
          onClick={onNextClick}
          aria-label={`Go to ${format(next, "MMMM yyyy")}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onNextClick?.()}
        >
          <p className="text-sm font-medium text-gray-400 mb-3 pl-1">
            {format(next, "MMMM yyyy")}
          </p>
          <MonthGrid anchor={next} events={events} />
        </div>
      </div>
    </div>
  );
}
