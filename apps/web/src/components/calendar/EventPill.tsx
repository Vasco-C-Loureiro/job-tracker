"use client";

import type { CalendarFeedEvent } from "@job-tracker/shared";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";
import { INTERVIEW_TYPE_ICONS } from "@/lib/calendar/icons";

interface EventPillProps {
  event: CalendarFeedEvent;
}

export function EventPill({ event }: EventPillProps) {
  const token   = resolveColorKey(event);
  const classes = colorClasses(token, "pill");

  return (
    <div
      className={`${classes} text-xs font-medium rounded px-1.5 py-0.5 leading-tight cursor-default select-none min-w-0 max-w-full flex items-center gap-1`}
      title={event.title}
    >
      <span className="truncate min-w-0 flex-1">
        {event.time && (
          <span className="opacity-70 mr-1">{event.time.slice(0, 5)}</span>
        )}
        {event.title}
      </span>
      {event.source === "interview_round" && event.roundType && (() => {
        const Icon = INTERVIEW_TYPE_ICONS[event.roundType] ?? INTERVIEW_TYPE_ICONS.other;
        return <Icon size={11} className="flex-shrink-0 opacity-70" />;
      })()}
    </div>
  );
}
