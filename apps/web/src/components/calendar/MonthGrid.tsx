"use client";

import type { CalendarFeedEvent } from "@job-tracker/shared";
import { monthMatrix, isoWeek, isSameMonthAs, ymd, sortDayEvents } from "@/lib/calendar/grid";
import { EventPill } from "./EventPill";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthGridProps {
  anchor: Date;
  events: CalendarFeedEvent[];
  onWeekClick?: (weekStart: Date) => void;
  onDayClick?: (day: Date) => void;
  compact?: boolean;
}

export function MonthGrid({ anchor, events, onWeekClick, onDayClick, compact = false }: MonthGridProps) {
  const weeks = monthMatrix(anchor);
  const todayStr = ymd(new Date());

  if (compact) {
    return (
      <div className="select-none">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-0.5">
              {d[0]}
            </div>
          ))}
        </div>
        {/* Week rows */}
        {weeks.map((row) => (
          <div key={row[0].toISOString()} className="grid grid-cols-7">
            {row.map((day) => {
              const isCurrentMonth = isSameMonthAs(day, anchor);
              const isToday = ymd(day) === todayStr;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onDayClick?.(day)}
                  className={[
                    "flex items-center justify-center h-6 w-full text-[11px] rounded",
                    isCurrentMonth ? "text-gray-700" : "text-gray-300",
                    isToday ? "ring-1 ring-blue-400 bg-blue-50 font-semibold" : "hover:bg-gray-100",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="select-none">
      {/* Header row: Wk + day names */}
      <div className="grid grid-cols-[2.5rem_repeat(7,1fr)] mb-1">
        <div className="text-center text-xs font-medium text-gray-400 py-1">Wk</div>
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Week rows */}
      {weeks.map((row) => (
        <div key={row[0].toISOString()} className="grid grid-cols-[2.5rem_repeat(7,1fr)]">
          {/* Week number */}
          <button
            type="button"
            onClick={() => onWeekClick?.(row[0])}
            className="text-center text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded py-1 cursor-pointer"
          >
            {isoWeek(row[0])}
          </button>
          {/* Day cells */}
          {row.map((day) => {
            const isCurrentMonth = isSameMonthAs(day, anchor);
            const isToday = ymd(day) === todayStr;
            const dayEvents = sortDayEvents(events.filter(e => e.date === ymd(day)));
            const MAX_PILLS = 3;
            const visible = dayEvents.slice(0, MAX_PILLS);
            const overflow = dayEvents.length - MAX_PILLS;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onDayClick?.(day)}
                className={[
                  "flex flex-col items-start min-h-[5rem] pt-1 px-0.5 rounded text-sm overflow-hidden",
                  isCurrentMonth ? "text-gray-800" : "text-gray-300 bg-gray-50/50",
                  isToday
                    ? "ring-1 ring-blue-400 bg-blue-50 font-semibold"
                    : "hover:bg-gray-100",
                ].join(" ")}
              >
                <span className="leading-none self-center mb-1">{day.getDate()}</span>
                <div className="mt-0.5 flex flex-col gap-0.5 min-w-0 w-full">
                  {visible.map(event => (
                    <EventPill key={event.id} event={event} />
                  ))}
                  {overflow > 0 && (
                    <div className="text-xs text-gray-400 px-1">+{overflow} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
