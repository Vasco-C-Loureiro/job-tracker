"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import type { CalendarFeedEvent } from "@job-tracker/shared";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";
import { ymd, sortDayEvents } from "@/lib/calendar/grid";
import { groupAppliedForDay } from "@/lib/calendar/grouping";

interface UpcomingListProps {
  events: CalendarFeedEvent[];
}

function formatTimeRange(time: string | null, endTime: string | null): string | null {
  if (!time) return null;
  const start = time.slice(0, 5);
  const end = endTime?.slice(0, 5);
  return end ? `${start} – ${end}` : start;
}

export function UpcomingList({ events }: UpcomingListProps) {
  const todayYmd = ymd(new Date());

  const futureEvents = events.filter(e => e.date >= todayYmd);

  if (futureEvents.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No upcoming events.</p>
      </div>
    );
  }

  // Group by date
  const byDate = new Map<string, CalendarFeedEvent[]>();
  for (const event of futureEvents) {
    if (!byDate.has(event.date)) byDate.set(event.date, []);
    byDate.get(event.date)!.push(event);
  }

  const sortedDates = Array.from(byDate.keys()).sort();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {sortedDates.map(dateStr => {
        const dayEvents = sortDayEvents(byDate.get(dateStr)!);
        const nonApplied = dayEvents.filter(e => e.source !== "applied");
        const appliedGroup = groupAppliedForDay(dayEvents);
        const cleanDateStr = dateStr.substring(0, 10);
        const [y, m, d] = cleanDateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d); // local date, no timezone shift

        if (isNaN(date.getTime())) return null;

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {format(date, "EEEE d MMMM")}
              </span>
              {dateStr === todayYmd && (
                <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                  Today
                </span>
              )}
            </div>

            {/* Event entries */}
            <div className="flex flex-col gap-2 pl-1">
              {nonApplied.map(event => {
                const token = resolveColorKey(event);
                const dotClass = colorClasses(token, "dot");
                const timeRange = formatTimeRange(event.time, event.endTime);

                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {event.title}
                        </span>
                        {timeRange && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{timeRange}</span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.source === "interview_round" && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {(event.company || event.jobTitle) && (
                            <p className="text-xs text-gray-400">
                              {event.company}{event.jobTitle ? ` · ${event.jobTitle}` : ""}
                            </p>
                          )}
                          {event.jobId && (
                            <Link
                              href={`/interviews?highlight=${event.jobId}`}
                              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                              <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {appliedGroup && (
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${colorClasses("applied", "dot")}`} />
                  <div>
                    <span className="text-sm font-medium text-blue-700">
                      Applied to {appliedGroup.label}{appliedGroup.countSuffix ?? ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
