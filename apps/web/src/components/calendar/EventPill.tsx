"use client";

import type { CalendarFeedEvent } from "@job-tracker/shared";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";

interface EventPillProps {
  event: CalendarFeedEvent;
}

export function EventPill({ event }: EventPillProps) {
  const token   = resolveColorKey(event);
  const classes = colorClasses(token, "pill");

  return (
    <div
      className={`${classes} text-xs font-medium rounded px-1.5 py-0.5 truncate leading-tight cursor-default select-none`}
      title={event.title}
    >
      {event.time && (
        <span className="opacity-70 mr-1">{event.time.slice(0, 5)}</span>
      )}
      {event.title}
    </div>
  );
}
