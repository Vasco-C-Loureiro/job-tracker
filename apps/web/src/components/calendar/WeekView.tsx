"use client";

import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import type { CalendarFeedEvent } from "@job-tracker/shared";
import { ymd, sortDayEvents } from "@/lib/calendar/grid";
import { groupAppliedForDay } from "@/lib/calendar/grouping";
import { EventCard } from "./EventCard";

interface WeekViewProps {
  focusedDate: Date;
  events: CalendarFeedEvent[];
  onDayClick?: (day: Date) => void;
}

export function WeekView({ focusedDate, events, onDayClick }: WeekViewProps) {
  const weekStart = startOfWeek(focusedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="flex flex-col gap-2">
      {days.map(day => {
        const isToday = isSameDay(day, today);
        const allDayEvents = sortDayEvents(events.filter(e => e.date === ymd(day)));
        const nonApplied   = allDayEvents.filter(e => e.source !== "applied");
        const appliedGroup = groupAppliedForDay(allDayEvents);

        return (
          <div
            key={ymd(day)}
            className={`rounded-lg p-3 ${isToday ? "bg-blue-50" : "bg-gray-50"}`}
            onClick={() => onDayClick?.(day)}
          >
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${isToday ? "text-blue-700" : "text-gray-700"}`}>
                {format(day, "EEEE")}
              </span>
              <span className={`text-sm ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                {format(day, "d MMM")}
              </span>
            </div>

            {/* Events */}
            {nonApplied.length === 0 && !appliedGroup ? (
              <p className="text-xs text-gray-300 italic">No events</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {nonApplied.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
                {appliedGroup && (
                  <div
                    className={`${appliedGroup.pillClasses} rounded-md px-3 py-2 text-sm font-medium`}
                    title={appliedGroup.companies.join(", ")}
                  >
                    {appliedGroup.label}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
