"use client";

import { addMonths, subMonths } from "date-fns";
import type { CalendarFeedEvent } from "@job-tracker/shared";
import { MonthGrid } from "./MonthGrid";

interface MonthViewProps {
  focusedDate: Date;
  events: CalendarFeedEvent[];
  onWeekClick?: (weekStart: Date) => void;
  onWeekHover?: (weekStart: Date) => void;
  onDayClick?: (day: Date) => void;
  onEventClick?: (event: CalendarFeedEvent) => void;
  onPrevClick?: () => void;
  onNextClick?: () => void;
}

export function MonthView({
  focusedDate,
  events,
  onWeekClick,
  onWeekHover,
  onDayClick,
  onEventClick,
  onPrevClick,
  onNextClick,
}: MonthViewProps) {
  const current = focusedDate;
  const prev = subMonths(current, 1);
  const next = addMonths(current, 1);
  const SIDE_SCALE = 0.9;
  const SIDE_GRID_HEIGHT = 400; // px, unscaled height of the side month grid before scale
  const PEEK_NUMBER_INDENT = 55; // 0 = full left, 100 = full right. Adjust to taste.

  return (
    <div className="py-2">
      {/*
        Clip container is the containing block for the absolute side months.
        overflow-hidden clips whatever bleeds past the container edges.
      */}
      <div className="relative">
        {/* Current month — normal flow, sets the track height */}
        <div className="px-32 mx-6">
          <MonthGrid
            anchor={current}
            events={events}
            showWeekNumbers={true}
            onWeekClick={onWeekClick}
            onWeekHover={onWeekHover}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
          />
        </div>

        {/*
          Prev month — right edge sits one column (1/7 of container width) inside
          the left edge of the container; overflow-hidden clips the rest.
          right: 6/7 * 100% means the element's right edge is W/7 from the left edge.
        */}
        <div
          className="absolute opacity-25 cursor-pointer"
          style={{
            right: "calc(70% * 6 / 7 + 35%)",
            width: "50%",
            top: "50%",
            transform: `translateY(-50%) scale(${SIDE_SCALE})`,
            transformOrigin: "right center",
          }}
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
            uniformHeight={SIDE_GRID_HEIGHT}
            cellAlign="end"
            numberIndent={PEEK_NUMBER_INDENT}
          />
        </div>

        {/*
          Next month — left edge sits one column (1/7 of container width) inside
          the right edge of the container; overflow-hidden clips the rest.
        */}
        <div
          className="absolute opacity-25 cursor-pointer"
          style={{
            left: "calc(70% * 6 / 7 + 35%)",
            width: "50%",
            top: "50%",
            transform: `translateY(-50%) scale(${SIDE_SCALE})`,
            transformOrigin: "left center",
          }}
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
            uniformHeight={SIDE_GRID_HEIGHT}
            cellAlign="start"
            numberIndent={100 - PEEK_NUMBER_INDENT}
          />
        </div>
      </div>
    </div>
  );
}
