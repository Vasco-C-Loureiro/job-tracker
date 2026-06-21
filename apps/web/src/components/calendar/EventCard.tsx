"use client";

import type { CalendarFeedEvent } from "@job-tracker/shared";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";
import { INTERVIEW_TYPE_ICONS } from "@/lib/calendar/icons";

interface EventCardProps {
  event: CalendarFeedEvent;
}

function formatTimeRange(time: string | null, endTime: string | null): string | null {
  if (!time) return null;
  const start = time.slice(0, 5);
  const end   = endTime?.slice(0, 5);
  return end ? `${start} – ${end}` : start;
}

export function EventCard({ event }: EventCardProps) {
  const token     = resolveColorKey(event);
  const classes   = colorClasses(token, "card");
  const timeRange = formatTimeRange(event.time, event.endTime);

  return (
    <div className={`${classes} rounded-md px-3 py-2 text-sm`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate">{event.title}</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          {timeRange && (
            <span className="text-xs opacity-70 whitespace-nowrap">{timeRange}</span>
          )}
          {event.source === "interview_round" && event.roundType && (() => {
            const Icon = INTERVIEW_TYPE_ICONS[event.roundType] ?? INTERVIEW_TYPE_ICONS.other;
            return <Icon size={14} className="opacity-70" />;
          })()}
        </span>
      </div>
      {event.description && (
        <p className="text-xs opacity-60 mt-0.5 line-clamp-2">{event.description}</p>
      )}
    </div>
  );
}
