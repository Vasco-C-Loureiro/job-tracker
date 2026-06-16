"use client";

import { setMonth, setYear, startOfMonth } from "date-fns";
import type { CalendarFeedEvent } from "@job-tracker/shared";
import { MonthGrid } from "./MonthGrid";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface YearMonthsViewProps {
  focusedDate: Date;
  events: CalendarFeedEvent[];
  onMonthClick?: (monthIndex: number) => void;
  onMonthHover?: (monthIndex: number) => void;
}

export function YearMonthsView({ focusedDate, events, onMonthClick, onMonthHover }: YearMonthsViewProps) {
  const year = focusedDate.getFullYear();

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="grid grid-cols-4 gap-3">
        {MONTH_NAMES.map((name, monthIdx) => {
          const anchor = startOfMonth(setMonth(setYear(new Date(), year), monthIdx));

          return (
            <div
              key={monthIdx}
              className="cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors"
              onClick={() => onMonthClick?.(monthIdx)}
              onMouseEnter={() => onMonthHover?.(monthIdx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onMonthClick?.(monthIdx)}
            >
              <p className="text-xs font-semibold text-gray-700 mb-1 text-center">{name}</p>
              <MonthGrid
                anchor={anchor}
                events={events}
                compact
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
