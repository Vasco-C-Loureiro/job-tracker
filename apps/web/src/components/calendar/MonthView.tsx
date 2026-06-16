"use client";

import { format } from "date-fns";
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
}: MonthViewProps) {
  const current = focusedDate;

  return (
    <div className="overflow-hidden py-2">

      {/* Month title — aligned with the main panel */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4 mx-36 pl-1">
        {format(current, "MMMM yyyy")}
      </h2>

      {/* Main panel */}
      <div className="relative mx-36">
        <MonthGrid
          anchor={current}
          events={events}
          showWeekNumbers={true}
          onWeekClick={onWeekClick}
          onWeekHover={onWeekHover}
          onDayClick={onDayClick}
        />
      </div>
    </div>
  );
}
