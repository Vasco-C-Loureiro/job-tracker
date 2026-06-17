"use client";

import { addMonths, format, subMonths } from "date-fns";
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
  const current = focusedDate;
  const prev = subMonths(current, 1);
  const next = addMonths(current, 1);

  return (
    <div className="py-2">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pl-1">
        {format(current, "MMMM yyyy")}
      </h2>

      {/*
        Clip container is the containing block for the absolute side months.
        overflow-hidden clips whatever bleeds past the container edges.
      */}
      <div className="relative overflow-hidden">
        {/* Current month — normal flow, sets the track height */}
        <div className="px-50">
          <MonthGrid
            anchor={current}
            events={events}
            showWeekNumbers={true}
            onWeekClick={onWeekClick}
            onWeekHover={onWeekHover}
            onDayClick={onDayClick}
          />
        </div>

        {/*
          Prev month — right edge sits one column (1/7 of container width) inside
          the left edge of the container; overflow-hidden clips the rest.
          right: 6/7 * 100% means the element's right edge is W/7 from the left edge.
        */}
        <div
          className="absolute top-0 opacity-25 cursor-pointer"
          // style={{ right: "calc(70% * 6 / 7 + 2%)", width: "70%" }}
          style={{ right: "calc(70% * 6 / 7 + 33%)", width: "50%" }}
          onClick={onPrevClick}
          role="button"
          tabIndex={0}
          aria-label="Go to previous month"
          onKeyDown={(e) => e.key === "Enter" && onPrevClick?.()}
        >
          <MonthGrid
            anchor={prev}
            events={events}
            showWeekNumbers={false}
            compact={false}
          />
        </div>

        {/*
          Next month — left edge sits one column (1/7 of container width) inside
          the right edge of the container; overflow-hidden clips the rest.
        */}
        <div
          className="absolute top-0 opacity-25 cursor-pointer"
          style={{ left: "calc(70% * 6 / 7 + 33%)", width: "50%" }}
          onClick={onNextClick}
          role="button"
          tabIndex={0}
          aria-label="Go to next month"
          onKeyDown={(e) => e.key === "Enter" && onNextClick?.()}
        >
          <MonthGrid
            anchor={next}
            events={events}
            showWeekNumbers={false}
            compact={false}
          />
        </div>
      </div>
    </div>
  );
}
