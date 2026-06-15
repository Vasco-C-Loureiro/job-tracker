"use client";

import type { CalendarFeedEvent } from "@job-tracker/shared";
import { monthMatrix, isoWeek, isSameMonthAs, ymd, sortDayEvents } from "@/lib/calendar/grid";
import { groupAppliedForDay, appliedDotCount } from "@/lib/calendar/grouping";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";
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
              const dayEvs     = events.filter(e => e.date === ymd(day));
              const nonApplied = dayEvs.filter(e => e.source !== "applied");
              const appliedEvs = dayEvs.filter(e => e.source === "applied");

              // Deduplicate non-applied dots by colour token
              const tokensSeen = new Set<string>();
              const nonAppliedDots = nonApplied.reduce<string[]>((acc, ev) => {
                const token = resolveColorKey(ev);
                if (!tokensSeen.has(token)) { tokensSeen.add(token); acc.push(token); }
                return acc;
              }, []).slice(0, 3);

              const numAppliedDots = appliedEvs.length > 0 ? appliedDotCount(appliedEvs.length) : 0;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onDayClick?.(day)}
                  className={[
                    "flex flex-col items-center h-7 w-full text-[11px] rounded pt-0.5",
                    isCurrentMonth ? "text-gray-700" : "text-gray-300",
                    isToday ? "ring-1 ring-blue-400 bg-blue-50 font-semibold" : "hover:bg-gray-100",
                  ].join(" ")}
                >
                  <span className="leading-none">{day.getDate()}</span>
                  {dayEvs.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-0.5 mt-0.5 justify-center">
                      {nonAppliedDots.map(token => (
                        <span
                          key={token}
                          className={`w-1.5 h-1.5 rounded-full ${colorClasses(token, "dot")}`}
                        />
                      ))}
                      {numAppliedDots > 0 && Array.from({ length: numAppliedDots }).map((_, i) => (
                        <span
                          key={`applied-${i}`}
                          className={`w-1.5 h-1.5 rounded-full ${colorClasses("applied", "dot")}${i > 0 ? " -ml-1" : ""}`}
                        />
                      ))}
                    </div>
                  )}
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
            const allDayEvents = sortDayEvents(events.filter(e => e.date === ymd(day)));
            const nonApplied   = allDayEvents.filter(e => e.source !== "applied");
            const appliedGroup = groupAppliedForDay(allDayEvents);
            const MAX_PILLS = 3;
            const slotsForNonApplied = appliedGroup ? MAX_PILLS - 1 : MAX_PILLS;
            const visibleNonApplied  = nonApplied.slice(0, slotsForNonApplied);
            const overflowNonApplied = nonApplied.length - slotsForNonApplied;
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
                  {visibleNonApplied.map(event => (
                    <EventPill key={event.id} event={event} />
                  ))}
                  {appliedGroup && (
                    <div
                      className={`${appliedGroup.pillClasses} text-xs font-medium rounded px-1.5 py-0.5 truncate leading-tight cursor-default select-none`}
                      title={appliedGroup.companies.join(", ")}
                    >
                      {appliedGroup.label}
                    </div>
                  )}
                  {overflowNonApplied > 0 && (
                    <div className="text-xs text-gray-400 px-1">+{overflowNonApplied} more</div>
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
