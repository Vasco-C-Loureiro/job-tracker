"use client";

import { useRef, useEffect, useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const mainRef = useRef<HTMLDivElement>(null);
  const [mainWidth, setMainWidth] = useState<number>(700);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMainWidth(el.offsetWidth));
    ro.observe(el);
    setMainWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="overflow-hidden py-2">

      {/* Month title — aligned with the main panel */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4 mx-36 pl-1">
        {format(current, "MMMM yyyy")}
      </h2>

      {/* Main panel + side peeks container */}
      <div className="relative mx-36">

        {/* Main calendar */}
        <div ref={mainRef}>
          <MonthGrid
            anchor={current}
            events={events}
            showWeekNumbers={true}
            onWeekClick={onWeekClick}
            onWeekHover={onWeekHover}
            onDayClick={onDayClick}
          />
        </div>

        {/* Left peek: previous month */}
        <div
          className="absolute right-full top-0 w-32 h-full overflow-hidden cursor-pointer opacity-70 hover:opacity-90 transition-opacity mr-2"
          onClick={onPrevClick}
          role="button"
          tabIndex={0}
          aria-label={`Go to ${format(prev, "MMMM yyyy")}`}
          onKeyDown={(e) => e.key === "Enter" && onPrevClick?.()}
        >
          <div className="absolute right-0 top-0" style={{ width: mainWidth }}>
            <MonthGrid
              anchor={prev}
              events={events}
              showWeekNumbers={false}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 rounded-full p-1.5 shadow-sm">
              <ChevronLeft size={18} className="text-gray-500" />
            </div>
          </div>
        </div>

        {/* Right peek: next month */}
        <div
          className="absolute left-full top-0 w-32 h-full overflow-hidden cursor-pointer opacity-70 hover:opacity-90 transition-opacity ml-2"
          onClick={onNextClick}
          role="button"
          tabIndex={0}
          aria-label={`Go to ${format(next, "MMMM yyyy")}`}
          onKeyDown={(e) => e.key === "Enter" && onNextClick?.()}
        >
          <div className="absolute left-0 top-0" style={{ width: mainWidth }}>
            <MonthGrid
              anchor={next}
              events={events}
              showWeekNumbers={false}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 rounded-full p-1.5 shadow-sm">
              <ChevronRight size={18} className="text-gray-500" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
